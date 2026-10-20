
-- Fix permissive review insert policy - restrict to valid firm_id
DROP POLICY IF EXISTS "Anyone authenticated can submit review" ON public.firm_reviews;
CREATE POLICY "Authenticated can submit review for approved firms" ON public.firm_reviews
  FOR INSERT TO authenticated WITH CHECK (
    firm_id IN (SELECT id FROM public.firms WHERE is_approved = true AND is_active = true)
  );
