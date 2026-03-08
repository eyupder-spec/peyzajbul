

## Mevcut Durum Analizi

Şu an `FirmaGiris.tsx`'de firma sahibi **kayıt olurken aynı anda firma kaydı da oluşturuyor** (satır 150-199). Yani `signUp` → `assign-firm-role` → `firms.insert` hep birlikte çalışıyor.

**Problem:** "Bu İşletme Senin Mi?" akışında firma zaten var. Kullanıcı yeni firma oluşturmamalı, mevcut firmayı sahiplenmeli.

## Çözüm: İki Ayrı Akış

```text
Akış 1 (mevcut): Firma Kayıt — Yeni firma oluşturur
  FirmaGiris → Kayıt Ol → Kullanıcı + Firma oluştur → Admin onayı bekle

Akış 2 (yeni): Firma Sahiplenme — Mevcut firmayı devralır
  FirmaDetay → "Bu İşletme Senin Mi?" → Kayıt ol (firma oluşturma YOK)
  → Doğrulama bilgileri gir → claim_requests tablosuna kayıt
  → Admin onaylar → Mevcut firmanın user_id güncellenir
```

### Veritabanı

**Yeni tablo: `claim_requests`**
- `id`, `firm_id` (FK → firms), `user_id` (FK → auth.users)
- `status` (pending/approved/rejected), `phone`, `tax_number`, `note`
- `created_at`, `updated_at`

**`firms` tablosuna:** `is_claimed` boolean (default false) kolonu eklenir. Admin panelden oluşturulan firmalar `is_claimed = false` olur.

### Sahiplenme Sayfası (`/firma/sahiplen/:firmId`)

1. Kullanıcı giriş yapmamışsa → basit kayıt formu (sadece e-posta + şifre, **firma oluşturmadan**)
2. Giriş yapmışsa → direkt doğrulama formu
3. Form: telefon, vergi no (opsiyonel), açıklama notu
4. Gönder → `claim_requests` tablosuna insert
5. "Talebiniz alındı, admin inceleyecek" mesajı

### Admin Paneli — "Sahiplenme Talepleri" Sekmesi

- Bekleyen talepleri listele (firma adı, talep eden kişi, telefon, vergi no)
- Karşılaştırma: talepteki telefon vs firmadaki telefon (eşleşme göster)
- Onayla / Reddet butonları

### Onay Edge Function (`approve-claim`)

Admin onayladığında:
1. `firms.user_id` → talep eden kullanıcıya güncelle
2. `firms.is_claimed` → true
3. `user_roles` → 'firm' rolü ata
4. `claim_requests.status` → 'approved'

### `FirmaDetay.tsx` Değişikliği

- `is_claimed === false` olan firmalar için **"Bu İşletme Senin Mi?"** butonu göster
- Butona tıklayınca `/firma/sahiplen/:firmId` sayfasına yönlendir

### Admin Panel — Firma Oluşturma Değişikliği

- Admin panelden firma oluşturulduğunda `is_claimed = false` set edilir (zaten default)
- Admin'in kendi `user_id`'si ile kaydedilir ama sahiplenme sonrası değiştirilir

### Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| DB Migration | `claim_requests` tablosu + `firms.is_claimed` kolonu + RLS |
| `src/pages/FirmaSahiplen.tsx` | **Yeni** — Kayıt/giriş + doğrulama formu |
| `src/pages/FirmaDetay.tsx` | "Bu İşletme Senin Mi?" butonu |
| `src/components/admin/AdminClaimTab.tsx` | **Yeni** — Talep yönetim sekmesi |
| `src/pages/AdminPanel.tsx` | Yeni sekme ekleme |
| `src/App.tsx` | `/firma/sahiplen/:firmId` rotası |
| `supabase/functions/approve-claim/index.ts` | **Yeni** — Onay işlemi |

