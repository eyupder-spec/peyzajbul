-- =====================================================================
-- Claim and outreach engine 1/2: schema (WP06)
--
-- Adds
--   * public.gen_claim_code() and public.firm_claim_codes (one capability code per firm,
--     created by an AFTER INSERT trigger on firms and backfilled for existing rows)
--   * public.firm_outreach     (admin contact log: who was messaged, when, with which result)
--   * public.firm_provenance   (where a listing came from; kept off the anon-readable firms table)
--   * public.claim_otps        (hashed one-time codes for claim, register and login; service role only)
--   * public.claim_otp_events  (one row per code requested for a firm; no personal data, kept for the funnel)
--   * claim_requests columns, CHECKs and unique indexes for the OTP-verified claim flow
-- Removes
--   * policy "Users can insert own claims" (it let any signed-in user insert a pending claim and skip the OTP)
--   * the DB-level WhatsApp broadcasts of 20260313030000_whatsapp_notifications.sql (wrong domain,
--     unsolicited message on every admin bulk insert, every lead sent to every firm in the city)
--
-- The claim code is a separate table and NOT a firms column on purpose: firms is readable by anon
-- through PostgREST, so a column would publish every claim link.
--
-- Apply order: after the 20261020* files, then 20261021120100_claim_rpcs.sql.
-- Idempotent: every statement can be re-run. No firms columns are added or changed, nothing is deleted.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS firms_assign_claim_code ON public.firms;
--   DROP FUNCTION IF EXISTS public.firms_assign_claim_code(), public.claim_ensure_code(uuid), public.gen_claim_code();
--   DROP TABLE IF EXISTS public.claim_otp_events, public.claim_otps, public.firm_provenance, public.firm_outreach,
--     public.firm_claim_codes;
--   ALTER TABLE public.claim_requests DROP CONSTRAINT IF EXISTS claim_requests_status_check, DROP COLUMN ... (columns below);
--   re-create "Users can insert own claims" from 20260308233044 only if the OTP flow is abandoned.
--   Re-creating the WhatsApp triggers is not recommended.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) gen_claim_code(): 10 characters from a 31 character alphabet (no 0, 1, i, l, o)
--     ~49.6 bits. The bytes come from md5(gen_random_uuid()) because the version and variant bits of a
--     raw UUID are fixed; the small modulo bias of byte % 31 is irrelevant for an unguessable URL token.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gen_claim_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_alphabet CONSTANT text := '23456789abcdefghjkmnpqrstuvwxyz';
  v_bytes bytea := decode(md5(gen_random_uuid()::text), 'hex');
  v_code text := '';
  v_i integer;
BEGIN
  FOR v_i IN 0..9 LOOP
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1, 1);
  END LOOP;
  RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------
