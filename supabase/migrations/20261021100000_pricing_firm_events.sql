-- =====================================================================
-- Fiyatlandirma (WP07) 1/4: firma profil olaylari
--
--   firm_events              profil goruntuleme ve iletisim tiklamalari (yalnizca hash'li ziyaretci)
--   record_firm_event        SADECE service_role: /api/track ucu cagirir
--   get_firm_event_stats     firma sahibi veya admin: panel istatistikleri
--   admin_firm_event_summary admin: firma bazli ozet (sahiplenme/outreach mesajlari icin)
--   get_founder_slots        herkese acik: Kurucu Uye kalan kontenjan (yalnizca sayi)
--
-- Ek ve tekrar calistirilabilir (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
-- Veri silmez, mevcut kolonlara dokunmaz.
--
-- Gizlilik: visitor_hash ve ip_hash, Next.js ucunda gunluk donen tuzla uretilen 32 hex karakterdir;
-- ham IP ve User-Agent hicbir yerde saklanmaz. Onerilen saklama suresi: 24 ay.
--
-- Sayac sisirmeye karsi iki katman: (1) ayni ziyaretci icin tekrar sayim penceresi ve saatlik tavan
-- (visitor_hash = tuz + gun + IP + User-Agent), (2) User-Agent'a bagli OLMAYAN IP tavani (ip_hash =
-- tuz + gun + IP). Ikincisi olmadan User-Agent metnini her istekte degistiren bir betik sinirsiz
-- "farkli ziyaretci" uretebilirdi. Tavanlar ortak IP (operator CGNAT) arkasindaki gercek ziyaretcileri
-- de kisitlayabilecegi icin bilerek genis tutulmustur; sayilar gosterge niteligindedir, denetlenmis degildir.
--
-- Uygulama sirasi: WP04 (20261020120*) ve WP05 (20261020150*) dosyalarindan sonra.
-- Uygulandiktan sonra Vercel'de SUPABASE_SERVICE_ROLE_KEY (yalnizca sunucu) ve TRACK_SALT
-- tanimlayip yeniden dagitin; o zamana kadar /api/track sessizce 204 doner.
--
-- Rollback: DROP FUNCTION get_founder_slots(integer), admin_firm_event_summary(integer),
--   get_firm_event_stats(uuid, integer), record_firm_event(uuid, text, text, text, text, text, text, text);
--   DROP TABLE public.firm_events;
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) firm_events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('profile_view', 'call_click', 'whatsapp_click', 'quote_click', 'website_click')),
  visitor_hash text NOT NULL,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text
);

-- Tablo ip_hash'ten once olusturulduysa kolon eklenir.
ALTER TABLE public.firm_events ADD COLUMN IF NOT EXISTS ip_hash text;

