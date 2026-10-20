
-- Function to auto-assign leads to matching firms (up to 3)
-- Prioritizes premium firms, then round-robin by updated_at
CREATE OR REPLACE FUNCTION public.assign_leads_to_firms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    matched_firms uuid[];
BEGIN
    SELECT array_agg(user_id)
    INTO matched_firms
    FROM (
        SELECT user_id
        FROM public.firms
        WHERE city = NEW.city
          AND is_approved = true
          AND is_active = true
        ORDER BY is_premium DESC, updated_at ASC
        LIMIT 3
    ) sub;

    IF matched_firms IS NOT NULL THEN
        NEW.assigned_firms := matched_firms;
    ELSE
        NEW.assigned_firms := '{}'::uuid[];
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger: runs BEFORE INSERT on leads
CREATE TRIGGER trg_assign_leads_to_firms
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_leads_to_firms();
