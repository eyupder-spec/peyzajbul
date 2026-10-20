-- =====================================================================
-- PARA YOLU (1/4): yeni tablolar
--
--   pricing_plans        fiyat tablosu (checkout fonksiyonlari fiyati buradan okur)
--   payments             kanitlanabilir gelir defteri: SADECE gercek para
--                        (hediye/promosyon jetonlar buraya YAZILMAZ)
--   stripe_events        webhook tekrar-koruma ve denetim kaydi
--   firm_subscriptions   abonelik durumu (firms tablosu public okunabildigi
--                        icin faturalama durumu burada tutulur)
--   lead_refund_requests lead iade talepleri (yazma yalnizca RPC ile)
--
-- Tum yazmalar service_role veya SECURITY DEFINER RPC ile yapilir
-- (20261020120100_money_rpcs.sql). Dosya tekrar calistirilabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) pricing_plans
-- coins: pakete eklenen TOPLAM jeton (bonus dahil). bonus_coins yalnizca
-- bilgi amaclidir (ornek: advantage = 200 + 20 bonus -> coins 220).
-- Fiyatlar minor birimdedir (kurus / cent). Seed degerleri bugunku USD
-- fiyatlariyla aynidir; TL'ye gecis ayri bir pricing migration'i ile yapilir.
-- Satir id'leri arayuzun gonderdigi paket/plan kodlariyla ayni olmalidir.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('coin_pack', 'pro_sub', 'sponsorship')),
  name text NOT NULL,
  coins integer,
  bonus_coins integer NOT NULL DEFAULT 0,
  billing_interval text CHECK (billing_interval IN ('month', 'year')),
  unit_amount_minor integer NOT NULL CHECK (unit_amount_minor > 0),
  currency text NOT NULL DEFAULT 'try' CHECK (currency IN ('try', 'usd')),
  vat_rate numeric(5, 2) NOT NULL DEFAULT 20,
  tax_inclusive boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_plans_coin_pack_has_coins CHECK (kind <> 'coin_pack' OR COALESCE(coins, 0) > 0),
  CONSTRAINT pricing_plans_pro_sub_has_interval CHECK (kind <> 'pro_sub' OR billing_interval IS NOT NULL)
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Admin politikasi pasif planlari da okumayi saglar. Istemciden yazma dosya
-- sonunda REVOKE edilir: fiyatlar migration veya service_role ile degistirilir.

DROP POLICY IF EXISTS "Anyone can read active pricing plans" ON public.pricing_plans;
CREATE POLICY "Anyone can read active pricing plans"
ON public.pricing_plans
FOR SELECT
TO anon, authenticated
USING (active);

DROP POLICY IF EXISTS "Admins manage pricing plans" ON public.pricing_plans;
CREATE POLICY "Admins manage pricing plans"
ON public.pricing_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_pricing_plans_updated_at ON public.pricing_plans;
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pricing_plans
  (id, kind, name, coins, bonus_coins, billing_interval, unit_amount_minor, currency, sort_order)
VALUES
  ('starter',   'coin_pack', 'Başlangıç', 50,   0,   NULL,    5000,   'usd', 10),
  ('advantage', 'coin_pack', 'Avantaj',   220,  20,  NULL,    20000,  'usd', 20),
  ('pro',       'coin_pack', 'Pro',       600,  100, NULL,    50000,  'usd', 30),
  ('ultra',     'coin_pack', 'Ultra',     1300, 300, NULL,    100000, 'usd', 40),
  ('monthly',   'pro_sub',   'Premium Aylık', NULL, 0, 'month', 1500,   'usd', 50),
  ('yearly',    'pro_sub',   'Premium Yıllık', NULL, 0, 'year',  15000,  'usd', 60)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- (b) payments: gelir defteri (yalnizca gercek para)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'iyzico', 'paytr', 'havale', 'manual')),
  provider_event_id text,
  -- Stripe: coin paketi icin cs_..., abonelik faturasi icin in_...; havale: serbest metin
  provider_object_id text NOT NULL,
  payment_intent_id text,
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  user_id uuid,
  kind text NOT NULL CHECK (kind IN ('coin_pack', 'pro_sub', 'sponsorship', 'agency', 'lead')),
  plan_id text,
  coins_granted integer NOT NULL DEFAULT 0,
  coins_clawed_back integer NOT NULL DEFAULT 0,
  gross_minor integer NOT NULL CHECK (gross_minor >= 0),
  tax_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL,
  fx_to_try numeric(14, 6),
  fee_minor integer,
  net_minor integer,
  settlement_currency text,
  status text NOT NULL DEFAULT 'succeeded'
    CHECK (status IN ('succeeded', 'partially_refunded', 'refunded', 'disputed', 'dispute_lost')),
  refunded_minor integer NOT NULL DEFAULT 0,
  invoice_no text,
  livemode boolean NOT NULL,
  review_reason text
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_object_uniq
  ON public.payments (provider, provider_object_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_event_uniq
  ON public.payments (provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_firm_id_idx ON public.payments (firm_id);
CREATE INDEX IF NOT EXISTS payments_payment_intent_idx ON public.payments (payment_intent_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments (created_at);
CREATE INDEX IF NOT EXISTS payments_review_idx ON public.payments (created_at) WHERE review_reason IS NOT NULL;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all payments" ON public.payments;
CREATE POLICY "Admins can read all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Firms can read own payments" ON public.payments;
CREATE POLICY "Firms can read own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- (c) stripe_events: politika yok -> yalnizca service_role erisebilir
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text,
  livemode boolean,
  object_id text,
  status text CHECK (status IN ('processing', 'processed', 'failed', 'ignored', 'needs_review')),
  attempts integer NOT NULL DEFAULT 1,
  error text,
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- (d) firm_subscriptions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firm_subscriptions (
  firm_id uuid PRIMARY KEY REFERENCES public.firms(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  plan text,
  status text,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  last_invoice_id text,
  last_payment_failed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firm_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firms can read own subscription" ON public.firm_subscriptions;
CREATE POLICY "Firms can read own subscription"
ON public.firm_subscriptions
FOR SELECT
TO authenticated
USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.firm_subscriptions;
CREATE POLICY "Admins can read all subscriptions"
ON public.firm_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_firm_subscriptions_updated_at ON public.firm_subscriptions;
CREATE TRIGGER update_firm_subscriptions_updated_at
  BEFORE UPDATE ON public.firm_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- (e) lead_refund_requests: yazma yalnizca request_lead_refund /
-- resolve_lead_refund RPC'leri ile
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL UNIQUE REFERENCES public.lead_purchases(id) ON DELETE CASCADE,
  lead_id uuid,
  firm_row_id uuid,
  user_id uuid NOT NULL,
  reason text CHECK (reason IN ('wrong_number', 'unreachable', 'not_a_real_request', 'duplicate', 'other')),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text
);

CREATE INDEX IF NOT EXISTS lead_refund_requests_status_idx
  ON public.lead_refund_requests (status, created_at);

ALTER TABLE public.lead_refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firms can read own refund requests" ON public.lead_refund_requests;
CREATE POLICY "Firms can read own refund requests"
ON public.lead_refund_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all refund requests" ON public.lead_refund_requests;
CREATE POLICY "Admins can read all refund requests"
ON public.lead_refund_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- Yazma yetkilerini kapat (Supabase varsayilan olarak anon/authenticated'a
-- tam yetki verir). Yazmalar service_role veya SECURITY DEFINER RPC ile.
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.firm_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.pricing_plans FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lead_refund_requests FROM anon, authenticated;
REVOKE ALL ON public.stripe_events FROM anon, authenticated;
