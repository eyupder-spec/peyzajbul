-- =====================================================================
-- Fiyatlandirma (WP07) 3/4: banner sayaci, banner URL kurali, sponsor talepleri
--
--   banner_event_dedupe      ayni ziyaretcinin ayni banner olayini gunde bir kez saymasi icin
--   record_banner_event      SADECE service_role: /api/track ucu cagirir (toplam + gunluk sayac)
--   track_banner_event       anon/authenticated EXECUTE yetkisi KALDIRILIR (anonim sayac sisirme acigi)
--   banners_target_url_https target_url yalnizca https olabilir (NOT VALID: mevcut satirlar bozulmaz)
--   get_my_banner_stats      firmanin kendi bannerlarinin goruntulenme/tiklama raporu
--   sponsor_requests         'Bolge Sponsoru' on rezervasyon talepleri
--
-- Ek ve tekrar calistirilabilir. Davranis degisikligi yalnizca track_banner_event uzerindeki
-- REVOKE'dur: BannerAd ayni surumde /api/track'e gecer, bu yuzden once bu migration'i uygulayin,
-- sonra uygulamayi dagitin.
--
-- Mevcut banner satirlari temizlendikten sonra:
--   ALTER TABLE public.banners VALIDATE CONSTRAINT banners_target_url_https;
--
-- Rollback: DROP TABLE sponsor_requests, banner_event_dedupe; DROP FUNCTION record_banner_event(uuid, text, text, text),
--   get_my_banner_stats(integer); ALTER TABLE banners DROP CONSTRAINT banners_target_url_https;
--   GRANT EXECUTE ON FUNCTION track_banner_event(uuid, text) TO anon, authenticated;
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) banner_event_dedupe
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banner_event_dedupe (
  banner_id uuid NOT NULL REFERENCES public.banners(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click')),
  visitor_hash text NOT NULL,
  day date NOT NULL,
  ip_hash text,
  PRIMARY KEY (banner_id, event_type, visitor_hash, day)
);

-- Tablo ip_hash'ten once olusturulduysa kolon eklenir.
ALTER TABLE public.banner_event_dedupe ADD COLUMN IF NOT EXISTS ip_hash text;

-- IP tavani (User-Agent'tan bagimsiz) bu indeksle taranir.
CREATE INDEX IF NOT EXISTS banner_event_dedupe_ip_day_idx
  ON public.banner_event_dedupe (ip_hash, day)
  WHERE ip_hash IS NOT NULL;

ALTER TABLE public.banner_event_dedupe ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.banner_event_dedupe FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- (b) record_banner_event: ayni (banner, tur, ziyaretci, gun) bir kez sayilir.
-- Toplam ve gunluk sayac mantigi 20260327145800_banners_and_stats.sql'deki track_banner_event
-- ile aynidir; gun, Europe/Istanbul takvimine gore alinir.
-- Ayrica ayni IP (User-Agent'tan bagimsiz ip_hash) ayni banner ve tur icin gunde en fazla 30 kez sayilir:
-- bu tavan olmadan User-Agent'i her istekte degistiren bir betik sinirsiz "farkli ziyaretci" uretebilirdi.
-- Tavan, ortak IP (operator CGNAT) arkasindaki ziyaretcileri de kisitlayabilir; sayilar gosterge niteligindedir.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_banner_event(uuid, text, text);

CREATE OR REPLACE FUNCTION public.record_banner_event(
  p_banner_id uuid,
  p_event_type text,
  p_visitor_hash text,
  p_ip_hash text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_inserted integer;
BEGIN
  IF p_event_type IS NULL OR p_event_type NOT IN ('view', 'click') THEN
    RETURN false;
  END IF;

  IF p_visitor_hash IS NULL OR p_visitor_hash !~ '^[0-9a-f]{32}$' THEN
    RETURN false;
  END IF;

  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{32}$' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.banners b
    WHERE b.id = p_banner_id
      AND b.is_active
      AND now() >= b.start_date
      AND now() <= b.end_date
  ) THEN
    RETURN false;
  END IF;

  -- Kilit, ayni IP'den gelen es zamanli isteklerin tavani birlikte asmasini engeller.
  PERFORM pg_advisory_xact_lock(hashtextextended('banner-ip:' || p_banner_id::text || ':' || p_event_type || ':' || p_ip_hash, 0));

  IF (
    SELECT count(*) FROM public.banner_event_dedupe d
    WHERE d.ip_hash = p_ip_hash
      AND d.day = v_day
      AND d.banner_id = p_banner_id
      AND d.event_type = p_event_type
  ) >= 30 THEN
    RETURN false;
  END IF;

  INSERT INTO public.banner_event_dedupe (banner_id, event_type, visitor_hash, day, ip_hash)
  VALUES (p_banner_id, p_event_type, p_visitor_hash, v_day, p_ip_hash)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN false;
  END IF;

  IF p_event_type = 'view' THEN
    UPDATE public.banners SET total_views = total_views + 1 WHERE id = p_banner_id;
  ELSE
    UPDATE public.banners SET total_clicks = total_clicks + 1 WHERE id = p_banner_id;
  END IF;

  INSERT INTO public.banner_daily_stats (banner_id, date, views, clicks)
  VALUES (
    p_banner_id,
    v_day,
    CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END
  )
  ON CONFLICT (banner_id, date) DO UPDATE
  SET views = public.banner_daily_stats.views + (CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END),
      clicks = public.banner_daily_stats.clicks + (CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_banner_event(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_banner_event(uuid, text, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- (c) track_banner_event: tarayicidan dogrudan cagri kapatilir (sinirsiz sayac sisirme)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.track_banner_event(uuid,text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.track_banner_event(uuid, text) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- (d) banners.target_url yalnizca https
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.banners'::regclass AND conname = 'banners_target_url_https'
  ) THEN
    ALTER TABLE public.banners
      ADD CONSTRAINT banners_target_url_https CHECK (target_url ~* '^https://') NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- (e) get_my_banner_stats: firmanin kendi bannerlari (firms.user_id = auth.uid())
-- views/clicks son p_days gunun gunluk toplamidir; total_* banner omru boyuncadir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_banner_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  banner_id uuid,
  title text,
  placement text,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean,
  views bigint,
  clicks bigint,
  total_views integer,
  total_clicks integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  v_since := (now() AT TIME ZONE 'Europe/Istanbul')::date - (least(greatest(coalesce(p_days, 30), 1), 365) - 1);

  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.placement,
    b.start_date,
    b.end_date,
    b.is_active,
    coalesce(sum(s.views), 0)::bigint,
    coalesce(sum(s.clicks), 0)::bigint,
    b.total_views,
    b.total_clicks
  FROM public.banners b
  JOIN public.firms f ON f.id = b.firm_id AND f.user_id = auth.uid()
  LEFT JOIN public.banner_daily_stats s ON s.banner_id = b.id AND s.date >= v_since
  GROUP BY b.id, b.title, b.placement, b.start_date, b.end_date, b.is_active, b.total_views, b.total_clicks
  ORDER BY b.start_date DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_banner_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_banner_stats(integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- (f) sponsor_requests: Bolge Sponsoru on rezervasyonu (odeme alinmaz)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  city_slug text NOT NULL CHECK (city_slug ~ '^[a-z0-9-]{1,64}$'),
  category_slug text NOT NULL CHECK (category_slug ~ '^[a-z0-9-]{1,64}$'),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'cancelled')),
  note text CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ayni firma ayni slot icin birden fazla 'new' talep acamaz
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_requests_open_slot_uniq
  ON public.sponsor_requests (firm_id, city_slug, category_slug)
  WHERE status = 'new';

CREATE INDEX IF NOT EXISTS sponsor_requests_status_created_idx
  ON public.sponsor_requests (status, created_at DESC);

ALTER TABLE public.sponsor_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sponsor_requests FROM PUBLIC, anon;
REVOKE DELETE, TRUNCATE ON public.sponsor_requests FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sponsor_requests TO authenticated;

DROP POLICY IF EXISTS "Firms can create own sponsor requests" ON public.sponsor_requests;
CREATE POLICY "Firms can create own sponsor requests"
ON public.sponsor_requests
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'new'
  AND firm_id IN (SELECT f.id FROM public.firms f WHERE f.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Firms can read own sponsor requests" ON public.sponsor_requests;
CREATE POLICY "Firms can read own sponsor requests"
ON public.sponsor_requests
FOR SELECT
TO authenticated
USING (firm_id IN (SELECT f.id FROM public.firms f WHERE f.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can read sponsor requests" ON public.sponsor_requests;
CREATE POLICY "Admins can read sponsor requests"
ON public.sponsor_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update sponsor requests" ON public.sponsor_requests;
CREATE POLICY "Admins can update sponsor requests"
ON public.sponsor_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
