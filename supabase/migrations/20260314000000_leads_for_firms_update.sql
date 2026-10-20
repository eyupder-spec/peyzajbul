-- Update leads_for_firms view to include all new lead form columns
DROP VIEW IF EXISTS public.leads_for_firms CASCADE;
CREATE VIEW public.leads_for_firms
WITH (security_invoker = on) AS
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
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.address
    ELSE NULL
  END AS address,
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.notes
    ELSE NULL
  END AS notes,
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.full_name
    ELSE left(split_part(l.full_name, ' ', 1), 1) || '** ' || left(split_part(l.full_name, ' ', 2), 1) || '**'
  END AS full_name,
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.phone
    ELSE left(l.phone, 2) || '** *** **' || right(l.phone, 2)
  END AS phone,
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.email
    ELSE '***@***.com'
  END AS email
FROM public.leads l;
