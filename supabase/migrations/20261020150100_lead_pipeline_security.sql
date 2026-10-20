-- =====================================================================
-- Lead pipeline 2/4: security lockdown (WP05: SEC-03, SEC-10, CH-06)
--
-- BREAKING. Do not apply on its own: the browser stops inserting leads, the
-- old otp_codes table is dropped, firms lose direct access to public.leads
-- and the lead-photos bucket becomes private. Release it together with the
-- new lead form (create-lead / send-otp / verify-otp contracts) and the
-- firm panel that reads leads_for_firms and lead_assignments only. The same release must
-- apply 20261020150400_lead_purchase_gate.sql, which restricts purchases to firms the lead
-- was routed to.
--
-- Before applying take a pg_dump of public.leads, public.otp_codes and the
-- leads_for_firms view definition; this migration is not trivially reversible.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) leads: no client INSERT, no firm SELECT
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  -- Every INSERT policy, whatever its (unknown) live name.
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leads' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leads', r.policyname);
  END LOOP;

  -- Every SELECT policy that lets a firm read leads through assigned_firms,
  -- including "Firms can read assigned leads".
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND cmd IN ('SELECT', 'ALL')
      AND qual ILIKE '%assigned_firms%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leads', r.policyname);
  END LOOP;
END $$;

REVOKE INSERT ON public.leads FROM anon, authenticated;
-- anon has no legitimate use for this table; status lookups go through get_lead_status().
REVOKE ALL ON public.leads FROM anon;

-- Kept on purpose: "Users can read own leads" and the admin SELECT/UPDATE/DELETE
-- policies (AdminPanel.tsx reads, approves, updates and deletes leads).
-- public.leads stays in the supabase_realtime publication for the admin live feed;
-- without a SELECT policy Realtime delivers nothing to firms.

-- ---------------------------------------------------------------------
-- (b) Defence in depth: privileged columns can only change through the
-- service role, cron/pg_net or an admin.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lead_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Leads can only be created through the create-lead function'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.admin_approved IS DISTINCT FROM OLD.admin_approved
       OR NEW.token_price IS DISTINCT FROM OLD.token_price
       OR NEW.price_jeton IS DISTINCT FROM OLD.price_jeton
       OR NEW.assigned_firms IS DISTINCT FROM OLD.assigned_firms
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.routing_status IS DISTINCT FROM OLD.routing_status
       OR NEW.lead_score IS DISTINCT FROM OLD.lead_score
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.target_firm_id IS DISTINCT FROM OLD.target_firm_id
       OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
       OR NEW.review_flags IS DISTINCT FROM OLD.review_flags
       OR NEW.status_token IS DISTINCT FROM OLD.status_token THEN
      RAISE EXCEPTION 'Not allowed to change protected lead columns'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_guard_privileged_columns ON public.leads;
CREATE TRIGGER lead_guard_privileged_columns
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.lead_guard_privileged_columns();

-- ---------------------------------------------------------------------
-- (c) Drop the legacy notification and assignment path
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_lead_created_whatsapp ON public.leads;
DROP TRIGGER IF EXISTS on_new_lead_notify ON public.leads;
DROP TRIGGER IF EXISTS on_lead_created_assign_firms ON public.leads;
DROP TRIGGER IF EXISTS trg_assign_leads_to_firms ON public.leads;

DROP FUNCTION IF EXISTS public.notify_firms_on_lead_whatsapp() CASCADE;
DROP FUNCTION IF EXISTS public.notify_firms_on_new_lead() CASCADE;
DROP FUNCTION IF EXISTS public.assign_leads_to_firms() CASCADE;

-- Plaintext one-time codes. Replaced by lead_otps (salted hashes only).
DROP TABLE IF EXISTS public.otp_codes;

-- ---------------------------------------------------------------------
-- (d) leads_for_firms: definer view with an explicit filter
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.leads_for_firms CASCADE;

