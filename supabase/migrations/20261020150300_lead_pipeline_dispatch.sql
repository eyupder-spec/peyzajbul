-- =====================================================================
-- Lead pipeline 4/4: dispatch plumbing, admin RPCs, cron (WP05: CH-06, M08)
--
-- ONE-TIME OPERATOR STEPS (run in the Supabase SQL editor; placeholders only,
-- never commit real values):
--
--   select vault.create_secret('<project base url, https scheme, no trailing slash>', 'EDGE_BASE_URL');
--   select vault.create_secret('<random value, 32+ bytes>', 'DISPATCH_SECRET');
--
-- The DISPATCH_SECRET stored in the Vault must be identical to the
-- DISPATCH_SECRET edge function secret:
--
--   supabase secrets set DISPATCH_SECRET=<same random value>
--
-- Until both Vault secrets exist internal.call_edge() only raises a WARNING and
-- returns NULL: routing still works, and the 5-minute pg_cron sweep plus the
-- fire-and-forget call in verify-otp deliver the queued notifications once the
-- secrets are in place. public.admin_notification_health() reports
-- vault_configured.
--
-- Deploy line (auth is enforced inside each function):
--   supabase functions deploy create-lead send-otp verify-otp dispatch-lead-notifications --no-verify-jwt
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) internal.call_edge: authenticated pg_net call into an edge function
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION internal.call_edge(fn text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base text;
  v_secret text;
  v_request_id bigint;
BEGIN
  BEGIN
    SELECT s.decrypted_secret INTO v_base
    FROM vault.decrypted_secrets s
    WHERE s.name = 'EDGE_BASE_URL'
    ORDER BY s.created_at DESC
    LIMIT 1;

    SELECT s.decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets s
    WHERE s.name = 'DISPATCH_SECRET'
    ORDER BY s.created_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'internal.call_edge: vault is not available (%): %', SQLSTATE, SQLERRM;
    RETURN NULL;
  END;

  IF coalesce(v_base, '') = '' OR coalesce(v_secret, '') = '' THEN
    RAISE WARNING 'internal.call_edge: EDGE_BASE_URL or DISPATCH_SECRET is missing from the Vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base, '/') || '/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    body := payload,
    timeout_milliseconds := 5000
  ) INTO v_request_id;

  RETURN v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'internal.call_edge: request to % failed (%): %', fn, SQLSTATE, SQLERRM;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION internal.call_edge(text, jsonb) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- (b) claim_notification_batch: lock-free queue claim for the dispatcher
