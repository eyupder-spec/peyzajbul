-- Secure view: masks sensitive fields for unpurchased leads
-- Firms only see full contact info after purchasing
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
  l.address,
  l.status,
  l.assigned_firms,
  l.lead_score,
  l.user_id,
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