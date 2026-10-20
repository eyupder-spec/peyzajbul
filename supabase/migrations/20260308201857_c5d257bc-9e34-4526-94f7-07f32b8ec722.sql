
ALTER TABLE public.firms ADD COLUMN logo_url text;

-- Create storage bucket for firm logos
INSERT INTO storage.buckets (id, name, public) VALUES ('firm-logos', 'firm-logos', true);

-- RLS: Firm owners can upload their own logo
CREATE POLICY "Firm owners can upload own logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'firm-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.firms WHERE user_id = auth.uid()
  )
);

-- RLS: Firm owners can update their own logo
CREATE POLICY "Firm owners can update own logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'firm-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.firms WHERE user_id = auth.uid()
  )
);

-- RLS: Firm owners can delete their own logo
CREATE POLICY "Firm owners can delete own logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'firm-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.firms WHERE user_id = auth.uid()
  )
);

-- RLS: Admins can manage all logos
CREATE POLICY "Admins can manage firm logos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'firm-logos' AND
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'firm-logos' AND
  public.has_role(auth.uid(), 'admin')
);

-- RLS: Public can view logos
CREATE POLICY "Public can view firm logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'firm-logos');
