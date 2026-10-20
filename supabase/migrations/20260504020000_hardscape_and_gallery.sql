-- 1. Bitkilere Galeri Eklentisi
ALTER TABLE public.plants 
ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

-- 2. Malzeme Kategorileri Tablosu
CREATE TABLE IF NOT EXISTS public.material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT '🪨',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Malzemeler Tablosu
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.material_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    usage_areas TEXT,
    material_type TEXT,
    image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Firma Malzemeleri (Firmaların sattığı malzemeler)
CREATE TABLE IF NOT EXISTS public.firm_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
    show_price BOOLEAN DEFAULT false,
    price_display TEXT,
    stock_status TEXT DEFAULT 'in_stock',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(firm_id, material_id)
);

-- 5. Malzemeler İçin Storage Bucket ve RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Materials" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
CREATE POLICY "Authenticated upload Materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials');
CREATE POLICY "Authenticated update Materials" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'materials');
CREATE POLICY "Authenticated delete Materials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'materials');
