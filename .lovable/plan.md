

## Plan: Firma Kayıt Formu İyileştirmeleri

### Yapılacaklar

**1. Veritabanı Değişiklikleri (Migration)**
- `firms` tablosuna `website` (text, nullable) kolonu ekle
- `tax_number` kolonunu kaldırma yerine olduğu gibi bırak (mevcut veriler bozulmasın) — koddan kaldırmak yeterli

**2. İl-İlçe Veri Dosyası Oluştur**
- `src/lib/districts.ts` dosyası oluştur — Türkiye'nin 81 ili için ilçe listesi (büyük şehirler dahil tüm ilçeler)
- `DISTRICTS_BY_CITY: Record<string, string[]>` formatında export et

**3. Firma Kayıt Formu (`FirmaGiris.tsx`) Güncellemeleri**
- **Vergi No alanını kaldır**, yerine **Website** alanı ekle (opsiyonel, URL formatı)
- **İlçe alanını** serbest text input yerine il seçimine bağlı **Select dropdown** yap
- **Validasyon ekle:**
  - E-posta: geçerli format kontrolü (regex)
  - Telefon: `05XX XXX XX XX` formatı, 10-11 haneli sayı kontrolü
  - Şifre: minimum 8 karakter, en az 1 büyük harf, 1 rakam
  - Website: geçerli URL formatı (opsiyonel)
- Hata mesajlarını Türkçe olarak form alanlarının altında göster

**4. Admin Firma Formu (`FirmFormDialog.tsx`) Güncellemeleri**
- `FirmFormData` tipinden `tax_number` kaldır, `website` ekle
- İlçe alanını il'e bağlı Select dropdown yap
- Website alanı ekle

**5. Firma Insert/Update İşlemleri**
- `FirmaGiris.tsx`'teki insert'e `website` alanı ekle, `tax_number` kaldır
- `FirmFormDialog.tsx`'teki save işlemlerinde aynı değişiklikler

### Teknik Detaylar

- Migration: `ALTER TABLE firms ADD COLUMN website text;`
- Validasyon client-side yapılacak, form submit öncesi kontrol edilecek
- İlçe verisi statik dosya olarak tutulacak (~81 il, her biri 5-30 ilçe)
- `tax_number` kolonu DB'de kalacak (geriye uyumluluk), sadece formlardan kaldırılacak

