
-- Add coin_balance to firms
ALTER TABLE public.firms ADD COLUMN coin_balance integer NOT NULL DEFAULT 0;

-- Create coin_transactions table
CREATE TABLE public.coin_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id uuid NOT NULL,
    type text NOT NULL CHECK (type IN ('purchase', 'spend', 'bonus')),
    amount integer NOT NULL,
    description text,
    lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    stripe_session_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- Firms can read own transactions
CREATE POLICY "Firms can read own transactions"
ON public.coin_transactions
FOR SELECT
TO authenticated
USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

-- Admins can read all transactions
CREATE POLICY "Admins can read all transactions"
ON public.coin_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
