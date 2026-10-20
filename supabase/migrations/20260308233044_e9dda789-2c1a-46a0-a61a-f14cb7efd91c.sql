
-- Add is_claimed column to firms
ALTER TABLE public.firms ADD COLUMN is_claimed boolean NOT NULL DEFAULT false;

-- Create claim_requests table
CREATE TABLE public.claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  phone text NOT NULL,
  tax_number text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can insert their own claims
CREATE POLICY "Users can insert own claims"
ON public.claim_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS: Users can read own claims
CREATE POLICY "Users can read own claims"
ON public.claim_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- RLS: Admins can manage all claims
CREATE POLICY "Admins can manage all claims"
ON public.claim_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_claim_requests_updated_at
  BEFORE UPDATE ON public.claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
