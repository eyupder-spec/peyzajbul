-- Admin görevleri ve notları için tablo oluşturma
CREATE TABLE IF NOT EXISTS public.admin_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid()
);

-- RLS Aktifleştirme
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

-- Politikalar: Sadece adminler kendi veya tüm görevleri yönetebilir (admin rolü olan her kullanıcı)
CREATE POLICY "Adminler tüm görevleri yönetebilir" ON public.admin_tasks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Gerçek zamanlı güncellemeler için (isteğe bağlı ama iyi olur)
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_tasks;
