-- =====================================================================
-- Claim and outreach engine 2/2: RPCs (WP06)
--
-- Requires 20261021120000_claim_schema.sql. Every function is SECURITY DEFINER with a fixed
-- search_path. Grants are explicit: each function is first revoked from PUBLIC, anon and
-- authenticated, then granted only to the roles listed here.
--
--   anon + authenticated   claim_preview, claim_log_click
--   service_role only      claim_user_id_by_email, claim_find_firm_by_phone, claim_apply_ownership,
--                          claim_revoke_ownership, claim_otp_issue, claim_otp_attempt
--                          (called by the claim-firm and approve-claim Edge Functions)
--   authenticated, admin   outreach_completeness, admin_outreach_queue, admin_outreach_funnel,
--                          admin_log_outreach (each raises 42501 'forbidden' for a non-admin)
--   internal helpers       claim_norm_text, claim_mask_email, claim_mask_phone, claim_resolve_firm,
--                          outreach_segment (no client grant; only the definer functions call them)
--
-- No firms columns change. grant_coins is NOT called from SQL: the Edge Function does it, so these
-- files apply even if the money migrations are late.
--
-- ROLLBACK: DROP FUNCTION IF EXISTS for every function named above (signatures are in the REVOKE block).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------

-- Lower-cases and folds Turkish letters so city and name comparisons ignore case and diacritics.
CREATE OR REPLACE FUNCTION public.claim_norm_text(p_text text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(translate(COALESCE(p_text, ''), 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc'))
$$;

-- 'info@firma.com' -> 'i***@firma.com'
CREATE OR REPLACE FUNCTION public.claim_mask_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_email IS NULL OR position('@' IN p_email) < 2 THEN NULL
    ELSE left(p_email, 1) || '***' || substr(p_email, position('@' IN p_email))
  END
$$;

-- '0532 123 45 42' -> '05** *** ** 42'; anything that is not an 11 digit national number gives NULL.
CREATE OR REPLACE FUNCTION public.claim_mask_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits text := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
BEGIN
  IF length(v_digits) = 12 AND left(v_digits, 2) = '90' THEN
    v_digits := '0' || substr(v_digits, 3);
  ELSIF length(v_digits) = 10 THEN
    v_digits := '0' || v_digits;
  END IF;
  IF length(v_digits) <> 11 THEN
    RETURN NULL;
  END IF;
  RETURN left(v_digits, 2) || '** *** ** ' || right(v_digits, 2);
END;
$$;

-- Segment thresholds live here so they can be tuned without a deploy.
-- A = priority city AND completeness >= 65; B = priority city OR completeness >= 40; C = the rest.
CREATE OR REPLACE FUNCTION public.outreach_segment(p_city text, p_completeness integer)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.claim_norm_text(p_city) IN ('ankara', 'antalya', 'istanbul', 'izmir', 'bursa')
         AND p_completeness >= 65 THEN 'A'
    WHEN public.claim_norm_text(p_city) IN ('ankara', 'antalya', 'istanbul', 'izmir', 'bursa')
         OR p_completeness >= 40 THEN 'B'
    ELSE 'C'
  END
$$;

-- Firm id for a claim code or a firm id; NULL when the code is malformed or unknown.
CREATE OR REPLACE FUNCTION public.claim_resolve_firm(p_code text, p_firm_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_code IS NOT NULL THEN
    IF p_code !~ '^[2-9a-hj-km-np-z]{10}$' THEN
      RETURN NULL;
    END IF;
    SELECT c.firm_id INTO v_id FROM public.firm_claim_codes c WHERE c.code = p_code;
    RETURN v_id;
  END IF;
  RETURN p_firm_id;
END;
$$;

-- ---------------------------------------------------------------------
-- (a) Public: preview and click log
-- ---------------------------------------------------------------------

-- Never returns the full phone, the full e-mail or the claim code.
CREATE OR REPLACE FUNCTION public.claim_preview(p_code text DEFAULT NULL, p_firm_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := public.claim_resolve_firm(p_code, p_firm_id);
  v_firm public.firms%ROWTYPE;
BEGIN
  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_firm FROM public.firms f WHERE f.id = v_id AND f.is_active AND f.is_approved;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'firm_id', v_firm.id,
    'company_name', v_firm.company_name,
    'city', v_firm.city,
    'district', v_firm.district,
    'slug', v_firm.slug,
    'logo_url', v_firm.logo_url,
    'services_count', COALESCE(cardinality(v_firm.services), 0),
    'is_claimed', v_firm.is_claimed,
    'has_email', btrim(COALESCE(v_firm.email, '')) <> '',
    'email_hint', public.claim_mask_email(NULLIF(btrim(COALESCE(v_firm.email, '')), '')),
    'phone_hint', public.claim_mask_phone(v_firm.phone)
  );
END;
$$;

-- Called by the browser after hydration, never by the server render, so link-preview crawlers
-- (WhatsApp, facebookexternalhit) do not create false clicks. No-op for claimed firms.
CREATE OR REPLACE FUNCTION public.claim_log_click(p_code text DEFAULT NULL, p_firm_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := public.claim_resolve_firm(p_code, p_firm_id);
  v_row uuid;
BEGIN
  IF v_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.firms f WHERE f.id = v_id AND f.is_claimed) THEN
    RETURN;
  END IF;

  SELECT o.id INTO v_row
  FROM public.firm_outreach o
  WHERE o.firm_id = v_id
    AND o.sent_at IS NOT NULL
    AND o.clicked_at IS NULL
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.firm_outreach
  SET clicked_at = now(),
      status = CASE WHEN status = 'sent' THEN 'clicked' ELSE status END
  WHERE id = v_row
    AND clicked_at IS NULL;
END;
$$;

-- ---------------------------------------------------------------------
-- (b) Service role: ownership transfer, used by the Edge Functions
-- ---------------------------------------------------------------------

-- supabase-js 2.x has no lookup by e-mail, so the Edge Function asks the database.
CREATE OR REPLACE FUNCTION public.claim_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id FROM auth.users u WHERE lower(u.email) = lower(btrim(p_email)) LIMIT 1
$$;

-- Duplicate-listing check for self-registration: the active firm whose phone ends in the same 10 digits,
-- a live listing (is_approved) before a pending application. is_approved is what tells the caller whether
-- the match has a profile page to send the applicant to (claim_preview hides unapproved firms) or is an
-- application that is still waiting for review. Taken-down firms (is_active = false) are ignored: a new
-- application for the same number is reviewed by an admin anyway.
DROP FUNCTION IF EXISTS public.claim_find_firm_by_phone(text);
CREATE FUNCTION public.claim_find_firm_by_phone(p_phone text)
RETURNS TABLE (firm_id uuid, is_approved boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.is_approved
  FROM public.firms f
  WHERE f.is_active
    AND length(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')) >= 10
    AND right(regexp_replace(COALESCE(f.phone, ''), '\D', '', 'g'), 10)
        = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
  ORDER BY f.is_approved DESC, f.created_at
  LIMIT 1
$$;

-- Decides whether another one-time code may be sent and, if so, stores it, in ONE transaction. The send
-- limits are checked against rows that parallel requests could not have hidden: the three locks below
-- (address, firm, ip hash) make count-then-insert atomic, so N simultaneous requests for one address or
-- firm pass one at a time and the cooldown, the hourly caps and the daily cap hold under concurrency.
-- The limits come from the caller (SEND_LIMITS in claim-firm/otp.ts), the code only arrives as a keyed hash.
--   allowed:  {allowed: true, id}
--   refused:  {allowed: false, reason: cooldown | firm_hour | firm_day | email_hour | ip_hour, retry_after}
-- A claim code for a firm also appends a claim_otp_events row (the lasting funnel count, see the schema file).
CREATE OR REPLACE FUNCTION public.claim_otp_issue(
  p_purpose text,
  p_firm_id uuid,
  p_target_email text,
  p_code_hash text,
  p_payload jsonb,
  p_ip_hash text,
  p_expires_at timestamptz,
  p_cooldown_seconds integer,
  p_firm_per_hour integer,
  p_firm_per_day integer,
  p_email_per_hour integer,
  p_ip_per_hour integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz;
  v_last timestamptz;
  v_id uuid;
BEGIN
  -- Fixed lock order (address, firm, ip) so two issuers can never wait for each other. Transaction-level
  -- locks: they are released when this call commits.
  PERFORM pg_advisory_xact_lock(hashtext('claim_otp:email:' || p_target_email));
  IF p_firm_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('claim_otp:firm:' || p_firm_id::text));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('claim_otp:ip:' || COALESCE(p_ip_hash, '')));

  -- Taken after the locks, so a request that waited stamps its row later than the one it waited for.
  v_now := clock_timestamp();

  SELECT max(o.created_at) INTO v_last
  FROM public.claim_otps o
  WHERE o.purpose = p_purpose
    AND o.target_email = p_target_email
    AND o.firm_id IS NOT DISTINCT FROM p_firm_id;

  IF v_last IS NOT NULL AND v_now - v_last < make_interval(secs => p_cooldown_seconds) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retry_after', GREATEST(1, ceil(p_cooldown_seconds - extract(epoch FROM (v_now - v_last)))::integer)
    );
  END IF;

  IF p_firm_id IS NOT NULL THEN
    IF (SELECT count(*) FROM public.claim_otps o
        WHERE o.firm_id = p_firm_id AND o.created_at >= v_now - interval '1 hour') >= p_firm_per_hour THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'firm_hour', 'retry_after', 3600);
    END IF;
    IF (SELECT count(*) FROM public.claim_otps o
        WHERE o.firm_id = p_firm_id AND o.created_at >= v_now - interval '24 hours') >= p_firm_per_day THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'firm_day', 'retry_after', 86400);
    END IF;
  END IF;

  IF (SELECT count(*) FROM public.claim_otps o
      WHERE o.target_email = p_target_email AND o.created_at >= v_now - interval '1 hour') >= p_email_per_hour THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'email_hour', 'retry_after', 3600);
  END IF;

  IF (SELECT count(*) FROM public.claim_otps o
      WHERE o.ip_hash = p_ip_hash AND o.created_at >= v_now - interval '1 hour') >= p_ip_per_hour THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ip_hour', 'retry_after', 3600);
  END IF;

  INSERT INTO public.claim_otps
    (purpose, firm_id, target_email, code_hash, payload, ip_hash, expires_at, created_at)
  VALUES
    (p_purpose, p_firm_id, p_target_email, p_code_hash, NULLIF(p_payload, 'null'::jsonb), p_ip_hash, p_expires_at, v_now)
  RETURNING id INTO v_id;

  IF p_firm_id IS NOT NULL AND p_purpose IN ('claim_firm_email', 'claim_whatsapp') THEN
    INSERT INTO public.claim_otp_events (firm_id, purpose, created_at)
    VALUES (p_firm_id, p_purpose, v_now);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'id', v_id);
