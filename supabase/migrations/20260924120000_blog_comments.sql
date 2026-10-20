-- 1. Blog Yorumları Tablosu
CREATE TABLE IF NOT EXISTS public.blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT true,
    admin_reply TEXT,
    admin_reply_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON public.blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON public.blog_comments(created_at DESC);

-- RLS Etkinleştir
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- Politikalar
-- Herkes onaylanmış yorumları görebilir; Adminler tüm yorumları görebilir
CREATE POLICY "Public can view approved blog comments"
ON public.blog_comments
FOR SELECT
USING (is_approved = true OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));

-- Ziyaretçiler ve kullanıcılar yorum ekleyebilir
CREATE POLICY "Anyone can insert blog comments"
ON public.blog_comments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Sadece adminler yorum güncelleyebilir (onay, cevap vs.)
CREATE POLICY "Admins can update blog comments"
ON public.blog_comments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sadece adminler yorum silebilir
CREATE POLICY "Admins can delete blog comments"
ON public.blog_comments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