CREATE INDEX IF NOT EXISTS firm_events_firm_created_idx
  ON public.firm_events (firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS firm_events_dedupe_idx
  ON public.firm_events (firm_id, event_type, visitor_hash, created_at DESC);
-- Saatlik ziyaretci tavani (120 olay) bu indeksle taranir.
CREATE INDEX IF NOT EXISTS firm_events_visitor_created_idx
  ON public.firm_events (visitor_hash, created_at DESC);
-- tracking_since (tum tablonun ilk kaydi) icin
CREATE INDEX IF NOT EXISTS firm_events_created_idx
  ON public.firm_events (created_at);
-- IP tavanlari (saatlik toplam, gunluk firma/tur) bu indeksle taranir.
CREATE INDEX IF NOT EXISTS firm_events_ip_created_idx
  ON public.firm_events (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

ALTER TABLE public.firm_events ENABLE ROW LEVEL SECURITY;

-- Yalnizca SELECT politikasi vardir. INSERT/UPDATE/DELETE politikasi yok: yazma yalnizca
-- record_firm_event (service_role) ile yapilir.
DROP POLICY IF EXISTS "Owners and admins can read firm events" ON public.firm_events;
CREATE POLICY "Owners and admins can read firm events"
ON public.firm_events
FOR SELECT
TO authenticated
USING (
  firm_id IN (SELECT f.id FROM public.firms f WHERE f.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

REVOKE ALL ON public.firm_events FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.firm_events FROM authenticated;
GRANT SELECT ON public.firm_events TO authenticated;

-- ---------------------------------------------------------------------
-- (b) record_firm_event: yalnizca service_role
--   * firma onayli ve aktif olmali
--   * ayni (firma, tur, ziyaretci) icin: profile_view 30 dk, tiklamalar 10 dk tekrar saymaz
--   * ziyaretci basina saatte en fazla 120 olay
--   * IP basina (User-Agent'tan bagimsiz) saatte en fazla 300 olay ve ayni (firma, tur) icin gunde en fazla 30 olay
--   * yalnizca gercekten eklendiyse true doner
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_firm_event(uuid, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.record_firm_event(
  p_firm_id uuid,
  p_event_type text,
  p_visitor_hash text,
  p_source_path text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_ip_hash text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window interval;
BEGIN
  IF p_event_type IS NULL
     OR p_event_type NOT IN ('profile_view', 'call_click', 'whatsapp_click', 'quote_click', 'website_click') THEN
    RETURN false;
  END IF;

  IF p_visitor_hash IS NULL OR p_visitor_hash !~ '^[0-9a-f]{32}$' THEN
    RETURN false;
  END IF;

  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{32}$' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.firms f
    WHERE f.id = p_firm_id AND f.is_approved AND f.is_active
  ) THEN
    RETURN false;
  END IF;

  v_window := CASE WHEN p_event_type = 'profile_view' THEN interval '30 minutes' ELSE interval '10 minutes' END;

  -- Ayni ziyaretcinin es zamanli iki istegi tekrar kontrolunu birlikte gecmesin
  PERFORM pg_advisory_xact_lock(hashtextextended(p_firm_id::text || ':' || p_event_type || ':' || p_visitor_hash, 0));

  IF EXISTS (
    SELECT 1 FROM public.firm_events e
    WHERE e.firm_id = p_firm_id
      AND e.event_type = p_event_type
      AND e.visitor_hash = p_visitor_hash
      AND e.created_at > now() - v_window
  ) THEN
    RETURN false;
  END IF;

  IF (
    SELECT count(*) FROM public.firm_events e
    WHERE e.visitor_hash = p_visitor_hash
      AND e.created_at > now() - interval '1 hour'
  ) >= 120 THEN
    RETURN false;
  END IF;

  -- User-Agent'i degistirerek her istekte yeni bir visitor_hash uretmek ip_hash'i degistirmez.
  -- Kilit, ayni IP'den gelen es zamanli isteklerin tavani birlikte asmasini engeller.
  PERFORM pg_advisory_xact_lock(hashtextextended('ip:' || p_ip_hash, 0));

  IF (
    SELECT count(*) FROM public.firm_events e
    WHERE e.ip_hash = p_ip_hash
      AND e.created_at > now() - interval '1 hour'
  ) >= 300 THEN
    RETURN false;
  END IF;

  IF (
    SELECT count(*) FROM public.firm_events e
    WHERE e.ip_hash = p_ip_hash
      AND e.firm_id = p_firm_id
      AND e.event_type = p_event_type
      AND e.created_at > now() - interval '1 day'
  ) >= 30 THEN
    RETURN false;
  END IF;

  INSERT INTO public.firm_events (firm_id, event_type, visitor_hash, ip_hash, source_path, utm_source, utm_medium, utm_campaign)
  VALUES (
    p_firm_id,
    p_event_type,
    p_visitor_hash,
    p_ip_hash,
    left(p_source_path, 200),
    left(p_utm_source, 64),
    left(p_utm_medium, 64),
    left(p_utm_campaign, 64)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_firm_event(uuid, text, text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_firm_event(uuid, text, text, text, text, text, text, text)
  TO service_role;

-- ---------------------------------------------------------------------
-- (c) get_firm_event_stats: sahip veya admin
-- Gunler Europe/Istanbul takvimine gore gruplanir. current = son p_days gun (bugun dahil),
-- previous = hemen onceki p_days gun. tracking_since tum tablonun ilk kaydidir:
-- sayacin ne zaman basladigini gosterir, firmanin ilk olayini degil.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_firm_event_stats(p_firm_id uuid, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 90);
  v_today date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_start timestamptz;
  v_prev_start timestamptz;
  v_current jsonb;
  v_previous jsonb;
  v_daily jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (
       EXISTS (SELECT 1 FROM public.firms f WHERE f.id = p_firm_id AND f.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin')
     ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_start := ((v_today - (v_days - 1))::timestamp) AT TIME ZONE 'Europe/Istanbul';
  v_prev_start := ((v_today - (2 * v_days - 1))::timestamp) AT TIME ZONE 'Europe/Istanbul';

  SELECT jsonb_build_object(
    'profile_view', count(*) FILTER (WHERE e.event_type = 'profile_view'),
    'call_click', count(*) FILTER (WHERE e.event_type = 'call_click'),
    'whatsapp_click', count(*) FILTER (WHERE e.event_type = 'whatsapp_click'),
    'quote_click', count(*) FILTER (WHERE e.event_type = 'quote_click'),
    'website_click', count(*) FILTER (WHERE e.event_type = 'website_click')
  )
  INTO v_current
  FROM public.firm_events e
  WHERE e.firm_id = p_firm_id AND e.created_at >= v_start;

  SELECT jsonb_build_object(
    'profile_view', count(*) FILTER (WHERE e.event_type = 'profile_view'),
    'call_click', count(*) FILTER (WHERE e.event_type = 'call_click'),
    'whatsapp_click', count(*) FILTER (WHERE e.event_type = 'whatsapp_click'),
    'quote_click', count(*) FILTER (WHERE e.event_type = 'quote_click'),
    'website_click', count(*) FILTER (WHERE e.event_type = 'website_click')
  )
  INTO v_previous
  FROM public.firm_events e
  WHERE e.firm_id = p_firm_id AND e.created_at >= v_prev_start AND e.created_at < v_start;

  WITH days AS (
    SELECT v_today - (v_days - 1) + i AS d
    FROM generate_series(0, v_days - 1) AS i
  ),
  ev AS (
    SELECT (e.created_at AT TIME ZONE 'Europe/Istanbul')::date AS d, e.event_type
    FROM public.firm_events e
    WHERE e.firm_id = p_firm_id AND e.created_at >= v_start
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'd', to_char(days.d, 'YYYY-MM-DD'),
        'profile_view', (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type = 'profile_view'),
        'call_click', (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type = 'call_click'),
        'whatsapp_click', (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type = 'whatsapp_click'),
        'quote_click', (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type = 'quote_click')
      )
      ORDER BY days.d
    ),
    '[]'::jsonb
  )
  INTO v_daily
  FROM days;

  RETURN jsonb_build_object(
    'tracking_since', (SELECT min(e.created_at) FROM public.firm_events e),
    'days', v_days,
    'current', v_current,
    'previous', v_previous,
    'daily', v_daily
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_firm_event_stats(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_firm_event_stats(uuid, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- (d) admin_firm_event_summary: yalnizca admin
-- Sahiplenilmemis firmalara 'sayfaniz N kez goruntulendi' diyebilmek icin (outreach, admin).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_firm_event_summary(p_days integer DEFAULT 30)
RETURNS TABLE (
  firm_id uuid,
  company_name text,
  phone text,
  email text,
  is_claimed boolean,
  profile_views bigint,
  call_clicks bigint,
  whatsapp_clicks bigint,
  quote_clicks bigint,
  website_clicks bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.company_name,
    f.phone,
    f.email,
    coalesce(f.is_claimed, false),
    count(*) FILTER (WHERE e.event_type = 'profile_view'),
    count(*) FILTER (WHERE e.event_type = 'call_click'),
    count(*) FILTER (WHERE e.event_type = 'whatsapp_click'),
    count(*) FILTER (WHERE e.event_type = 'quote_click'),
    count(*) FILTER (WHERE e.event_type = 'website_click')
  FROM public.firm_events e
  JOIN public.firms f ON f.id = e.firm_id
  WHERE e.created_at >= now() - make_interval(days => v_days)
  GROUP BY f.id, f.company_name, f.phone, f.email, f.is_claimed
  ORDER BY count(*) FILTER (WHERE e.event_type = 'profile_view') DESC, f.company_name;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_firm_event_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_firm_event_summary(integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- (e) get_founder_slots: Kurucu Uye kalan kontenjan (yalnizca sayilar)
-- Dolu sayilanlar: plani 'founder' olan ve hala gecerli aboneligi olan firmalar.
-- WP04'un firm_subscriptions tablosu varsa oradan, yoksa firms satirindan sayilir.
-- Bu fonksiyon yalnizca gosterim icindir; gercek kontenjan zorlamasi checkout fonksiyonunda
-- (create-premium-checkout) yapilmalidir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_founder_slots(p_cap integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap integer := greatest(coalesce(p_cap, 25), 0);
  v_taken integer;
BEGIN
  IF to_regclass('public.firm_subscriptions') IS NOT NULL THEN
    SELECT count(*)::integer INTO v_taken
    FROM public.firm_subscriptions fs
    WHERE fs.plan = 'founder'
      AND fs.status IN ('active', 'trialing', 'past_due')
      AND (fs.current_period_end IS NULL OR fs.current_period_end > now());
  ELSE
    SELECT count(*)::integer INTO v_taken
    FROM public.firms f
    WHERE f.subscription_plan = 'founder'
      AND f.is_premium
      AND f.stripe_subscription_id IS NOT NULL
      AND (f.premium_until IS NULL OR f.premium_until > now());
  END IF;

  RETURN jsonb_build_object(
    'cap', v_cap,
    'taken', v_taken,
    'remaining', greatest(v_cap - v_taken, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_founder_slots(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_founder_slots(integer) TO anon, authenticated, service_role;
