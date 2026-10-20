-- =====================================================================
-- leads_for_firms view: assigned_firms filtresini ekle
-- Firma, leads_for_firms view'ından yalnızca kendi assigned_firms 
-- array'inde olduğu leadleri görebilir.
-- assigned_firms kolonunda firms.id (UUID) tutulur.
-- Mevcut kullanıcının firma.id'si assigned_firms içinde mi diye kontrol edilir.
-- =====================================================================

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
  -- Sadece satın alındıysa adres göster
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.address
    ELSE NULL
  END AS address,
  -- Sadece satın alındıysa notlar göster
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.notes
    ELSE NULL
  END AS notes,
  -- Sadece satın alındıysa fotoğraflar göster
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.photo_urls
    ELSE NULL
  END AS photo_urls,
  -- İsim maskeleme
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.full_name
    ELSE left(split_part(l.full_name, ' ', 1), 1) || '** ' || left(split_part(l.full_name, ' ', 2), 1) || '**'
  END AS full_name,
  -- Telefon maskeleme
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.phone
    ELSE left(l.phone, 2) || '** *** **' || right(l.phone, 2)
  END AS phone,
  -- Email maskeleme
  CASE
    WHEN l.id IN (SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid())
    THEN l.email
    ELSE '***@***.com'
  END AS email
FROM public.leads l
WHERE
  l.status IN ('active', 'purchased')
  AND (
    -- Satın aldığı leadler her zaman görünsün (purchased olsa bile)
    l.id IN (
      SELECT lp.lead_id FROM public.lead_purchases lp WHERE lp.firm_id = auth.uid()
    )
    OR
    -- assigned_firms içinde bu firmanın id'si var mı?
    -- auth.uid() = user_id, ama assigned_firms firms.id tutuyor
    -- Bu yüzden firms tablosundan id'yi bul
    (SELECT f.id FROM public.firms f WHERE f.user_id = auth.uid() LIMIT 1)
      = ANY(l.assigned_firms)
  );
