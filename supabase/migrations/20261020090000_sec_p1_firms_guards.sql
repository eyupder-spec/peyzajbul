-- =====================================================================
-- SEC P1 / 1 of 5: firms guards, role grant on approval, has_role hardening
--
-- APPLY ORDER:
--   Apply together with the other four *_sec_p1_* files, in filename order
--   (090000 -> 090400). Deploy the Edge Functions first (see PREREQUISITES).
--   This file is SAFE to apply with no client change.
--
-- PREREQUISITES:
--   * None in the database. Run the read-only audit queries below on production
--     BEFORE applying and keep the output as proof of the state before the fix.
--   * Deploy the hardened Edge Functions first (assign-firm-role,
--     send-lead-confirmation, ...). Order between functions and this file is
--     otherwise safe: the firm 'firm' role is now granted by a trigger when an
--     admin approves the firm, and assign-firm-role is a no-op.
--   * Idempotent: every statement can be re-run. Drift-safe: the live firms
--     table has columns that no migration creates (landing_config,
--     profile_views, expo_push_token), so rows are rewritten with
--     jsonb_populate_record and columns are compared through to_jsonb().
--
-- ROLLBACK (each object is independently removable):
--   DROP TRIGGER IF EXISTS tr_firms_insert_guard      ON public.firms;
--   DROP TRIGGER IF EXISTS tr_firms_url_guard         ON public.firms;
--   DROP TRIGGER IF EXISTS tr_firms_grant_firm_role   ON public.firms;
--   check_firm_update_security(): restore the body from 20260311183000_security_hardening.sql
--   has_role(): restore the body from 20260308140122_640ad77f-ac14-4bc6-ab4b-d2b89ce78129.sql
--   Policies: recreate from 20260308141145 / 20260308145645 / 20260311183000 as needed.
--
-- READ-ONLY AUDIT QUERIES (run on production first, they change nothing):
--   (a) coin ledger mismatch
--       SELECT f.id, f.company_name, f.coin_balance, COALESCE(SUM(t.amount), 0) AS ledger
--       FROM firms f LEFT JOIN coin_transactions t ON t.firm_id = f.id
--       GROUP BY f.id HAVING f.coin_balance <> COALESCE(SUM(t.amount), 0);
--   (b) premium without a Stripe subscription
--       SELECT id, company_name, premium_until FROM firms
--       WHERE is_premium AND stripe_subscription_id IS NULL;
--   (c) non-admin users that own more than one firm
--       SELECT f.user_id, count(*) FROM firms f
--       WHERE NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = f.user_id AND r.role = 'admin')
--       GROUP BY f.user_id HAVING count(*) > 1;
--   (d) current policies on the money and role tables
--       SELECT polname, polrelid::regclass FROM pg_policy
--       WHERE polrelid IN ('public.lead_purchases'::regclass,
--                          'public.coin_transactions'::regclass,
--                          'public.user_roles'::regclass);
--   (e) live code that updates avg_rating / review_count as a non-admin would now
--       be blocked by check_firm_update_security(); look for it before applying:
--       SELECT proname FROM pg_proc WHERE prosrc ILIKE '%update%firms%';
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Re-assert 20260311183000_security_hardening.sql idempotently.
--    supabase_push_out.txt (2026-03-15) listed that migration as pending on
--    the remote. If the original open policy "Service role can insert
--    purchases" (WITH CHECK firm_id = auth.uid()) is still live, any signed-up
--    user can insert a lead_purchases row for themselves and unmask a lead
--    for free.
-- ---------------------------------------------------------------------

-- lead_purchases: only admins may insert from a client; the service role bypasses RLS.
DROP POLICY IF EXISTS "Service role can insert purchases" ON public.lead_purchases;
DROP POLICY IF EXISTS "Firms can insert own purchases" ON public.lead_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.lead_purchases;
DROP POLICY IF EXISTS "Only admins can insert purchases manually" ON public.lead_purchases;
CREATE POLICY "Only admins can insert purchases manually"
ON public.lead_purchases
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- coin_transactions: same rule. "Admins can insert transactions" (20260308162558) is admin-only and stays.
DROP POLICY IF EXISTS "Firms can insert own transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Only admins can insert transactions manually" ON public.coin_transactions;
CREATE POLICY "Only admins can insert transactions manually"
ON public.coin_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Idempotency of Stripe credits: one coin_transactions row per Stripe session.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_purchase_session
    ON public.coin_transactions (stripe_session_id)
    WHERE (stripe_session_id IS NOT NULL);
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'idx_unique_purchase_session not created: duplicate stripe_session_id values exist in coin_transactions. Resolve the duplicates and re-run this file.';
END $$;

-- user_roles: only admins can write roles.
DROP POLICY IF EXISTS "Admins can do everything on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------
-- 2) has_role(): answer only for the caller's own uid.
--    The old body let any anon/authenticated client ask whether an arbitrary
--    user id is an admin. Every policy and trigger in the repository already
--    calls has_role(auth.uid(), ...). EXECUTE is deliberately NOT revoked from
--    anon: policies without a TO clause (for example firm_reviews "Admins can
--    manage all reviews") are evaluated for anon and would raise
--    "permission denied for function has_role".
--    Consequence: to check another user's role, query user_roles with the
--    service role instead.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _user_id AND ur.role = _role
     )
