-- =====================================================================
-- LEADINT 1/2: lead source and calculator estimate on the lead (WP20)
--
-- Adds two nullable columns to public.leads:
--   lead_source      where the form was opened from (create-lead `kaynak`, e.g. 'calculator', 'hero', 'firm_profile')
--   estimate_token   token of the cost calculator estimate the visitor came from (create-lead `est`, 16 characters)
--
-- Why the token is stored: create-lead receives it before the visitor has proved the e-mail address, and
-- verify-otp links the estimate to the lead only after the code is confirmed
-- (public.link_lead_artifacts, 20261021090000_calc_estimates.sql). The column carries it from one call to the other.
--
-- Idempotent: every statement can be re-run. Additive: no existing column, policy or grant changes.
-- Optional: until this file is applied create-lead stores leads without the two columns and verify-otp skips the
-- estimate link (both log ESTIMATE_COLUMN_MISSING / LEAD_COLUMNS_MISSING), so nothing breaks.
-- Apply after 20261021090000_calc_estimates.sql, before or together with the create-lead / verify-otp deploy.
-- ROLLBACK (manual, loses the values): ALTER TABLE public.leads DROP COLUMN IF EXISTS lead_source, DROP COLUMN IF EXISTS estimate_token;
-- =====================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS estimate_token text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass AND conname = 'leads_lead_source_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_lead_source_check
      CHECK (lead_source IS NULL OR lead_source ~ '^[a-z_]{1,32}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass AND conname = 'leads_estimate_token_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_estimate_token_check
      CHECK (estimate_token IS NULL OR estimate_token ~ '^[a-z0-9]{16}$');
  END IF;
END $$;

COMMENT ON COLUMN public.leads.lead_source IS
  'Where the lead form was opened from (create-lead kaynak): navbar, hero, firm_profile, calculator, ... Null for leads created before this column existed.';
COMMENT ON COLUMN public.leads.estimate_token IS
  'Token of the calculator estimate the visitor came from (public.estimates.token). verify-otp passes it to link_lead_artifacts after the code is confirmed; not a secret, but not shown to firms (leads_for_firms lists its columns explicitly).';
