

## Bulk Firma Oluşturma

Admin paneline iki yeni toplu firma ekleme yöntemi eklenecek: **CSV yükleme** ve **çoklu URL crawler**.

### 1. Yeni Bileşen: `AdminBulkFirmTab.tsx`

Admin paneline yeni bir sekme/dialog oluşturulacak. İki mod içerecek:

**CSV/Excel Yükleme Modu:**
- Kullanıcı CSV dosyası yükler (sütunlar: firma_adı, telefon, email, il, ilçe, adres, website, açıklama, hizmetler)
- Dosya parse edilir ve tablo önizlemesi gösterilir
- Kullanıcı satırları inceleyip düzenleyebilir
- "Tümünü Ekle" butonu ile toplu insert yapılır
- Örnek CSV şablonu indirme linki sunulur

**Çoklu URL Crawler Modu:**
- Textarea'ya birden fazla URL yapıştırılır (satır başına bir URL)
- Her URL için mevcut `firecrawl-company` edge function çağrılır
- Sonuçlar tablo olarak gösterilir, kullanıcı düzenleyebilir
- Seçilen firmaları toplu olarak veritabanına ekler

### 2. Admin Panel Entegrasyonu

- `SIDEBAR_ITEMS`'a "Toplu Ekle" menü öğesi eklenir (Upload ikonu ile)
- Firmalar sekmesine de "Toplu Ekle" butonu konulabilir
- Tab state'ine `"bulk"` key eklenir

### 3. Firma Insert Mantığı

- Mevcut `FirmFormDialog`'daki insert mantığı yeniden kullanılır
- Her firma için admin'in `user_id`'si atanır, slug otomatik üretilir (`generateFirmSlug`)
- `is_approved: true`, `is_active: true` varsayılan olarak ayarlanır
- Hata olan satırlar kırmızı işaretlenip rapor edilir, başarılı olanlar eklenir

### 4. CSV Parse

- Harici kütüphane gerekmez, basit bir `FileReader` + split/parse yeterli
- İlk satır header olarak kabul edilir
- Hizmetler virgülle ayrılmış string olarak parse edilir

### Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `src/components/admin/AdminBulkFirmTab.tsx` | Yeni bileşen — CSV yükleme + çoklu URL crawler |
| `src/pages/AdminPanel.tsx` | Sidebar'a "Toplu Ekle" menüsü, tab render |

