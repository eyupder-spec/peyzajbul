-- =====================================================================
-- SEC P1 / 3 of 5: reviews, lead inserts, blog comments
--
-- APPLY ORDER:
--   Apply together with the other *_sec_p1_* files, in filename order.
--   Because this file sorts after 20260924120000_blog_comments.sql, a single
--   `supabase db push` creates the blog_comments table and hardens it back to
--   back, so there is no window in which it is open.
--
-- PREREQUISITES:
--   * None. Every block is guarded: a missing table is skipped with a NOTICE.
--   * Client impact: BlogComments.tsx inserts is_approved:true, which is now
--     rejected until that line is removed (the comments feature is not live yet).
--     Reviews must be submitted unapproved, which the site already does.
--   * Idempotent: every statement can be re-run.
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS firm_reviews_submit_pending ON public.firm_reviews;
--     then recreate "Authenticated can submit review for approved firms" from 20260308160156.
--   DROP TRIGGER IF EXISTS a_leads_insert_guard ON public.leads;
--   DROP POLICY IF EXISTS blog_comments_submit_pending ON public.blog_comments;
--     then recreate "Anyone can insert blog comments" from 20260924120000_blog_comments.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- (a) firm_reviews: new reviews always start unapproved and are validated.
--     The client never sets is_approved (FirmDetailContent.tsx,
--     PremiumLandingPage.tsx) and admin inserts go through the existing
--     "Admins can manage all reviews" policy. photo_url is deliberately not
--     referenced: the column exists live but in no migration.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.firm_reviews') IS NULL THEN
    RAISE NOTICE 'public.firm_reviews does not exist, skipping the review policies';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Authenticated can submit review for approved firms" ON public.firm_reviews;
  DROP POLICY IF EXISTS "Anyone authenticated can submit review" ON public.firm_reviews;
  DROP POLICY IF EXISTS firm_reviews_submit_pending ON public.firm_reviews;

  CREATE POLICY firm_reviews_submit_pending ON public.firm_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
      is_approved = false
      AND rating BETWEEN 1 AND 5
      AND char_length(btrim(reviewer_name)) BETWEEN 2 AND 80
      AND char_length(coalesce(comment, '')) <= 1000
      AND firm_id IN (SELECT id FROM public.firms WHERE is_approved AND is_active)
      AND firm_id NOT IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
    );

  -- (b) Test data fix: unpublish the placeholder review "deneme" / "deneme".
  --     Reversible: UPDATE public.firm_reviews SET is_approved = true WHERE <same filter>.
  UPDATE public.firm_reviews
  SET is_approved = false
  WHERE lower(btrim(reviewer_name)) = 'deneme'
    AND lower(btrim(coalesce(comment, ''))) = 'deneme';
END $$;

-- OWNER DECISION (not applied automatically): the reviews by 'Nilay' and 'Metin' on
-- 'Elite Garden Peyzaj' cannot be verified. To unpublish them, find their ids and run:
--   SELECT r.id, r.reviewer_name, r.comment, r.created_at
--   FROM public.firm_reviews r JOIN public.firms f ON f.id = r.firm_id
--   WHERE f.company_name = 'Elite Garden Peyzaj' AND r.reviewer_name IN ('Nilay', 'Metin');
--   -- UPDATE public.firm_reviews SET is_approved = false
--   -- WHERE id IN ('<id of the Nilay review>', '<id of the Metin review>');


-- ---------------------------------------------------------------------
-- (c) leads: browser inserts cannot pre-approve, pre-assign or self-price.
--     Policy "Users can insert own leads" (20260308140122) only checks
--     user_id = auth.uid(), so a signed-up user could insert a lead that is
--     already admin_approved, assigned to chosen firms and priced at will,
--     bypassing admin approval and routing. The service role (send-otp,
--     verify-otp, create-lead) and admins are unaffected. The policy stays in
--     place; dropping it is a follow-up once create-lead and the new lead
--     form have shipped. The trigger name sorts before calculate_lead_score_trigger
--     and trigger_calculate_lead_price so those still see the rewritten row.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leads_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  v_status := CASE WHEN NEW.status IN ('active', 'unverified') THEN NEW.status ELSE 'active' END;

  RETURN jsonb_populate_record(
    NEW,
    jsonb_build_object(
      'admin_approved', false,
      'assigned_firms', '[]'::jsonb,
      'token_price', 20,
      'user_id', auth.uid(),
      'status', v_status
    )
  );
END;
$$;

DROP TRIGGER IF EXISTS a_leads_insert_guard ON public.leads;
CREATE TRIGGER a_leads_insert_guard
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.leads_insert_guard();


-- ---------------------------------------------------------------------
-- (d) blog_comments (the table is not in production yet; 20260924120000
--     creates it with open policies): comments start unapproved and are
--     validated. Admin replies cannot be forged by visitors.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.blog_comments') IS NULL THEN
    RAISE NOTICE 'public.blog_comments does not exist, skipping the blog comment policies';
    RETURN;
  END IF;

  ALTER TABLE public.blog_comments ALTER COLUMN is_approved SET DEFAULT false;

  DROP POLICY IF EXISTS "Anyone can insert blog comments" ON public.blog_comments;
  DROP POLICY IF EXISTS blog_comments_submit_pending ON public.blog_comments;

  CREATE POLICY blog_comments_submit_pending ON public.blog_comments
    FOR INSERT TO anon, authenticated
    WITH CHECK (
      is_approved = false
      AND admin_reply IS NULL
      AND admin_reply_at IS NULL
      AND char_length(btrim(content)) BETWEEN 5 AND 2000
      AND char_length(btrim(user_name)) BETWEEN 1 AND 80
      AND (user_email IS NULL OR char_length(user_email) <= 254)
    );
END $$;
