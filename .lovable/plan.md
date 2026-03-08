

## Kategori Sistemi Planı

Peyzaj sektörüne özel kapsamlı bir kategori sistemi oluşturulacak. Kategoriler hem firmaların hizmet seçiminde, hem kullanıcı filtrelemelerinde, hem de SEO amaçlı dinamik sayfalarda kullanılacak.

---

### Kategori Listesi (Önerilen ~20 kategori)

| Kategori | Slug | Icon |
|---|---|---|
| Peyzaj Mimarlığı | peyzaj-mimarligi | 📐 |
| Bahçe Tasarımı | bahce-tasarimi | 🎨 |
| Bahçe Bakımı & Bahçıvanlık | bahce-bakimi | 🌿 |
| Çim Serme & Çim Bakımı | cim-serme | 🌱 |
| Ağaçlandırma & Fidan | agaclandirma | 🌳 |
| Ağaç Budama & Kesim | agac-budama | ✂️ |
| Sulama Sistemleri | sulama-sistemleri | 💧 |
| Sert Zemin (Hardscape) | sert-zemin | 🧱 |
| Peyzaj Aydınlatma | peyzaj-aydinlatma | 💡 |
| Havuz Yapımı & Çevresi | havuz-yapimi | 🏊 |
| Süs Havuzu & Şelale | sus-havuzu | ⛲ |
| Çatı Bahçesi & Teras | cati-bahcesi | 🏢 |
| Dikey Bahçe | dikey-bahce | 🌿 |
| Kentsel Peyzaj | kentsel-peyzaj | 🏙️ |
| Park & Oyun Alanı | park-oyun-alani | 🛝 |
| Çit & Pergola | cit-pergola | 🏗️ |
| Peyzaj Malzemeleri Satışı | peyzaj-malzemeleri | 🪨 |
| Doğal Taş & Kaplama | dogal-tas | 🪨 |
| Bitki Satışı & Fidanlık | bitki-satisi | 🌺 |
| Toprak & Gübre Hizmetleri | toprak-gubre | 🌾 |

---

### Yapılacaklar

**1. Kategori veri dosyası oluştur** (`src/lib/categories.ts`)
- Tüm kategoriler slug, label, icon, kısa açıklama ve SEO metni ile tanımlanacak
- `getCategoryBySlug`, `getAllCategories` gibi yardımcı fonksiyonlar

**2. Kategoriler sayfası** (`src/pages/Kategoriler.tsx` — route: `/kategoriler`)
- Tüm kategorileri grid olarak listeleyen SEO uyumlu sayfa
- Her kategori kartında icon, isim ve kısa açıklama

**3. Kategori detay sayfası** (`src/pages/KategoriDetay.tsx` — route: `/kategoriler/:slug`)
- Üstte dinamik SEO makalesi (kategori açıklaması)
- Altında o kategoriye ait firmaların listesi (firms tablosundaki `services` array'inden filtreleme)
- Helmet ile dinamik title/description

**4. Mevcut SERVICE_OPTIONS güncelleme**
- `FirmFormDialog.tsx`'deki `SERVICE_OPTIONS` listesini yeni kategorilerle eşitle
- `StepService.tsx`'deki lead form seçeneklerini güncellenmiş kategorilerle değiştir

**5. Navbar'a Kategoriler linki ekle**
- Navbar'daki `links` array'ine "Kategoriler" → `/kategoriler` ekle

**6. Ana sayfada kategori bölümü**
- Index sayfasına popüler kategorileri gösteren yeni bir section ekle (HowItWorks altında veya üstünde)

**7. Firmalar sayfası filtresi güncelle**
- `Firmalar.tsx`'deki hizmet filtresi dropdown'unu yeni kategori listesinden besle

**8. Routing** (`App.tsx`)
- `/kategoriler` ve `/kategoriler/:slug` route'larını ekle

---

### Teknik Detaylar

- Veritabanı değişikliği gerekmez — firmalar zaten `services` text array'i ile hizmetlerini saklıyor. Kategori eşleşmesi bu alan üzerinden yapılacak.
- Kategori label'ları `SERVICE_OPTIONS` ile birebir eşleşecek şekilde tasarlanacak, böylece mevcut firmalar otomatik olarak doğru kategorilerde görünecek.
- Her kategori detay sayfası `useMemo` ile firms datasını filtreleyecek veya ayrı bir query ile `services` array'inde `@>` (contains) kontrolü yapacak.

