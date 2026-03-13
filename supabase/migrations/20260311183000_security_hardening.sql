
-- 1. SECURE FIRMS TABLE: Prevent users from updating sensitive columns
-- We use a trigger to ensure only admins or service_role can change balance/premium status

CREATE OR REPLACE FUNCTION public.check_firm_update_security()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Service role (Edge Functions) bypass: auth.uid() is null for service_role
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Admin bypass
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- 3. For regular authenticated users, block sensitive column changes
  IF (OLD.coin_balance IS DISTINCT FROM NEW.coin_balance) OR
     (OLD.is_approved IS DISTINCT FROM NEW.is_approved) OR
     (OLD.is_premium IS DISTINCT FROM NEW.is_premium) OR
     (OLD.premium_until IS DISTINCT FROM NEW.premium_until) OR
     (OLD.user_id IS DISTINCT FROM NEW.user_id)
  THEN
    RAISE EXCEPTION 'Hata: Hassas kolonları güncelleme yetkiniz yok. (Jeton, Premium, Onay Durumu vb.)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_firm_update_security ON public.firms;
CREATE TRIGGER tr_check_firm_update_security
  BEFORE UPDATE ON public.firms
  FOR EACH ROW
  EXECUTE FUNCTION public.check_firm_update_security();


-- 2. SECURE LEAD PURCHASES: Only service_role or admin can insert
-- First, drop ANY existing insert policies to be safe
DROP POLICY IF EXISTS "Service role can insert purchases" ON public.lead_purchases;
DROP POLICY IF EXISTS "Firms can insert own purchases" ON public.lead_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.lead_purchases;

CREATE POLICY "Only admins can insert purchases manually"
ON public.lead_purchases
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 3. SECURE COIN TRANSACTIONS: Only service_role or admin can insert
DROP POLICY IF EXISTS "Firms can insert own transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.coin_transactions;

CREATE POLICY "Only admins can insert transactions manually"
ON public.coin_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 4. IDEMPOTENCY: Make sure stripe_session_id is unique in transactions to prevent double counting
-- First, clean up any NULLs if they exist (optional but safe)
-- ALTER TABLE public.coin_transactions ADD CONSTRAINT unique_stripe_session_id UNIQUE (stripe_session_id);
-- Note: We only want it unique for successful 'purchase' types
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_purchase_session ON public.coin_transactions (stripe_session_id) WHERE (stripe_session_id IS NOT NULL);

-- 5. SECURE USER ROLES: Only admins can assign roles
DROP POLICY IF EXISTS "Admins can do everything on user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
