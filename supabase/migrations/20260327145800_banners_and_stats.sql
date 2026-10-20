-- Create Banners Table
CREATE TABLE public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    image_url_desktop TEXT NOT NULL,
    image_url_mobile TEXT,
    target_url TEXT NOT NULL,
    placement TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    total_views INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for Banners
COMMENT ON TABLE public.banners IS 'Sistemdeki süreli banner reklamlar.';
COMMENT ON COLUMN public.banners.placement IS 'home_top, home_middle, home_left, home_right, sidebar_right, blog_inline, firm_list_top vb.';
COMMENT ON COLUMN public.banners.image_url_mobile IS 'Eğer boşsa (NULL), mobilde (md boyuttan küçük) bu reklam gösterilmeyecektir.';

-- Create Banner Daily Stats Table
CREATE TABLE public.banner_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    banner_id UUID NOT NULL REFERENCES public.banners(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(banner_id, date)
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies for Banners
CREATE POLICY "Aktif reklamları herkes görebilir" ON public.banners
    FOR SELECT TO public
    USING (is_active = true AND now() >= start_date AND now() <= end_date);

CREATE POLICY "Admin her şeyi yapabilir" ON public.banners
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policies for Banner Daily Stats
CREATE POLICY "Admin her istatistiği görebilir" ON public.banner_daily_stats
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Storage Bucket for Banners (if permitted via SQL)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Banner resimlerini herkes görebilir" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'banners');

CREATE POLICY "Admin banner resmi yükleyebilir ve silebilir" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id = 'banners' AND 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RPC Function for tracking events (High Performance)
-- Güvenlik (SECURITY DEFINER): Bu fonksiyon public olarak çağırılabilmeli ancak tabloları admin yetkisi ile güncelleyebilmelidir.
CREATE OR REPLACE FUNCTION public.track_banner_event(p_banner_id UUID, p_event_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_event_type NOT IN ('view', 'click') THEN
        RETURN;
    END IF;

    -- Banners tablosunu güncelle
    IF p_event_type = 'view' THEN
        UPDATE public.banners 
        SET total_views = total_views + 1
        WHERE id = p_banner_id;
    ELSIF p_event_type = 'click' THEN
        UPDATE public.banners 
        SET total_clicks = total_clicks + 1
        WHERE id = p_banner_id;
    END IF;

    -- Daily stats tablosunu güncelle (Varsa artır, yoksa oluştur)
    INSERT INTO public.banner_daily_stats (banner_id, date, views, clicks)
    VALUES (
        p_banner_id, 
        CURRENT_DATE, 
        CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END, 
        CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END
    )
    ON CONFLICT (banner_id, date) DO UPDATE 
    SET 
        views = public.banner_daily_stats.views + (CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END),
        clicks = public.banner_daily_stats.clicks + (CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END);
END;
$$;
