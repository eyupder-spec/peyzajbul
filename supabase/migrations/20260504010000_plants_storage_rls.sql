-- plants storage bucket'ı için RLS politikaları
-- 1. Herkes dosyaları okuyabilsin (Public Access)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'plants');

-- 2. Yalnızca giriş yapmış kullanıcılar dosya yükleyebilsin (Insert)
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'plants');

-- 3. Yalnızca giriş yapmış kullanıcılar güncelleme yapabilsin (Update)
CREATE POLICY "Authenticated users can update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'plants');

-- 4. Yalnızca giriş yapmış kullanıcılar silebilsin (Delete)
CREATE POLICY "Authenticated users can delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'plants');
