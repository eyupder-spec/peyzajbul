
-- Create lead scoring function
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    score integer := 0;
BEGIN
    -- Budget scoring
    CASE NEW.budget
        WHEN '100.000 ₺ üzeri' THEN score := score + 30;
        WHEN '30.000 – 100.000 ₺' THEN score := score + 20;
        WHEN '10.000 – 30.000 ₺' THEN score := score + 10;
        ELSE score := score + 0;
    END CASE;

    -- Timeline scoring
    CASE NEW.timeline
        WHEN 'Hemen (1–2 hafta)' THEN score := score + 25;
        WHEN '1 ay içinde' THEN score := score + 15;
        WHEN '3 ay içinde' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;

    -- Project size scoring
    CASE NEW.project_size
        WHEN '1000 m² üzeri' THEN score := score + 20;
        WHEN '500–1000 m²' THEN score := score + 15;
        WHEN '100–500 m²' THEN score := score + 10;
        WHEN '0–100 m²' THEN score := score + 5;
        ELSE score := score + 5;
    END CASE;

    -- Email verified (user exists = email verified with auto-confirm)
    score := score + 10;

    -- Phone provided
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        score := score + 15;
    END IF;

    NEW.lead_score := score;
    RETURN NEW;
END;
$$;

-- Create trigger for lead scoring
CREATE TRIGGER calculate_lead_score_trigger
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_lead_score();

-- Admin RLS policies for leads (full access)
CREATE POLICY "Admins can read all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all leads"
ON public.leads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin RLS policies for user_roles
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin RLS for lead_purchases
CREATE POLICY "Admins can read all purchases"
ON public.lead_purchases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
