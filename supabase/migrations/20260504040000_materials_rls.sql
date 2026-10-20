-- RLS Policies for material_categories, materials and firm_materials
-- Run this in Supabase SQL Editor

-- ============================================================
-- material_categories
-- ============================================================
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read material_categories"
  ON public.material_categories FOR SELECT
  USING (true);

CREATE POLICY "Admin insert material_categories"
  ON public.material_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin update material_categories"
  ON public.material_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin delete material_categories"
  ON public.material_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- materials
-- ============================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read materials"
  ON public.materials FOR SELECT
  USING (true);

CREATE POLICY "Admin insert materials"
  ON public.materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin update materials"
  ON public.materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin delete materials"
  ON public.materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- firm_materials
-- ============================================================
ALTER TABLE public.firm_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read firm_materials"
  ON public.firm_materials FOR SELECT
  USING (true);

CREATE POLICY "Firm owner insert firm_materials"
  ON public.firm_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Firm owner update firm_materials"
  ON public.firm_materials FOR UPDATE
  TO authenticated
  USING (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Firm owner delete firm_materials"
  ON public.firm_materials FOR DELETE
  TO authenticated
  USING (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