CREATE VIEW public.leads_for_firms
WITH (security_invoker = off, security_barrier = true) AS
SELECT
  l.id,
  l.created_at,
  l.updated_at,
  l.service_type,
  l.project_size,
  l.budget,
  l.timeline,
  l.city,
  l.district,
  l.status,
  l.lead_score,
  l.project_type,
  l.area_size,
  l.scope,
  l.irrigation_type,
  l.irrigation_system,
  l.water_source,
  l.property_type,
  l.current_condition,
  l.token_price,
  la.id AS assignment_id,
  la.rank AS assignment_rank,
  la.assigned_at,
  la.viewed_at,
  coalesce(la.purchased_at, pu.purchased_at) AS purchased_at,
  coalesce(la.is_direct, false) AS is_direct,
  (pu.lead_id IS NOT NULL) AS is_purchased,
  (
    SELECT count(*)::int
    FROM public.lead_assignments a
    WHERE a.lead_id = l.id AND a.status <> 'declined'
  ) AS assigned_count,
  (
    SELECT count(*)::int
    FROM public.lead_purchases p
    WHERE p.lead_id = l.id AND p.status = 'paid'
  ) AS purchase_count,
  CASE
    WHEN l.target_firm_id IN (SELECT f.id FROM public.firms f WHERE f.user_id = auth.uid())
      THEN l.target_firm_id
    ELSE NULL
  END AS target_firm_id,
  -- Storage paths inside the private lead-photos bucket; only after purchase.
  CASE WHEN pu.lead_id IS NOT NULL THEN l.photo_urls ELSE NULL END AS photo_urls,
  CASE WHEN pu.lead_id IS NOT NULL THEN l.address ELSE NULL END AS address,
  CASE WHEN pu.lead_id IS NOT NULL THEN l.notes ELSE NULL END AS notes,
  CASE
    WHEN pu.lead_id IS NOT NULL THEN l.full_name
    ELSE left(split_part(l.full_name, ' ', 1), 1) || '** ' || left(split_part(l.full_name, ' ', 2), 1) || '**'
  END AS full_name,
  CASE
    WHEN pu.lead_id IS NOT NULL THEN l.phone
    ELSE left(l.phone, 2) || '** *** **' || right(l.phone, 2)
  END AS phone,
  CASE
    WHEN pu.lead_id IS NOT NULL THEN l.email
    ELSE '***@***.com'
  END AS email
FROM public.leads l
LEFT JOIN LATERAL (
  SELECT a.id, a.rank, a.assigned_at, a.viewed_at, a.purchased_at, a.is_direct
  FROM public.lead_assignments a
  JOIN public.firms f ON f.id = a.firm_id
  WHERE a.lead_id = l.id AND f.user_id = auth.uid()
  ORDER BY a.rank NULLS LAST, a.assigned_at
  LIMIT 1
) la ON true
LEFT JOIN LATERAL (
  SELECT p.lead_id, p.purchased_at
  FROM public.lead_purchases p
  WHERE p.lead_id = l.id AND p.firm_id = auth.uid() AND p.status = 'paid'
  ORDER BY p.purchased_at
  LIMIT 1
) pu ON true
WHERE
  -- Routed to this firm, approved and live ...
  (la.id IS NOT NULL AND l.admin_approved AND l.status IN ('active', 'purchased'))
  -- ... or already bought (and not refunded) by this firm, whatever happened to the lead afterwards.
  OR pu.lead_id IS NOT NULL;

REVOKE ALL ON public.leads_for_firms FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.leads_for_firms TO authenticated;
GRANT SELECT ON public.leads_for_firms TO service_role;

-- ---------------------------------------------------------------------
-- (e) lead_purchases
-- ---------------------------------------------------------------------
-- The open policy that let every firm read every purchase ("FOMO counter").
-- The view above exposes real counts instead.
DROP POLICY IF EXISTS "Firms can read all purchases for FOMO" ON public.lead_purchases;

-- Purchases are written by the server (spend-coins / Stripe webhook) with the service role.
-- A firm inserting its own purchase row would unlock the unmasked contact details for free.
DROP POLICY IF EXISTS "Service role can insert purchases" ON public.lead_purchases;
REVOKE INSERT ON public.lead_purchases FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.lead_purchase_mark_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' THEN
    RETURN NEW;
  END IF;

  UPDATE public.lead_assignments a
  SET status = 'purchased',
      purchased_at = coalesce(a.purchased_at, now())
  FROM public.firms f
  WHERE a.lead_id = NEW.lead_id
    AND a.firm_id = f.id
    AND f.user_id = NEW.firm_id
    AND a.status <> 'purchased';

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lead_purchase_mark_assignment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lead_purchase_mark_assignment ON public.lead_purchases;
CREATE TRIGGER lead_purchase_mark_assignment
  AFTER INSERT ON public.lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.lead_purchase_mark_assignment();

-- ---------------------------------------------------------------------
-- (f) Storage: lead-photos becomes private, uploads use server-issued signed URLs
-- ---------------------------------------------------------------------
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'lead-photos';

DROP POLICY IF EXISTS "Public can read lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload lead photos" ON storage.objects;

