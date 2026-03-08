
-- Add premium fields to firms
ALTER TABLE public.firms 
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS detailed_services jsonb DEFAULT '[]'::jsonb;

-- Gallery table for premium firms
CREATE TABLE public.firm_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.firm_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view gallery of approved firms" ON public.firm_gallery
  FOR SELECT USING (
    firm_id IN (SELECT id FROM public.firms WHERE is_approved = true AND is_active = true)
  );

CREATE POLICY "Firm owners can manage own gallery" ON public.firm_gallery
  FOR ALL USING (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
  ) WITH CHECK (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all gallery" ON public.firm_gallery
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Reviews table
CREATE TABLE public.firm_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.firm_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved reviews" ON public.firm_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Anyone authenticated can submit review" ON public.firm_reviews
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage all reviews" ON public.firm_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('firm-gallery', 'firm-gallery', true);

CREATE POLICY "Anyone can view firm gallery files" ON storage.objects
  FOR SELECT USING (bucket_id = 'firm-gallery');

CREATE POLICY "Authenticated users can upload to firm gallery" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'firm-gallery');

CREATE POLICY "Authenticated users can delete own firm gallery" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'firm-gallery');

-- Enable realtime for gallery
ALTER PUBLICATION supabase_realtime ADD TABLE public.firm_gallery;
