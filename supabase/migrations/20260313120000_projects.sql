-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  title         text NOT NULL,
  slug          text NOT NULL,
  description   text,
  cover_image   text,
  category      text NOT NULL,          -- hizmet slug (bahce-tasarimi vb.)
  city          text NOT NULL,           -- il slug (istanbul vb.)
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order    integer DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, slug)
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public: published projeler, onaylı+aktif+premium firmalardan
CREATE POLICY "Public can view published premium projects"
  ON public.projects FOR SELECT
  USING (
    status = 'published'
    AND firm_id IN (
      SELECT id FROM public.firms
      WHERE is_approved = true AND is_active = true AND is_premium = true
    )
  );

-- Firm owner: kendi projeleri üzerinde tam yetki
CREATE POLICY "Firm owners can manage own projects"
  ON public.projects FOR ALL
  USING (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
  )
  WITH CHECK (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
  );

-- Admin: tüm projelerde tam yetki
CREATE POLICY "Admins can manage all projects"
  ON public.projects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================
-- PROJECT IMAGES TABLE
-- =====================================================
CREATE TABLE public.project_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url     text NOT NULL,
  caption       text,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

-- Public: published proje görselleri
CREATE POLICY "Public can view published project images"
  ON public.project_images FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.firms f ON f.id = p.firm_id
      WHERE p.status = 'published' AND f.is_approved = true AND f.is_active = true AND f.is_premium = true
    )
  );

-- Firm owner: kendi proje görselleri
CREATE POLICY "Firm owners can manage own project images"
  ON public.project_images FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.firms f ON f.id = p.firm_id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.firms f ON f.id = p.firm_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Admin: tüm proje görselleri
CREATE POLICY "Admins can manage all project images"
  ON public.project_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- =====================================================
-- STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', true);

CREATE POLICY "Anyone can view project images" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can delete project images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'project-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.firms f ON f.id = p.firm_id
        WHERE f.user_id = auth.uid() 
        AND p.id::text = (storage.foldername(name))[2]
      )
    )
  );
