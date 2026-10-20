-- =====================================================================
-- SEC P2 / 4 of 4: lead photos become private
--
-- SUPERSEDED BY THE LEAD PIPELINE (WP05):
--   20261020150100_lead_pipeline_security.sql already makes the lead-photos
--   bucket private and installs its own lead_photos_read policy
--   (public.firm_can_read_lead_photo), which also covers the new <lead id>/
--   folders. When that file is applied this one is redundant, and recreating
--   lead_photos_read below would narrow it to <user id>/ folders. The block
--   below therefore detects public.firm_can_read_lead_photo(text) and exits
--   with a NOTICE without touching anything. Use this file only when the
--   lead pipeline files are NOT being released.
--
-- APPLY AFTER / PREREQUISITES:
--   * The lead pipeline (WP05), the pricing / firm panel (WP07) and the lead
--     form (WP08) packages store the object PATH of each lead photo (not the
--     public URL) and render it through createSignedUrl. Existing rows hold
--     public URLs (LeadFormWidget.tsx:99); they must be converted or the
--     renderer must derive the path from the URL first.
--   * Verification on staging after applying:
--       the object URL /storage/v1/object/public/lead-photos/... no longer works;
--       the owner, an admin and a firm holding a lead_purchases row for that lead
--       can create a signed URL; any other firm and anon cannot.
--
-- APPLY ORDER:
--   PHASE 2. A blanket `supabase db push` would apply this file together with
--   the P1 files and turn every stored lead photo link into a 400/404, so apply
--   it deliberately and only when the prerequisites hold.
--
-- The 'lead-photos' folder is the uploader's auth uid ('<uid>/<uuid>.<ext>'),
-- and lead_purchases.firm_id holds the purchasing firm's auth uid.
--
-- ROLLBACK:
--   UPDATE storage.buckets SET public = true WHERE id = 'lead-photos';
--   DROP POLICY IF EXISTS lead_photos_read ON storage.objects;
--   DROP FUNCTION IF EXISTS public.firm_bought_lead_of_user(text);
--   then recreate lead_photos_owner_read from 20261020090300_sec_p1_storage.sql.
-- =====================================================================

DO $do$
BEGIN
  IF to_regprocedure('public.firm_can_read_lead_photo(text)') IS NOT NULL THEN
    RAISE NOTICE 'sec_p2_lead_photos_private skipped: public.firm_can_read_lead_photo(text) is present. Lead photo access is governed by 20261020150100_lead_pipeline_security.sql, which supersedes this file.';
    RETURN;
  END IF;

  UPDATE storage.buckets SET public = false WHERE id = 'lead-photos';

  -- A firm cannot read public.leads directly once 20261020095000_sec_p2_leads_pii_view.sql
  -- has dropped its SELECT policy, and a policy subquery runs with the caller's own
  -- row-level security. This definer helper answers the one question the policy needs.
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.firm_bought_lead_of_user(p_lead_owner text)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $body$
      SELECT auth.uid() IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM public.lead_purchases lp
           JOIN public.leads l ON l.id = lp.lead_id
           WHERE lp.firm_id = auth.uid()
             AND lp.status = 'paid'
             AND l.user_id::text = p_lead_owner
         )
    $body$
  $fn$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.firm_bought_lead_of_user(text) FROM PUBLIC, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.firm_bought_lead_of_user(text) TO authenticated';

  EXECUTE 'DROP POLICY IF EXISTS lead_photos_owner_read ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS lead_photos_read ON storage.objects';

  EXECUTE $policy$
    CREATE POLICY lead_photos_read ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'lead-photos'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.has_role(auth.uid(), 'admin')
          OR public.firm_bought_lead_of_user((storage.foldername(name))[1])
        )
      )
  $policy$;
END $do$;
