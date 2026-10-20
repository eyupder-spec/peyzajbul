-- =====================================================================
-- Lead pipeline 1/4: schema (WP05)
--
-- Additive and idempotent. The live `leads` table has drifted from the
-- migration history (target_firm_id, the 'unverified' status and the anon
-- INSERT policy only exist in production), so every statement is guarded.
--
-- Adds
--   * leads: attribution, routing state, email verification, KVKK evidence,
--     status token, review flags
--   * lead_otps, lead_rate_limits, lead_assignments, notification_log,
--     lead_routing_settings (RLS on, no anon access)
--   * helper functions used by the create-lead / send-otp / verify-otp /
--     dispatch-lead-notifications edge functions
--
-- Apply order: 20261020150000 -> 150100 -> 150200 -> 150300 -> 150400.
-- 150100 (security) and 150400 (purchase gate) are the breaking pair: release
-- them together with the new lead form and the firm panel.
-- Existing leads become routing_status = 'legacy_unrouted' so that nothing
-- is sent to firms when this migration is deployed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) public.leads
-- ---------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS service_slug text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS routing_status text NOT NULL DEFAULT 'legacy_unrouted',
  ADD COLUMN IF NOT EXISTS routed_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS supply_shortfall smallint,
  ADD COLUMN IF NOT EXISTS review_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status_token text
    DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  ADD COLUMN IF NOT EXISTS landing_path text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS client_session_id text,
  ADD COLUMN IF NOT EXISTS first_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS kvkk_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kvkk_version text;

-- Existing rows keep 'legacy_unrouted'; rows created from now on start as 'pending'.
ALTER TABLE public.leads ALTER COLUMN routing_status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass AND conname = 'leads_routing_status_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_routing_status_check
      CHECK (routing_status IN ('pending', 'routed', 'waiting_supply', 'needs_review', 'rejected', 'legacy_unrouted'));
  END IF;
END $$;

-- target_firm_id exists in production only (set by the firm profile lead form).
-- Declare it here; add the foreign key only when this migration creates the column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'target_firm_id'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN target_firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS leads_status_token_key ON public.leads (status_token);

-- The lead is now created before any auth user exists.
ALTER TABLE public.leads ALTER COLUMN user_id DROP NOT NULL;

-- Replace every CHECK constraint that is defined on the status column.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.leads'::regclass
      AND c.contype = 'c'
      AND a.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT %I', r.conname);
  END LOOP;

  ALTER TABLE public.leads
    ADD CONSTRAINT leads_status_check
    CHECK (status IN ('unverified', 'active', 'purchased', 'expired', 'rejected')) NOT VALID;
END $$;

