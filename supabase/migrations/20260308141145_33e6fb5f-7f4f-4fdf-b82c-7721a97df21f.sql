
-- Create lead_purchases table
CREATE TABLE public.lead_purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    firm_id uuid NOT NULL,
    stripe_session_id text,
    amount numeric(10,2) NOT NULL DEFAULT 20.00,
    status text NOT NULL DEFAULT 'paid',
    purchased_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

-- Firms can read their own purchases
CREATE POLICY "Firms can read own purchases"
ON public.lead_purchases
FOR SELECT
TO authenticated
USING (firm_id = auth.uid());

-- Service role can insert (from webhook)
CREATE POLICY "Service role can insert purchases"
ON public.lead_purchases
FOR INSERT
TO authenticated
WITH CHECK (firm_id = auth.uid());

-- Firms with role 'firm' can read leads assigned to them
CREATE POLICY "Firms can read assigned leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'firm') 
    AND auth.uid() = ANY(assigned_firms)
);

-- Enable realtime for lead_purchases
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_purchases;
