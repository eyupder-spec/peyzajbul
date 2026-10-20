
-- Function to notify a new firm on creation (Onboarding/Claim)
CREATE OR REPLACE FUNCTION public.notify_new_firm_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  waha_message text;
  claim_url text := 'https://peyzajrehberi.com/firma/sahiplen/' || NEW.slug; -- Adjust host if needed
BEGIN
  -- Only if not claimed and has a phone
  IF NEW.is_claimed = false AND NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    waha_message := '🌿 PeyzajBul''a Hoş Geldiniz! \n\n' || 
                   NEW.company_name || ' firmanız sisteme eklendi. Profilinizi sahiplenerek yeni müşteri taleplerini (lead) yönetmeye başlamak için tıklayın: \n' || 
                   claim_url;

    payload := jsonb_build_object(
      'phone', NEW.phone,
      'message', waha_message
    );

    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for firm onboarding
DROP TRIGGER IF EXISTS on_firm_created_whatsapp ON public.firms;
CREATE TRIGGER on_firm_created_whatsapp
AFTER INSERT ON public.firms
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_firm_onboarding();


-- Update/Enhance lead notification to include WhatsApp
CREATE OR REPLACE FUNCTION public.notify_firms_on_lead_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  firm_record RECORD;
  payload jsonb;
  waha_message text;
  panel_url text := 'https://peyzajrehberi.com/firma/panel';
  claim_url text;
BEGIN
  -- Find all approved firms in the same city
  FOR firm_record IN
    SELECT company_name, phone, is_claimed, slug
    FROM public.firms
    WHERE city = NEW.city AND is_approved = true AND phone IS NOT NULL AND phone != ''
  LOOP
    IF firm_record.is_claimed = true THEN
      waha_message := '🔔 Yeni Lead Bildirimi! \n\n' || 
                     NEW.city || ' bölgesinde yeni bir ' || NEW.service_type || ' talebi var. \n' ||
                     'Detayları görmek için panele göz atın: ' || panel_url;
    ELSE
      claim_url := 'https://peyzajrehberi.com/firma/sahiplen/' || firm_record.slug;
      waha_message := '🚀 ' || NEW.city || ' bölgesinde Yeni Bir İş Fırsatı! \n\n' || 
                     'Şehrinizde yeni bir peyzaj talebi oluşturuldu. \n' ||
                     'Bu işi kaçırmamak ve detayları görmek için hemen profilinizi sahiplenin: ' || claim_url;
    END IF;

    payload := jsonb_build_object(
      'phone', firm_record.phone,
      'message', waha_message
    );

    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Trigger for lead notification (WhatsApp)
DROP TRIGGER IF EXISTS on_lead_created_whatsapp ON public.leads;
CREATE TRIGGER on_lead_created_whatsapp
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_firms_on_lead_whatsapp();
