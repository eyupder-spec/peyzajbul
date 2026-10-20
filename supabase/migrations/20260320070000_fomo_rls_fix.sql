-- =====================================================================
-- FOMO SAYACININ ÇALIŞMASI İÇİN RLS DÜZELTMESİ
-- Firmalar "kurallar gereği" diğer firmaların satın alımlarını göremiyordu 
-- ve bu yüzden "Henüz kimse satın almadı" yazıyordu.
-- Aşağıdaki policy sadece OKUMA işlemlerine izin verir, böylece FOMO çalışır.
-- =====================================================================

-- Varsa eski kısıtlayıcı policy'yi düşür
DROP POLICY IF EXISTS "Firms can only read own purchases" ON public.lead_purchases;

-- Tüm giriş yapmış (authenticated) kullanıcıların sayım yapabilmesi için okuma izni ver
CREATE POLICY "Firms can read all purchases for FOMO" 
ON public.lead_purchases 
FOR SELECT 
TO authenticated 
USING (true);
