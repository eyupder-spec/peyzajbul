
CREATE OR REPLACE FUNCTION public.notify_firms_on_new_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  firm_record RECORD;
  payload jsonb;
  base_url text := 'https://tfydaaxgaomdvthclcse.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmeWRhYXhnYW9tZHZ0aGNsY3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcxNDcsImV4cCI6MjA4ODU1MzE0N30.VENacbhHGwAxvhv0a_g0Hvrywor5k2PhHKGykY368Qo';
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
          url := base_url || '/functions/v1/notify-telegram',
          body := payload::jsonb,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || anon_key
          )
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
