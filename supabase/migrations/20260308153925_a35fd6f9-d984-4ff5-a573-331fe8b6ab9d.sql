CREATE POLICY "Public can read approved active firms"
ON public.firms
FOR SELECT
TO anon, authenticated
USING (is_approved = true AND is_active = true);