END;
$$;

-- Atomically spends one of the 5 guesses of an OTP row. Returns the attempt number (1..p_max), or
-- NULL when the row is consumed, expired or already out of attempts. One statement, so parallel
-- requests can never test more than p_max codes against one row.
CREATE OR REPLACE FUNCTION public.claim_otp_attempt(p_id uuid, p_max integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts integer;
BEGIN
  UPDATE public.claim_otps
  SET attempts = attempts + 1
  WHERE id = p_id
    AND consumed_at IS NULL
    AND expires_at > now()
    AND attempts < p_max
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts;
END;
$$;

-- Approves a pending claim: moves ownership, grants the 'firm' role, closes competing claims and
-- stamps the outreach log, all in one transaction. firms.phone and firms.email are never overwritten
-- (the e-mail is only filled when the firm has none), so a claimant cannot redirect public contact data.
-- Errors (SQLSTATE P0001): claim_not_found, claim_not_pending, already_claimed, user_has_firm, firm_not_found.
CREATE OR REPLACE FUNCTION public.claim_apply_ownership(p_claim_id uuid, p_approved_by uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.claim_requests%ROWTYPE;
  v_previous uuid;
  v_rows integer;
BEGIN
  SELECT * INTO v_claim FROM public.claim_requests WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_claim.status = 'approved' THEN
    RETURN jsonb_build_object('already', true, 'firm_id', v_claim.firm_id, 'user_id', v_claim.user_id);
  END IF;
  IF v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'claim_not_pending' USING ERRCODE = 'P0001';
  END IF;

  -- The firm panel and the login check read the owner with .single(): one firm per user. Any other firm
  -- the claimant owns counts, a claimed one and also a pending self-registration (kind 'register': not
  -- approved, not claimed yet). The unclaimed listings still held by an admin account (the seeded
  -- directory) never count; the role is read from user_roles because has_role() only answers for the
  -- caller's own uid and this runs as the service role. The lock serialises one user's claims, so two of
  -- them cannot both pass the check before either has committed.
  PERFORM pg_advisory_xact_lock(hashtext('claim_user:' || v_claim.user_id::text));
  IF EXISTS (
    SELECT 1 FROM public.firms f
    WHERE f.user_id = v_claim.user_id
      AND f.id <> v_claim.firm_id
      AND (
        f.is_claimed
        OR NOT EXISTS (
          SELECT 1 FROM public.user_roles ur WHERE ur.user_id = f.user_id AND ur.role = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'user_has_firm' USING ERRCODE = 'P0001';
  END IF;

  IF v_claim.kind = 'register' THEN
    UPDATE public.firms
    SET is_approved = true,
        is_claimed = true
    WHERE id = v_claim.firm_id
      AND user_id = v_claim.user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'firm_not_found' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT f.user_id INTO v_previous FROM public.firms f WHERE f.id = v_claim.firm_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'firm_not_found' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.firms
    SET user_id = v_claim.user_id,
        is_claimed = true,
        email = CASE
                  WHEN btrim(COALESCE(email, '')) = '' AND btrim(COALESCE(v_claim.email, '')) <> ''
                    THEN btrim(v_claim.email)
                  ELSE email
                END
    WHERE id = v_claim.firm_id
      AND is_claimed = false;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_claim.user_id, 'firm')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.claim_requests
  SET status = 'approved',
      approved_at = now(),
      approved_by = p_approved_by,
      previous_user_id = COALESCE(v_previous, previous_user_id)
  WHERE id = p_claim_id;

  UPDATE public.claim_requests
  SET status = 'rejected',
      rejected_reason = 'diger_talep_onaylandi'
  WHERE firm_id = v_claim.firm_id
    AND status = 'pending'
    AND id <> p_claim_id;

  UPDATE public.firm_outreach
  SET claimed_at = now(),
      status = 'claimed'
  WHERE id = (
    SELECT o.id
    FROM public.firm_outreach o
    WHERE o.firm_id = v_claim.firm_id
      AND o.sent_at IS NOT NULL
    ORDER BY o.created_at DESC
    LIMIT 1
  );

  RETURN jsonb_build_object(
    'already', false,
    'firm_id', v_claim.firm_id,
    'user_id', v_claim.user_id,
    'kind', v_claim.kind
  );
END;
$$;

-- Dispute handling: hands the firm back to the previous owner and removes the 'firm' role when the
-- claimant owns no other claimed firm. Errors: claim_not_found, claim_not_approved.
CREATE OR REPLACE FUNCTION public.claim_revoke_ownership(p_claim_id uuid, p_admin uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.claim_requests%ROWTYPE;
  v_restored boolean := false;
BEGIN
  SELECT * INTO v_claim FROM public.claim_requests WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_claim.status <> 'approved' THEN
    RAISE EXCEPTION 'claim_not_approved' USING ERRCODE = 'P0001';
  END IF;

  IF v_claim.kind = 'register' THEN
    -- A self-registered listing has no earlier owner: take it offline instead.
    UPDATE public.firms
    SET is_claimed = false,
        is_approved = false
    WHERE id = v_claim.firm_id
      AND user_id = v_claim.user_id;
    v_restored := FOUND;
  ELSE
    -- Legacy approvals have no previous_user_id; the owner is then left for the admin to fix by hand.
    UPDATE public.firms
    SET user_id = COALESCE(v_claim.previous_user_id, user_id),
        is_claimed = false
    WHERE id = v_claim.firm_id
      AND user_id = v_claim.user_id;
    v_restored := FOUND AND v_claim.previous_user_id IS NOT NULL;
  END IF;

  DELETE FROM public.user_roles ur
  WHERE ur.user_id = v_claim.user_id
    AND ur.role = 'firm'
    AND NOT EXISTS (
      SELECT 1 FROM public.firms f
      WHERE f.user_id = v_claim.user_id
        AND f.id <> v_claim.firm_id
        AND f.is_claimed
    );

  UPDATE public.claim_requests
  SET status = 'revoked',
      rejected_reason = NULLIF(left(btrim(COALESCE(p_reason, '')), 200), ''),
      approved_by = COALESCE(p_admin, approved_by)
  WHERE id = p_claim_id;

  RETURN jsonb_build_object('firm_id', v_claim.firm_id, 'owner_restored', v_restored);
END;
$$;

-- ---------------------------------------------------------------------
-- (c) Admin only: outreach queue, funnel and log
-- ---------------------------------------------------------------------

-- Profile completeness 0-100: description >= 80 chars 25, website 20, e-mail 20, >= 3 services 15,
-- address 10, logo 10.
CREATE OR REPLACE FUNCTION public.outreach_completeness(firm public.firms)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF char_length(btrim(COALESCE(firm.description, ''))) >= 80 THEN v_score := v_score + 25; END IF;
  IF btrim(COALESCE(firm.website, '')) <> '' THEN v_score := v_score + 20; END IF;
  IF btrim(COALESCE(firm.email, '')) <> '' THEN v_score := v_score + 20; END IF;
  IF COALESCE(cardinality(firm.services), 0) >= 3 THEN v_score := v_score + 15; END IF;
  IF btrim(COALESCE(firm.address, '')) <> '' THEN v_score := v_score + 10; END IF;
  IF btrim(COALESCE(firm.logo_url, '')) <> '' THEN v_score := v_score + 10; END IF;
  RETURN v_score;
END;
$$;

-- One row per listed firm (is_approved) with its outreach state.
--   next_step: day0_intro -> day3_lead (+3 d) -> day7_email (+7 d) -> day10_call (+10 d) -> day14_breakup (+14 d),
--     measured from the first day0_intro send (else the first step send; a never-contacted firm is due now).
--     Steps that cannot be performed are skipped: WhatsApp steps need a valid mobile number that was not
--     flagged invalid_number, day7_email needs an e-mail address, day10_call always works. day3_lead is a
--     message about a real lead, so it needs one (a verified lead of the last 30 days in the firm's city, or
--     one that asked for this very firm) and is dropped once a later step was done: without a lead the
--     sequence goes on to day7_email / day10_call instead of waiting on it indefinitely.
--     No next_step once the firm is claimed, paid, opted out or marked not_interested.
--   p_state: never_contacted | contacted | clicked | replied | claimed | paid | opted_out | due
--     (never_contacted excludes claimed and opted-out firms; due = contacted, next step overdue)
CREATE OR REPLACE FUNCTION public.admin_outreach_queue(
  p_segment text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  firm_id uuid,
  company_name text,
  city text,
  district text,
  phone text,
  email text,
  slug text,
  claim_code text,
  is_claimed boolean,
  completeness integer,
  has_mobile boolean,
  has_email boolean,
  segment text,
  last_step text,
  last_status text,
  last_sent_at timestamptz,
  contact_count integer,
  clicked_at timestamptz,
  next_step text,
  next_due_at timestamptz,
  paid boolean,
  opted_out boolean,
  views_30d integer,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 1000);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_city text := public.claim_norm_text(btrim(COALESCE(p_city, '')));
  v_search text := public.claim_norm_text(btrim(COALESCE(p_search, '')));
  v_search_digits text := regexp_replace(COALESCE(p_search, ''), '\D', '', 'g');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT o.firm_id AS fid,
           (count(*) FILTER (WHERE o.sent_at IS NOT NULL))::integer AS n_sent,
           min(o.sent_at) FILTER (WHERE o.step = 'day0_intro') AS day0_at,
           min(o.sent_at) FILTER (WHERE o.step <> 'manual') AS first_step_at,
           max(o.sent_at) AS last_at,
           max(o.clicked_at) AS click_at,
           bool_or(o.replied_at IS NOT NULL) AS did_reply,
           bool_or(o.status = 'removal_requested') AS did_remove,
           bool_or(o.status = 'not_interested') AS not_interested,
           bool_or(o.status = 'invalid_number') AS invalid_number,
           array_agg(DISTINCT o.step) FILTER (WHERE o.sent_at IS NOT NULL AND o.step <> 'manual') AS done_steps
    FROM public.firm_outreach o
    GROUP BY o.firm_id
  ),
  latest AS (
    SELECT DISTINCT ON (o.firm_id) o.firm_id AS fid, o.status AS last_status
    FROM public.firm_outreach o
    ORDER BY o.firm_id, o.created_at DESC
  ),
  latest_sent AS (
    SELECT DISTINCT ON (o.firm_id) o.firm_id AS fid, o.step AS last_step
    FROM public.firm_outreach o
    WHERE o.sent_at IS NOT NULL
    ORDER BY o.firm_id, o.sent_at DESC
  ),
  -- Real demand of the last 30 days, the same leads the admin screen offers for day3_lead (verified leads only).
  -- target_firm_id (lead pipeline migrations) is read through to_jsonb so this still runs without that column.
  recent_leads AS (
    SELECT public.claim_norm_text(l.city) AS city_key,
           to_jsonb(l) ->> 'target_firm_id' AS target_firm
    FROM public.leads l
    WHERE l.status IN ('active', 'purchased', 'expired')
      AND l.created_at > now() - interval '30 days'
  ),
  base AS (
    SELECT f.id AS fid,
           f.company_name AS f_name,
           f.city AS f_city,
           f.district AS f_district,
           f.phone AS f_phone,
           f.email AS f_email,
           f.slug AS f_slug,
           cc.code AS f_code,
           f.is_claimed AS f_claimed,
           public.outreach_completeness(f) AS comp,
           (regexp_replace(COALESCE(f.phone, ''), '\D', '', 'g') ~ '^(90|0)?5[0-9]{9}$'
              AND NOT COALESCE(a.invalid_number, false)) AS f_mobile,
           (btrim(COALESCE(f.email, '')) <> '') AS f_mail,
           (EXISTS (SELECT 1 FROM public.coin_transactions t WHERE t.firm_id = f.id AND t.type = 'purchase')
              OR COALESCE(f.is_premium AND f.premium_until > now(), false)) AS f_paid,
           (COALESCE(a.did_remove, false) OR NOT f.is_active) AS f_opted,
           EXISTS (
             SELECT 1 FROM recent_leads rl
             WHERE rl.city_key = public.claim_norm_text(f.city) OR rl.target_firm = f.id::text
           ) AS f_lead,
           COALESCE(a.not_interested, false) AS f_notint,
           COALESCE(a.n_sent, 0) AS f_contacts,
           a.day0_at,
           a.first_step_at,
           a.last_at,
           a.click_at,
           COALESCE(a.did_reply, false) AS f_replied,
           COALESCE(a.done_steps, ARRAY[]::text[]) AS f_done
    FROM public.firms f
    LEFT JOIN public.firm_claim_codes cc ON cc.firm_id = f.id
    LEFT JOIN agg a ON a.fid = f.id
    WHERE f.is_approved
  ),
  enriched AS (
    SELECT b.*,
           public.outreach_segment(b.f_city, b.comp) AS seg,
           l.last_status AS l_status,
           ls.last_step AS l_step,
           n.next_step AS n_step,
           n.next_due_at AS n_due
    FROM base b
    LEFT JOIN latest l ON l.fid = b.fid
    LEFT JOIN latest_sent ls ON ls.fid = b.fid
    LEFT JOIN LATERAL (
      SELECT s.step AS next_step,
             CASE
               WHEN b.f_contacts = 0 THEN now()
               ELSE COALESCE(b.day0_at, b.first_step_at, now()) + make_interval(days => s.off_days)
             END AS next_due_at
      FROM (VALUES
        ('day0_intro', 1, 0, 'mobile'),
        ('day3_lead', 2, 3, 'mobile'),
        ('day7_email', 3, 7, 'email'),
        ('day10_call', 4, 10, 'phone'),
        ('day14_breakup', 5, 14, 'mobile')
      ) AS s(step, ord, off_days, via)
      WHERE NOT b.f_claimed
        AND NOT b.f_paid
        AND NOT b.f_opted
        AND NOT b.f_notint
        AND (s.via = 'phone'
             OR (s.via = 'mobile' AND b.f_mobile)
             OR (s.via = 'email' AND b.f_mail))
        AND NOT (s.step = ANY (b.f_done))
        AND (s.step <> 'day3_lead'
             OR (b.f_lead AND NOT (b.f_done && ARRAY['day7_email', 'day10_call', 'day14_breakup']::text[])))
      ORDER BY s.ord
      LIMIT 1
    ) n ON true
  ),
  filtered AS (
    SELECT e.*
    FROM enriched e
    WHERE (COALESCE(p_segment, '') = '' OR e.seg = p_segment)
      AND (v_city = '' OR public.claim_norm_text(e.f_city) = v_city)
      AND (v_search = ''
           OR strpos(public.claim_norm_text(e.f_name), v_search) > 0
           OR (v_search_digits <> '' AND regexp_replace(COALESCE(e.f_phone, ''), '\D', '', 'g') LIKE '%' || v_search_digits || '%'))
      AND CASE COALESCE(p_state, '')
            WHEN 'never_contacted' THEN e.f_contacts = 0 AND NOT e.f_claimed AND NOT e.f_opted
            WHEN 'contacted' THEN e.f_contacts > 0
            WHEN 'clicked' THEN e.click_at IS NOT NULL
            WHEN 'replied' THEN e.f_replied
            WHEN 'claimed' THEN e.f_claimed
            WHEN 'paid' THEN e.f_paid
            WHEN 'opted_out' THEN e.f_opted
            WHEN 'due' THEN e.f_contacts > 0 AND e.n_step IS NOT NULL AND e.n_due <= now()
            ELSE true
          END
  )
  SELECT x.fid,
         x.f_name,
         x.f_city,
         x.f_district,
         x.f_phone,
         x.f_email,
         x.f_slug,
         x.f_code,
         x.f_claimed,
         x.comp,
         x.f_mobile,
         x.f_mail,
         x.seg,
         x.l_step,
         x.l_status,
         x.last_at,
         x.f_contacts,
         x.click_at,
         x.n_step,
         x.n_due,
         x.f_paid,
         x.f_opted,
         NULL::integer,
         count(*) OVER ()
  FROM filtered x
  ORDER BY CASE x.seg WHEN 'A' THEN 1 WHEN 'B' THEN 2 ELSE 3 END, x.comp DESC, x.f_name
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

-- Funnel counts over the listed (is_approved) firms. Every number is a direct count, not an estimate.
-- organic_claims = claimed firms that were never actually contacted (a sent outreach row).
-- otp_started = firms that ever asked for a claim code, from claim_otp_events (claim_otps is trimmed every two days).
-- first_lead_bought: lead_purchases.firm_id holds the owner's user id while coin_transactions.firm_id holds
-- firms.id, so both are matched; the user id only counts for claimed firms (seeded firms share the admin's id).
CREATE OR REPLACE FUNCTION public.admin_outreach_funnel()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH listed AS (
    SELECT f.id, f.user_id, f.phone, f.email, f.is_claimed, f.is_premium, f.premium_until
    FROM public.firms f
    WHERE f.is_approved
  ),
  paid_firms AS (
    SELECT l.id
    FROM listed l
    WHERE EXISTS (SELECT 1 FROM public.coin_transactions t WHERE t.firm_id = l.id AND t.type = 'purchase')
       OR COALESCE(l.is_premium AND l.premium_until > now(), false)
  ),
  claimed_firms AS (
    SELECT DISTINCT r.firm_id
    FROM public.claim_requests r
    WHERE r.kind = 'claim' AND r.status = 'approved'
  )
  SELECT jsonb_build_object(
    'listed', (SELECT count(*) FROM listed),
    'with_mobile', (SELECT count(*) FROM listed l WHERE regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') ~ '^(90|0)?5[0-9]{9}$'),
    'with_email', (SELECT count(*) FROM listed l WHERE btrim(COALESCE(l.email, '')) <> ''),
    'contacted', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o JOIN listed l ON l.id = o.firm_id WHERE o.sent_at IS NOT NULL),
    'replied', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o JOIN listed l ON l.id = o.firm_id WHERE o.replied_at IS NOT NULL),
    'clicked', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o JOIN listed l ON l.id = o.firm_id WHERE o.clicked_at IS NOT NULL),
    'otp_started', (SELECT count(DISTINCT e.firm_id) FROM public.claim_otp_events e),
    'claimed', (SELECT count(*) FROM claimed_firms),
    'organic_claims', (
      SELECT count(*) FROM claimed_firms cf
      WHERE NOT EXISTS (SELECT 1 FROM public.firm_outreach o WHERE o.firm_id = cf.firm_id AND o.sent_at IS NOT NULL)
    ),
    'paid', (SELECT count(*) FROM paid_firms),
    'first_lead_bought', (
      SELECT count(*) FROM listed l
      WHERE EXISTS (
        SELECT 1 FROM public.lead_purchases lp
        WHERE lp.firm_id = l.id OR (l.is_claimed AND lp.firm_id = l.user_id)
      )
    ),
    'by_channel', (
      SELECT jsonb_object_agg(ch.channel, jsonb_build_object(
        'sent', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o WHERE o.channel = ch.channel AND o.sent_at IS NOT NULL),
        'clicked', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o WHERE o.channel = ch.channel AND o.clicked_at IS NOT NULL),
        'claimed', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o WHERE o.channel = ch.channel AND o.claimed_at IS NOT NULL)
      ))
      FROM (VALUES ('whatsapp'), ('email'), ('phone')) AS ch(channel)
    ),
    'by_segment', (
      SELECT jsonb_object_agg(sg.segment, jsonb_build_object(
        'contacted', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o WHERE o.segment = sg.segment AND o.sent_at IS NOT NULL),
        'claimed', (SELECT count(DISTINCT o.firm_id) FROM public.firm_outreach o WHERE o.segment = sg.segment AND o.claimed_at IS NOT NULL)
      ))
      FROM (VALUES ('A'), ('B'), ('C')) AS sg(segment)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Records what the admin did by hand. Opening a wa.me link logs nothing; the admin presses
-- 'Gönderildi' afterwards.
--   sent                 inserts a row (segment computed now) and ignores an identical firm+channel+step
--                        repeated within 60 seconds
--   replied              stamps replied_at on the latest row
--   not_interested | invalid_number | bounced | removal_requested
--                        set the status of the latest row
--   note                 appends the note to the latest row and keeps its status
--   Without an earlier row, a non-'sent' event inserts one (sent_at stays NULL).
--   removal_requested ALSO sets firms.is_active = false so the profile leaves /firmalar, /firma/[slug]
--   and the firm sitemap the same day.
CREATE OR REPLACE FUNCTION public.admin_log_outreach(
  p_firm_id uuid,
  p_event text,
  p_channel text DEFAULT 'whatsapp',
  p_step text DEFAULT 'manual',
  p_message text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm public.firms%ROWTYPE;
  v_id uuid;
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_event IS NULL OR p_event NOT IN
     ('sent', 'replied', 'not_interested', 'removal_requested', 'invalid_number', 'bounced', 'note') THEN
    RAISE EXCEPTION 'invalid_event' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_firm FROM public.firms WHERE id = p_firm_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'firm_not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Serialises double clicks on the same firm so the 60 second de-dupe cannot be raced.
  PERFORM pg_advisory_xact_lock(hashtext('firm_outreach:' || p_firm_id::text));

  IF p_event = 'sent' THEN
    SELECT o.id INTO v_id
    FROM public.firm_outreach o
    WHERE o.firm_id = p_firm_id
      AND o.channel = p_channel
      AND o.step = p_step
      AND o.sent_at > now() - interval '60 seconds'
    ORDER BY o.sent_at DESC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;

    INSERT INTO public.firm_outreach
      (firm_id, channel, step, status, segment, message_preview, note, sent_at, sent_by)
    VALUES
      (p_firm_id, p_channel, p_step, 'sent',
       public.outreach_segment(v_firm.city, public.outreach_completeness(v_firm)),
       left(p_message, 2000), v_note, now(), auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  SELECT o.id INTO v_id
  FROM public.firm_outreach o
  WHERE o.firm_id = p_firm_id
  ORDER BY o.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    INSERT INTO public.firm_outreach
      (firm_id, channel, step, status, segment, note, replied_at, sent_by)
    VALUES
      (p_firm_id, p_channel, p_step, p_event,
       public.outreach_segment(v_firm.city, public.outreach_completeness(v_firm)),
       v_note, CASE WHEN p_event = 'replied' THEN now() END, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.firm_outreach
    SET status = CASE WHEN p_event = 'note' THEN status ELSE p_event END,
        replied_at = CASE WHEN p_event = 'replied' THEN COALESCE(replied_at, now()) ELSE replied_at END,
        note = CASE
                 WHEN v_note IS NULL THEN note
                 WHEN note IS NULL OR note = '' THEN v_note
                 ELSE note || E'\n' || v_note
               END
    WHERE id = v_id;
  END IF;

  IF p_event = 'removal_requested' THEN
    UPDATE public.firms SET is_active = false WHERE id = p_firm_id;
  END IF;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.claim_norm_text(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_mask_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_mask_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outreach_segment(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_resolve_firm(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_preview(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_log_click(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_find_firm_by_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_otp_issue(text, uuid, text, text, jsonb, text, timestamptz, integer, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_otp_attempt(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_apply_ownership(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_revoke_ownership(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outreach_completeness(public.firms) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_outreach_queue(text, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_outreach_funnel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_log_outreach(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_preview(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_log_click(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_user_id_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_find_firm_by_phone(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_otp_issue(text, uuid, text, text, jsonb, text, timestamptz, integer, integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_otp_attempt(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_apply_ownership(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_revoke_ownership(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.outreach_completeness(public.firms) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_outreach_queue(text, text, text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_outreach_funnel() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_log_outreach(uuid, text, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- Self-check: a wrong grant fails the migration instead of shipping.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_fn text;
  v_service_only text[] := ARRAY[
    'public.claim_user_id_by_email(text)',
    'public.claim_find_firm_by_phone(text)',
    'public.claim_otp_issue(text,uuid,text,text,jsonb,text,timestamptz,integer,integer,integer,integer,integer)',
    'public.claim_otp_attempt(uuid,integer)',
    'public.claim_apply_ownership(uuid,uuid)',
    'public.claim_revoke_ownership(uuid,uuid,text)',
    'public.claim_norm_text(text)',
    'public.claim_mask_email(text)',
    'public.claim_mask_phone(text)',
    'public.outreach_segment(text,integer)',
    'public.claim_resolve_firm(text,uuid)'
  ];
  v_admin_only text[] := ARRAY[
    'public.outreach_completeness(public.firms)',
    'public.admin_outreach_queue(text,text,text,text,integer,integer)',
    'public.admin_outreach_funnel()',
    'public.admin_log_outreach(uuid,text,text,text,text,text)'
  ];
BEGIN
  FOREACH v_fn IN ARRAY v_service_only LOOP
    IF has_function_privilege('anon', v_fn, 'EXECUTE') OR has_function_privilege('authenticated', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'claim_rpcs: % must not be executable by anon or authenticated', v_fn;
    END IF;
  END LOOP;

  FOREACH v_fn IN ARRAY v_admin_only LOOP
    IF has_function_privilege('anon', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'claim_rpcs: % must not be executable by anon', v_fn;
    END IF;
  END LOOP;

  IF NOT has_function_privilege('anon', 'public.claim_preview(text,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.claim_log_click(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'claim_rpcs: claim_preview and claim_log_click must be executable by anon';
  END IF;
END $$;
