

## Plan: E-posta OTP Doğrulama ile Şifresiz Teklif Formu

### Özet
Teklif al formundaki şifre alanı kaldırılacak. Kullanıcı iletişim bilgilerini girdikten sonra Resend ile e-posta OTP kodu gönderilecek, doğrulama sonrası otomatik şifre oluşturulup hesap açılacak.

### Yeni Akış
1. Hizmet → 2. Alan → 3. Bütçe → 4. Zaman → 5. Konum → 6. İletişim (şifresiz) → 7. OTP Doğrulama → Hesap + Lead oluştur

### Yapılacaklar

**1. Resend API Key ekleme**
- `RESEND_API_KEY` secret olarak eklenecek (kullanıcıdan alınacak)
- Resend hesabından API key gerekiyor: https://resend.com/api-keys

**2. Edge Function: `send-otp` oluştur**
- `supabase/functions/send-otp/index.ts`
- Rastgele 6 haneli kod üretir
- Kodu Resend API ile kullanıcıya e-posta olarak gönderir
- Kodu veritabanında saklayarak doğrulama için kullanır (yeni `otp_codes` tablosu)
- 5 dakika geçerlilik süresi

**3. Veritabanı: `otp_codes` tablosu**
```
otp_codes: id, email, code, expires_at, used (boolean), created_at
```
- RLS: Herkesin insert yapabilmesi gerekmez — edge function service role ile çalışacak
- Geçici kodlar, süre dolunca geçersiz

**4. Edge Function: `verify-otp` oluştur**
- `supabase/functions/verify-otp/index.ts`
- E-posta + kodu kontrol eder
- Geçerliyse: rastgele şifre üretir, `supabase.auth.admin.createUser()` ile hesap oluşturur
- Oluşturulan şifreyi Resend ile kullanıcıya e-posta olarak gönderir
- Kullanıcı token'ı döner (session)

**5. Form değişiklikleri**
- `src/lib/leadFormData.ts`: `password` alanını kaldır
- `src/components/lead-form/StepContact.tsx`: Şifre inputunu ve göster/gizle toggle'ı kaldır
- `src/components/lead-form/StepOtp.tsx`: Yeni bileşen — 6 haneli OTP girişi, "Kod Gönder" / "Tekrar Gönder" butonları, 60sn geri sayım
- `src/components/lead-form/LeadFormModal.tsx`: 
  - `TOTAL_STEPS` → 7
  - Adım 6→7 geçişinde `send-otp` edge function çağrılır
  - Adım 7'de doğrulama sonrası `verify-otp` çağrılır → session alınır → lead kaydedilir

**6. Config güncellemesi**
- `supabase/config.toml`: `send-otp` ve `verify-otp` için `verify_jwt = false`

### Gereksinim
Resend API Key gerekiyor. İlk adımda kullanıcıdan istenecek.

