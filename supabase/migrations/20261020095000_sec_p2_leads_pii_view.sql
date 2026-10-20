-- =====================================================================
-- SEC P2 / 1 of 4: leads PII behind the jeton paywall
--
-- SUPERSEDED BY THE LEAD PIPELINE (WP05):
--   20261020150100_lead_pipeline_security.sql replaces leads_for_firms with a
--   security_barrier definer view driven by public.lead_assignments, drops the
--   firm SELECT policy on public.leads and makes the lead-photos bucket
--   private. When that release is applied this file is redundant. The block
--   below detects public.lead_assignments (created by
--   20261020150000_lead_pipeline_schema.sql) and then exits with a NOTICE
--   without touching the view, the grants or the policy, so it can never
--   overwrite the WP05 view. Still, never apply 20261020150100 first and this
--   file afterwards on purpose: use this file only when the lead pipeline
--   files are NOT being released.
--
-- APPLY AFTER / PREREQUISITES:
--   * The P1 files (20261020090000 .. 090400) are applied.
--   * A staging diff of the live view definition against the one below:
--       select pg_get_viewdef('public.leads_for_firms'::regclass, true);
--     The latest view in the repository (20260322150000_admin_lead_approval.sql)
--     dropped photo_urls although FirmaLeadler.tsx and FirmaPanel.tsx expect
--     photo_urls, so the live definition has drifted. Add any live column the
--     firm panel selects (it reads leads_for_firms with select("*")) to the
--     SELECT list. target_firm_id is added automatically when leads has it.
--   * No repository migration builds on public.leads_for_firms. The DROP VIEW
--     below has no CASCADE on purpose: if a live object depends on the view it
--     aborts, so resolve that dependency first instead of dropping it silently.
--   * Verification (as a firm user on staging):
--       select full_name, phone, email from leads;           -- zero rows or permission denied
--       select full_name, phone, email from leads_for_firms; -- masked until a paid lead_purchases row exists
--       an unassigned firm and anon see nothing.
--   * Side effect: dropping the firm SELECT policy on leads also stops Supabase
--     Realtime events on public.leads for firms (src/hooks/useLeadNotifications.ts),
--     so lead alerts in the firm panel must come from polling the view or from
--     the notification dispatcher instead.
--
-- APPLY ORDER:
--   PHASE 2. Do NOT apply together with the P1 files by accident: a blanket
--   `supabase db push` applies every pending file in filename order, so apply
--   this one deliberately and only when the prerequisites below hold.
--
-- Why: policy "Firms can read assigned leads" (20260308141145) lets any
-- assigned firm SELECT full_name/phone/email/address directly from public.leads
-- and bypass the paywall. It existed only because leads_for_firms was created
-- with security_invoker. The view below uses default (definer) semantics and
-- filters rows itself: approved leads, signed-in callers, and only admins or
-- firms the lead was assigned to (assigned_firms holds auth user ids).
-- Contact details are unmasked only for a lead_purchases row with
-- status = 'paid' (the column default); other statuses stay masked.
--
-- ROLLBACK: recreate policy "Firms can read assigned leads" ON public.leads
--   (20260308141145_33e6fb5f-7f4f-4fdf-b82c-7721a97df21f.sql) and the view from
--   20260322150000_admin_lead_approval.sql.
-- =====================================================================

DO $do$
DECLARE
  v_extra_columns text := '';
BEGIN
  IF to_regclass('public.lead_assignments') IS NOT NULL THEN
    RAISE NOTICE 'sec_p2_leads_pii_view skipped: the lead pipeline schema (public.lead_assignments) is present. Access to leads is governed by 20261020150100_lead_pipeline_security.sql, which supersedes this file.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'target_firm_id'
  ) THEN
    v_extra_columns := E',\n  l.target_firm_id';
  END IF;

  EXECUTE 'DROP VIEW IF EXISTS public.leads_for_firms';

  EXECUTE format($view$
    CREATE VIEW public.leads_for_firms AS
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
      l.assigned_firms,
      l.lead_score,
      l.user_id,
      l.project_type,
      l.area_size,
      l.scope,
      l.irrigation_type,
      l.irrigation_system,
      l.water_source,
      l.property_type,
      l.current_condition,
      l.token_price,
      l.price_jeton,
      CASE
        WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid() AND lp.status = 'paid')
        THEN l.address
        ELSE NULL
      END AS address,
      CASE
        WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid() AND lp.status = 'paid')
        THEN l.notes
        ELSE NULL
      END AS notes,
      CASE
        WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid() AND lp.status = 'paid')
        THEN l.photo_urls
        ELSE NULL
      END AS photo_urls,
      CASE
        WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid() AND lp.status = 'paid')
        THEN l.full_name
        ELSE left(split_part(l.full_name, ' ', 1), 1) || '** ' || left(split_part(l.full_name, ' ', 2), 1) || '**'
      END AS full_name,
      CASE
        WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid() AND lp.status = 'paid')
        THEN l.phone
        ELSE left(l.phone, 2) || '** *** **' || right(l.phone, 2)
      END AS phone,
      CASE
        WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid() AND lp.status = 'paid')
        THEN l.email
        ELSE '***@***.com'
      END AS email%s
    FROM public.leads l
    WHERE l.admin_approved = true
      AND auth.uid() IS NOT NULL
      AND (
        public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'firm') AND auth.uid() = ANY(l.assigned_firms))
      )
  $view$, v_extra_columns);

  EXECUTE 'REVOKE ALL ON public.leads_for_firms FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.leads_for_firms TO authenticated';

  EXECUTE 'DROP POLICY IF EXISTS "Firms can read assigned leads" ON public.leads';
END $do$;
