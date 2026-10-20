-- =====================================================================
-- Lead pipeline: purchase gate, follow-up to 4/4 (WP05, routing hook for WP04 purchase_lead)
--
-- WP04's purchase_lead() asks public.lead_is_purchasable_by(uid, lead) before it charges coins.
-- That function shipped as a stub that always answers true, so any approved, active firm that
-- learns a lead id (firm panel URLs, wa.me links) could buy a lead that was never routed to it.
-- That defeats claimed-only routing and the assignment-scoped leads_for_firms view.
--
-- From here on a firm may only buy a lead that has a live lead_assignments row for it
-- (public.firm_can_buy_lead, migration 3), whether it was routed by score or requested directly.
--
-- RELEASE COUPLING: apply this in the same release as 20261020150100_lead_pipeline_security.sql, the
-- new lead form and the firm panel that reads leads_for_firms. Until then the old panel lists leads
-- by city, not by assignment, and the old pipeline never creates assignments, so applying this
-- earlier would block every purchase. Leads that predate the pipeline carry routing_status
-- 'legacy_unrouted' and have no assignments: they become purchasable only once they are re-routed
-- on purpose with admin_requeue_legacy_leads('45 days') from the RUNBOOK, which also notifies the
-- matching firms.
--
-- Rollback: CREATE OR REPLACE public.lead_is_purchasable_by again with a body of "SELECT true".
-- =====================================================================

CREATE OR REPLACE FUNCTION public.lead_is_purchasable_by(p_uid uuid, p_lead uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.firm_can_buy_lead(p_uid, p_lead)
$$;

REVOKE ALL ON FUNCTION public.lead_is_purchasable_by(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_is_purchasable_by(uuid, uuid) TO service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.lead_is_purchasable_by(uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.lead_is_purchasable_by(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'lead_purchase_gate: lead_is_purchasable_by must not be executable by anon or authenticated';
  END IF;
END $$;
