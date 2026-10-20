-- =====================================================================
-- Fiyatlandirma (WP07) 4/4: pricing_plans satirlarini TL'ye gecir
--
-- WP04, pricing_plans tablosunu eski USD paketleriyle tohumladi (starter/advantage/pro/ultra,
-- monthly/yearly). Checkout fonksiyonlari fiyati bu tablodan okur; arayuz ise src/lib/pricing.ts
-- icindeki id'leri gonderir. Bu dosya ikisini esitler:
--
--   jeton paketleri  starter 600 TL (660 jeton), standard 1.500 TL (1.725), plus 3.000 TL (3.600)
--   Pro abonelik     monthly 590 TL/ay, yearly 4.900 TL/yil, founder (Kurucu Uye) 2.900 TL/yil
--
-- coins = bonus dahil TOPLAM jeton (stripe-webhook bu degeri yukler), bonus_coins yalnizca bilgidir.
-- Tutarlar kurus (minor) cinsindendir. Fiyatlar KDV dahildir (src/lib/pricing.ts PRICE_TAX_MODE
-- = 'inclusive'); mali musavir 'KDV haric' derse tax_inclusive ve pricing.ts birlikte degistirilmelidir.
-- Eski USD paketleri (advantage, pro, ultra) silinmez, satisdan kaldirilir (active = false).
--
-- Tekrar calistirilabilir. stripe_price_id yalnizca fiyat degistiginde veya para birimi TL
-- olmadiginda temizlenir; boylece checkout, eski USD Stripe fiyatina degil bu tablodaki TL
-- tutara gore oturum acar. TL Stripe fiyat nesneleri olusturulduysa id'lerini sonradan yazin.
--
-- KONTENJAN: 'founder' satiri bilerek active = false ile eklenir ve bu dosya tekrar calistirildiginda
-- active degerine dokunmaz. create-premium-checkout loadPlan() ile aktif her pro_sub satirini satar ve
-- 'founder' icin get_founder_slots().remaining kontrolu yapmaz; satir aktif olursa kontenjan dolduktan
-- sonra da dogrudan fonksiyon cagrisiyla ucuz yillik plan alinabilir. Satiri yalnizca create-premium-checkout
-- (WP04) 'founder' planini remaining <= 0 iken reddedecek sekilde guncellendikten sonra elle acin:
--   UPDATE public.pricing_plans SET active = true WHERE id = 'founder';
-- ve ayni anda src/lib/pricing.ts icinde OFFER_FLAGS.founderEnabled = true yapin.
-- =====================================================================

INSERT INTO public.pricing_plans
  (id, kind, name, coins, bonus_coins, billing_interval, unit_amount_minor, currency, tax_inclusive, active, sort_order)
VALUES
  ('starter',  'coin_pack', 'Başlangıç',  660,  60,  NULL,    60000,  'try', true, true, 10),
  ('standard', 'coin_pack', 'Standart',   1725, 225, NULL,    150000, 'try', true, true, 20),
  ('plus',     'coin_pack', 'Plus',       3600, 600, NULL,    300000, 'try', true, true, 30),
  ('monthly',  'pro_sub',   'Aylık Pro',  NULL, 0,   'month', 59000,  'try', true, true, 50),
  ('yearly',   'pro_sub',   'Yıllık Pro', NULL, 0,   'year',  490000, 'try', true, true, 60),
  ('founder',  'pro_sub',   'Kurucu Üye', NULL, 0,   'year',  290000, 'try', true, false, 70)
ON CONFLICT (id) DO UPDATE
SET kind = EXCLUDED.kind,
    name = EXCLUDED.name,
    coins = EXCLUDED.coins,
    bonus_coins = EXCLUDED.bonus_coins,
    billing_interval = EXCLUDED.billing_interval,
    stripe_price_id = CASE
      WHEN public.pricing_plans.currency = 'try'
       AND public.pricing_plans.unit_amount_minor = EXCLUDED.unit_amount_minor
      THEN public.pricing_plans.stripe_price_id
      ELSE NULL
    END,
    unit_amount_minor = EXCLUDED.unit_amount_minor,
    currency = EXCLUDED.currency,
    tax_inclusive = EXCLUDED.tax_inclusive,
    active = CASE WHEN public.pricing_plans.id = 'founder' THEN public.pricing_plans.active ELSE EXCLUDED.active END,
    sort_order = EXCLUDED.sort_order;

-- Eski USD jeton paketleri satisdan kalkar (satirlar odeme gecmisi icin durur)
UPDATE public.pricing_plans
SET active = false
WHERE id IN ('advantage', 'pro', 'ultra')
  AND kind = 'coin_pack';
