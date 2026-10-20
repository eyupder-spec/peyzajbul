-- Add price_jeton column to leads table if not exists
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS price_jeton integer DEFAULT 5;

-- Create pricing calculation function
CREATE OR REPLACE FUNCTION public.calculate_lead_price()
RETURNS TRIGGER AS $$
DECLARE
    base_price NUMERIC := 5;
    loc_mult NUMERIC := 1.0;
    area_mult NUMERIC := 1.0;
    budget_mult NUMERIC := 1.0;
    urg_mult NUMERIC := 1.0;
    note_bonus NUMERIC := 0;
    photo_bonus NUMERIC := 0;
    raw_price NUMERIC;
    total NUMERIC;
    tier1_cities TEXT[] := ARRAY['İstanbul', 'İzmir', 'Muğla']; -- Bodrum vs Muğla'da
    tier2_cities TEXT[] := ARRAY['Ankara', 'Antalya', 'Bursa', 'Kocaeli'];
BEGIN
    -- 1. Base Price by Service Type
    IF NEW.service_type ILIKE '%Mimarlığı%' OR NEW.service_type ILIKE '%Havuz%' THEN
        base_price := 25;
    ELSIF NEW.service_type ILIKE '%Tasarım%' OR NEW.service_type ILIKE '%Zemin%' THEN
        base_price := 15;
    ELSIF NEW.service_type ILIKE '%Sulama%' THEN
        base_price := 10;
    ELSE
        base_price := 5; -- Bakım, Ağaçlandırma vs.
    END IF;

    -- 2. Location Multiplier
    IF NEW.city = ANY(tier1_cities) THEN
        loc_mult := 1.5;
    ELSIF NEW.city = ANY(tier2_cities) THEN
        loc_mult := 1.2;
    ELSE
        loc_mult := 1.0;
    END IF;

    -- 3. Area Multiplier
    IF NEW.project_size ILIKE '%500-1000%' OR NEW.project_size ILIKE '%1000m2+%' THEN
        area_mult := 2.5;
    ELSIF NEW.project_size ILIKE '%100-250%' OR NEW.project_size ILIKE '%250-500%' THEN
        area_mult := 1.7;
    ELSIF NEW.project_size ILIKE '%50-100%' THEN
        area_mult := 1.3;
    ELSE
        area_mult := 1.0;
    END IF;

    -- 4. Budget Multiplier
    IF NEW.budget ILIKE '%200.000%' OR NEW.budget ILIKE '%500.000%' THEN
        budget_mult := 2.0;
    ELSIF NEW.budget ILIKE '%50.000%' OR NEW.budget ILIKE '%100.000%' THEN
        budget_mult := 1.5;
    ELSIF NEW.budget ILIKE '%Fiyat araştır%' OR NEW.budget ILIKE '%Belirsiz%' THEN
        budget_mult := 0.8;
    ELSE
        budget_mult := 1.0;
    END IF;

    -- 5. Urgency Multiplier
    IF NEW.timeline ILIKE '%Hemen%' THEN
        urg_mult := 1.2;
    ELSE
        urg_mult := 1.0;
    END IF;

    -- 6. Quality Add-ons
    IF NEW.notes IS NOT NULL AND length(NEW.notes) > 50 THEN
        note_bonus := 5;
    END IF;
    
    IF NEW.photo_urls IS NOT NULL AND array_length(NEW.photo_urls, 1) > 0 THEN
        photo_bonus := 5;
    END IF;

    -- 7. Calculate Total
    raw_price := base_price * loc_mult * area_mult * budget_mult * urg_mult;
    total := raw_price + note_bonus + photo_bonus;

    -- 8. Apply Limits (Min $5, Max $55)
    NEW.price_jeton := LEAST(55, GREATEST(5, ROUND(total)));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS trigger_calculate_lead_price ON public.leads;

-- Create trigger
CREATE TRIGGER trigger_calculate_lead_price
BEFORE INSERT OR UPDATE OF service_type, city, project_size, budget, timeline, notes, photo_urls ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.calculate_lead_price();
