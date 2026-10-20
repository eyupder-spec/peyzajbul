-- =====================================================================
-- Fiyatlandirma (WP07) 2/4: lead sonucu ve satin alma sayilari
--
--   lead_purchases.outcome*      firmanin bildirdigi sonuc (ulasildi / ulasilamadi / is aldim / olmadi)
--   set_lead_outcome             firma kendi satin almasinin sonucunu yazar
--   get_lead_purchase_counts     lead basina 'paid' satin alma sayisi (tum firmalar toplami)
--
-- Ek ve tekrar calistirilabilir. Var olan kolonlara, politikalara ve verilere dokunmaz.
--
-- get_lead_purchase_counts, WP03'un 20261020095100_sec_p2_lead_purchases_counts.sql dosyasindaki
-- tanimla birebir aynidir (CREATE OR REPLACE): bu dosya tek basina uygulansa da firma paneli
-- calisir. Fonksiyon yalnizca lead basina toplam sayiyi dondurur; firmalarin birbirinin satin
-- almalarini gormesi gerekmez. 'Firms can read all purchases for FOMO' (USING true) politikasi
-- panel bu fonksiyonu kullandiktan sonra kaldirilabilir (WP03).
--
-- Rollback: DROP FUNCTION public.set_lead_outcome(uuid, text, integer);
--   ALTER TABLE public.lead_purchases DROP COLUMN outcome, DROP COLUMN outcome_at,
--     DROP COLUMN outcome_value_try, DROP COLUMN refund_requested_at;
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) lead_purchases: sonuc kolonlari
-- Not: outcome_value_try firmanin kendi bildirimidir, dogrulanmis ciro degildir.
-- refund_requested_at yalnizca 'ulasilamadi' secildiginde bir kez dolar; asil iade talebi
-- public.request_lead_refund (WP04) ile olusur, admin onayi gerekir.
-- ---------------------------------------------------------------------
ALTER TABLE public.lead_purchases
  ADD COLUMN IF NOT EXISTS outcome text
    CHECK (outcome IN ('reached', 'not_reached', 'won', 'lost')),
  ADD COLUMN IF NOT EXISTS outcome_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_value_try integer
    CHECK (outcome_value_try >= 0),
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz;

-- ---------------------------------------------------------------------
-- (b) set_lead_outcome
-- lead_purchases.firm_id auth kullanici id'sidir (bkz. 20260308204326); yalnizca kendi,
-- 'paid' durumundaki satin almasi guncellenebilir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_lead_outcome(
  p_lead_id uuid,
  p_outcome text,
  p_value_try integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.lead_purchases%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('reached', 'not_reached', 'won', 'lost') THEN
    RAISE EXCEPTION 'invalid_outcome' USING ERRCODE = 'P0001';
  END IF;

  IF p_value_try IS NOT NULL AND p_value_try < 0 THEN
    RAISE EXCEPTION 'invalid_value' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lead_purchases lp
  SET outcome = p_outcome,
      outcome_at = now(),
      outcome_value_try = CASE WHEN p_outcome = 'won' THEN p_value_try ELSE NULL END,
      refund_requested_at = CASE
        WHEN p_outcome = 'not_reached' THEN coalesce(lp.refund_requested_at, now())
        ELSE lp.refund_requested_at
      END
  WHERE lp.lead_id = p_lead_id
    AND lp.firm_id = v_uid
    AND lp.status = 'paid'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_not_found' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'outcome', v_row.outcome,
    'outcome_value_try', v_row.outcome_value_try,
    'refund_requested_at', v_row.refund_requested_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_lead_outcome(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_lead_outcome(uuid, text, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- (c) get_lead_purchase_counts
-- 'paid' sayma kurali spend-coins / purchase_lead ile aynidir (3 alici siniri).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_lead_purchase_counts(p_lead_ids uuid[])
RETURNS TABLE (lead_id uuid, purchase_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Oturum açmanız gerekiyor.' USING ERRCODE = '42501';
  END IF;

  IF p_lead_ids IS NULL OR cardinality(p_lead_ids) = 0 THEN
    RETURN;
  END IF;

  IF cardinality(p_lead_ids) > 200 THEN
    RAISE EXCEPTION 'En fazla 200 talep sorgulanabilir.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT lp.lead_id, count(*)::integer
  FROM public.lead_purchases lp
  WHERE lp.lead_id = ANY (p_lead_ids)
    AND lp.status = 'paid'
  GROUP BY lp.lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lead_purchase_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_purchase_counts(uuid[]) TO authenticated;
