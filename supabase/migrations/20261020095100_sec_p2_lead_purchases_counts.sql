-- =====================================================================
-- SEC P2 / 2 of 4: purchase counts through an RPC, own-rows purchases, blog comment privacy
--
-- APPLY AFTER / PREREQUISITES:
--   * The P1 files are applied.
--   * The pricing / firm panel package (WP07) ships rpc('get_lead_purchase_counts')
--     in place of the all-rows lead_purchases reads at
--     src/views/FirmaLeadler.tsx:154-166 and src/views/FirmaPanel.tsx:203-212.
--     Realtime INSERT events for other firms' purchases stop arriving once the
--     FOMO policy is dropped, so the panel should refetch counts when leads change.
--   * The legal / blog package (WP13) switches src/components/blog/BlogComments.tsx
--     to the blog_comments_public view and drops is_approved:true. Note that an
--     anonymous insert followed by .select() needs SELECT on the base table, so
--     inserts must not request the row back.
--   * Verification:
--       as a firm: select * from lead_purchases;               -- only the firm's own rows
--       as a firm: select * from get_lead_purchase_counts(array['<lead id>']::uuid[]);
--       as anon:   select * from get_lead_purchase_counts(...);  -- permission denied
--       as anon:   select * from blog_comments_public;          -- approved rows, no user_email
--
-- APPLY ORDER:
--   PHASE 2. A blanket `supabase db push` would apply this file together with
--   the P1 files, so apply it deliberately and only when the prerequisites hold.
--
-- Why: policy "Firms can read all purchases for FOMO" (20260320070000_fomo_rls_fix.sql,
-- USING true) lets every signed-in user read every firm's purchases
-- (lead_id, firm_id, amount). Only the count per lead is needed.
--
-- ROLLBACK: DROP FUNCTION IF EXISTS public.get_lead_purchase_counts(uuid[]);
--   recreate "Firms can read all purchases for FOMO" from 20260320070000_fomo_rls_fix.sql;
--   DROP VIEW IF EXISTS public.blog_comments_public; recreate the public SELECT policy
--   from 20260924120000_blog_comments.sql.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_lead_purchase_counts(p_lead_ids uuid[])
RETURNS TABLE (lead_id uuid, purchase_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Oturum açmanız gerekiyor.' USING ERRCODE = '42501';
  END IF;

  IF p_lead_ids IS NULL OR cardinality(p_lead_ids) = 0 THEN
    RETURN;
  END IF;

  IF cardinality(p_lead_ids) > 200 THEN
    RAISE EXCEPTION 'En fazla 200 talep sorgulanabilir.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT lp.lead_id, count(*)::integer
  FROM public.lead_purchases lp
  WHERE lp.lead_id = ANY (p_lead_ids)
    AND lp.status = 'paid'
  GROUP BY lp.lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lead_purchase_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_purchase_counts(uuid[]) TO authenticated;

-- lead_purchases: firms read their own rows only. "Admins can read all purchases" (20260308142541) stays.
DROP POLICY IF EXISTS "Firms can read all purchases for FOMO" ON public.lead_purchases;
DROP POLICY IF EXISTS "Firms can read own purchases" ON public.lead_purchases;
CREATE POLICY "Firms can read own purchases"
ON public.lead_purchases
FOR SELECT
TO authenticated
USING (firm_id = auth.uid());


-- blog_comments: expose approved comments without user_email, keep the base table admin-only.
-- Skipped with a NOTICE while the table does not exist.
DO $$
BEGIN
  IF to_regclass('public.blog_comments') IS NULL THEN
    RAISE NOTICE 'public.blog_comments does not exist, skipping blog_comments_public';
    RETURN;
  END IF;

  CREATE OR REPLACE VIEW public.blog_comments_public AS
  SELECT id, post_id, user_name, content, admin_reply, admin_reply_at, created_at
  FROM public.blog_comments
  WHERE is_approved = true;

  GRANT SELECT ON public.blog_comments_public TO anon, authenticated;

  DROP POLICY IF EXISTS "Public can view approved blog comments" ON public.blog_comments;
  DROP POLICY IF EXISTS blog_comments_admin_select ON public.blog_comments;
  CREATE POLICY blog_comments_admin_select ON public.blog_comments
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
END $$;
