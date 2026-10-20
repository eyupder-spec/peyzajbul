-- =====================================================================
-- Lead pipeline 3/4: routing (WP05: M01, W5, M12)
--
-- A verified lead is routed only to claimed, approved, active, non-admin firms
-- through public.lead_assignments. Nothing here sends mail by itself: routing
-- writes notification_log rows and pings the dispatch-lead-notifications edge
-- function through internal.call_edge (migration 4), and a dispatch failure can
-- never roll routing back.
--
-- The TypeScript twin of the scoring below is rankFirmsForLead in
-- src/lib/leadRouting.ts. This file is the source of truth.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) route_lead
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.route_lead(p_lead_id uuid, p_reroute boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_set public.lead_routing_settings%ROWTYPE;
  v_prev_status text;
  v_existing int;
  v_free int;
  v_rank int;
  v_cand record;
  v_assignment_id uuid;
  v_inserted int := 0;
  v_total int;
  v_user_ids uuid[];
  v_flags text[];
  v_notify boolean := false;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_lead.routing_status = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rejected');
  END IF;
  IF v_lead.email_verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_verified');
  END IF;
  IF NOT coalesce(v_lead.admin_approved, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_approved');
  END IF;
  IF v_lead.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active');
  END IF;

  SELECT * INTO v_set FROM public.lead_routing_settings LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.lead_routing_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_set FROM public.lead_routing_settings LIMIT 1;
  END IF;

  v_prev_status := v_lead.routing_status;

  -- A lead that is already fully routed is left alone unless an admin asks for a re-run.
  IF NOT p_reroute AND v_prev_status = 'routed' AND coalesce(v_lead.supply_shortfall, 0) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_routed', 'routing_status', v_prev_status);
  END IF;

  SELECT count(*)::int, coalesce(max(a.rank), 0)::int
  INTO v_existing, v_rank
  FROM public.lead_assignments a
  WHERE a.lead_id = v_lead.id AND a.status <> 'declined';

  v_free := greatest(v_set.max_firms - v_existing, 0);

  -- Informational flag: the homeowner asked for a firm that has not claimed its profile yet.
  -- WP06 uses it as the claim-outreach hook.
  v_flags := coalesce(v_lead.review_flags, '{}');
  IF v_lead.target_firm_id IS NOT NULL
     AND NOT ('target_unclaimed' = ANY (v_flags))
     AND EXISTS (
       SELECT 1 FROM public.firms f
       WHERE f.id = v_lead.target_firm_id AND NOT coalesce(f.is_claimed, false)
     ) THEN
    v_flags := array_append(v_flags, 'target_unclaimed');
  END IF;

  IF v_free > 0 THEN
    FOR v_cand IN
      WITH base AS (
        SELECT
          f.id AS firm_id,
          f.user_id,
          f.telegram_chat_id,
          (v_lead.target_firm_id IS NOT NULL AND f.id = v_lead.target_firm_id) AS is_direct,
          (public.tr_norm(f.city) = public.tr_norm(v_lead.city)) AS city_match,
          EXISTS (
            SELECT 1 FROM unnest(coalesce(f.services, '{}'::text[])) AS s(name)
            WHERE public.tr_norm(s.name) = public.tr_norm(v_lead.service_type)
          ) AS service_exact,
          (coalesce(cardinality(f.services), 0) = 0) AS service_generic,
          (
            f.district IS NOT NULL AND v_lead.district IS NOT NULL
            AND public.tr_norm(f.district) = public.tr_norm(v_lead.district)
          ) AS same_district,
          (coalesce(f.is_premium, false) AND (f.premium_until IS NULL OR f.premium_until > now())) AS premium_active,
          (
            nullif(btrim(coalesce(f.description, '')), '') IS NOT NULL
            AND nullif(btrim(coalesce(f.logo_url, '')), '') IS NOT NULL
          ) AS profile_complete,
          (
            SELECT count(*) FROM public.lead_assignments a
            WHERE a.firm_id = f.id AND a.assigned_at > now() - interval '30 days'
          ) AS recent_30d,
          (SELECT max(a.assigned_at) FROM public.lead_assignments a WHERE a.firm_id = f.id) AS last_assigned
        FROM public.firms f
        WHERE f.is_claimed IS TRUE
          AND f.is_approved IS TRUE
          AND f.is_active IS TRUE
          AND f.user_id IS NOT NULL
          -- The ghost listings created by the old trigger are owned by the admin user id.
          AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur WHERE ur.user_id = f.user_id AND ur.role = 'admin'
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.lead_assignments x WHERE x.lead_id = v_lead.id AND x.firm_id = f.id
          )
      ),
      scored AS (
        SELECT
          b.*,
          (
            CASE
              WHEN b.service_exact THEN v_set.service_match_points
              WHEN b.service_generic THEN v_set.generic_service_points
              ELSE 0
            END
            + CASE WHEN b.same_district THEN v_set.district_points ELSE 0 END
            + CASE WHEN b.premium_active THEN v_set.premium_points ELSE 0 END
            + CASE WHEN b.profile_complete THEN v_set.profile_points ELSE 0 END
          ) AS score,
          to_jsonb(array_remove(ARRAY[
            CASE WHEN b.is_direct THEN 'Size özel' END,
            CASE WHEN b.service_exact THEN 'Hizmet uyumu'
                 WHEN b.service_generic THEN 'Genel hizmet' END,
            CASE WHEN b.same_district THEN 'Aynı ilçe' END,
            CASE WHEN b.premium_active THEN 'Sponsorlu' END,
            CASE WHEN b.profile_complete THEN 'Eksiksiz profil' END
          ], NULL)) AS reasons
        FROM base b
      )
      SELECT s.*
      FROM scored s
      WHERE s.is_direct
         OR (
           s.city_match
           AND (s.service_exact OR s.service_generic OR v_set.allow_service_mismatch_fallback)
         )
      ORDER BY s.is_direct DESC, s.score DESC, s.recent_30d ASC, s.last_assigned ASC NULLS FIRST, random()
      LIMIT v_free
    LOOP
      v_assignment_id := NULL;
      INSERT INTO public.lead_assignments (lead_id, firm_id, rank, score, reasons, is_direct)
      VALUES (v_lead.id, v_cand.firm_id, (v_rank + 1)::smallint, v_cand.score, v_cand.reasons, v_cand.is_direct)
      ON CONFLICT (lead_id, firm_id) DO NOTHING
      RETURNING id INTO v_assignment_id;

      IF v_assignment_id IS NULL THEN
        CONTINUE;
      END IF;

      v_rank := v_rank + 1;
      v_inserted := v_inserted + 1;

      INSERT INTO public.notification_log (dedupe_key, lead_id, assignment_id, firm_id, channel)
      VALUES
        ('lead:' || v_lead.id::text || ':firm:' || v_cand.firm_id::text || ':email',
         v_lead.id, v_assignment_id, v_cand.firm_id, 'firm_email'),
        ('lead:' || v_lead.id::text || ':firm:' || v_cand.firm_id::text || ':wa',
         v_lead.id, v_assignment_id, v_cand.firm_id, 'wa_link')
      ON CONFLICT (dedupe_key) DO NOTHING;

      IF v_cand.telegram_chat_id IS NOT NULL AND btrim(v_cand.telegram_chat_id) <> '' THEN
        INSERT INTO public.notification_log (dedupe_key, lead_id, assignment_id, firm_id, channel)
        VALUES
          ('lead:' || v_lead.id::text || ':firm:' || v_cand.firm_id::text || ':telegram',
           v_lead.id, v_assignment_id, v_cand.firm_id, 'firm_telegram')
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  SELECT count(*)::int INTO v_total
  FROM public.lead_assignments a
  WHERE a.lead_id = v_lead.id AND a.status <> 'declined';

  -- assigned_firms is kept for backwards compatibility only (auth user ids of the routed firms).
  SELECT coalesce(array_agg(f.user_id ORDER BY a.rank), '{}'::uuid[]) INTO v_user_ids
  FROM public.lead_assignments a
  JOIN public.firms f ON f.id = a.firm_id
  WHERE a.lead_id = v_lead.id AND a.status <> 'declined';

  UPDATE public.leads
  SET assigned_firms = v_user_ids,
      routing_status = CASE WHEN v_total >= 1 THEN 'routed' ELSE 'waiting_supply' END,
      supply_shortfall = greatest(v_set.max_firms - v_total, 0)::smallint,
      routed_at = CASE WHEN routed_at IS NULL AND v_total >= 1 THEN now() ELSE routed_at END,
      review_flags = v_flags
  WHERE id = v_lead.id;

  IF v_inserted > 0 THEN
    v_notify := true;
    INSERT INTO public.notification_log (dedupe_key, lead_id, channel, meta)
    VALUES ('lead:' || v_lead.id::text || ':admin:routed:' || v_total::text,
            v_lead.id, 'admin_digest', jsonb_build_object('kind', 'routed'))
    ON CONFLICT (dedupe_key) DO NOTHING;

    -- The homeowner was told "we are looking for a firm"; now there is one.
    IF v_prev_status = 'waiting_supply' THEN
      INSERT INTO public.notification_log (dedupe_key, lead_id, channel)
      VALUES ('lead:' || v_lead.id::text || ':homeowner:update', v_lead.id, 'homeowner_update')
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSIF v_total = 0 AND v_prev_status IS DISTINCT FROM 'waiting_supply' THEN
    v_notify := true;
    INSERT INTO public.notification_log (dedupe_key, lead_id, channel, meta)
    VALUES ('lead:' || v_lead.id::text || ':admin:supply_gap:' || to_char(now(), 'YYYYMMDD'),
            v_lead.id, 'admin_digest', jsonb_build_object('kind', 'supply_gap'))
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  IF v_notify THEN
    -- A dispatch failure (Vault or pg_net not configured) must never undo the routing.
    BEGIN
      PERFORM internal.call_edge('dispatch-lead-notifications', jsonb_build_object('leadId', p_lead_id));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'route_lead: dispatch call failed (%): %', SQLSTATE, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'routing_status', CASE WHEN v_total >= 1 THEN 'routed' ELSE 'waiting_supply' END,
    'assigned', v_inserted,
    'total', v_total,
    'supply_shortfall', greatest(v_set.max_firms - v_total, 0)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.route_lead(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.route_lead(uuid, boolean) TO service_role;

-- ---------------------------------------------------------------------
-- (b) route_waiting_leads: top up leads that could not be fully served
-- ---------------------------------------------------------------------
-- Runs from pg_cron every 15 minutes and can be called by hand after a claim is approved.
-- Returns the number of leads that received at least one new firm.
CREATE OR REPLACE FUNCTION public.route_waiting_leads(p_city text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
  v_count int := 0;
BEGIN
  FOR v_id IN
    SELECT l.id
    FROM public.leads l
    WHERE l.admin_approved
      AND l.status = 'active'
      AND l.email_verified_at IS NOT NULL
      AND (p_city IS NULL OR public.tr_norm(l.city) = public.tr_norm(p_city))
      AND (
        -- no firm yet (older leads are stale and are not sold to a firm that claims later)
        (l.routing_status = 'waiting_supply' AND l.created_at > now() - interval '30 days')
        -- partially served
        OR (l.routing_status = 'routed' AND coalesce(l.supply_shortfall, 0) > 0
            AND l.created_at > now() - interval '14 days')
        -- approved but routing did not complete (safety net for a failed approval trigger)
        OR (l.routing_status IN ('pending', 'needs_review') AND l.created_at > now() - interval '30 days')
      )
    ORDER BY l.created_at
    LIMIT 500
  LOOP
    BEGIN
      v_result := public.route_lead(v_id);
      IF coalesce((v_result ->> 'assigned')::int, 0) > 0 THEN
        v_count := v_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'route_waiting_leads: lead % failed (%): %', v_id, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.route_waiting_leads(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.route_waiting_leads(text) TO service_role;

-- ---------------------------------------------------------------------
-- (c) finalize_verified_lead (called by verify-otp with the service role)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_verified_lead(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_set public.lead_routing_settings%ROWTYPE;
  v_flags text[];
  v_auto boolean;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_lead.status NOT IN ('unverified', 'active', 'purchased') OR v_lead.routing_status = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;

  SELECT * INTO v_set FROM public.lead_routing_settings LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.lead_routing_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_set FROM public.lead_routing_settings LIMIT 1;
  END IF;

  v_flags := coalesce(v_lead.review_flags, '{}');

  IF v_lead.notes IS NOT NULL
     AND v_lead.notes ~* '(https?://|www\.|t\.me/|wa\.me/|whatsapp|telegram|bit\.ly)'
     AND NOT ('suspicious_notes' = ANY (v_flags)) THEN
    v_flags := array_append(v_flags, 'suspicious_notes');
  END IF;

  IF v_lead.ip_hash IS NOT NULL
     AND NOT ('ip_velocity' = ANY (v_flags))
     AND (
       SELECT count(*) FROM public.leads l
       WHERE l.ip_hash = v_lead.ip_hash AND l.created_at > now() - interval '24 hours'
     ) > 2 THEN
    v_flags := array_append(v_flags, 'ip_velocity');
  END IF;

  -- Only the informational 'target_unclaimed' flag may coexist with auto approval.
  v_auto := v_set.auto_approve
            AND cardinality(array_remove(v_flags, 'target_unclaimed')) = 0
            AND NOT coalesce(v_lead.admin_approved, false);

  -- One statement: when admin_approved flips to true the AFTER UPDATE trigger
  -- trg_lead_route_on_approval routes the lead (email_verified_at is set in the same row).
  UPDATE public.leads
  SET email_verified_at = coalesce(email_verified_at, now()),
      status = CASE WHEN status = 'unverified' THEN 'active' ELSE status END,
      review_flags = v_flags,
      admin_approved = CASE WHEN v_auto THEN true ELSE admin_approved END
  WHERE id = p_lead_id;

  IF NOT v_auto AND NOT coalesce(v_lead.admin_approved, false) THEN
    UPDATE public.leads SET routing_status = 'needs_review' WHERE id = p_lead_id;

    INSERT INTO public.notification_log (dedupe_key, lead_id, channel, meta)
    VALUES ('lead:' || p_lead_id::text || ':admin:needs_review', p_lead_id, 'admin_digest',
            jsonb_build_object('kind', 'needs_review'))
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  INSERT INTO public.notification_log (dedupe_key, lead_id, channel)
  VALUES ('lead:' || p_lead_id::text || ':homeowner:confirm', p_lead_id, 'homeowner_confirm')
  ON CONFLICT (dedupe_key) DO NOTHING;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'ok', true,
    'routing_status', v_lead.routing_status,
    'admin_approved', coalesce(v_lead.admin_approved, false)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.finalize_verified_lead(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_verified_lead(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- (d) Manual approval (AdminPanel) and auto approval share one routing path
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_lead_route_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Approval must never fail because routing hit a problem; route_waiting_leads retries it.
  BEGIN
    PERFORM public.route_lead(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_lead_route_on_approval: routing lead % failed (%): %', NEW.id, SQLSTATE, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.trg_lead_route_on_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lead_route_on_approval ON public.leads;
CREATE TRIGGER trg_lead_route_on_approval
  AFTER UPDATE OF admin_approved ON public.leads
  FOR EACH ROW
  WHEN (NEW.admin_approved AND NOT coalesce(OLD.admin_approved, false) AND NEW.email_verified_at IS NOT NULL)
  EXECUTE FUNCTION public.trg_lead_route_on_approval();

-- ---------------------------------------------------------------------
-- (e) Scoring and price
-- ---------------------------------------------------------------------
-- +10 for a verified email is now granted only when the email was actually verified.
-- Phone ownership is NOT verified (no SMS provider): the score must not claim it.
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  score integer := 0;
BEGIN
  -- Project type bonus (commercial = higher value)
  IF NEW.project_type = 'commercial' THEN
    score := score + 10;
  END IF;

  -- Budget scoring (residential and commercial)
  CASE NEW.budget
    WHEN '200000+' THEN score := score + 30;
    WHEN '75000-200000' THEN score := score + 25;
    WHEN '25000-75000' THEN score := score + 15;
    WHEN '25000-alti' THEN score := score + 5;
    WHEN '2000000+' THEN score := score + 30;
    WHEN '750000-2000000' THEN score := score + 25;
    WHEN '250000-750000' THEN score := score + 15;
    WHEN '250000-alti' THEN score := score + 5;
    ELSE score := score + 0;
  END CASE;

  -- Timeline scoring
  CASE NEW.timeline
    WHEN 'hemen' THEN score := score + 25;
    WHEN '1-ay' THEN score := score + 20;
    WHEN '1-3-ay' THEN score := score + 10;
    WHEN '3-6-ay' THEN score := score + 5;
    ELSE score := score + 0;
  END CASE;

  -- Area size scoring (residential and commercial)
  CASE NEW.area_size
    WHEN '1000+' THEN score := score + 20;
    WHEN '500-1000' THEN score := score + 15;
    WHEN '150-500' THEN score := score + 10;
    WHEN '50-150' THEN score := score + 5;
    WHEN '20000+' THEN score := score + 20;
    WHEN '5000-20000' THEN score := score + 15;
    WHEN '1000-5000' THEN score := score + 10;
    WHEN '1000-alti' THEN score := score + 5;
    ELSE score := score + 0;
  END CASE;

  -- Fallback to the old project_size column if area_size is null
  IF NEW.area_size IS NULL AND NEW.project_size IS NOT NULL THEN
    CASE NEW.project_size
      WHEN '1000+' THEN score := score + 20;
      WHEN '500-1000' THEN score := score + 15;
      WHEN '100-500' THEN score := score + 10;
      ELSE score := score + 5;
    END CASE;
  END IF;

  -- Email verified (only once the one-time code was confirmed)
  IF NEW.email_verified_at IS NOT NULL THEN
    score := score + 10;
  END IF;

  -- Phone provided (not verified)
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    score := score + 5;
  END IF;

  NEW.lead_score := score;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.leads'::regclass
      AND NOT t.tgisinternal
      AND t.tgfoid = 'public.calculate_lead_score'::regproc
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.leads', r.tgname);
  END LOOP;
END $$;

CREATE TRIGGER calculate_lead_score_trigger
  BEFORE INSERT OR UPDATE OF email_verified_at, budget, timeline, area_size, notes, photo_urls ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_lead_score();

-- Price in jeton. The previous version matched formatted strings such as '%200.000%' that the form
-- never stores; this one keys off the real slugs. On INSERT token_price (what a firm pays) is set
-- from price_jeton so a client can never choose it.
CREATE OR REPLACE FUNCTION public.calculate_lead_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base numeric;
  v_loc numeric := 1.0;
  v_area numeric := 1.0;
  v_budget numeric := 1.0;
  v_urgency numeric := 1.0;
  v_note_bonus numeric := 0;
  v_photo_bonus numeric := 0;
  v_total numeric;
  v_area_key text;
  tier1_cities text[] := ARRAY['İstanbul', 'İzmir', 'Muğla'];
  tier2_cities text[] := ARRAY['Ankara', 'Antalya', 'Bursa', 'Kocaeli'];
BEGIN
  -- 1. Base price by service
  IF NEW.service_slug IS NOT NULL THEN
    v_base := CASE
      WHEN NEW.service_slug IN ('proje-tasarim-uygulama', 'sadece-uygulama', 'havuz-cevresi', 'havuz-cevresi-ticari') THEN 25
      WHEN NEW.service_slug IN ('bahce-tasarimi', 'sert-zemin', 'otopark-yol') THEN 15
      WHEN NEW.service_slug = 'sulama-sistemi' THEN 10
      ELSE 5
    END;
  ELSIF NEW.service_type ILIKE '%Mimarlığı%' OR NEW.service_type ILIKE '%Havuz%' THEN
    v_base := 25;
  ELSIF NEW.service_type ILIKE '%Tasarım%' OR NEW.service_type ILIKE '%Zemin%' THEN
    v_base := 15;
  ELSIF NEW.service_type ILIKE '%Sulama%' THEN
    v_base := 10;
  ELSE
    v_base := 5;
  END IF;

  -- 2. Location
  IF NEW.city = ANY (tier1_cities) THEN
    v_loc := 1.5;
  ELSIF NEW.city = ANY (tier2_cities) THEN
    v_loc := 1.2;
  END IF;

  -- 3. Area (residential and commercial slugs)
  v_area_key := coalesce(NEW.area_size, NEW.project_size);
  v_area := CASE v_area_key
    WHEN '500-1000' THEN 2.5
    WHEN '1000+' THEN 2.5
    WHEN '5000-20000' THEN 2.5
    WHEN '20000+' THEN 2.5
    WHEN '150-500' THEN 1.7
    WHEN '1000-5000' THEN 1.7
    WHEN '50-150' THEN 1.3
    WHEN '1000-alti' THEN 1.3
    ELSE 1.0
  END;

  -- 4. Budget (residential and commercial slugs)
  v_budget := CASE NEW.budget
    WHEN '200000+' THEN 2.0
    WHEN '2000000+' THEN 2.0
    WHEN '750000-2000000' THEN 2.0
    WHEN '75000-200000' THEN 1.5
    WHEN '250000-750000' THEN 1.5
    WHEN 'bilmiyorum' THEN 0.8
    WHEN 'teklif-sonrasi' THEN 0.8
    ELSE 1.0
  END;

  -- 5. Urgency
  IF NEW.timeline = 'hemen' THEN
    v_urgency := 1.2;
  END IF;

  -- 6. Quality add-ons
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 50 THEN
    v_note_bonus := 5;
  END IF;
  IF NEW.photo_urls IS NOT NULL AND coalesce(array_length(NEW.photo_urls, 1), 0) > 0 THEN
    v_photo_bonus := 5;
  END IF;

  -- 7. Total, clamped to 5..55 jeton
  v_total := v_base * v_loc * v_area * v_budget * v_urgency + v_note_bonus + v_photo_bonus;
  NEW.price_jeton := least(55, greatest(5, round(v_total)))::integer;

  -- token_price follows the computed price unless an admin set a different one by hand.
  IF TG_OP = 'INSERT' THEN
    NEW.token_price := NEW.price_jeton;
  ELSIF NEW.token_price IS NOT DISTINCT FROM OLD.token_price
        AND OLD.token_price IS NOT DISTINCT FROM OLD.price_jeton THEN
    NEW.token_price := NEW.price_jeton;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.leads'::regclass
      AND NOT t.tgisinternal
      AND t.tgfoid = 'public.calculate_lead_price'::regproc
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.leads', r.tgname);
  END LOOP;
END $$;

CREATE TRIGGER trigger_calculate_lead_price
  BEFORE INSERT OR UPDATE OF service_type, service_slug, city, project_size, area_size, budget, timeline, notes, photo_urls
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_lead_price();

-- ---------------------------------------------------------------------
-- (f) Public and firm RPCs
-- ---------------------------------------------------------------------

-- Backend of the homeowner status page /talep/[token]. No personal data and no
-- names of firms that did not buy the lead.
CREATE OR REPLACE FUNCTION public.get_lead_status(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE status_token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'created_at', v_lead.created_at,
    'service_type', v_lead.service_type,
    'city', v_lead.city,
    'district', v_lead.district,
    'status', v_lead.status,
    'routing_status', v_lead.routing_status,
    'notified_count', count(*) FILTER (WHERE a.notified_at IS NOT NULL),
    'viewed_count', count(*) FILTER (WHERE a.viewed_at IS NOT NULL),
    'purchased_count', count(*) FILTER (WHERE a.status = 'purchased'),
    'contacted_firms', coalesce(
      jsonb_agg(jsonb_build_object('company_name', f.company_name, 'slug', f.slug) ORDER BY a.purchased_at)
        FILTER (WHERE a.status = 'purchased'),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.lead_assignments a
  JOIN public.firms f ON f.id = a.firm_id
  WHERE a.lead_id = v_lead.id AND a.status <> 'declined';

  -- No assignment rows: the aggregate above still returns one row with zero counts.
  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_lead_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_status(text) TO anon, authenticated, service_role;

-- A firm opening a lead marks its own assignment as viewed (idempotent).
CREATE OR REPLACE FUNCTION public.mark_assignment_viewed(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.lead_assignments a
  SET viewed_at = coalesce(a.viewed_at, now()),
      status = CASE WHEN a.status = 'assigned' THEN 'viewed' ELSE a.status END
  FROM public.firms f
  WHERE a.lead_id = p_lead_id
    AND a.firm_id = f.id
    AND f.user_id = auth.uid()
    AND (a.viewed_at IS NULL OR a.status = 'assigned');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_assignment_viewed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_assignment_viewed(uuid) TO authenticated, service_role;

-- spend-coins must call this before charging: only a firm the lead was routed to may buy it.
CREATE OR REPLACE FUNCTION public.firm_can_buy_lead(p_user_id uuid, p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lead_assignments a
    JOIN public.firms f ON f.id = a.firm_id
    JOIN public.leads l ON l.id = a.lead_id
    WHERE a.lead_id = p_lead_id
      AND f.user_id = p_user_id
      AND a.status NOT IN ('declined', 'expired')
      AND l.admin_approved
      AND l.status IN ('active', 'purchased')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.firm_can_buy_lead(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.firm_can_buy_lead(uuid, uuid) TO service_role;

-- Unclaimed approved firms in the lead's city, for the operator's claim-outreach links.
-- Same city normalisation as route_lead; firms with a mobile number come first.
CREATE OR REPLACE FUNCTION public.unclaimed_firms_for_lead(p_lead_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE (firm_id uuid, company_name text, phone text, slug text, district text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT f.id, f.company_name, f.phone, f.slug, f.district
  FROM public.leads l
  JOIN public.firms f ON public.tr_norm(f.city) = public.tr_norm(l.city)
  WHERE l.id = p_lead_id
    AND NOT coalesce(f.is_claimed, false)
    AND f.is_approved IS TRUE
    AND f.is_active IS TRUE
    AND nullif(btrim(coalesce(f.phone, '')), '') IS NOT NULL
    AND f.slug IS NOT NULL
  ORDER BY
    (regexp_replace(coalesce(f.phone, ''), '[^0-9]', '', 'g') ~ '^(0090|90|0)?5[0-9]{9}$') DESC,
    (l.district IS NOT NULL AND f.district IS NOT NULL
       AND public.tr_norm(f.district) = public.tr_norm(l.district)) DESC,
    coalesce(f.is_premium, false) DESC,
    f.company_name
  LIMIT greatest(p_limit, 0)
$$;
REVOKE EXECUTE ON FUNCTION public.unclaimed_firms_for_lead(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unclaimed_firms_for_lead(uuid, int) TO service_role;
