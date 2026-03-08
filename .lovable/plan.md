

## Plan: Lead Satın Alındığında Kullanıcıya Bilgilendirme E-postası

### Konsept
Firma bir lead'i satın aldığında (jeton veya Stripe ile), kullanıcıya Resend üzerinden otomatik bir e-posta gönderilecek: _"X Firma talebinizi aldı. Gün içerisinde sizinle iletişime geçecektir."_

### Değişiklik

**`supabase/functions/spend-coins/index.ts`** — Lead satın alma işlemi başarılı olduktan sonra:
1. Lead bilgilerini çek (kullanıcı e-postası, hizmet türü, şehir)
2. Firma bilgilerini çek (firma adı)
3. Resend API ile kullanıcıya bilgilendirme e-postası gönder

E-posta içeriği:
- Konu: "Talebiniz İlgileniliyor! - Peyzaj Rehberi"
- Gövde: "{Firma Adı} talebinizi aldı ve gün içerisinde sizinle iletişime geçecektir." + hizmet türü ve şehir bilgisi

**`supabase/functions/stripe-webhook/index.ts`** — Stripe ile ödeme sonrası lead satın alımında da aynı e-posta mantığı eklenir (eğer bu fonksiyonda lead_purchase kaydı yapılıyorsa).

### Teknik Detaylar
- Mevcut `RESEND_API_KEY` secret'ı zaten var, yeni secret gerekmez
- `send-otp` fonksiyonundaki Resend entegrasyonu ile aynı pattern kullanılacak
- E-posta gönderimi satın alma işlemini bloklamayacak (hata olsa bile satın alma başarılı sayılacak)

### Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `supabase/functions/spend-coins/index.ts` | Lead + firma bilgisi çek, Resend ile e-posta gönder |
| `supabase/functions/stripe-webhook/index.ts` | Aynı e-posta mantığını Stripe ödeme sonrasına ekle (varsa) |