-- Leads that were already active or purchased had their email verified by the old flow.
UPDATE public.leads
SET email_verified_at = created_at
WHERE status IN ('active', 'purchased')
  AND email_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS leads_routing_status_created_idx
  ON public.leads (routing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_dedupe_idx
  ON public.leads (lower(email), service_slug, city, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_utm_source_created_idx
  ON public.leads (utm_source, created_at);
CREATE INDEX IF NOT EXISTS leads_ip_hash_created_idx
  ON public.leads (ip_hash, created_at)
  WHERE ip_hash IS NOT NULL;

-- ---------------------------------------------------------------------
-- (b) New tables (service role only unless a policy below says otherwise)
-- ---------------------------------------------------------------------

-- One OTP row per lead. Only a salted hash of the code is stored.
CREATE TABLE IF NOT EXISTS public.lead_otps (
  lead_id uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  salt text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  send_count smallint NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lead_otps TO service_role;

-- Fixed-window counters. Buckets are salted hashes, never a raw IP, email or phone.
CREATE TABLE IF NOT EXISTS public.lead_rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
ALTER TABLE public.lead_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lead_rate_limits TO service_role;

CREATE INDEX IF NOT EXISTS lead_rate_limits_window_idx ON public.lead_rate_limits (window_start);

-- Which firms a lead was routed to (firm_id is firms.id, not the auth user id).
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  rank smallint,
  score int,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_direct boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'viewed', 'purchased', 'declined', 'expired')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  viewed_at timestamptz,
  purchased_at timestamptz,
  UNIQUE (lead_id, firm_id)
);
CREATE INDEX IF NOT EXISTS lead_assignments_firm_assigned_idx
  ON public.lead_assignments (firm_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS lead_assignments_lead_idx
  ON public.lead_assignments (lead_id);

ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lead_assignments TO authenticated;
GRANT ALL ON public.lead_assignments TO service_role;

DROP POLICY IF EXISTS "Firms can read own assignments" ON public.lead_assignments;
CREATE POLICY "Firms can read own assignments"
ON public.lead_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.firms f
    WHERE f.id = lead_assignments.firm_id AND f.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage lead assignments" ON public.lead_assignments;
CREATE POLICY "Admins manage lead assignments"
ON public.lead_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Firms subscribe to this table for live alerts (leads itself no longer reaches them).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_assignments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Outbound notification queue and audit trail. meta carries ids only, never homeowner data.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.lead_assignments(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  channel text NOT NULL
    CHECK (channel IN ('firm_email', 'firm_telegram', 'admin_digest', 'homeowner_confirm', 'homeowner_update', 'wa_link')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'skipped', 'manual_pending')),
  attempts smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  wa_url text,
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS notification_log_status_next_idx
  ON public.notification_log (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS notification_log_lead_idx
  ON public.notification_log (lead_id);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;

DROP POLICY IF EXISTS "Admins can read notification log" ON public.notification_log;
CREATE POLICY "Admins can read notification log"
ON public.notification_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Single-row routing configuration, editable by admins only.
CREATE TABLE IF NOT EXISTS public.lead_routing_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  max_firms smallint NOT NULL DEFAULT 3 CHECK (max_firms BETWEEN 1 AND 10),
  auto_approve boolean NOT NULL DEFAULT true,
  allow_service_mismatch_fallback boolean NOT NULL DEFAULT false,
  service_match_points int NOT NULL DEFAULT 40,
  generic_service_points int NOT NULL DEFAULT 10,
  district_points int NOT NULL DEFAULT 25,
  premium_points int NOT NULL DEFAULT 10,
  profile_points int NOT NULL DEFAULT 5
);
INSERT INTO public.lead_routing_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.lead_routing_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_routing_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.lead_routing_settings TO authenticated;
GRANT ALL ON public.lead_routing_settings TO service_role;

DROP POLICY IF EXISTS "Admins manage routing settings" ON public.lead_routing_settings;
CREATE POLICY "Admins manage routing settings"
ON public.lead_routing_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- (c) Helper functions. Supabase grants EXECUTE on new functions to anon and
-- authenticated by default, so every one of them is revoked explicitly.
-- ---------------------------------------------------------------------

-- Lower-cased, trimmed, Turkish characters folded to ASCII (matches trNorm in src/lib/leadRouting.ts).
CREATE OR REPLACE FUNCTION public.tr_norm(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT lower(translate(btrim(coalesce(p_text, '')), 'İıŞşĞğÜüÖöÇçÂâÎîÛû', 'iissgguuooccaaiiuu'))
$$;
REVOKE EXECUTE ON FUNCTION public.tr_norm(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tr_norm(text) TO service_role;

-- Fixed-window counter: the caller passes a salted-hash bucket key.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_bucket text, p_window_seconds int, p_max int)
RETURNS TABLE (allowed boolean, hits int, retry_after int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_window timestamptz;
  v_hits int;
BEGIN
  IF p_window_seconds < 1 OR p_max < 1 THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;

  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.lead_rate_limits AS r (bucket, window_start, hits)
  VALUES (p_bucket, v_window, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO v_hits;

  allowed := v_hits <= p_max;
  hits := v_hits;
  retry_after := GREATEST(
    1,
    ceil(extract(epoch FROM (v_window + make_interval(secs => p_window_seconds) - now())))::int
  );
  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, int, int) TO service_role;

-- Replaces the unpaginated auth.admin user listing in verify-otp.
CREATE OR REPLACE FUNCTION public.find_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
  ORDER BY u.created_at
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.find_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_id_by_email(text) TO service_role;

-- True for admins, firm owners and any account with a role other than homeowner.
-- verify-otp never mints a login session for these accounts.
CREATE OR REPLACE FUNCTION public.user_is_privileged(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    coalesce(public.has_role(p_uid, 'admin'), false)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p_uid AND ur.role::text <> 'homeowner')
    OR EXISTS (SELECT 1 FROM public.firms f WHERE f.user_id = p_uid)
$$;
REVOKE EXECUTE ON FUNCTION public.user_is_privileged(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_privileged(uuid) TO service_role;

-- Reserves one verification attempt under a row lock and returns the state of the OTP.
-- verify-otp compares the submitted code only when otp_state = 'ok', so parallel guesses
-- can never evaluate more than p_max_attempts codes.
CREATE OR REPLACE FUNCTION public.lead_otp_register_attempt(p_lead_id uuid, p_max_attempts int DEFAULT 5)
RETURNS TABLE (otp_state text, otp_hash text, otp_salt text, otp_attempts int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.lead_otps%ROWTYPE;
  v_attempts int;
BEGIN
  SELECT * INTO v_row FROM public.lead_otps o WHERE o.lead_id = p_lead_id FOR UPDATE;

  IF NOT FOUND THEN
    otp_state := 'missing';
  ELSIF v_row.consumed_at IS NOT NULL THEN
    otp_state := 'consumed';
  ELSIF v_row.expires_at <= now() THEN
    otp_state := 'expired';
  ELSIF v_row.attempts >= p_max_attempts THEN
    otp_state := 'locked';
    otp_attempts := v_row.attempts;
  ELSE
    UPDATE public.lead_otps o
    SET attempts = o.attempts + 1
    WHERE o.lead_id = p_lead_id
    RETURNING o.attempts INTO v_attempts;

    otp_state := 'ok';
    otp_hash := v_row.code_hash;
    otp_salt := v_row.salt;
    otp_attempts := v_attempts;
  END IF;

  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lead_otp_register_attempt(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_otp_register_attempt(uuid, int) TO service_role;
