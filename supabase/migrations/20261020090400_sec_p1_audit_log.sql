-- =====================================================================
-- SEC P1 / 5 of 5: admin audit log
--
-- Records who changed roles, firm approval/premium/balance/ownership, coin
-- transactions and review moderation. This is also the moderation log for
-- reviews (insert, approval flip, delete).
--
-- APPLY ORDER:
--   Apply together with the other *_sec_p1_* files, in filename order. It is
--   the last P1 file so that the role grant on firm approval
--   (20261020090000) is logged from the first approval on.
--
-- PREREQUISITES:
--   * None. The audit trigger can never block a business write: audit_change()
--     swallows its own errors and only raises a WARNING.
--   * Idempotent: every statement can be re-run.
--   * Read the log as an admin:
--       select at, actor, action, table_name, row_id, old_data, new_data
--       from public.admin_audit_log order by id desc limit 100;
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS tr_audit_user_roles ON public.user_roles;
--   DROP TRIGGER IF EXISTS tr_audit_firms ON public.firms;
--   DROP TRIGGER IF EXISTS tr_audit_coin_transactions ON public.coin_transactions;
--   DROP TRIGGER IF EXISTS tr_audit_firm_reviews ON public.firm_reviews;
--   DROP FUNCTION IF EXISTS public.audit_change();
--   DROP TABLE IF EXISTS public.admin_audit_log;
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at               timestamptz NOT NULL DEFAULT now(),
  actor            uuid,
  actor_is_service boolean NOT NULL DEFAULT false,
  action           text NOT NULL,
  table_name       text NOT NULL,
  row_id           text,
  old_data         jsonb,
  new_data         jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_at ON public.admin_audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_table_row ON public.admin_audit_log (table_name, row_id);

-- Admin-only SELECT, no write policies: rows are written only by the SECURITY DEFINER trigger function.
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

DROP POLICY IF EXISTS admin_audit_log_admin_select ON public.admin_audit_log;
CREATE POLICY admin_audit_log_admin_select ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


CREATE OR REPLACE FUNCTION public.audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_keys text[] := ARRAY['id', 'company_name', 'is_approved', 'is_premium', 'premium_until', 'coin_balance', 'user_id', 'is_claimed'];
BEGIN
  BEGIN
    IF TG_OP <> 'INSERT' THEN
      v_old := to_jsonb(OLD);
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_new := to_jsonb(NEW);
    END IF;

    -- Homeowner role rows are created on every signup and would only add noise.
    IF TG_TABLE_NAME = 'user_roles'
       AND COALESCE(v_new ->> 'role', 'homeowner') = 'homeowner'
       AND COALESCE(v_old ->> 'role', 'homeowner') = 'homeowner' THEN
      RETURN NULL;
    END IF;

    -- UPDATE OF is_approved also fires when the value is written back unchanged.
    IF TG_TABLE_NAME = 'firm_reviews' AND TG_OP = 'UPDATE'
       AND (v_old -> 'is_approved') IS NOT DISTINCT FROM (v_new -> 'is_approved') THEN
      RETURN NULL;
    END IF;

    -- Firms hold personal and financial columns; log only the tracked ones.
    IF TG_TABLE_NAME = 'firms' THEN
      IF v_old IS NOT NULL THEN
        SELECT jsonb_object_agg(k, v_old -> k) INTO v_old FROM unnest(v_keys) AS k;
      END IF;
      IF v_new IS NOT NULL THEN
        SELECT jsonb_object_agg(k, v_new -> k) INTO v_new FROM unnest(v_keys) AS k;
      END IF;
    END IF;

    INSERT INTO public.admin_audit_log (actor, actor_is_service, action, table_name, row_id, old_data, new_data)
    VALUES (
      v_actor,
      v_actor IS NULL,
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(v_new ->> 'id', v_old ->> 'id'),
      v_old,
      v_new
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'audit_change failed on %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  END;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_change() FROM PUBLIC, anon, authenticated;


DROP TRIGGER IF EXISTS tr_audit_user_roles ON public.user_roles;
CREATE TRIGGER tr_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_change();

DROP TRIGGER IF EXISTS tr_audit_firms ON public.firms;
CREATE TRIGGER tr_audit_firms
  AFTER UPDATE ON public.firms
  FOR EACH ROW
  WHEN (
    OLD.is_approved IS DISTINCT FROM NEW.is_approved
    OR OLD.is_premium IS DISTINCT FROM NEW.is_premium
    OR OLD.premium_until IS DISTINCT FROM NEW.premium_until
    OR OLD.coin_balance IS DISTINCT FROM NEW.coin_balance
    OR OLD.user_id IS DISTINCT FROM NEW.user_id
    OR OLD.is_claimed IS DISTINCT FROM NEW.is_claimed
  )
  EXECUTE FUNCTION public.audit_change();

DROP TRIGGER IF EXISTS tr_audit_coin_transactions ON public.coin_transactions;
CREATE TRIGGER tr_audit_coin_transactions
  AFTER INSERT ON public.coin_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_change();

DO $$
BEGIN
  IF to_regclass('public.firm_reviews') IS NULL THEN
    RAISE NOTICE 'public.firm_reviews does not exist, skipping its audit trigger';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS tr_audit_firm_reviews ON public.firm_reviews;
  CREATE TRIGGER tr_audit_firm_reviews
    AFTER INSERT OR DELETE OR UPDATE OF is_approved ON public.firm_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_change();
END $$;
