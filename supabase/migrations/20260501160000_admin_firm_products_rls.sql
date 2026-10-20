-- ============================================
-- Admin için firm_plants ve firm_products RLS politikaları
-- ============================================

-- Admin tüm firma bitkilerini yönetebilir
CREATE POLICY "firm_plants_admin_all" ON public.firm_plants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin tüm firma ürünlerini yönetebilir
CREATE POLICY "firm_products_admin_all" ON public.firm_products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- firm_plants için WITH CHECK ekle (firma kendi ürünleri)
-- Mevcut politikayı düşür ve yeniden oluştur WITH CHECK ile
DROP POLICY IF EXISTS "firm_plants_firm_manage" ON public.firm_plants;
CREATE POLICY "firm_plants_firm_manage" ON public.firm_plants
  FOR ALL
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()))
  WITH CHECK (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "firm_products_firm_manage" ON public.firm_products;
CREATE POLICY "firm_products_firm_manage" ON public.firm_products
  FOR ALL
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()))
  WITH CHECK (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