-- A policy subquery runs with the caller's own row-level security, and a firm cannot read
-- public.leads. This definer helper answers the one question the policy needs: did the caller buy
-- (and not get refunded for) the lead whose photos live in this folder? The folder is the lead id
-- for new uploads; the second comparison covers the legacy objects stored under <userId>/.
CREATE OR REPLACE FUNCTION public.firm_can_read_lead_photo(p_folder text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.lead_purchases lp
       JOIN public.leads l ON l.id = lp.lead_id
       WHERE lp.firm_id = auth.uid()
         AND lp.status = 'paid'
         AND (lp.lead_id::text = p_folder OR l.user_id::text = p_folder)
     )
$$;
REVOKE EXECUTE ON FUNCTION public.firm_can_read_lead_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.firm_can_read_lead_photo(text) TO authenticated;

-- Readable by admins and by firms that bought the lead; nobody else (no public access).
DROP POLICY IF EXISTS lead_photos_read ON storage.objects;
CREATE POLICY lead_photos_read
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lead-photos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.firm_can_read_lead_photo((storage.foldername(name))[1])
  )
);

-- Public URLs become bucket paths ("<folder>/<file>").
UPDATE public.leads l
SET photo_urls = (
  SELECT array_agg(regexp_replace(u.url, '^.*/lead-photos/', '') ORDER BY u.ord)
  FROM unnest(l.photo_urls) WITH ORDINALITY AS u(url, ord)
)
WHERE l.photo_urls IS NOT NULL
  AND EXISTS (SELECT 1 FROM unnest(l.photo_urls) AS x(url) WHERE x.url ~ '^https?://');

-- ---------------------------------------------------------------------
-- (g) Final audit of the leads policies
--
-- The live schema has drifted from the repo migrations and (a) only knows the policies it can
-- name or match on assigned_firms. A firm-readable policy keyed on target_firm_id or the firms
-- table, a firm-scoped FOR ALL policy or any other differently named SELECT/UPDATE/DELETE policy
-- would survive silently and let a firm read full_name, phone and email straight from public.leads
-- (bypassing the masked view and the purchase paywall, and still receiving Realtime events).
--   1. Policies that reference the firms table, firm ids or assigned_firms are dropped.
--   2. Every other policy that applies to anon, authenticated or public must be exactly the owner
--      policy (auth.uid() = user_id) or an admin has_role policy. Anything else aborts the
--      migration with its name and command so the operator can review it against the live
--      pg_policies instead of shipping a leak.
-- ---------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
  v_dropped text[] := ARRAY[]::text[];
  v_unsafe text[] := ARRAY[]::text[];
BEGIN
  FOR r IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL')
      AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
      AND (
        coalesce(qual, '') ~* '(target_firm_id|assigned_firms|firms|firm_id)'
        OR coalesce(with_check, '') ~* '(target_firm_id|assigned_firms|firms|firm_id)'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leads', r.policyname);
    v_dropped := v_dropped || format('%s (%s)', r.policyname, r.cmd);
  END LOOP;

  IF cardinality(v_dropped) > 0 THEN
    RAISE NOTICE 'lead_pipeline_security: dropped firm-keyed policies on public.leads: %', array_to_string(v_dropped, ', ');
  END IF;

  -- Qual with whitespace, parentheses, schema prefixes and casts removed, so that
  -- "(auth.uid() = user_id)" and "has_role(auth.uid(), 'admin'::app_role)" compare reliably.
  FOR r IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND permissive = 'PERMISSIVE'
      AND cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL')
      AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
      AND regexp_replace(
            regexp_replace(lower(coalesce(qual, with_check, 'true')), '\s|public\.|\(|\)', '', 'g'),
            '::[a-z_]+', '', 'g'
          ) !~ '^((select)?auth\.uid(asuid)?=user_id|user_id=(select)?auth\.uid(asuid)?|has_role(select)?auth\.uid(asuid)?,''admin'')$'
  LOOP
    v_unsafe := v_unsafe || format('%s (%s)', r.policyname, r.cmd);
  END LOOP;

  IF cardinality(v_unsafe) > 0 THEN
    RAISE EXCEPTION 'lead_pipeline_security: public.leads still has policies that are neither the owner policy nor an admin policy: %. Review them against the live pg_policies and drop them explicitly before re-running.',
      array_to_string(v_unsafe, ', ');
  END IF;

  IF has_table_privilege('anon', 'public.leads', 'SELECT') THEN
    RAISE EXCEPTION 'lead_pipeline_security: anon can still SELECT from public.leads';
  END IF;
END $$;
