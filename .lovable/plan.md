

## Mevcut Lead'leri Firmalara Atama

### Durum
- **İstanbul lead'i** (`b13d6e4d...`): `assigned_firms` boş. İstanbul'da 2 onaylı firma var:
  - `89c2e816...` (Yeşil Peyzaj A.S - premium)
  - `81a24714...` (DENEME FİRMAM)
- **Ankara lead'i** (`d022ae82...`): `assigned_firms` boş. Ankara'da onaylı firma yok, atama yapılamaz.

### Yapılacak İşlem

Tek bir SQL UPDATE ile İstanbul lead'inin `assigned_firms` alanına eşleşen 2 firmanın `user_id`'leri yazılacak:

```sql
UPDATE leads
SET assigned_firms = ARRAY['89c2e816-d08f-49ab-bbd3-cc76613066b7', '81a24714-68a9-42f6-87df-2fdb119f15e0']::uuid[]
WHERE id = 'b13d6e4d-4687-4cfd-af44-91c9a9d9e6cc';
```

Ankara lead'i için eşleşen firma bulunmadığından güncelleme yapılmayacak.

### Sonuç
İstanbul'daki iki firma, firma panellerinde (`/firma/leadler`) bu lead'i görebilecek. Yeni lead'ler ise daha önce oluşturduğumuz `assign_leads_to_firms` trigger'ı sayesinde otomatik atanacak.

