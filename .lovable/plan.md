

# Lead Form 5 Adimli Yeniden Yapilandirma Plani

## Ozet

Mevcut 7 adimli statik formu, proje tipine gore dinamik degisen 5 adimli (+ OTP) bir forma donusturuyoruz. E-posta zorunlu, OTP ile dogrulanacak. Telefon onaylama yok.

## Adim Akisi

```text
1. Proje Tipi (Konut / Ticari)
2. Hizmet Turu (proje tipine gore 6 secenek)
3. Kapsam (hizmet turune gore dinamik coklu secim / alt sorular)
4. Proje Detaylari (konum, mulk tipi, alan, durum, butce, zaman, foto, not)
5. Iletisim (Ad Soyad*, Telefon*, E-posta*) → OTP dogrulama → Submit
```

## 1. Veri Modeli (`leadFormData.ts`)

`LeadFormData` interface yeniden yazilacak:
- `projectType`: "residential" | "commercial"
- `serviceType`: string
- `scope`: string[] (coklu secim)
- `irrigationType`, `irrigationSystem`, `waterSource`: string (sulama icin)
- `propertyType`, `areaSize`, `currentCondition`: string
- `budget`, `timeline`: string
- `city`, `district`, `address`: string
- `photos`: File[] (max 5, opsiyonel)
- `notes`: string (opsiyonel)
- `fullName`, `phone`, `email`: string (hepsi zorunlu)
- `kvkkAccepted`: boolean

Eski alanlar (`projectSize`) kaldirilacak.

## 2. Yeni Step Bilesenleri

**StepProjectType.tsx** -- 2 buyuk kart: Konut (🏠) / Ticari (🏢). Tek secim.

**StepServiceType.tsx** -- `projectType` degerine gore 6 secenek gosterir. Emoji ikonlu kartlar, mevcut `StepService` tarzinda.

**StepScope.tsx** -- En karmasik adim. `serviceType`'a gore:
- Bahce Tasarimi → 8 checkbox
- Bahce Bakimi → 6 checkbox  
- Sulama Sistemi → 3 ayri tek secim grubu (islem tipi / sistem tipi / su kaynagi)
- Sert Zemin → 6 checkbox
- Bitki & Agac Dikimi / Havuz Cevresi → genel kapsam checkboxlari veya atlanabilir
- Commercial hizmetler → 8 checkbox

**StepProjectDetails.tsx** -- Tek uzun sayfa, bolumler halinde:
- Konum (il/ilce dropdown -- mevcut `StepLocation` mantigi inline)
- Mulk tipi (projectType'a gore farkli secenekler)
- Alan buyuklugu (projectType'a gore farkli araliklar)
- Mevcut durum (4 secenek)
- Butce (projectType'a gore farkli araliklar)
- Baslangic zamani (5 secenek)
- Fotograf yukleme (max 5, jpg/png, 10MB)
- Ek notlar textarea

**StepContact.tsx** -- Guncelleme: Ad Soyad*, Telefon*, E-posta* (hepsi zorunlu). KVKK onay checkbox.

**StepOtp.tsx** -- Mevcut haliyle korunacak, degisiklik yok.

## 3. LeadFormModal Guncelleme

- `TOTAL_STEPS = 6` (5 adim + OTP)
- Adim 5'te "Dogrulama Kodu Gonder" butonu → OTP gonderir → Adim 6'ya gecer
- Adim 6'da OTP girilir → verify + submit
- `canNext()` validasyonu:
  - Adim 1: projectType secili
  - Adim 2: serviceType secili
  - Adim 3: en az 1 scope secili (sulama icin 3 alan dolu)
  - Adim 4: city + propertyType + areaSize + currentCondition + budget + timeline dolu
  - Adim 5: fullName + phone + email + kvkkAccepted
  - Adim 6: otpCode.length === 6

## 4. Silinecek / Kullanilmayacak Dosyalar

- `StepService.tsx` → `StepProjectType.tsx` + `StepServiceType.tsx` ile degisecek
- `StepOption.tsx` → Artik kullanilmayacak
- `StepLocation.tsx` → `StepProjectDetails.tsx` icine tasinacak

## 5. Veritabani Migrasyonu

`leads` tablosuna yeni kolonlar:
```sql
ALTER TABLE leads ADD COLUMN project_type text;
ALTER TABLE leads ADD COLUMN scope text[];
ALTER TABLE leads ADD COLUMN irrigation_type text;
ALTER TABLE leads ADD COLUMN irrigation_system text;
ALTER TABLE leads ADD COLUMN water_source text;
ALTER TABLE leads ADD COLUMN property_type text;
ALTER TABLE leads ADD COLUMN area_size text;
ALTER TABLE leads ADD COLUMN current_condition text;
ALTER TABLE leads ADD COLUMN notes text;
ALTER TABLE leads ADD COLUMN photo_urls text[];
```

## 6. Fotograf Yukleme

- Yeni storage bucket: `lead-photos` (public)
- Submit sirasinda fotograflar upload edilip URL'leri `photo_urls` kolonuna yazilacak

## 7. Lead Scoring Guncellemesi

`calculate_lead_score` DB fonksiyonu yeni butce/alan degerlerine gore guncellenecek. Ticari projeler icin daha yuksek baz puan. `leadScoring.ts` frontend tarafindaki breakdown da uyumlu hale getirilecek.

## 8. Telegram Bildirimi

`notify_firms_on_new_lead` fonksiyonu yeni alan isimlerini (`project_type`, `area_size` vs.) payload'a ekleyecek sekilde guncellenecek.