-- (b) firm_claim_codes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firm_claim_codes (
  firm_id uuid PRIMARY KEY REFERENCES public.firms(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[2-9a-hj-km-np-z]{10}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Returns the firm's code, creating one when missing. Retries a code collision up to 5 times and
-- never raises for it: failing here would block the firm INSERT. A firm without a code is repaired
-- by re-running this migration or calling the function again.
CREATE OR REPLACE FUNCTION public.claim_ensure_code(p_firm uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_try integer := 0;
BEGIN
  SELECT c.code INTO v_code FROM public.firm_claim_codes c WHERE c.firm_id = p_firm;
  IF FOUND THEN
    RETURN v_code;
  END IF;

  LOOP
    v_try := v_try + 1;
    v_code := public.gen_claim_code();
    BEGIN
      INSERT INTO public.firm_claim_codes (firm_id, code) VALUES (p_firm, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- Either another session just created this firm's code, or the generated code collided.
      SELECT c.code INTO v_code FROM public.firm_claim_codes c WHERE c.firm_id = p_firm;
      IF FOUND THEN
        RETURN v_code;
      END IF;
      IF v_try >= 5 THEN
        RAISE WARNING 'claim_ensure_code: no free code for firm % after % tries', p_firm, v_try;
        RETURN NULL;
      END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.firms_assign_claim_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.claim_ensure_code(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS firms_assign_claim_code ON public.firms;
CREATE TRIGGER firms_assign_claim_code
  AFTER INSERT ON public.firms
  FOR EACH ROW
  EXECUTE FUNCTION public.firms_assign_claim_code();

REVOKE ALL ON FUNCTION public.gen_claim_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ensure_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.firms_assign_claim_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gen_claim_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ensure_code(uuid) TO service_role;

-- Backfill: one code per existing firm (369 on the live database).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT f.id
    FROM public.firms f
    WHERE NOT EXISTS (SELECT 1 FROM public.firm_claim_codes c WHERE c.firm_id = f.id)
  LOOP
    PERFORM public.claim_ensure_code(r.id);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- (c) firm_outreach
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firm_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'phone')),
  step text NOT NULL DEFAULT 'manual'
    CHECK (step IN ('day0_intro', 'day3_lead', 'day7_email', 'day10_call', 'day14_breakup', 'manual')),
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'clicked', 'replied', 'claimed', 'not_interested', 'removal_requested',
                      'invalid_number', 'bounced', 'note')),
  segment text CHECK (segment IN ('A', 'B', 'C')),
  message_preview text CHECK (message_preview IS NULL OR char_length(message_preview) <= 2000),
  note text,
  sent_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  claimed_at timestamptz,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS firm_outreach_firm_created_idx ON public.firm_outreach (firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS firm_outreach_status_idx ON public.firm_outreach (status);

-- ---------------------------------------------------------------------
-- (d) firm_provenance: where a listing came from (TL-14), off the public firms table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firm_provenance (
  firm_id uuid PRIMARY KEY REFERENCES public.firms(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('csv', 'crawler', 'manual', 'self_registered')),
  source_url text,
  scraped_at timestamptz,
  imported_by uuid,
  note text
);

-- ---------------------------------------------------------------------
-- (e) claim_otps: only a keyed hash of the code is stored, never the code
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('claim_firm_email', 'claim_whatsapp', 'register', 'login')),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  target_email text NOT NULL,
  code_hash text NOT NULL,
  payload jsonb,
  attempts integer NOT NULL DEFAULT 0,
  ip_hash text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_otps_firm_created_idx ON public.claim_otps (firm_id, created_at);
CREATE INDEX IF NOT EXISTS claim_otps_email_created_idx ON public.claim_otps (target_email, created_at);
CREATE INDEX IF NOT EXISTS claim_otps_ip_created_idx ON public.claim_otps (ip_hash, created_at);

-- One row per code request for a firm, written in the same transaction as the code (claim_otp_issue).
-- claim_otps is trimmed every two days because it holds addresses and registration payloads; this table
-- holds no personal data and survives that trim, so the activation funnel's "firms that asked for a code"
-- is a lasting count and not a rolling 48 hours.
CREATE TABLE IF NOT EXISTS public.claim_otp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('claim_firm_email', 'claim_whatsapp')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_otp_events_firm_idx ON public.claim_otp_events (firm_id);

-- ---------------------------------------------------------------------
-- (f) claim_requests
-- ---------------------------------------------------------------------
ALTER TABLE public.claim_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'claim' CHECK (kind IN ('claim', 'register')),
  ADD COLUMN IF NOT EXISTS verification_method text
    CHECK (verification_method IN ('firm_email', 'whatsapp', 'register_email', 'manual')),
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_code text,
  ADD COLUMN IF NOT EXISTS previous_user_id uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS credit_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ip_hash text;

-- Requests created before the OTP flow stay approvable: the admin vouched for them by hand.
UPDATE public.claim_requests
SET verification_method = 'manual'
WHERE verification_method IS NULL;

-- At most one pending request per (firm, user): older duplicates are rejected, the oldest is kept.
UPDATE public.claim_requests c
SET status = 'rejected',
    rejected_reason = 'tekrar_talep'
FROM (
  SELECT r.id,
         row_number() OVER (PARTITION BY r.firm_id, r.user_id ORDER BY r.created_at, r.id) AS rn
  FROM public.claim_requests r
  WHERE r.status = 'pending'
) d
WHERE c.id = d.id
  AND d.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claim_requests_status_check'
      AND conrelid = 'public.claim_requests'::regclass
  ) THEN
    ALTER TABLE public.claim_requests
      ADD CONSTRAINT claim_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')) NOT VALID;
  END IF;

  BEGIN
    ALTER TABLE public.claim_requests VALIDATE CONSTRAINT claim_requests_status_check;
  EXCEPTION WHEN check_violation THEN
    RAISE WARNING 'claim_requests_status_check could not be validated: rows with an unknown status exist';
  END;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_pending_firm_user_uniq
  ON public.claim_requests (firm_id, user_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_pending_whatsapp_code_uniq
  ON public.claim_requests (whatsapp_code)
  WHERE status = 'pending' AND whatsapp_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS claim_requests_firm_status_idx
  ON public.claim_requests (firm_id, status);

-- ---------------------------------------------------------------------
-- (g) RLS and grants
-- ---------------------------------------------------------------------
ALTER TABLE public.firm_claim_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_otp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage claim codes" ON public.firm_claim_codes;
CREATE POLICY "Admins manage claim codes"
ON public.firm_claim_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage firm outreach" ON public.firm_outreach;
CREATE POLICY "Admins manage firm outreach"
ON public.firm_outreach
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage firm provenance" ON public.firm_provenance;
CREATE POLICY "Admins manage firm provenance"
ON public.firm_provenance
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- claim_otps and claim_otp_events have no policy at all: only the service role (which bypasses RLS) can
-- write them, and the funnel reads claim_otp_events through admin_outreach_funnel().

-- Claim codes are read through admin_outreach_queue() only, never straight from the table.
REVOKE ALL ON public.claim_otps FROM anon, authenticated;
REVOKE ALL ON public.claim_otp_events FROM anon, authenticated;
REVOKE ALL ON public.firm_claim_codes FROM anon, authenticated;
REVOKE ALL ON public.firm_outreach FROM anon;
REVOKE ALL ON public.firm_provenance FROM anon;

GRANT ALL ON public.claim_otps TO service_role;
GRANT ALL ON public.claim_otp_events TO service_role;
GRANT ALL ON public.firm_claim_codes TO service_role;
GRANT ALL ON public.firm_outreach TO service_role;
GRANT ALL ON public.firm_provenance TO service_role;

-- Any signed-in user could insert a pending claim for any firm and skip the e-mail check.
-- Claims are now created by the claim-firm Edge Function (service role) only.
-- "Users can read own claims" and "Admins can manage all claims" stay.
DROP POLICY IF EXISTS "Users can insert own claims" ON public.claim_requests;

-- ---------------------------------------------------------------------
-- (h) Remove the broken DB-level WhatsApp broadcasts. Outreach is now a human sending a wa.me
--     message from the admin tool. Safe to re-run, and safe if WP05 already dropped the lead trigger.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_firm_created_whatsapp ON public.firms;
DROP FUNCTION IF EXISTS public.notify_new_firm_onboarding();
DROP TRIGGER IF EXISTS on_lead_created_whatsapp ON public.leads;
DROP FUNCTION IF EXISTS public.notify_firms_on_lead_whatsapp();

-- ---------------------------------------------------------------------
-- Self-check: fail loudly when the lock-down did not take effect.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('claim_otps', 'claim_otp_events')
  ) THEN
    RAISE EXCEPTION 'claim_schema: claim_otps and claim_otp_events must have no policies';
  END IF;
  IF has_table_privilege('anon', 'public.claim_otps', 'SELECT')
     OR has_table_privilege('authenticated', 'public.claim_otps', 'SELECT')
     OR has_table_privilege('anon', 'public.claim_otp_events', 'SELECT')
     OR has_table_privilege('authenticated', 'public.claim_otp_events', 'SELECT')
     OR has_table_privilege('anon', 'public.firm_claim_codes', 'SELECT')
     OR has_table_privilege('authenticated', 'public.firm_claim_codes', 'SELECT') THEN
    RAISE EXCEPTION 'claim_schema: claim_otps / claim_otp_events / firm_claim_codes are still readable by a client role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'claim_requests' AND policyname = 'Users can insert own claims'
  ) THEN
    RAISE EXCEPTION 'claim_schema: policy "Users can insert own claims" is still present';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.firms f
    LEFT JOIN public.firm_claim_codes c ON c.firm_id = f.id
    WHERE c.firm_id IS NULL
  ) THEN
    RAISE WARNING 'claim_schema: some firms still have no claim code; re-run this migration';
  END IF;
END $$;
