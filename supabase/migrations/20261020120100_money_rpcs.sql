-- =====================================================================
-- PARA YOLU (3/4): tum para hareketleri SECURITY DEFINER RPC'ler
--
-- Hata sozlesmesi: RAISE EXCEPTION '<kod>' USING ERRCODE = 'P0001'. Mesaj
-- yalnizca kod'dur; Edge Function'lar bunu Turkce metne cevirir.
--
--   purchase_lead            firm_not_found | lead_unavailable | already_purchased |
--                            sold_out | insufficient_balance
--   record_coin_pack_payment invalid_session | invalid_coins | invalid_amount
--   record_subscription_payment  invalid_invoice | invalid_amount | period_end_required
--   sync_subscription_state  invalid_reason
--   apply_payment_reversal   invalid_kind
--   grant_coins / admin_grant_coins  invalid_type | invalid_amount | firm_not_found |
--                            insufficient_balance | forbidden
--   request_lead_refund      not_authenticated | invalid_reason | refund_window_closed |
--                            refund_already_requested
--   resolve_lead_refund      forbidden | request_not_found | request_already_resolved |
--                            firm_not_found
--
-- Kilit sirasi her zaman: firma -> lead.
-- Yetki: tum fonksiyonlar yalnizca service_role; request_lead_refund,
-- resolve_lead_refund ve admin_grant_coins ayrica authenticated (icerde
-- auth.uid() / admin kontrolu yapar). Dosya sonunda self-check vardir.
--
-- ---------------------------------------------------------------------
-- MANUEL DOĞRULAMA (iki oturumlu psql tarifi; WP15 bunu pgTAP'e cevirecek)
-- Degerleri kendi test verinizle doldurun: <DB_URL>, <UID> (firma sahibi
-- auth kullanicisi), <FIRM_ID>, <LEAD_1..5> (admin_approved, status=active,
-- token_price=20), <SESSION_ID>, <EVENT_ID>.
--
-- (1) Atomik harcama: bakiye 20 iken 5 paralel purchase_lead, 5 farkli lead
--     (hepsi 20 jeton).
--       psql "<DB_URL>" -c "UPDATE firms SET coin_balance = 20 WHERE id = '<FIRM_ID>';"
--       for L in <LEAD_1> <LEAD_2> <LEAD_3> <LEAD_4> <LEAD_5>; do
--         psql "<DB_URL>" -c "SELECT purchase_lead('<UID>', '$L');" &
--       done; wait
--     Beklenen: tam 1 basarili cagri, digerleri 'insufficient_balance';
--       SELECT coin_balance FROM firms WHERE id = '<FIRM_ID>';              -- 0
--       SELECT count(*) FROM coin_transactions
--        WHERE firm_id = '<FIRM_ID>' AND type = 'spend';                    -- 1
--
-- (2) 3 alici siniri: 4 ayri firma ayni lead'i ayni anda satin alir
--     (her firmaya >= 20 jeton verin).
--       for U in <UID_A> <UID_B> <UID_C> <UID_D>; do
--         psql "<DB_URL>" -c "SELECT purchase_lead('$U', '<LEAD_1>');" &
--       done; wait
--     Beklenen: tam 3 basarili, 4. cagri 'sold_out';
--       SELECT count(*) FROM lead_purchases
--        WHERE lead_id = '<LEAD_1>' AND status = 'paid';                    -- 3
--
-- (3) Odeme tekrari: ayni oturum iki kez islenir.
--       SELECT record_coin_pack_payment('<EVENT_ID>', '<SESSION_ID>', 'pi_test',
--              '<UID>', '<FIRM_ID>', 'starter', 50, 5000, 'usd', false);
--       -- ayni cagriyi ikinci kez calistirin (veya baska bir event id ile)
--     Beklenen: ikinci cagri {"credited": false, "duplicate": true};
--       SELECT count(*) FROM payments WHERE provider_object_id = '<SESSION_ID>';   -- 1
--       SELECT count(*) FROM coin_transactions
--        WHERE stripe_session_id = '<SESSION_ID>';                                  -- 1
--
-- (4) Iade tekrari: ayni event id ile iki kez geri alma.
--       SELECT apply_payment_reversal('<REV_EVENT_ID>', 'pi_test', 'refund', 5000);
--       SELECT apply_payment_reversal('<REV_EVENT_ID>', 'pi_test', 'refund', 5000);
--     Beklenen: tek geri alma;
--       SELECT count(*) FROM coin_transactions
--        WHERE idempotency_key = 'rev:<REV_EVENT_ID>';                              -- 1
--       SELECT status, coins_clawed_back FROM payments
--        WHERE provider_object_id = '<SESSION_ID>';                                 -- refunded, 50
--
-- (5) Cozulemeyen firma sonradan duzeltilir: olmayan bir firma ile cagirin
--     (p_firm/p_user rastgele uuid), sonra firmayi duzeltip ayni cagriyi tekrarlayin.
--       SELECT record_coin_pack_payment('<EVENT_ID>', '<SESSION_ID_2>', 'pi_test2',
--              '<UID>', '<MISSING_FIRM_ID>', 'starter', 50, 5000, 'usd', false);
--       -- ilk cagri: {"credited": false, "reason": "firm_not_found"}
--       -- firma verisi duzeltilince (p_firm = <FIRM_ID>) ayni oturumla tekrar:
--     Beklenen: {"credited": true}; payments'ta hala tek satir, firm_id dolu,
--       review_reason NULL, coins_granted 50; ucuncu cagri {"duplicate": true};
--       SELECT count(*) FROM coin_transactions
--        WHERE stripe_session_id = '<SESSION_ID_2>';                                -- 1
-- =====================================================================

-- ---------------------------------------------------------------------
-- Uygunluk kancasi: simdilik her admin onayli aktif lead satin alinabilir.
-- assigned_firms burada ZORLANMAZ (ice aktarilan firmalar ayni admin
-- user_id'sini paylasir; sert kural gercek satislari engellerdi).
-- Sehir/kategori eslesmesi icin sonraki migration bu govdeyi degistirir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lead_is_purchasable_by(p_uid uuid, p_lead uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT true
$$;

-- KDV dahil tutardan vergi payi (minor birim). Yalnizca fiyat satiri bulunur
-- ve tax_inclusive ise hesaplanir, aksi halde 0.
CREATE OR REPLACE FUNCTION public.money_tax_minor(p_gross integer, p_plan_id text, p_kind text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT round(p_gross - p_gross / (1 + pp.vat_rate / 100.0))::integer
      FROM public.pricing_plans pp
      WHERE pp.id = p_plan_id
        AND pp.kind = p_kind
        AND pp.tax_inclusive
    ),
    0
  )
$$;

-- ---------------------------------------------------------------------
-- (1) purchase_lead: bakiye dusme + islem kaydi + satin alma tek transaction
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_lead(p_uid uuid, p_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm public.firms%ROWTYPE;
  v_lead public.leads%ROWTYPE;
  v_firm_count integer;
  v_price integer;
  v_balance integer;
  v_buyers integer;
  v_tx uuid;
  v_purchase uuid;
BEGIN
  -- Firma: kullanicinin tam olarak bir onayli ve aktif firmasi olmali
  SELECT count(*) INTO v_firm_count
  FROM public.firms
  WHERE user_id = p_uid AND is_approved AND is_active;

  IF p_uid IS NULL OR v_firm_count <> 1 THEN
    RAISE EXCEPTION 'firm_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_firm
  FROM public.firms
  WHERE user_id = p_uid AND is_approved AND is_active
  FOR UPDATE;

  -- Lead: kilit sirasi firma -> lead
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead FOR UPDATE;

  IF NOT FOUND
     OR v_lead.status <> 'active'
     OR NOT COALESCE(v_lead.admin_approved, false)
     OR v_lead.user_id = p_uid
     OR NOT public.lead_is_purchasable_by(p_uid, p_lead) THEN
    RAISE EXCEPTION 'lead_unavailable' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lead_purchases
    WHERE lead_id = p_lead AND firm_id = p_uid AND status <> 'void_duplicate'
  ) THEN
    RAISE EXCEPTION 'already_purchased' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_buyers
  FROM public.lead_purchases
  WHERE lead_id = p_lead AND status = 'paid';

  IF v_buyers >= 3 THEN
    RAISE EXCEPTION 'sold_out' USING ERRCODE = 'P0001';
  END IF;

  v_price := GREATEST(COALESCE(NULLIF(v_lead.token_price, 0), 20), 5);

  IF v_firm.coin_balance < v_price THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.firms
  SET coin_balance = coin_balance - v_price
  WHERE id = v_firm.id
  RETURNING coin_balance INTO v_balance;

  INSERT INTO public.coin_transactions (firm_id, type, amount, description, lead_id)
  VALUES (v_firm.id, 'spend', -v_price, 'Müşteri adayı açma', p_lead)
  RETURNING id INTO v_tx;

  INSERT INTO public.lead_purchases (lead_id, firm_id, firm_row_id, amount, status, coin_tx_id)
  VALUES (p_lead, p_uid, v_firm.id, v_price, 'paid', v_tx)
  RETURNING id INTO v_purchase;

  RETURN jsonb_build_object(
    'new_balance', v_balance,
    'price', v_price,
    'purchase_id', v_purchase,
    'company_name', v_firm.company_name,
    'buyers_after', v_buyers + 1
  );
END;
$$;

-- ---------------------------------------------------------------------
-- (2) record_coin_pack_payment: odeme kaydi + jeton kredisi, tekrar guvenli
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_coin_pack_payment(
  p_event_id text,
  p_session_id text,
  p_payment_intent text,
  p_user uuid,
  p_firm uuid,
  p_plan_id text,
  p_coins integer,
  p_gross integer,
  p_currency text,
  p_livemode boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm public.firms%ROWTYPE;
  v_found boolean := false;
  v_plan_name text;
  v_tax integer;
  v_payment uuid;
  v_balance integer;
  v_legacy_tx uuid;
BEGIN
  IF p_session_id IS NULL OR btrim(p_session_id) = '' THEN
    RAISE EXCEPTION 'invalid_session' USING ERRCODE = 'P0001';
  END IF;
  IF p_coins IS NULL OR p_coins <= 0 OR p_coins > 100000 THEN
    RAISE EXCEPTION 'invalid_coins' USING ERRCODE = 'P0001';
  END IF;
  IF p_gross IS NULL OR p_gross < 0 OR p_currency IS NULL OR btrim(p_currency) = '' THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;

  -- Firma: once p_firm, sonra kullanicinin tek firmasi
  IF p_firm IS NOT NULL THEN
    SELECT * INTO v_firm FROM public.firms WHERE id = p_firm FOR UPDATE;
    v_found := FOUND;
  END IF;

  IF NOT v_found AND p_user IS NOT NULL THEN
    IF (SELECT count(*) FROM public.firms WHERE user_id = p_user) = 1 THEN
      SELECT * INTO v_firm FROM public.firms WHERE user_id = p_user FOR UPDATE;
      v_found := FOUND;
    END IF;
  END IF;

  v_tax := public.money_tax_minor(p_gross, p_plan_id, 'coin_pack');

  -- Firma bulunamazsa para yine de kaydedilir, sessizce dusurulmez
  IF NOT v_found THEN
    INSERT INTO public.payments (
      provider, provider_event_id, provider_object_id, payment_intent_id, user_id,
      kind, plan_id, coins_granted, gross_minor, tax_minor, currency, livemode, review_reason
    )
    VALUES (
      'stripe', p_event_id, p_session_id, p_payment_intent, p_user,
      'coin_pack', p_plan_id, 0, p_gross, v_tax, lower(p_currency), COALESCE(p_livemode, false),
      'firm_not_found'
    )
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('credited', false, 'reason', 'firm_not_found');
  END IF;

  INSERT INTO public.payments (
    provider, provider_event_id, provider_object_id, payment_intent_id, firm_id, user_id,
    kind, plan_id, coins_granted, gross_minor, tax_minor, currency, livemode
  )
  VALUES (
    'stripe', p_event_id, p_session_id, p_payment_intent, v_firm.id, COALESCE(p_user, v_firm.user_id),
    'coin_pack', p_plan_id, p_coins, p_gross, v_tax, lower(p_currency), COALESCE(p_livemode, false)
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_payment;

  -- Daha once firma bulunamadigi icin 'firm_not_found' ile kaydedilmis odeme:
  -- firma artik cozuluyorsa (veri duzeltildi, olay Stripe'tan yeniden gonderildi)
  -- ayni satir tamamlanir ve jeton asagida tam bir kez kredilenir.
  IF v_payment IS NULL THEN
    UPDATE public.payments
    SET firm_id = v_firm.id,
        user_id = COALESCE(p_user, v_firm.user_id),
        coins_granted = p_coins,
        review_reason = NULL
    WHERE provider = 'stripe'
      AND provider_object_id = p_session_id
      AND firm_id IS NULL
      AND review_reason = 'firm_not_found'
      AND status = 'succeeded'
    RETURNING id INTO v_payment;
  END IF;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('credited', false, 'duplicate', true);
  END IF;

  -- Eski webhook bu oturumu zaten kredilemisse tekrar kredilemeyiz, yalnizca
  -- defteri baglariz.
  SELECT id INTO v_legacy_tx
  FROM public.coin_transactions
  WHERE stripe_session_id = p_session_id
  LIMIT 1;

  IF v_legacy_tx IS NOT NULL THEN
    UPDATE public.coin_transactions
    SET payment_id = v_payment
    WHERE id = v_legacy_tx AND payment_id IS NULL;

    RETURN jsonb_build_object(
      'credited', false, 'duplicate', true, 'reason', 'already_credited', 'payment_id', v_payment
    );
  END IF;

  SELECT name INTO v_plan_name
  FROM public.pricing_plans
  WHERE id = p_plan_id AND kind = 'coin_pack';

  UPDATE public.firms
  SET coin_balance = coin_balance + p_coins
  WHERE id = v_firm.id
  RETURNING coin_balance INTO v_balance;

  INSERT INTO public.coin_transactions (
    firm_id, type, amount, description, stripe_session_id, payment_id, idempotency_key
  )
  VALUES (
    v_firm.id, 'purchase', p_coins,
    COALESCE(v_plan_name, p_plan_id, 'Jeton') || ' paketi - ' || p_coins || ' jeton',
    p_session_id, v_payment, 'credit:' || p_session_id
  );

  RETURN jsonb_build_object('credited', true, 'payment_id', v_payment, 'new_balance', v_balance);
END;
$$;

-- ---------------------------------------------------------------------
-- (3) record_subscription_payment: abonelik faturasi -> premium
-- Premium bitisi Stripe donem sonudur (p_period_end), asla now()+1 ay degil.
-- Tutar 0 olan fatura (yuzde yuz promosyon kodu) gelir degil hediyedir:
-- payments'a yazilmaz, premium_source 'comp' olur.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_subscription_payment(
  p_event_id text,
  p_invoice_id text,
  p_payment_intent text,
  p_subscription_id text,
  p_customer_id text,
  p_user uuid,
  p_firm uuid,
  p_plan text,
  p_period_end timestamptz,
  p_gross integer,
  p_currency text,
  p_livemode boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm public.firms%ROWTYPE;
  v_sub public.firm_subscriptions%ROWTYPE;
  v_found boolean := false;
  v_firm_id uuid;
  v_tax integer;
  v_payment uuid;
  v_until timestamptz;
BEGIN
  IF p_invoice_id IS NULL OR btrim(p_invoice_id) = '' THEN
    RAISE EXCEPTION 'invalid_invoice' USING ERRCODE = 'P0001';
  END IF;
  IF p_gross IS NULL OR p_gross < 0 OR p_currency IS NULL OR btrim(p_currency) = '' THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF p_period_end IS NULL THEN
    RAISE EXCEPTION 'period_end_required' USING ERRCODE = 'P0001';
  END IF;

  -- Firma: p_firm, abonelik id, Stripe musteri id, kullanicinin tek firmasi
  IF p_firm IS NOT NULL THEN
    SELECT * INTO v_firm FROM public.firms WHERE id = p_firm FOR UPDATE;
    v_found := FOUND;
  END IF;

  IF NOT v_found AND p_subscription_id IS NOT NULL THEN
    SELECT firm_id INTO v_firm_id
    FROM public.firm_subscriptions
    WHERE stripe_subscription_id = p_subscription_id;
    IF v_firm_id IS NOT NULL THEN
      SELECT * INTO v_firm FROM public.firms WHERE id = v_firm_id FOR UPDATE;
      v_found := FOUND;
    END IF;
  END IF;

  IF NOT v_found AND p_customer_id IS NOT NULL THEN
    IF (SELECT count(*) FROM public.firms WHERE stripe_customer_id = p_customer_id) = 1 THEN
      SELECT * INTO v_firm FROM public.firms WHERE stripe_customer_id = p_customer_id FOR UPDATE;
      v_found := FOUND;
    END IF;
  END IF;

  IF NOT v_found AND p_user IS NOT NULL THEN
    IF (SELECT count(*) FROM public.firms WHERE user_id = p_user) = 1 THEN
      SELECT * INTO v_firm FROM public.firms WHERE user_id = p_user FOR UPDATE;
      v_found := FOUND;
    END IF;
  END IF;

  v_tax := public.money_tax_minor(p_gross, p_plan, 'pro_sub');

  IF NOT v_found THEN
    IF p_gross > 0 THEN
      INSERT INTO public.payments (
        provider, provider_event_id, provider_object_id, payment_intent_id, user_id,
        kind, plan_id, gross_minor, tax_minor, currency, livemode, review_reason
      )
      VALUES (
        'stripe', p_event_id, p_invoice_id, p_payment_intent, p_user,
        'pro_sub', p_plan, p_gross, v_tax, lower(p_currency), COALESCE(p_livemode, false),
        'firm_not_found'
      )
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object('applied', false, 'reason', 'firm_not_found');
  END IF;

  IF p_gross > 0 THEN
    INSERT INTO public.payments (
      provider, provider_event_id, provider_object_id, payment_intent_id, firm_id, user_id,
      kind, plan_id, gross_minor, tax_minor, currency, livemode
    )
    VALUES (
      'stripe', p_event_id, p_invoice_id, p_payment_intent, v_firm.id, COALESCE(p_user, v_firm.user_id),
      'pro_sub', p_plan, p_gross, v_tax, lower(p_currency), COALESCE(p_livemode, false)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_payment;

    -- 'firm_not_found' ile kaydedilmis fatura: firma artik cozuluyorsa satir
    -- tamamlanir, boylece iade ve firma bazli gelir dogru calisir.
    IF v_payment IS NULL THEN
      UPDATE public.payments
      SET firm_id = v_firm.id,
          user_id = COALESCE(p_user, v_firm.user_id),
          payment_intent_id = COALESCE(payment_intent_id, p_payment_intent),
          review_reason = NULL
      WHERE provider = 'stripe'
        AND provider_object_id = p_invoice_id
        AND firm_id IS NULL
        AND review_reason = 'firm_not_found'
        AND status = 'succeeded'
      RETURNING id INTO v_payment;
    END IF;

    IF v_payment IS NULL AND p_payment_intent IS NOT NULL THEN
      UPDATE public.payments
      SET payment_intent_id = p_payment_intent
      WHERE provider = 'stripe'
        AND provider_object_id = p_invoice_id
        AND payment_intent_id IS NULL;
    END IF;
  END IF;

  -- Tekrar eden event guvenle yeniden uygulanir (GREATEST ile); ancak iptal
  -- edilmis bir abonelige ait gec gelen eski fatura premium'u geri acmaz.
  SELECT * INTO v_sub FROM public.firm_subscriptions WHERE firm_id = v_firm.id;

  IF FOUND
     AND v_sub.status = 'canceled'
     AND v_sub.stripe_subscription_id IS NOT DISTINCT FROM p_subscription_id THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'subscription_canceled', 'payment_id', v_payment);
  END IF;

  UPDATE public.firms
  SET is_premium = true,
      premium_until = GREATEST(COALESCE(premium_until, '-infinity'::timestamptz), p_period_end),
      premium_source = CASE WHEN p_gross > 0 THEN 'paid' ELSE 'comp' END,
      subscription_plan = COALESCE(p_plan, subscription_plan),
      stripe_customer_id = COALESCE(p_customer_id, stripe_customer_id),
      stripe_subscription_id = COALESCE(p_subscription_id, stripe_subscription_id)
  WHERE id = v_firm.id
  RETURNING premium_until INTO v_until;

  INSERT INTO public.firm_subscriptions (
    firm_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_end, last_invoice_id
  )
  VALUES (
    v_firm.id, p_subscription_id, COALESCE(p_customer_id, v_firm.stripe_customer_id), p_plan,
    'active', p_period_end, p_invoice_id
  )
  ON CONFLICT (firm_id) DO UPDATE
  SET stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.firm_subscriptions.stripe_customer_id),
      plan = COALESCE(EXCLUDED.plan, public.firm_subscriptions.plan),
      status = 'active',
      current_period_end = EXCLUDED.current_period_end,
      last_invoice_id = EXCLUDED.last_invoice_id;

  RETURN jsonb_build_object('applied', true, 'payment_id', v_payment, 'premium_until', v_until);
END;
$$;

-- ---------------------------------------------------------------------
-- (4) sync_subscription_state: abonelik durumu (premium_until'e dokunmaz,
-- yalnizca 'deleted' premium'u kapatir). Bilinmeyen abonelik hata degildir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_subscription_state(
  p_subscription_id text,
  p_status text,
  p_cancel_at_period_end boolean,
  p_period_end timestamptz,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm_id uuid;
BEGIN
  IF p_reason IS NULL OR p_reason NOT IN ('updated', 'deleted', 'payment_failed') THEN
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = 'P0001';
  END IF;

  IF p_subscription_id IS NULL THEN
    RETURN;
  END IF;

  SELECT firm_id INTO v_firm_id
  FROM public.firm_subscriptions
  WHERE stripe_subscription_id = p_subscription_id;

  IF v_firm_id IS NULL THEN
    SELECT id INTO v_firm_id
    FROM public.firms
    WHERE stripe_subscription_id = p_subscription_id
    LIMIT 1;
  END IF;

  IF v_firm_id IS NULL THEN
    RETURN;
  END IF;

  IF p_reason = 'payment_failed' THEN
    UPDATE public.firm_subscriptions
    SET status = 'past_due',
        last_payment_failed_at = now()
    WHERE stripe_subscription_id = p_subscription_id
      AND status IS DISTINCT FROM 'canceled';

  ELSIF p_reason = 'updated' THEN
    -- 'canceled' son durumdur; gec gelen eski bir event onu geri acmaz
    UPDATE public.firm_subscriptions
    SET status = COALESCE(p_status, status),
        cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
        current_period_end = COALESCE(p_period_end, current_period_end)
    WHERE stripe_subscription_id = p_subscription_id
      AND status IS DISTINCT FROM 'canceled';

  ELSE
    UPDATE public.firm_subscriptions
    SET status = 'canceled',
        current_period_end = COALESCE(p_period_end, current_period_end)
    WHERE stripe_subscription_id = p_subscription_id;

    -- Yalnizca firmanin guncel aboneligi bu ise premium kapanir (premium_until
    -- gecmisi korunur).
    UPDATE public.firms
    SET is_premium = false,
        premium_source = NULL,
        stripe_subscription_id = NULL,
        subscription_plan = NULL
    WHERE id = v_firm_id
      AND stripe_subscription_id = p_subscription_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- (5) apply_payment_reversal: iade / itiraz (dispute). Event tekrarinda
-- ayni sonucu verir, bakiye asla negatife dusmez.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_payment_reversal(
  p_event_id text,
  p_payment_intent text,
  p_kind text,
  p_amount_minor integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_firm public.firms%ROWTYPE;
  v_sub public.firm_subscriptions%ROWTYPE;
  v_has_firm boolean := false;
  v_new_refunded integer;
  v_status text;
  v_reason text;
  v_target integer;
  v_delta integer;
  v_claw integer := 0;
  v_restored integer := 0;
  v_clawed integer;
  v_new_reason text;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('refund', 'dispute_opened', 'dispute_won', 'dispute_lost') THEN
    RAISE EXCEPTION 'invalid_kind' USING ERRCODE = 'P0001';
  END IF;

  IF p_payment_intent IS NULL THEN
    RETURN jsonb_build_object('matched', false);
  END IF;

  SELECT * INTO v_pay
  FROM public.payments
  WHERE payment_intent_id = p_payment_intent
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false);
  END IF;

  -- Ayni event ikinci kez gelirse degisiklik yok
  IF p_event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.coin_transactions WHERE idempotency_key = 'rev:' || p_event_id
  ) THEN
    RETURN jsonb_build_object('matched', true, 'duplicate', true, 'payment_id', v_pay.id);
  END IF;

  v_new_refunded := v_pay.refunded_minor;
  v_status := v_pay.status;
  v_reason := v_pay.review_reason;
  v_clawed := v_pay.coins_clawed_back;

  IF p_kind = 'refund' THEN
    v_new_refunded := GREATEST(v_pay.refunded_minor, COALESCE(p_amount_minor, 0));
    IF v_pay.status IN ('succeeded', 'partially_refunded', 'refunded') AND v_new_refunded > 0 THEN
      v_status := CASE
        WHEN v_pay.gross_minor > 0 AND v_new_refunded >= v_pay.gross_minor THEN 'refunded'
        ELSE 'partially_refunded'
      END;
    END IF;
  ELSIF p_kind = 'dispute_opened' THEN
    v_status := 'disputed';
  ELSIF p_kind = 'dispute_lost' THEN
    v_status := 'dispute_lost';
  ELSE
    v_status := CASE
      WHEN v_pay.gross_minor > 0 AND v_new_refunded >= v_pay.gross_minor THEN 'refunded'
      WHEN v_new_refunded > 0 THEN 'partially_refunded'
      ELSE 'succeeded'
    END;
  END IF;

  IF v_pay.kind = 'coin_pack' AND v_pay.coins_granted > 0 AND v_pay.gross_minor > 0 THEN
    -- Iadelerle gerekli olan geri alma miktari
    IF p_kind IN ('refund', 'dispute_won') THEN
      v_target := floor(v_pay.coins_granted::numeric * v_new_refunded / v_pay.gross_minor)::integer;
    ELSE
      v_target := v_pay.coins_granted;
    END IF;

    v_delta := v_target - v_pay.coins_clawed_back;

    IF v_pay.firm_id IS NOT NULL THEN
      SELECT * INTO v_firm FROM public.firms WHERE id = v_pay.firm_id FOR UPDATE;
      v_has_firm := FOUND;
    END IF;

    IF v_delta > 0 AND p_kind <> 'dispute_won' THEN
      v_claw := LEAST(v_delta, CASE WHEN v_has_firm THEN v_firm.coin_balance ELSE 0 END);

      IF v_claw > 0 THEN
        UPDATE public.firms SET coin_balance = coin_balance - v_claw WHERE id = v_firm.id;

        INSERT INTO public.coin_transactions (firm_id, type, amount, description, payment_id, idempotency_key)
        VALUES (v_firm.id, 'refund', -v_claw, 'Ödeme iadesi - jeton geri alındı', v_pay.id, 'rev:' || p_event_id);

        v_clawed := v_clawed + v_claw;
      END IF;

      IF v_claw < v_delta THEN
        v_new_reason := 'refund_shortfall:' || (v_delta - v_claw);
        IF v_reason IS NULL OR v_reason LIKE 'refund_shortfall:%' THEN
          v_reason := v_new_reason;
        ELSE
          v_reason := v_reason || ' | ' || v_new_reason;
        END IF;
      END IF;

    ELSIF v_delta < 0 AND p_kind = 'dispute_won' THEN
      -- Itiraz kazanildi: itiraz nedeniyle alinan jetonlar geri verilir
      IF v_has_firm THEN
        v_restored := -v_delta;

        UPDATE public.firms SET coin_balance = coin_balance + v_restored WHERE id = v_firm.id;

        INSERT INTO public.coin_transactions (firm_id, type, amount, description, payment_id, idempotency_key)
        VALUES (v_firm.id, 'refund', v_restored, 'Itiraz kazanıldı - jetonlar iade edildi', v_pay.id, 'rev:' || p_event_id);

        v_clawed := v_clawed - v_restored;
      ELSE
        v_reason := COALESCE(v_reason || ' | ', '') || 'restore_coins_manually';
      END IF;
    END IF;

  ELSIF v_pay.kind = 'pro_sub' THEN
    IF p_kind IN ('dispute_opened', 'dispute_lost')
       OR (p_kind = 'refund' AND v_pay.gross_minor > 0 AND v_new_refunded >= v_pay.gross_minor) THEN
      SELECT * INTO v_sub FROM public.firm_subscriptions WHERE firm_id = v_pay.firm_id;

      IF v_pay.firm_id IS NULL THEN
        v_reason := COALESCE(v_reason || ' | ', '') || 'firm_missing';
      -- Daha eski bir faturanin iadesi guncel odenmis donemi kapatmaz
      ELSIF NOT FOUND OR v_sub.last_invoice_id IS NULL OR v_sub.last_invoice_id = v_pay.provider_object_id THEN
        UPDATE public.firms
        SET is_premium = false,
            premium_until = LEAST(premium_until, now())
        WHERE id = v_pay.firm_id;
      ELSE
        v_reason := COALESCE(v_reason || ' | ', '') || 'refund_of_older_invoice';
      END IF;

    ELSIF p_kind = 'dispute_won' THEN
      v_reason := COALESCE(v_reason || ' | ', '') || 'restore_premium_manually';
    END IF;
  END IF;

  UPDATE public.payments
  SET status = v_status,
      refunded_minor = v_new_refunded,
      coins_clawed_back = v_clawed,
      review_reason = v_reason
  WHERE id = v_pay.id;

  RETURN jsonb_build_object(
    'matched', true,
    'payment_id', v_pay.id,
    'status', v_status,
    'clawed', v_claw,
    'restored', v_restored,
    'review_reason', v_reason
  );
END;
$$;

-- ---------------------------------------------------------------------
-- (6) grant_coins: hediye / promosyon / duzeltme. payments'a ASLA yazmaz.
-- ('ilk lead ucretsiz' gibi akislar anahtar 'first_lead:'||firm_id ile kullanir.)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_coins(
  p_firm uuid,
  p_amount integer,
  p_type text,
  p_note text,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm public.firms%ROWTYPE;
  v_tx uuid;
  v_balance integer;
  v_description text;
BEGIN
  IF p_type IS NULL OR p_type NOT IN ('grant', 'promo', 'admin_adjust', 'bonus') THEN
    RAISE EXCEPTION 'invalid_type' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount IS NULL
     OR p_amount = 0
     OR abs(p_amount) > 100000
     OR (p_amount < 0 AND p_type <> 'admin_adjust') THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_firm FROM public.firms WHERE id = p_firm FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'firm_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.coin_transactions WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('granted', false, 'duplicate', true, 'new_balance', v_firm.coin_balance);
  END IF;

  IF v_firm.coin_balance + p_amount < 0 THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0001';
  END IF;

  v_description := COALESCE(
    NULLIF(btrim(p_note), ''),
    CASE p_type
      WHEN 'promo' THEN 'Promosyon jetonu'
      WHEN 'bonus' THEN 'Bonus jeton'
      WHEN 'admin_adjust' THEN 'Yönetici düzeltmesi'
      ELSE 'Jeton hediyesi'
    END
  );

  INSERT INTO public.coin_transactions (firm_id, type, amount, description, idempotency_key)
  VALUES (v_firm.id, p_type, p_amount, v_description, p_idempotency_key)
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_tx;

  IF v_tx IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'duplicate', true, 'new_balance', v_firm.coin_balance);
  END IF;

  UPDATE public.firms
  SET coin_balance = coin_balance + p_amount
  WHERE id = v_firm.id
  RETURNING coin_balance INTO v_balance;

  RETURN jsonb_build_object('granted', true, 'tx_id', v_tx, 'new_balance', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_coins(
  p_firm uuid,
  p_amount integer,
  p_type text,
  p_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;

  RETURN public.grant_coins(p_firm, p_amount, p_type, p_note, NULL);
END;
$$;

-- ---------------------------------------------------------------------
-- (7) lead iadesi: talep (firma) ve karar (admin)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_lead_refund(p_lead uuid, p_reason text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  refund_window_hours CONSTANT integer := 72;
  v_uid uuid := auth.uid();
  v_purchase public.lead_purchases%ROWTYPE;
  v_request uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('wrong_number', 'unreachable', 'not_a_real_request', 'duplicate', 'other') THEN
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_purchase
  FROM public.lead_purchases
  WHERE lead_id = p_lead
    AND firm_id = v_uid
    AND status IN ('paid', 'refunded')
  ORDER BY purchased_at DESC
  LIMIT 1;

  IF FOUND AND EXISTS (
    SELECT 1 FROM public.lead_refund_requests WHERE purchase_id = v_purchase.id
  ) THEN
    RAISE EXCEPTION 'refund_already_requested' USING ERRCODE = 'P0001';
  END IF;

  IF NOT FOUND
     OR v_purchase.status <> 'paid'
     OR v_purchase.purchased_at < now() - make_interval(hours => refund_window_hours) THEN
    RAISE EXCEPTION 'refund_window_closed' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.lead_refund_requests (purchase_id, lead_id, firm_row_id, user_id, reason, note)
  VALUES (v_purchase.id, p_lead, v_purchase.firm_row_id, v_uid, p_reason, left(p_note, 1000))
  ON CONFLICT (purchase_id) DO NOTHING
  RETURNING id INTO v_request;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'refund_already_requested' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('request_id', v_request, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_lead_refund(p_request uuid, p_approve boolean, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.lead_refund_requests%ROWTYPE;
  v_purchase public.lead_purchases%ROWTYPE;
  v_firm_id uuid;
  v_amount integer;
  v_balance integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_req FROM public.lead_refund_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'request_already_resolved' USING ERRCODE = 'P0001';
  END IF;

  IF NOT COALESCE(p_approve, false) THEN
    UPDATE public.lead_refund_requests
    SET status = 'rejected',
        resolved_at = now(),
        resolved_by = auth.uid(),
        resolution_note = left(p_note, 1000)
    WHERE id = v_req.id;

    RETURN jsonb_build_object('status', 'rejected');
  END IF;

  SELECT * INTO v_purchase FROM public.lead_purchases WHERE id = v_req.purchase_id FOR UPDATE;

  v_firm_id := COALESCE(v_purchase.firm_row_id, v_req.firm_row_id);
  IF v_firm_id IS NULL AND (SELECT count(*) FROM public.firms WHERE user_id = v_purchase.firm_id) = 1 THEN
    SELECT id INTO v_firm_id FROM public.firms WHERE user_id = v_purchase.firm_id;
  END IF;

  IF v_firm_id IS NULL THEN
    RAISE EXCEPTION 'firm_not_found' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.firms WHERE id = v_firm_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'firm_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_amount := round(v_purchase.amount)::integer;

  UPDATE public.firms
  SET coin_balance = coin_balance + v_amount
  WHERE id = v_firm_id
  RETURNING coin_balance INTO v_balance;

  INSERT INTO public.coin_transactions (firm_id, type, amount, description, lead_id, idempotency_key)
  VALUES (
    v_firm_id, 'refund', v_amount, 'Müşteri adayı iadesi', v_purchase.lead_id,
    'lead_refund:' || p_request
  );

  UPDATE public.lead_purchases
  SET status = 'refunded',
      refunded_at = now()
  WHERE id = v_purchase.id;

  UPDATE public.lead_refund_requests
  SET status = 'approved',
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution_note = left(p_note, 1000)
  WHERE id = v_req.id;

  RETURN jsonb_build_object('status', 'approved', 'refunded_coins', v_amount, 'new_balance', v_balance);
END;
$$;

-- ---------------------------------------------------------------------
-- (8) expire_premiums: odemeli (paid) premium icin 3 gun tolerans, gecikmis
-- yenileme webhook'u odeme yapan firmayi dusurmesin. premium_until NULL olan
-- elle (comp) premium hic bitmez (eski davranis).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_premiums()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.firms
  SET is_premium = false,
      premium_source = NULL
  WHERE is_premium
    AND premium_until IS NOT NULL
    AND premium_until + (CASE WHEN premium_source = 'paid' THEN interval '3 days' ELSE interval '0' END) < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------
-- Yetkiler: varsayilan olarak yalnizca service_role
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.lead_is_purchasable_by(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.money_tax_minor(integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_lead(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_coin_pack_payment(text, text, text, uuid, uuid, text, integer, integer, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_subscription_payment(text, text, text, text, text, uuid, uuid, text, timestamptz, integer, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_subscription_state(text, text, boolean, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_payment_reversal(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_coins(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_grant_coins(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_lead_refund(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_lead_refund(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_premiums() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.lead_is_purchasable_by(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.money_tax_minor(integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_lead(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_coin_pack_payment(text, text, text, uuid, uuid, text, integer, integer, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_subscription_payment(text, text, text, text, text, uuid, uuid, text, timestamptz, integer, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_subscription_state(text, text, boolean, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_payment_reversal(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_coins(uuid, integer, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_coins(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_lead_refund(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_lead_refund(uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_premiums() TO service_role;

-- Yalnizca bu uc fonksiyon istemciden cagrilabilir (icerde yetki kontrolu var)
GRANT EXECUTE ON FUNCTION public.request_lead_refund(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_lead_refund(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_coins(uuid, integer, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- Self-check: eksik fonksiyon, fazla yetki veya eksik koruma varsa migration
-- hata verir.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_service_only text[] := ARRAY[
    'public.lead_is_purchasable_by(uuid,uuid)',
    'public.money_tax_minor(integer,text,text)',
    'public.purchase_lead(uuid,uuid)',
    'public.record_coin_pack_payment(text,text,text,uuid,uuid,text,integer,integer,text,boolean)',
    'public.record_subscription_payment(text,text,text,text,text,uuid,uuid,text,timestamptz,integer,text,boolean)',
    'public.sync_subscription_state(text,text,boolean,timestamptz,text)',
    'public.apply_payment_reversal(text,text,text,integer)',
    'public.grant_coins(uuid,integer,text,text,text)',
    'public.expire_premiums()'
  ];
  v_client_callable text[] := ARRAY[
    'public.admin_grant_coins(uuid,integer,text,text)',
    'public.request_lead_refund(uuid,text,text)',
    'public.resolve_lead_refund(uuid,boolean,text)'
  ];
  v_sig text;
  v_role text;
BEGIN
  FOREACH v_sig IN ARRAY v_service_only || v_client_callable LOOP
    IF to_regprocedure(v_sig) IS NULL THEN
      RAISE EXCEPTION 'money self-check: % eksik', v_sig;
    END IF;
  END LOOP;

  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      FOREACH v_sig IN ARRAY v_service_only LOOP
        IF has_function_privilege(v_role, v_sig, 'EXECUTE') THEN
          RAISE EXCEPTION 'money self-check: % icin % EXECUTE yetkisi var', v_sig, v_role;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    FOREACH v_sig IN ARRAY v_client_callable LOOP
      IF has_function_privilege('anon', v_sig, 'EXECUTE') THEN
        RAISE EXCEPTION 'money self-check: % anon tarafindan cagrilabiliyor', v_sig;
      END IF;
    END LOOP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'lead_purchases_lead_firm_uniq'
  ) THEN
    RAISE EXCEPTION 'money self-check: lead_purchases_lead_firm_uniq eksik';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'firms_coin_balance_nonneg' AND conrelid = 'public.firms'::regclass
  ) THEN
    RAISE EXCEPTION 'money self-check: firms_coin_balance_nonneg eksik';
  END IF;
END $$;
