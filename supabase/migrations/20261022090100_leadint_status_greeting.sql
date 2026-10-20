-- =====================================================================
-- LEADINT 2/2: get_lead_status also returns id, first_name and routed_at (WP20)
--
-- The homeowner status page (/talep/[id]?t=token) is keyed by the status token only. It now greets the visitor
-- by first name and can show when the lead was delivered, so the RPC returns three more keys:
--   id          the lead id (lets the page show the reference number of the lead the token really belongs to)
--   first_name  the first word of the name the visitor typed; never the surname, phone, e-mail or address
--   routed_at   when the lead reached its first firm; null until that happened
-- Everything else is unchanged from 20261020150200_lead_pipeline_routing.sql: same signature and return type,
-- same token-only access (a missing, short or unknown token returns NULL), same grants.
--
-- Idempotent (CREATE OR REPLACE, grants re-issued). Optional: the page works without the new keys.
-- Apply after 20261020150200_lead_pipeline_routing.sql. This file replaces that definition, so never re-apply
-- the older file after it.
-- ROLLBACK: re-run the get_lead_status block of 20261020150200_lead_pipeline_routing.sql.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_lead_status(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE status_token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', v_lead.id,
    'first_name', nullif(left(split_part(btrim(v_lead.full_name), ' ', 1), 40), ''),
    'created_at', v_lead.created_at,
    'routed_at', v_lead.routed_at,
    'service_type', v_lead.service_type,
    'city', v_lead.city,
    'district', v_lead.district,
    'status', v_lead.status,
    'routing_status', v_lead.routing_status,
    'notified_count', count(*) FILTER (WHERE a.notified_at IS NOT NULL),
    'viewed_count', count(*) FILTER (WHERE a.viewed_at IS NOT NULL),
    'purchased_count', count(*) FILTER (WHERE a.status = 'purchased'),
    'contacted_firms', coalesce(
      jsonb_agg(jsonb_build_object('company_name', f.company_name, 'slug', f.slug) ORDER BY a.purchased_at)
        FILTER (WHERE a.status = 'purchased'),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.lead_assignments a
  JOIN public.firms f ON f.id = a.firm_id
  WHERE a.lead_id = v_lead.id AND a.status <> 'declined';

  -- No assignment rows: the aggregate above still returns one row with zero counts.
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_lead_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_status(text) TO anon, authenticated, service_role;
