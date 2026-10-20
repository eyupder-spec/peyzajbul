-- plants tablosuna görsel sütunu ekleme
ALTER TABLE public.plants 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- storage bucket for plants
INSERT INTO storage.buckets (id, name, public)
VALUES ('plants', 'plants', true)
ON CONFLICT (id) DO NOTHING;
