-- =====================================================================
-- CALC: maliyet hesaplayici tahminleri
--
-- Neler eklenir (additive, mevcut hicbir tablo degistirilmez):
--   public.estimates                  hesaplayici tahminleri (CTA tiklandiginda save_estimate ile yazilir)
--   public.save_estimate(...)         anon + authenticated
--   public.link_lead_artifacts(...)   yalnizca service_role (create-lead, OTP dogrulamasindan sonra)
--   public.anonymize_old_estimates()  yalnizca service_role; pg_cron ile gunde bir (90 gunden eski kayitlarda
--                                     visitor_id ve utm NULL yapilir)
--
-- Idempotent: her ifade yeniden calistirilabilir.
-- DEPENDS ON: public.leads, public.has_role(uuid, app_role) (20260308140122_*.sql).
-- OPSIYONEL: public.edge_rate_limit_hit (20261020090100_sec_p1_internal_calls.sql); varsa save_estimate IP basina
--   gunluk sinir da uygular, yoksa o kontrol atlanir.
-- Hesaplayici bu migration olmadan da calisir (CTA token olmadan forma yonlendirir).
-- ROLLBACK: dosyanin sonundaki yorum blogu.
-- =====================================================================


-- ---------------------------------------------------------------------
-- (a) estimates: maliyet hesaplayici tahminleri
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token             text        NOT NULL UNIQUE,
  inputs            jsonb       NOT NULL,
  result            jsonb       NOT NULL,
  benchmark_version text        NOT NULL,
  utm               jsonb,
  visitor_id        text,
  lead_id           uuid        REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS estimates_visitor_created_idx ON public.estimates (visitor_id, created_at);
