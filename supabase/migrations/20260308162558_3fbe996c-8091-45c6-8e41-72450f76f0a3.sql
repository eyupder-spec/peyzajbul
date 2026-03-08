-- Allow admins to insert coin transactions (for manual coin additions)
CREATE POLICY "Admins can insert transactions"
ON public.coin_transactions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));