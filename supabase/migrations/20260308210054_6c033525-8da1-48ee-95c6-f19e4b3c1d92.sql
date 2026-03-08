
ALTER TABLE public.firms ADD COLUMN telegram_chat_id text DEFAULT NULL;

-- Trigger to notify firms via edge function when a new lead is assigned
CREATE OR REPLACE FUNCTION public.notify_firms_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  firm_record RECORD;
  payload jsonb;
BEGIN
  IF NEW.assigned_firms IS NOT NULL AND array_length(NEW.assigned_firms, 1) > 0 THEN
    FOR firm_record IN
      SELECT id, company_name, telegram_chat_id, user_id
      FROM public.firms
      WHERE user_id = ANY(NEW.assigned_firms)
    LOOP
      IF firm_record.telegram_chat_id IS NOT NULL THEN
        payload := jsonb_build_object(
          'chat_id', firm_record.telegram_chat_id,
          'firm_name', firm_record.company_name,
          'service_type', NEW.service_type,
          'city', NEW.city,
          'district', NEW.district,
          'budget', NEW.budget,
          'project_size', NEW.project_size,
          'timeline', NEW.timeline,
          'lead_score', NEW.lead_score
        );
        PERFORM net.http_post(
          url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-telegram',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := payload
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_lead_notify
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_firms_on_new_lead();

-- Enable realtime for leads table
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