CREATE INDEX IF NOT EXISTS estimates_created_idx ON public.estimates (created_at);
CREATE INDEX IF NOT EXISTS estimates_lead_idx ON public.estimates (lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.estimates.result IS
  'Istemci tarafinda hesaplanip gonderilen, DOGRULANMAMIS tahmin (anon cagri sahte deger yazabilir). Metrikler icin inputs + benchmark_version ile yeniden hesaplayin; result degerini dogru kabul etmeyin.';
COMMENT ON COLUMN public.estimates.visitor_id IS
  'Sayfa yuklemesine ozgu rastgele kimlik; kalici kimlik yalnizca analitik izni verildiyse. 90 gun sonra anonymize_old_estimates() ile NULL yapilir.';


-- ---------------------------------------------------------------------
-- Yetkiler ve RLS: anon/authenticated icin yazma politikasi YOK.
-- Okuma yalnizca admin (WP12 hesaplayici -> lead metrikleri icin).
-- Yazma yalnizca save_estimate (SECURITY DEFINER) ve service role ile.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.estimates FROM anon, authenticated;
GRANT SELECT ON public.estimates TO authenticated;

DROP POLICY IF EXISTS "Admins can read estimates" ON public.estimates;
CREATE POLICY "Admins can read estimates" ON public.estimates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------
-- (1) save_estimate: hesaplayici CTA'si tiklandiginda cagirilir (anon + authenticated).
--     Girdiyi dogrular, kotuye kullanimi sinirlar, 16 karakterlik token dondurur.
--     Hata kodlari: 'invalid_estimate' (22023), 'rate_limited' (P0001).
--     Sinirlar: IP basina 30/gun (IP basligi varsa), ziyaretci basina 20/saat, genel 3000/gun.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_estimate(
  p_inputs            jsonb,
  p_result            jsonb,
  p_benchmark_version text,
  p_utm               jsonb,
  p_visitor_id        text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min   numeric;
  v_max   numeric;
  v_token text;
  v_utm   jsonb := p_utm;
  v_ip    text;
  v_try   integer := 0;
BEGIN
  IF p_inputs IS NULL OR jsonb_typeof(p_inputs) <> 'object'
     OR p_result IS NULL OR jsonb_typeof(p_result) <> 'object'
     OR octet_length(p_inputs::text) > 4000
     OR octet_length(p_result::text) > 8000 THEN
    RAISE EXCEPTION 'invalid_estimate' USING ERRCODE = '22023';
  END IF;

  IF p_visitor_id IS NULL OR char_length(p_visitor_id) NOT BETWEEN 8 AND 64 THEN
    RAISE EXCEPTION 'invalid_estimate' USING ERRCODE = '22023';
  END IF;

  IF p_benchmark_version IS NULL OR char_length(p_benchmark_version) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION 'invalid_estimate' USING ERRCODE = '22023';
  END IF;

  IF v_utm IS NOT NULL AND (jsonb_typeof(v_utm) <> 'object' OR octet_length(v_utm::text) > 1000) THEN
    v_utm := NULL;
  END IF;

  BEGIN
    v_min := (p_result->>'minTry')::numeric;
    v_max := (p_result->>'maxTry')::numeric;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'invalid_estimate' USING ERRCODE = '22023';
  END;

  IF v_min IS NULL OR v_max IS NULL
     OR v_min NOT BETWEEN 1000 AND 50000000
     OR v_max NOT BETWEEN 1000 AND 50000000
     OR v_min > v_max THEN
    RAISE EXCEPTION 'invalid_estimate' USING ERRCODE = '22023';
  END IF;

  -- Ziyaretci kimligini istemci secer, rotasyonla sinir asilabilir: bu yuzden IP basina gunluk sinir da uygulanir.
  -- IP, Cloudflare'in yazdigi cf-connecting-ip basligindan okunur (istemci degistiremez); baslik yoksa veya
  -- edge_rate_limit_hit kurulu degilse bu kontrol atlanir. Ham IP saklanmaz: sayac anahtari SHA-256 ozetidir ve
  -- edge_rate_limits'te en fazla 2 gun tutulur. Reddedilen cagrinin sayac artisi RAISE ile geri alinir.
  BEGIN
    v_ip := nullif(btrim(current_setting('request.headers', true)::json ->> 'cf-connecting-ip'), '');
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  IF v_ip IS NOT NULL AND to_regprocedure('public.edge_rate_limit_hit(text,integer,integer)') IS NOT NULL THEN
    IF NOT public.edge_rate_limit_hit('calc-estimate:' || encode(sha256(convert_to(v_ip, 'utf8')), 'hex'), 30, 86400) THEN
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Ziyaretci ve genel sinirlar yumusaktir: es zamanli cagrilarda birkac satir asilabilir.
  IF (SELECT count(*) FROM public.estimates
        WHERE visitor_id = p_visitor_id AND created_at > now() - interval '1 hour') >= 20
     OR (SELECT count(*) FROM public.estimates
           WHERE created_at > now() - interval '1 day') >= 3000 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  LOOP
    v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
    BEGIN
      INSERT INTO public.estimates (token, inputs, result, benchmark_version, utm, visitor_id)
      VALUES (v_token, p_inputs, p_result, p_benchmark_version, v_utm, p_visitor_id);
      RETURN v_token;
    EXCEPTION WHEN unique_violation THEN
      v_try := v_try + 1;
      IF v_try >= 5 THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.save_estimate(jsonb, jsonb, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_estimate(jsonb, jsonb, text, jsonb, text) TO anon, authenticated;


-- ---------------------------------------------------------------------
-- (2) link_lead_artifacts: create-lead (service role) OTP dogrulamasindan SONRA cagirir.
--     Yalnizca henuz bagli olmayan (lead_id IS NULL) tahmini baglar.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_lead_artifacts(
  p_lead_id         uuid,
  p_estimate_token  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_lead_id IS NULL OR p_estimate_token IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.estimates
     SET lead_id = p_lead_id
   WHERE token = p_estimate_token AND lead_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.link_lead_artifacts(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_lead_artifacts(uuid, text) TO service_role;


-- ---------------------------------------------------------------------
-- (3) anonymize_old_estimates: saklama suresi. 90 gunden eski tahminlerde ziyaretci kimligi ve kampanya
--     parametreleri silinir; hesaplama girdileri ve sonuc (kisisel veri icermez) metrikler icin kalir.
--     Her gece 00:20 UTC (03:20 Turkiye saati) calisir. pg_cron olmayan ortamlarda (yerel / CI) migration
--     bozulmaz: uyari verilir, fonksiyon elle veya harici zamanlayici ile calistirilir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anonymize_old_estimates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.estimates
     SET visitor_id = NULL,
         utm = NULL
   WHERE created_at < now() - interval '90 days'
     AND (visitor_id IS NOT NULL OR utm IS NOT NULL);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_old_estimates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_old_estimates() TO service_role;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'anonymize-old-estimates') THEN
    PERFORM cron.unschedule('anonymize-old-estimates');
  END IF;

  PERFORM cron.schedule(
    'anonymize-old-estimates',
    '20 0 * * *',
    $cron$SELECT public.anonymize_old_estimates();$cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron yok: public.anonymize_old_estimates() fonksiyonunu gunde bir elle veya harici zamanlayici ile calistirin (%)', SQLERRM;
END $$;


-- =====================================================================
-- ROLLBACK (elle, gerekirse; veri kaybi yaratir):
--   SELECT cron.unschedule('anonymize-old-estimates');
--   DROP FUNCTION IF EXISTS public.anonymize_old_estimates();
--   DROP FUNCTION IF EXISTS public.link_lead_artifacts(uuid, text);
--   DROP FUNCTION IF EXISTS public.save_estimate(jsonb, jsonb, text, jsonb, text);
--   DROP TABLE IF EXISTS public.estimates;
-- =====================================================================
