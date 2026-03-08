
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    score integer := 0;
BEGIN
    -- Budget scoring
    CASE NEW.budget
        WHEN '100000+' THEN score := score + 30;
        WHEN '30000-100000' THEN score := score + 20;
        WHEN '10000-30000' THEN score := score + 10;
        ELSE score := score + 0;
    END CASE;

    -- Timeline scoring
    CASE NEW.timeline
        WHEN 'hemen' THEN score := score + 25;
        WHEN '1-ay' THEN score := score + 15;
        WHEN '3-ay' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;

    -- Project size scoring
    CASE NEW.project_size
        WHEN '1000+' THEN score := score + 20;
        WHEN '500-1000' THEN score := score + 15;
        WHEN '100-500' THEN score := score + 10;
        ELSE score := score + 5;
    END CASE;

    -- Email verified
    score := score + 10;

    -- Phone provided
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        score := score + 15;
    END IF;

    NEW.lead_score := score;
    RETURN NEW;
END;
$function$;
