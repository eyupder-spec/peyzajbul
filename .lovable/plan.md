

## Plan: Siteyi Görsel Olarak İyileştirme

Mevcut site fonksiyonel ama biraz "düz" duruyor. Aşağıdaki değişikliklerle modern, profesyonel ve canlı bir görünüm kazandıracağız:

### 1. Hero Bölümü — Daha Etkileyici
- Arka plan görselinin opaklığını artır (opacity-20 → opacity-30)
- Gradient overlay'i yumuşat
- Başlığa altın renkli bir accent span ekle ("En İyi" kelimesini vurgula)
- CTA butonlarına hafif animasyon (hover:scale-105, hover:shadow-lg)
- İstatistik sayaçlarını Hero'nun alt kısmına taşı (güven oluştur)

### 2. Navbar — Daha Şık
- Backdrop blur'u artır (backdrop-blur-sm → backdrop-blur-md)
- Shadow ekle (shadow-sm)
- Logo yanına küçük bir yeşil nokta/pulse efekti

### 3. Firma Kartları — Daha Çekici
- Logo alanını büyüt (w-12 h-12 → w-14 h-14)
- Hover'da yukarı kalkma efekti (hover:-translate-y-1)
- Premium kartlara hafif gradient arka plan
- Buton hover'ında ok animasyonu

### 4. "Nasıl Çalışır" Bölümü — Adımlar Arası Bağlantı
- Adımlar arasına kesik çizgi/ok bağlantısı ekle
- İkon arka planlarını daha belirgin yap
- Numara badge'lerini daha görünür yap

### 5. Kategori Kartları — Daha Canlı
- Hover'da ikon büyüme efekti (group-hover:scale-110)
- Gradient border hover efekti
- Daha büyük ikon alanı

### 6. Şehir Kartları — Daha Zarif
- Overlay gradient'i iyileştir
- Hover'da hafif parlaklık efekti
- Şehir isimlerine beyaz text-shadow

### 7. Genel İyileştirmeler
- Section'lar arası geçişleri yumuşat (scroll-smooth)
- TrustBadges bölümüne counter animasyonu ekle
- Footer'a sosyal medya ikonları ve daha zengin layout
- Tüm section başlıklarına dekoratif alt çizgi (accent renginde)

### Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `src/components/Hero.tsx` | Accent vurgu, istatistik sayaçları, buton animasyonları |
| `src/components/Navbar.tsx` | Blur, shadow, logo iyileştirmesi |
| `src/components/FirmCard.tsx` | Hover efektleri, premium gradient |
| `src/components/HowItWorks.tsx` | Adımlar arası bağlantı, ikon iyileştirmesi |
| `src/components/PopularCategories.tsx` | Hover animasyonları |
| `src/components/FeaturedCities.tsx` | Overlay ve hover iyileştirmeleri |
| `src/components/TrustBadges.tsx` | Hero altına taşınacak veya animasyon eklenecek |
| `src/components/Footer.tsx` | Daha zengin layout |
| `src/index.css` | Yeni utility class'lar, smooth scroll |