-- ---------------------------------------------------------------------
-- A row in 'sending' carries its claim time in next_attempt_at. wa_link rows are not
-- claimed here: the dispatcher fills wa_url and moves them to 'manual_pending'.
CREATE OR REPLACE FUNCTION public.claim_notification_batch(p_limit int DEFAULT 25, p_lead_id uuid DEFAULT NULL)
RETURNS SETOF public.notification_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- A dispatcher that died mid-send leaves rows in 'sending'; give them back to the queue.
  UPDATE public.notification_log
  SET status = 'queued'
  WHERE status = 'sending'
    AND next_attempt_at < now() - interval '10 minutes';

  RETURN QUERY
  WITH picked AS (
    SELECT n.id
    FROM public.notification_log n
    WHERE n.status IN ('queued', 'failed')
      AND n.channel <> 'wa_link'
      AND n.attempts < 5
      AND n.next_attempt_at <= now()
      AND (p_lead_id IS NULL OR n.lead_id = p_lead_id)
    ORDER BY n.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT least(greatest(p_limit, 0), 100)
  ),
  claimed AS (
    UPDATE public.notification_log n
    SET status = 'sending',
        attempts = n.attempts + 1,
        next_attempt_at = now()
    FROM picked
    WHERE n.id = picked.id
    RETURNING n.*
  )
  SELECT * FROM claimed;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_notification_batch(int, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_batch(int, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- (c) Admin RPCs (each one checks the admin role itself)
-- ---------------------------------------------------------------------

-- WhatsApp click-to-chat links waiting for the operator to tap.
CREATE OR REPLACE FUNCTION public.admin_wa_queue(p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  lead_ref text,
  company_name text,
  firm_phone text,
  wa_url text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT n.id, left(n.lead_id::text, 8), f.company_name, f.phone, n.wa_url, n.status, n.created_at
  FROM public.notification_log n
  LEFT JOIN public.firms f ON f.id = n.firm_id
  WHERE n.channel = 'wa_link'
    AND n.status = 'manual_pending'
  ORDER BY n.created_at
  LIMIT least(greatest(p_limit, 1), 200);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_wa_queue(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wa_queue(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_wa_sent(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows int;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.notification_log
  SET status = 'sent', sent_at = now(), sent_by = auth.uid()
  WHERE id = p_id
    AND channel = 'wa_link'
    AND status = 'manual_pending';
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN v_rows > 0;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_mark_wa_sent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_wa_sent(uuid) TO authenticated;

-- Route one approved lead again (for example after a firm claimed its profile).
CREATE OR REPLACE FUNCTION public.admin_requeue_lead(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows int;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.leads
  SET routing_status = 'pending'
  WHERE id = p_lead_id
    AND admin_approved
    AND routing_status <> 'rejected';
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_requeueable');
  END IF;

  RETURN public.route_lead(p_lead_id, true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_requeue_lead(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_requeue_lead(uuid) TO authenticated;

-- Historical backfill: route the approved, verified leads that were created before the pipeline
-- existed (routing_status 'legacy_unrouted'). This notifies firms, so it is run deliberately
-- from the runbook and never automatically.
CREATE OR REPLACE FUNCTION public.admin_requeue_legacy_leads(p_since interval DEFAULT '45 days')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
  v_processed int := 0;
  v_routed int := 0;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  FOR v_id IN
    SELECT l.id
    FROM public.leads l
    WHERE l.routing_status = 'legacy_unrouted'
      AND l.admin_approved
      AND l.status = 'active'
      AND l.email_verified_at IS NOT NULL
      AND l.created_at >= now() - p_since
    ORDER BY l.created_at
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      v_result := public.route_lead(v_id, true);
      IF coalesce((v_result ->> 'assigned')::int, 0) > 0 THEN
        v_routed := v_routed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'admin_requeue_legacy_leads: lead % failed (%): %', v_id, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'routed', v_routed);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_requeue_legacy_leads(interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_requeue_legacy_leads(interval) TO authenticated;

-- Leads whose one-time code was never entered (recent ones only), so they can be recovered by hand.
CREATE OR REPLACE FUNCTION public.admin_unverified_leads()
RETURNS TABLE (
  lead_id uuid,
  created_at timestamptz,
  full_name text,
  email text,
  phone text,
  service_type text,
  city text,
  district text,
  budget text,
  send_count smallint,
  last_sent_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.created_at, l.full_name, l.email, l.phone, l.service_type, l.city, l.district,
         l.budget, o.send_count, o.last_sent_at
  FROM public.leads l
  LEFT JOIN public.lead_otps o ON o.lead_id = l.id
  WHERE l.status = 'unverified'
    AND l.created_at > now() - interval '14 days'
  ORDER BY l.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_unverified_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unverified_leads() TO authenticated;

-- One call for the "is the pipeline alive" question.
CREATE OR REPLACE FUNCTION public.admin_notification_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_vault boolean := false;
  v_queued int;
  v_failed int;
  v_oldest numeric;
  v_last_sent timestamptz;
  v_waiting int;
  v_median numeric;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  BEGIN
    SELECT count(DISTINCT s.name) = 2 INTO v_vault
    FROM vault.secrets s
    WHERE s.name IN ('EDGE_BASE_URL', 'DISPATCH_SECRET');
  EXCEPTION WHEN OTHERS THEN
    v_vault := false;
  END;

  SELECT count(*) INTO v_queued FROM public.notification_log WHERE status = 'queued';

  SELECT count(*) INTO v_failed
  FROM public.notification_log
  WHERE status = 'failed' AND created_at > now() - interval '24 hours';

  SELECT round((extract(epoch FROM (now() - min(created_at))) / 60.0)::numeric, 1) INTO v_oldest
  FROM public.notification_log
  WHERE status = 'queued';

  SELECT max(sent_at) INTO v_last_sent FROM public.notification_log WHERE status = 'sent';

  SELECT count(*) INTO v_waiting FROM public.leads WHERE routing_status = 'waiting_supply';

  SELECT round(
           (percentile_cont(0.5) WITHIN GROUP (
              ORDER BY extract(epoch FROM (first_notified_at - created_at)) / 60.0
           ))::numeric, 1)
  INTO v_median
  FROM public.leads
  WHERE first_notified_at IS NOT NULL
    AND created_at > now() - interval '30 days';

  RETURN jsonb_build_object(
    'vault_configured', coalesce(v_vault, false),
    'queued', v_queued,
    'failed_24h', v_failed,
    'oldest_queued_minutes', v_oldest,
    'last_sent_at', v_last_sent,
    'waiting_supply_leads', v_waiting,
    'median_minutes_submit_to_first_notified', v_median
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_notification_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_notification_health() TO authenticated;

-- ---------------------------------------------------------------------
-- (d) pg_cron (UTC). Skipped when the extension is not installed; re-runnable.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(j.jobid)
    FROM cron.job j
    WHERE j.jobname IN ('lead-dispatch-sweep', 'lead-waiting-supply-retry', 'lead-housekeeping');

    -- Retry queued and failed notifications.
    PERFORM cron.schedule(
      'lead-dispatch-sweep',
      '*/5 * * * *',
      $cron$SELECT internal.call_edge('dispatch-lead-notifications', '{}'::jsonb)$cron$
    );

    -- Fill open slots when a firm claimed its profile after the lead was routed.
    PERFORM cron.schedule(
      'lead-waiting-supply-retry',
      '*/15 * * * *',
      $cron$SELECT public.route_waiting_leads()$cron$
    );

    PERFORM cron.schedule(
      'lead-housekeeping',
      '30 3 * * *',
      $cron$
        DELETE FROM public.lead_otps WHERE last_sent_at < now() - interval '1 day';
        DELETE FROM public.lead_rate_limits WHERE window_start < now() - interval '2 days';
        UPDATE public.leads SET status = 'expired'
        WHERE status = 'unverified' AND created_at < now() - interval '14 days';
      $cron$
    );
  END IF;
END $$;
