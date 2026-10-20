-- =====================================================================
-- SEC P1 / 4 of 5: Storage policies and bucket limits
--
-- APPLY ORDER:
--   Apply together with the other *_sec_p1_* files, in filename order.
--
-- PREREQUISITES:
--   * None. Public object URLs keep working: every bucket stays public, only
--     writes and (for lead-photos) listing are restricted.
--   * Policies are created with distinct names and every DROP POLICY IF EXISTS
--     uses the exact original name, so the file can be re-run safely.
--   * Bucket 'firm-reviews' exists live but in no migration. Audit its policies:
--       select * from pg_policies where schemaname = 'storage';
--   * Smoke test after applying: upload a gallery photo as a firm owner,
--     upload a lead photo from the quote form, upload a plant image as admin.
--
-- ROLLBACK: drop the policies created here and recreate the dropped ones from
--   20260308160142 (firm-gallery), 20260313120000_projects.sql (project-images),
--   20260504010000 (plants), 20260504020000 (materials) and
--   20260309000353 (lead-photos).
-- =====================================================================


-- ---------------------------------------------------------------------
-- firm-gallery: paths are '<firm_id>/<file>' (FirmaGaleri, FirmPhotoCrawler, AdminPanel).
-- Before: any signed-in user could upload to and delete from any firm's gallery.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload to firm gallery" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own firm gallery" ON storage.objects;
DROP POLICY IF EXISTS firm_gallery_owner_insert ON storage.objects;
DROP POLICY IF EXISTS firm_gallery_owner_delete ON storage.objects;
DROP POLICY IF EXISTS firm_gallery_admin_all ON storage.objects;

CREATE POLICY firm_gallery_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'firm-gallery'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.firms WHERE user_id = auth.uid())
  );

CREATE POLICY firm_gallery_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'firm-gallery'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.firms WHERE user_id = auth.uid())
  );

CREATE POLICY firm_gallery_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'firm-gallery' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'firm-gallery' AND public.has_role(auth.uid(), 'admin'));
-- "Anyone can view firm gallery files" (public SELECT) is kept.


-- ---------------------------------------------------------------------
-- project-images: covers/<project_id>/..., gallery/<project_id>/..., products/<firm_id>/...
-- Writes are limited to admins and to the owner of the project or firm.
-- "Anyone can view project images" (public SELECT) is kept.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project images" ON storage.objects;
DROP POLICY IF EXISTS project_images_owner_insert ON storage.objects;
DROP POLICY IF EXISTS project_images_owner_delete ON storage.objects;

CREATE POLICY project_images_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        (storage.foldername(name))[1] IN ('covers', 'gallery')
        AND (storage.foldername(name))[2] IN (
          SELECT p.id::text
          FROM public.projects p
          JOIN public.firms f ON f.id = p.firm_id
          WHERE f.user_id = auth.uid()
        )
      )
      OR (
        (storage.foldername(name))[1] = 'products'
        AND (storage.foldername(name))[2] IN (SELECT f.id::text FROM public.firms f WHERE f.user_id = auth.uid())
      )
    )
  );

CREATE POLICY project_images_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        (storage.foldername(name))[1] IN ('covers', 'gallery')
        AND (storage.foldername(name))[2] IN (
          SELECT p.id::text
          FROM public.projects p
          JOIN public.firms f ON f.id = p.firm_id
          WHERE f.user_id = auth.uid()
        )
      )
      OR (
        (storage.foldername(name))[1] = 'products'
        AND (storage.foldername(name))[2] IN (SELECT f.id::text FROM public.firms f WHERE f.user_id = auth.uid())
      )
    )
  );


-- ---------------------------------------------------------------------
-- plants and materials: AdminPlantsTab and AdminMaterialsTab are the only writers.
-- Public SELECT policies ("Public Access", "Public Access Materials") are kept.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload Materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update Materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete Materials" ON storage.objects;
DROP POLICY IF EXISTS plants_admin_write ON storage.objects;
DROP POLICY IF EXISTS materials_admin_write ON storage.objects;

CREATE POLICY plants_admin_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'plants' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'plants' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY materials_admin_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------
-- lead-photos: paths are '<auth uid>/<uuid>.<ext>' (LeadFormWidget).
-- Dropping the public SELECT policy stops anonymous LIST/enumeration of every
-- homeowner's folder through the Storage API. Existing public URLs keep
-- working because the bucket itself is still public (made private later by
-- 20261020095300_sec_p2_lead_photos_private.sql).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read lead photos" ON storage.objects;
DROP POLICY IF EXISTS lead_photos_owner_insert ON storage.objects;
DROP POLICY IF EXISTS lead_photos_owner_read ON storage.objects;

CREATE POLICY lead_photos_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lead-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY lead_photos_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'lead-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );


-- ---------------------------------------------------------------------
-- Bucket limits. A bucket that does not exist is a no-op. firm-logos mime
-- types are left alone because SVG logos are possible.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'allowed_mime_types'
  ) THEN
    RAISE NOTICE 'storage.buckets has no allowed_mime_types column, skipping bucket limits';
    RETURN;
  END IF;

  UPDATE storage.buckets
  SET file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  WHERE id = 'lead-photos';

  UPDATE storage.buckets
  SET file_size_limit = 8388608,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  WHERE id IN ('firm-gallery', 'project-images', 'plants', 'materials', 'firm-reviews');
END $$;
