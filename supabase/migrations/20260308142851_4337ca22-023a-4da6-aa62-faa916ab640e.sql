
-- Create firms table with business details and approval status
CREATE TABLE public.firms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    company_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    city text NOT NULL,
    district text,
    address text,
    tax_number text,
    description text,
    services text[] DEFAULT '{}',
    is_approved boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

-- Firms can read their own record
CREATE POLICY "Firms can read own record"
ON public.firms
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Firms can update their own record
CREATE POLICY "Firms can update own record"
ON public.firms
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert their own firm
CREATE POLICY "Users can insert own firm"
ON public.firms
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can do everything on firms
CREATE POLICY "Admins can read all firms"
ON public.firms
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all firms"
ON public.firms
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete firms"
ON public.firms
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_firms_updated_at
    BEFORE UPDATE ON public.firms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
