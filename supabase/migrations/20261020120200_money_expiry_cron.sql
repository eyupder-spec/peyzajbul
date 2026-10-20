-- =====================================================================
-- PARA YOLU (4/4): premium bitis zamanlayicisi
--
-- Her gece 00:10 UTC (03:10 Turkiye saati) public.expire_premiums() calisir.
-- Eski setup_cron_dashboard.sql zaman damgasi olmadigi icin Supabase CLI
-- tarafindan atlaniyordu ve premium_source'u yok sayan satir ici UPDATE
-- calistiriyordu; bu dosya onun yerine gecer.
--
-- pg_cron olmayan ortamlarda (yerel / CI) migration bozulmaz: uyari verilir ve
-- expire-premiums Edge Function'i elle veya harici zamanlayici ile tetiklenir.
-- =====================================================================
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-premium-firms') THEN
    PERFORM cron.unschedule('expire-premium-firms');
  END IF;

  PERFORM cron.schedule(
    'expire-premium-firms',
    '10 0 * * *',
    $cron$SELECT public.expire_premiums();$cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron yok: expire-premiums Edge Function ile tetikleyin (%)', SQLERRM;
END $$;
