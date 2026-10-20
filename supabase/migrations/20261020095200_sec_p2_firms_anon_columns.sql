-- =====================================================================
-- SEC P2 / 3 of 4: anonymous REST access to public firm columns only
--
-- APPLY AFTER / PREREQUISITES:
--   * The home / firm page package (WP19) replaces .select("*") at
--     src/components/FirmDetailContent.tsx:131 with an explicit column list.
--   * A repository grep shows no anonymous-side select('*') on firms and no
--     embed that expands firms(*). Known authenticated-only users of select("*")
--     (src/views/AdminPanel.tsx:257) are unaffected: this file only changes the anon role.
--   * Verification on staging after applying:
--       anon REST  firms?select=*                                -> 42501 permission denied
--       anon REST  firms?select=id,company_name,slug,city,phone,email,logo_url,is_approved -> rows
--       every public page renders: /, /firmalar, /iller/*, /firma/*, a premium landing page,
--       including firm_gallery embeds.
--       authenticated owner and admin reads are unchanged.
--
-- APPLY ORDER:
--   PHASE 2. A blanket `supabase db push` would apply this file together with
--   the P1 files and break the public site, so apply it deliberately and only
--   when the prerequisites hold.
--
-- Why: anon can SELECT every column of an approved firm, including
-- coin_balance, stripe_customer_id, stripe_subscription_id, subscription_plan,
-- tax_number, telegram_chat_id, expo_push_token and profile_views. The grant
-- below is fail-closed: a column added later is not readable by anon until it
-- is added to the allow-list. Columns that exist in the allow-list but not in
-- the live table are skipped (the list is intersected with information_schema),
-- so drift cannot make the grant fail. user_id, is_approved and is_active MUST
-- stay granted: policies on firm_gallery, projects, firm_products, firm_plants
-- and others subquery them as anon.
--
-- ROLLBACK: GRANT SELECT ON public.firms TO anon;
-- =====================================================================

DO $$
DECLARE
  v_allowed text[] := ARRAY[
    'id', 'user_id', 'company_name', 'city', 'district', 'address', 'phone', 'email',
    'website', 'description', 'services', 'logo_url', 'slug', 'is_active', 'is_approved',
    'is_premium', 'premium_until', 'is_claimed', 'google_maps_url', 'detailed_services',
    'social_instagram', 'social_facebook', 'social_x', 'social_youtube', 'social_linkedin',
    'response_time', 'trust_badges', 'faq_items', 'before_after', 'portfolio_items',
    'youtube_videos', 'landing_config', 'avg_rating', 'review_count', 'created_at', 'updated_at'
  ];
  v_columns text;
BEGIN
  SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position)
  INTO v_columns
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'firms'
    AND c.column_name = ANY (v_allowed);

  IF v_columns IS NULL THEN
    RAISE EXCEPTION 'public.firms has none of the expected public columns; refusing to change grants';
  END IF;

  -- Revoking the table-level privilege also removes any column-level grants, so re-runs converge.
  REVOKE SELECT ON public.firms FROM anon;
  EXECUTE format('GRANT SELECT (%s) ON public.firms TO anon', v_columns);
END $$;
