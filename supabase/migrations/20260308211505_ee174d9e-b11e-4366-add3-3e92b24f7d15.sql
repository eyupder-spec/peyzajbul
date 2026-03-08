
CREATE OR REPLACE FUNCTION public.notify_firms_on_new_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  firm_record RECORD;
  payload jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE LOG 'notify_firms_on_new_lead: missing vault secrets';
    RETURN NEW;
  END IF;

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
          url := supabase_url || '/functions/v1/notify-telegram',
          body := payload::jsonb,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          )
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