$$;


-- ---------------------------------------------------------------------
-- 3) firms INSERT guard.
--    Policy "Users can insert own firm" only checks user_id = auth.uid(), so a
--    signed-up user could create an approved, premium firm with a coin balance.
--    Admin imports (AdminBulkFirmTab / FirmFormDialog) and the service role are
--    left untouched.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.firms_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.firms f WHERE f.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Bu hesap için zaten bir firma kaydı var.';
  END IF;

  -- Rewrite protected values. Keys that are not columns of the live table are ignored.
  RETURN jsonb_populate_record(
    NEW,
    jsonb_build_object(
      'user_id', auth.uid(),
      'is_approved', false,
      'is_premium', false,
      'premium_until', null,
      'coin_balance', 0,
      'is_claimed', false,
      'stripe_customer_id', null,
      'stripe_subscription_id', null,
      'subscription_plan', null,
      'avg_rating', null,
      'review_count', 0,
      'profile_views', 0
    )
  );
END;
$$;

DROP TRIGGER IF EXISTS tr_firms_insert_guard ON public.firms;
CREATE TRIGGER tr_firms_insert_guard
  BEFORE INSERT ON public.firms
  FOR EACH ROW
  EXECUTE FUNCTION public.firms_insert_guard();


-- ---------------------------------------------------------------------
-- 4) firms UPDATE guard: non-admins cannot touch money, approval, ownership,
--    Stripe or rating columns. profile_views is deliberately not protected:
--    a live RPC may increment it as the visitor.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_firm_update_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_column text;
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
BEGIN
  -- Service role (Edge Functions): auth.uid() is null.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  FOREACH protected_column IN ARRAY ARRAY[
    'coin_balance', 'is_approved', 'is_premium', 'premium_until', 'user_id',
    'is_claimed', 'stripe_customer_id', 'stripe_subscription_id',
    'subscription_plan', 'avg_rating', 'review_count'
  ] LOOP
    IF (old_row -> protected_column) IS DISTINCT FROM (new_row -> protected_column) THEN
      RAISE EXCEPTION 'Hata: Hassas kolonları güncelleme yetkiniz yok. (%)', protected_column
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_firm_update_security ON public.firms;
CREATE TRIGGER tr_check_firm_update_security
  BEFORE UPDATE ON public.firms
  FOR EACH ROW
  EXECUTE FUNCTION public.check_firm_update_security();


-- ---------------------------------------------------------------------
-- 5) URL scheme guard for values that end up in href/src attributes.
--    No admin bypass. Only values that changed are validated, so unrelated
--    updates of legacy rows are never blocked.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.firms_url_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  url_column text;
  url_value text;
  new_row jsonb := to_jsonb(NEW);
  old_row jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
BEGIN
  FOREACH url_column IN ARRAY ARRAY[
    'website', 'social_instagram', 'social_facebook', 'social_x',
    'social_youtube', 'social_linkedin', 'logo_url'
  ] LOOP
    url_value := new_row ->> url_column;
    IF url_value IS NOT NULL AND url_value IS DISTINCT FROM (old_row ->> url_column) THEN
      IF regexp_replace(url_value, '[[:space:][:cntrl:]]', '', 'g') ~* '^(javascript|data|vbscript|file|blob):' THEN
        RAISE EXCEPTION 'Geçersiz bağlantı: % alanı güvenli olmayan bir adres içeriyor.', url_column
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END LOOP;

  url_value := new_row ->> 'google_maps_url';
  IF url_value IS NOT NULL AND url_value IS DISTINCT FROM (old_row ->> 'google_maps_url') THEN
    IF btrim(url_value) <> '' AND btrim(url_value) !~* '^https://' THEN
      RAISE EXCEPTION 'Geçersiz bağlantı: google_maps_url yalnızca https:// ile başlayabilir.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_firms_url_guard ON public.firms;
CREATE TRIGGER tr_firms_url_guard
  BEFORE INSERT OR UPDATE ON public.firms
  FOR EACH ROW
  EXECUTE FUNCTION public.firms_url_guard();


-- ---------------------------------------------------------------------
-- 6) Grant the 'firm' role when an admin approves a firm.
--    Replaces the unauthenticated assign-firm-role Edge Function. The
--    homeowner role row is kept. Skipped when the user does not exist in
--    auth.users (user_roles.user_id has a foreign key) and for admins
--    (pre-seeded firms carry the admin's uid).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_firm_role_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id AND ur.role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'firm')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_firms_grant_firm_role ON public.firms;
CREATE TRIGGER tr_firms_grant_firm_role
  AFTER UPDATE OF is_approved ON public.firms
  FOR EACH ROW
  WHEN (NEW.is_approved IS TRUE AND OLD.is_approved IS DISTINCT FROM TRUE)
  EXECUTE FUNCTION public.grant_firm_role_on_approval();
