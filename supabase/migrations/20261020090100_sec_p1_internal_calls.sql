-- =====================================================================
-- SEC P1 / 2 of 5: rate limiting and authenticated database -> Edge Function calls
--
-- APPLY ORDER:
--   Apply together with the other *_sec_p1_* files, in filename order.
--   Deploy the Edge Functions first (they call edge_rate_limit_hit and fail
--   open with a warning until this file is applied).
--
-- PREREQUISITES:
--   * Vault secrets, created once in the SQL editor with the same values that
--     are set as Edge Function secrets (never commit them):
--       select vault.create_secret('<project url>',            'SUPABASE_URL');
--       select vault.create_secret('<project anon key>',       'SUPABASE_ANON_KEY');
--       select vault.create_secret('<INTERNAL_FUNCTION_SECRET>', 'INTERNAL_FUNCTION_SECRET');
--     Until they exist invoke_internal_function() logs a warning and does
--     nothing, so no lead update ever fails because of a notification.
--   * pg_net (extension "pg_net", schema net) for net.http_post.
--   * Idempotent: every statement can be re-run.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.edge_rate_limit_hit(text, integer, integer);
--   DROP TABLE IF EXISTS public.edge_rate_limits;
--   DROP FUNCTION IF EXISTS public.invoke_internal_function(text, jsonb);
--   notify_firms_on_new_lead(): restore from 20260309000353_def5f822-396b-48a1-a9bb-150d633021da.sql
--     (that definition posts to a different Supabase project, do not restore it on purpose).
--   notify_new_firm_onboarding(): restore from 20260313030000_whatsapp_notifications.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- (a) Fixed-window rate limiter used by the Edge Functions (_shared/auth.ts rateLimit),
--     and send-otp.
--     Returns true while the key is within its limit for the current window and
--     false once it is exceeded. Windows are aligned to the epoch and must not
--     exceed 2 days (rows older than 2 days are purged opportunistically).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.edge_rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_hits integer;
BEGIN
  IF p_key IS NULL OR p_limit IS NULL OR p_limit < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 172800 THEN
    RAISE EXCEPTION 'edge_rate_limit_hit: invalid arguments' USING ERRCODE = '22023';
  END IF;

  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.edge_rate_limits AS r (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO v_hits;

  IF random() < 0.02 THEN
    DELETE FROM public.edge_rate_limits WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN v_hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.edge_rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_hit(text, integer, integer) TO service_role;


-- ---------------------------------------------------------------------
-- (b) Authenticated call from the database to an Edge Function.
--     Sends the anon key as the Bearer token (satisfies the default
--     verify_jwt gateway check) and the shared secret in x-internal-secret
--     (checked by requireServiceSecret in the function). It never raises:
--     a failed notification must not roll back the statement that fired it.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoke_internal_function(p_function text, p_body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_anon_key text;
  v_secret text;
BEGIN
  IF p_function IS NULL OR p_function !~ '^[a-z0-9-]+$' THEN
    RAISE WARNING 'invoke_internal_function: invalid function name';
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'INTERNAL_FUNCTION_SECRET' LIMIT 1;

  IF v_url IS NULL OR v_anon_key IS NULL OR v_secret IS NULL THEN
    RAISE WARNING 'invoke_internal_function(%): Vault secrets SUPABASE_URL, SUPABASE_ANON_KEY and INTERNAL_FUNCTION_SECRET are required', p_function;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/' || p_function,
    body := p_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key,
      'x-internal-secret', v_secret
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_internal_function(%) failed: %', p_function, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_internal_function(text, jsonb) FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------------------
-- (c) Telegram notification for newly approved leads.
--     Trigger on_new_lead_notify (20260322150000) stays bound to this
--     function. The previous definition (20260309000353) hardcoded the URL of a
--     different Supabase project and an anon JWT, so lead data and Telegram
--     chat ids were POSTed to another project and never reached this one.
--     This body contains no URL or key literals.
--     Note: Telegram messages that never arrived before will start arriving.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_firms_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
          'project_type', COALESCE(NEW.project_type, ''),
          'service_type', NEW.service_type,
          'city', NEW.city,
          'district', NEW.district,
          'budget', NEW.budget,
          'area_size', COALESCE(NEW.area_size, NEW.project_size),
          'timeline', NEW.timeline,
          'lead_score', NEW.lead_score
        );
        PERFORM public.invoke_internal_function('notify-telegram', payload);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- (d) Onboarding WhatsApp for newly created firms.
--     Body copied verbatim from 20260313030000_whatsapp_notifications.sql with
--     one guard prepended: a self-registered firm (a signed-in non-admin) can
--     no longer make the platform send a WhatsApp message to an arbitrary phone
--     number with an attacker-chosen company_name/slug (phishing relay).
--     notify_firms_on_lead_whatsapp() is intentionally untouched; the lead
--     notification dispatcher replaces it.
-- ---------------------------------------------------------------------
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
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

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
