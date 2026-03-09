
-- Add new columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_type text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS scope text[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS irrigation_type text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS irrigation_system text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS water_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS property_type text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS area_size text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS current_condition text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS photo_urls text[];

-- Make project_size nullable (we're replacing it with area_size)
ALTER TABLE public.leads ALTER COLUMN project_size DROP NOT NULL;

-- Create lead-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-photos', 'lead-photos', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to lead-photos bucket
CREATE POLICY "Authenticated users can upload lead photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-photos');

-- Allow public to read lead photos
CREATE POLICY "Public can read lead photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'lead-photos');

-- Update calculate_lead_score function for new values
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    score integer := 0;
BEGIN
    -- Project type bonus (commercial = higher value)
    IF NEW.project_type = 'commercial' THEN
        score := score + 10;
    END IF;

    -- Budget scoring (residential)
    CASE NEW.budget
        WHEN '200000+' THEN score := score + 30;
        WHEN '75000-200000' THEN score := score + 25;
        WHEN '25000-75000' THEN score := score + 15;
        WHEN '25000-alti' THEN score := score + 5;
        -- Commercial budgets
        WHEN '2000000+' THEN score := score + 30;
        WHEN '750000-2000000' THEN score := score + 25;
        WHEN '250000-750000' THEN score := score + 15;
        WHEN '250000-alti' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;

    -- Timeline scoring
    CASE NEW.timeline
        WHEN 'hemen' THEN score := score + 25;
        WHEN '1-ay' THEN score := score + 20;
        WHEN '1-3-ay' THEN score := score + 10;
        WHEN '3-6-ay' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;

    -- Area size scoring (residential)
    CASE NEW.area_size
        WHEN '1000+' THEN score := score + 20;
        WHEN '500-1000' THEN score := score + 15;
        WHEN '150-500' THEN score := score + 10;
        WHEN '50-150' THEN score := score + 5;
        -- Commercial area sizes
        WHEN '20000+' THEN score := score + 20;
        WHEN '5000-20000' THEN score := score + 15;
        WHEN '1000-5000' THEN score := score + 10;
        WHEN '1000-alti' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;

    -- Fallback to old project_size if area_size is null
    IF NEW.area_size IS NULL AND NEW.project_size IS NOT NULL THEN
        CASE NEW.project_size
            WHEN '1000+' THEN score := score + 20;
            WHEN '500-1000' THEN score := score + 15;
            WHEN '100-500' THEN score := score + 10;
            ELSE score := score + 5;
        END CASE;
    END IF;

    -- Email verified
    score := score + 10;

    -- Phone provided
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        score := score + 5;
    END IF;

    NEW.lead_score := score;
    RETURN NEW;
END;
$$;

-- Update notify_firms_on_new_lead to include new fields
CREATE OR REPLACE FUNCTION public.notify_firms_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  firm_record RECORD;
  payload jsonb;
  base_url text := 'https://tfydaaxgaomdvthclcse.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmeWRhYXhnYW9tZHZ0aGNsY3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcxNDcsImV4cCI6MjA4ODU1MzE0N30.VENacbhHGwAxvhv0a_g0Hvrywor5k2PhHKGykY368Qo';
BEGIN
  IF NEW.assigned_firms IS NOT NULL AND array_length(NEW.assigned_firms, 1) > 0 THEN
    FOR firm_record IN
      SELECT id, company_name, telegram_chat_id, user_id
      FROM public.firms
      WHERE user_id = ANY(NEW.assigned_firms)
    LOOP
      IF firm_record.telegram_chat_id IS NOT NULL THEN
        payload := jsonb_build_object(
          'chat_id', firm_record.telegram_chat_id,
          'firm_name', firm_record.company_name,
          'project_type', COALESCE(NEW.project_type, ''),
          'service_type', NEW.service_type,
          'city', NEW.city,
          'district', NEW.district,
          'budget', NEW.budget,
          'area_size', COALESCE(NEW.area_size, NEW.project_size),
          'timeline', NEW.timeline,
          'lead_score', NEW.lead_score
        );
        PERFORM net.http_post(
          url := base_url || '/functions/v1/notify-telegram',
          body := payload::jsonb,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || anon_key
          )
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
