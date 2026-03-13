# Proje Genel Bakış: Peyzajbul

Bu belge, Lovable'dan yerel ortama ve kendi Supabase hesabınıza taşıdığımız **Peyzajbul** projesinin mevcut mimarisini, teknoloji yığınını ve özelliklerini özetlemektedir.

## 🛠 Teknoloji Yığını

- **Frontend:** React + TypeScript (Vite)
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend/Veritabanı:** Supabase (Kendi kontrolünüzde)
- **E-posta Servisi:** Resend (Edge Functions aracılığıyla)
- **Form Yönetimi:** React Hook Form + Zod (Doğrulama)
- **Veri Çekme:** TanStack Query (React Query)

## 📁 Dosya Yapısı ve Mimari

### 1. `/src` - Uygulama Kaynak Kodları
- **`/pages`**: Uygulamanın tüm sayfaları burada yer alır.
    - `Index.tsx`: Ana sayfa, Hero bölümü, öne çıkan şehirler ve firmalar.
    - `Firmalar.tsx`: Tüm firmaların listelendiği ve filtrelendiği sayfa.
    - `FirmaDetay.tsx`: Firma profili, hizmetler, galeriler ve iletişim.
    - `AdminPanel.tsx`: Sistem yönetimi (Kategoriler, firmalar, onaylar vb.).
    - `FirmaPanel.tsx`: Firmaların kendi profillerini yönettiği alan.
- **`/components`**: Tekrar kullanılabilir arayüz bileşenleri.
    - `lead-form/`: Çok adımlı teklif formu bileşenleri.
    - `admin/`: Admin paneline özel tablolar ve sekmeler.
    - `ui/`: shadcn/ui bileşenleri (Button, Input, Dialog vb.).
- **`/integrations/supabase`**: Supabase istemcisi ve otomatik oluşturulan tip tanımları.
- **`/lib`**: Yardımcı fonksiyonlar ve statik veriler (`cities.ts`, `categories.ts`, `leadFormData.ts`).

### 2. `/supabase` - Sunucu Tarafı
- **`/migrations`**: Veritabanı şemasını (tablolar, RLS politikaları, fonksiyonlar) oluşturan SQL dosyaları.
- **`/functions`**: Edge Functions (Deno tabanlı).
    - `send-otp`: Kayıt/Teklif sırasında e-posta ile kod gönderimi.
    - `verify-otp`: Kod doğrulama ve kullanıcı oluşturma.
    - `spend-coins`: Firma içi bakiye (jeton) yönetimi.

## 🚀 Mevcut Durum ve Özellikler

1.  **Teklif Formu (Lead System):** Kullanıcılar çok adımlı bir form ile peyzaj ihtiyacını iletir, e-posta doğrulaması (OTP) sonrası sistemde bir talep (lead) oluşur.
2.  **Firma Yönetimi:** Firmalar sisteme üye olabilir, jeton satın alarak taleplere erişebilir ve profillerini (galeri, hizmetler) yönetebilir.
3.  **Hiyerarşik Yapı:** İl -> İlçe -> Kategori -> Firma şeklinde giden SEO uyumlu bir yapı mevcuttur.
4.  **Admin Kontrolü:** Tüm firmalar, admin tarafından onaylandıktan sonra yayına alınır.

## 📌 Sıradaki Geliştirme Notları

- **Canlıya Geçiş:** Projenin internette (Vercel/Netlify vb.) yayınlanması.
- **E-posta Şablonları:** Resend üzerinden gönderilen e-postaların tasarımı.
- **Görseller (Storage):** Profil fotoğrafları ve galeri görselleri için Supabase Storage kullanımı.
- **SEO Optimizasyonu:** `react-helmet-async` ile dinamik meta etiketlerin güçlendirilmesi.

---
*Bu proje Lovable'dan tamamen özgürleştirilmiş olup, artık yerel ortamda ve kendi Supabase projenizde geliştirilmeye hazırdır.*
