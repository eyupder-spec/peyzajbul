-- Yeni kolonlar
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS token_price integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS admin_approved boolean DEFAULT false;

-- Firma lead listesi görünümü (Sadece admin onaylıları getir)
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
  l.token_price,
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
FROM public.leads l
WHERE l.admin_approved = true;

-- ====== TİTREŞİM VE BİLDİRİM (TELEGRAM/WEBHOOK) GÜNCELLEMELERİ ======
-- Telegram ve atama bildirimlerinin (trigger) SADECE admin onayladıktan sonra çalışması için 
-- mevcut trigger'ları silip özel şartlı (WHEN) olarak tekrar ekliyoruz. 
-- PostgreSQL'in eşzamanlı eklenen sütunları hemen görememesi sorununu çözmek için
-- işlem blok (DO $$) içine alarak dinamik olarak oluşturuyoruz.

DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_lead_created_assign_firms ON public.leads;
  EXECUTE '
  CREATE TRIGGER on_lead_created_assign_firms
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    WHEN (NEW.admin_approved = true AND OLD.admin_approved = false)
    EXECUTE FUNCTION assign_leads_to_firms()';

  DROP TRIGGER IF EXISTS on_new_lead_notify ON public.leads;
  EXECUTE '
  CREATE TRIGGER on_new_lead_notify
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    WHEN (NEW.admin_approved = true AND OLD.admin_approved = false)
    EXECUTE FUNCTION notify_firms_on_new_lead()';

  DROP TRIGGER IF EXISTS trg_assign_leads_to_firms ON public.leads;
  EXECUTE '
  CREATE TRIGGER trg_assign_leads_to_firms
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    WHEN (NEW.admin_approved = true AND OLD.admin_approved = false)
    EXECUTE FUNCTION assign_leads_to_firms()';
END $$;

