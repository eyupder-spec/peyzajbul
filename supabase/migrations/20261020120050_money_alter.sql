-- =====================================================================
-- PARA YOLU (2/4): mevcut tablolarda degisiklikler (tekrar calistirilabilir)
--
--   lead_purchases    tekil (lead, firma) kurali, firm_row_id / coin_tx_id kopruleri
--   coin_transactions yeni tipler, payment_id, idempotency_key; "satin alma" ile
--                     "hediye" ayrimi
--   firms             premium_source (paid | comp | trial), negatif bakiye korumasi
--
-- NOT: lead_purchases.firm_id = auth kullanici id'si olarak KALIR
-- (leads_for_firms gorunumu ve RLS buna dayanir). coin_transactions.firm_id
-- firms.id'dir. firm_row_id acik koprudur.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) lead_purchases
-- ---------------------------------------------------------------------

-- Ayni (lead, firma) icin en eski kayit disindakiler void_duplicate olur.
-- Finansal satirlar ASLA silinmez.
DO $$
BEGIN
  UPDATE public.lead_purchases lp
  SET status = 'void_duplicate'
  FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY lead_id, firm_id
             ORDER BY purchased_at, created_at, id
           ) AS rn
    FROM public.lead_purchases
    WHERE status <> 'void_duplicate'
  ) d
  WHERE lp.id = d.id
    AND d.rn > 1;
END $$;

ALTER TABLE public.lead_purchases
  ADD COLUMN IF NOT EXISTS firm_row_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coin_tx_id uuid REFERENCES public.coin_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- Yalnizca kullanicinin TEK firmasi varsa firms.id'yi geri doldur
UPDATE public.lead_purchases lp
SET firm_row_id = f.id
FROM (
  SELECT user_id, (array_agg(id))[1] AS id
  FROM public.firms
  GROUP BY user_id
  HAVING count(*) = 1
) f
WHERE lp.firm_row_id IS NULL
  AND lp.firm_id = f.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS lead_purchases_lead_firm_uniq
  ON public.lead_purchases (lead_id, firm_id)
  WHERE status <> 'void_duplicate';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lead_purchases_status_check'
      AND conrelid = 'public.lead_purchases'::regclass
  ) THEN
    ALTER TABLE public.lead_purchases
      ADD CONSTRAINT lead_purchases_status_check
      CHECK (status IN ('paid', 'refunded', 'void_duplicate')) NOT VALID;
  END IF;

  BEGIN
    ALTER TABLE public.lead_purchases VALIDATE CONSTRAINT lead_purchases_status_check;
  EXCEPTION WHEN check_violation THEN
    RAISE WARNING 'lead_purchases_status_check dogrulanamadi: gecersiz status degerli satirlar var';
  END;
END $$;

-- ---------------------------------------------------------------------
-- (b) coin_transactions
-- ---------------------------------------------------------------------
ALTER TABLE public.coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_type_check
  CHECK (type IN ('purchase', 'spend', 'bonus', 'grant', 'promo', 'refund', 'admin_adjust'));

ALTER TABLE public.coin_transactions
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- idx_unique_purchase_session (stripe_session_id) yerinde kalir; iade/geri alma
-- satirlari stripe_session_id'yi NULL birakmalidir.
CREATE UNIQUE INDEX IF NOT EXISTS coin_transactions_idem_uniq
  ON public.coin_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Admin'in elle yukledigi jetonlar 'purchase' olarak loglanmisti (AdminPanel).
-- Bunlar gelir degil hediyedir: provider izi olmayan 'purchase' -> 'grant'.
UPDATE public.coin_transactions
SET type = 'grant'
WHERE type = 'purchase'
  AND stripe_session_id IS NULL
  AND payment_id IS NULL;

-- Istemci kaynakli (auth.uid() dolu) INSERT'ler payment_id olmadan 'purchase'
-- yazamaz; 'grant'e cevrilir. service_role (auth.uid() NULL) etkilenmez.
CREATE OR REPLACE FUNCTION public.coin_tx_purchase_requires_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'purchase' AND NEW.payment_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.type := 'grant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coin_tx_purchase_requires_payment ON public.coin_transactions;
CREATE TRIGGER coin_tx_purchase_requires_payment
  BEFORE INSERT ON public.coin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.coin_tx_purchase_requires_payment();

-- ---------------------------------------------------------------------
-- (c) firms
-- ---------------------------------------------------------------------
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS premium_source text
  CHECK (premium_source IN ('paid', 'comp', 'trial'));

-- Mevcut premium firmalar: Stripe aboneligi varsa 'paid', yoksa 'comp'
UPDATE public.firms
SET premium_source = CASE WHEN stripe_subscription_id IS NOT NULL THEN 'paid' ELSE 'comp' END
WHERE is_premium
  AND premium_source IS NULL;

-- Admin'in elle premium acmasi otomatik 'comp' olur; premium degilse kaynak
-- bos kalir. Istemci (admin olmayan) premium_source degerini belirleyemez:
-- check_firm_update_security bu kolonu korumadigi icin burada korunur.
CREATE OR REPLACE FUNCTION public.firms_premium_source_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.premium_source := OLD.premium_source;
    ELSE
      NEW.premium_source := NULL;
    END IF;
  END IF;

  IF NEW.is_premium THEN
    IF NEW.premium_source IS NULL THEN
      NEW.premium_source := 'comp';
    END IF;
  ELSE
    NEW.premium_source := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS firms_premium_source_default ON public.firms;
CREATE TRIGGER firms_premium_source_default
  BEFORE INSERT OR UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.firms_premium_source_default();

-- Negatif bakiye korumasi. Eski veri migration'i bozmasin diye NOT VALID eklenir,
-- ardindan dogrulama denenir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'firms_coin_balance_nonneg'
      AND conrelid = 'public.firms'::regclass
  ) THEN
    ALTER TABLE public.firms
      ADD CONSTRAINT firms_coin_balance_nonneg CHECK (coin_balance >= 0) NOT VALID;
  END IF;

  BEGIN
    ALTER TABLE public.firms VALIDATE CONSTRAINT firms_coin_balance_nonneg;
  EXCEPTION WHEN check_violation THEN
    RAISE WARNING 'negatif bakiyeli firma var, elle duzeltin';
  END;
END $$;

-- Stripe abonelikli mevcut firmalar icin firm_subscriptions satiri
INSERT INTO public.firm_subscriptions
  (firm_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_end)
SELECT id, stripe_subscription_id, stripe_customer_id, subscription_plan, 'active', premium_until
FROM public.firms
WHERE stripe_subscription_id IS NOT NULL
ON CONFLICT DO NOTHING;
