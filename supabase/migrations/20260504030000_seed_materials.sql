-- Hardscape Material Categories & Materials Seed
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. KATEGORILER
-- ============================================================
INSERT INTO material_categories (name, slug, icon, sort_order) VALUES
  ('Doğal Taşlar ve Çakıllar',         'dogal-taslar-ve-cakillar',          '🪨', 1),
  ('Zemin Kaplamaları',                 'zemin-kaplamalari',                 '🧱', 2),
  ('Ahşap Yapılar ve Gölge Elemanları', 'ahsap-yapilar-ve-golge-elemanlari', '🪵', 3),
  ('Bahçe Aydınlatması',               'bahce-aydinlatmasi',                '💡', 4),
  ('Saksılar ve Dekoratif Objeler',    'saksilar-ve-dekoratif-objeler',     '🏺', 5),
  ('Su Öğeleri',                       'su-ogeleri',                        '💧', 6),
  ('Sulama Sistemleri',                'sulama-sistemleri',                 '🚿', 7)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. MALZEMELER
-- ============================================================

-- Dogal Taslar ve Cakillar
WITH cat AS (SELECT id FROM material_categories WHERE slug = 'dogal-taslar-ve-cakillar')
INSERT INTO materials (name, slug, category_id, material_type, usage_areas, is_published) VALUES
  ('Kayrak Tasi',                       'kayrak-tasi',       (SELECT id FROM cat), 'Dogal Tas',    'Zemin, Yurume Yolu, Duvar', true),
  ('Traverten',                         'traverten',         (SELECT id FROM cat), 'Dogal Tas',    'Teras, Yurume Yolu, Havuz Cevresi', true),
  ('Bazalt',                            'bazalt',            (SELECT id FROM cat), 'Dogal Tas',    'Zemin Kaplama, Doseme, Kup Tas', true),
  ('Granit Kup Tas',                    'granit-kup-tas',    (SELECT id FROM cat), 'Dogal Tas',    'Yol, Kaldirim, Bordur', true),
  ('Dolomit Tasi (Beyaz Cakil)',        'dolomit-tasi',      (SELECT id FROM cat), 'Cakil',        'Cicek Yatagi, Dekoratif Zemin', true),
  ('Podima Tasi',                       'podima-tasi',       (SELECT id FROM cat), 'Dogal Tas',    'Zemin, Duvar Kaplama', true),
  ('Dere Cakili',                       'dere-cakili',       (SELECT id FROM cat), 'Cakil',        'Dekoratif, Drenaj, Zemin Ortusu', true),
  ('Lav Tasi / Curuf',                  'lav-tasi',          (SELECT id FROM cat), 'Volkanik Tas', 'Cicek Yatagi, Drenaj, Dekorasyon', true),
  ('Mermer Kirigi / Mozaik',            'mermer-kirigi',     (SELECT id FROM cat), 'Dogal Tas',    'Dekoratif, Zemin Dolgusu', true)
ON CONFLICT (slug) DO NOTHING;

-- Zemin Kaplamalari (Deck ve Parke)
WITH cat AS (SELECT id FROM material_categories WHERE slug = 'zemin-kaplamalari')
INSERT INTO materials (name, slug, category_id, material_type, usage_areas, is_published) VALUES
  ('Teak Ahsap Deck',                         'teak-ahsap-deck',      (SELECT id FROM cat), 'Ahsap',    'Teras, Balkon, Havuz Cevresi', true),
  ('Cam / Ipe Ahsap Deck',                    'cam-ipe-ahsap-deck',   (SELECT id FROM cat), 'Ahsap',    'Teras, Bahce Zemini', true),
  ('Kompozit Deck',                            'kompozit-deck',        (SELECT id FROM cat), 'Kompozit', 'Teras, Balkon, Yurume Yolu', true),
  ('Kilit Parke Tasi',                         'kilit-parke-tasi',     (SELECT id FROM cat), 'Beton',    'Otopark, Yol, Yaya Kaldirimi', true),
  ('Dogal Tas Doseme',                         'dogal-tas-doseme',     (SELECT id FROM cat), 'Dogal Tas','Bahce Yolu, Teras, Avlu', true),
  ('Kaucuk Zemin Kaplama',                     'kaucuk-zemin-kaplama', (SELECT id FROM cat), 'Kaucuk',   'Cocuk Oyun Alani, Spor Sahasi', true),
  ('Cim Tasi',                                 'cim-tasi',             (SELECT id FROM cat), 'Beton',    'Gecis Yolu, Otopark, Peyzaj', true),
  ('Seramik / Porselen Dis Mekan Fayansi',     'dis-mekan-fayans',     (SELECT id FROM cat), 'Seramik',  'Teras, Balkon, Havuz Kenari', true)
ON CONFLICT (slug) DO NOTHING;

-- Ahsap Yapilar ve Golge Elemanlari
WITH cat AS (SELECT id FROM material_categories WHERE slug = 'ahsap-yapilar-ve-golge-elemanlari')
INSERT INTO materials (name, slug, category_id, material_type, usage_areas, is_published) VALUES
  ('Pergola',                          'pergola',             (SELECT id FROM cat), 'Yapi Elemani',  'Bahce, Teras, Oturma Alani', true),
  ('Kamelya (Gazebo)',                 'kamelya-gazebo',      (SELECT id FROM cat), 'Yapi Elemani',  'Bahce Oturma Alani, Dinlenme', true),
  ('Kis Bahcesi',                      'kis-bahcesi',         (SELECT id FROM cat), 'Yapi Elemani',  'Cok Amacli Kapali Alan', true),
  ('Ahsap Cit Sistemi',               'ahsap-cit-sistemi',   (SELECT id FROM cat), 'Cit',           'Bahce Cevirme, Gizlilik', true),
  ('Ayirici (Separator)',              'ayirici-separator',   (SELECT id FROM cat), 'Bolucu',        'Alan Ayrimi, Dekorasyon', true),
  ('Ahsap Saksilik / Bitki Kasasi',   'ahsap-saksilik',      (SELECT id FROM cat), 'Ahsap',         'Bitki Yetistiriciligi, Dekorasyon', true),
  ('Tente ve Golgelik Sistemi',        'tente-golgelik',      (SELECT id FROM cat), 'Golge Sistemi', 'Teras, Balkon, Bahce', true)
ON CONFLICT (slug) DO NOTHING;

-- Bahce Aydinlatmasi
WITH cat AS (SELECT id FROM material_categories WHERE slug = 'bahce-aydinlatmasi')
INSERT INTO materials (name, slug, category_id, material_type, usage_areas, is_published) VALUES
  ('Bollard / Cim Armaturu',               'bollard-cim-armaturu',    (SELECT id FROM cat), 'Aydinlatma',    'Yol, Cim Alan, Bahce Yuruyus Yolu', true),
  ('Agac Alti Projektor',                  'agac-alti-projektor',     (SELECT id FROM cat), 'Aydinlatma',    'Agac, Bitki Vurgulama', true),
  ('Duvar Apligi (Dis Mekan)',             'dis-mekan-aplik',         (SELECT id FROM cat), 'Aydinlatma',    'Duvar, Bahce Girisi', true),
  ('Solar Aydinlatma Sistemi',             'solar-aydinlatma',        (SELECT id FROM cat), 'Aydinlatma',    'Tum Acik Alanlar, Enerji Tasarruflu', true),
  ('Su Ici Aydinlatma',                    'su-ici-aydinlatma',       (SELECT id FROM cat), 'Aydinlatma',    'Havuz, Golet, Su Ogeleri', true),
  ('Yol Bordur Armaturu',                  'yol-bordur-armaturu',     (SELECT id FROM cat), 'Aydinlatma',    'Yol Kenari, Bordur', true),
  ('Akilli Bahce Aydinlatma Sistemi',      'akilli-bahce-aydinlatma', (SELECT id FROM cat), 'Akilli Sistem', 'Tum Bahce Aydinlatmasi', true)
ON CONFLICT (slug) DO NOTHING;

-- Saksilar ve Dekoratif Objeler
WITH cat AS (SELECT id FROM material_categories WHERE slug = 'saksilar-ve-dekoratif-objeler')
INSERT INTO materials (name, slug, category_id, material_type, usage_areas, is_published) VALUES
  ('Fiberglas / Polietilen Saksi',     'fiberglas-saksi',       (SELECT id FROM cat), 'Saksi',      'Teras, Balkon, Bahce', true),
  ('Beton Saksi',                      'beton-saksi',           (SELECT id FROM cat), 'Saksi',      'Modern Bahce, Dis Mekan', true),
  ('Terracotta Saksi',                 'terracotta-saksi',      (SELECT id FROM cat), 'Saksi',      'Geleneksel Bahce, Ic-Dis Mekan', true),
  ('Corten Celik Saksi',               'corten-celik-saksi',    (SELECT id FROM cat), 'Saksi',      'Modern / Endustriyel Bahce', true),
  ('Tas / Polyester Saksi',            'tas-polyester-saksi',   (SELECT id FROM cat), 'Saksi',      'Mimari Bahce Tasarimi', true),
  ('Bahce Heykeli ve Sus Figuru',      'bahce-heykeli',         (SELECT id FROM cat), 'Dekorasyon', 'Bahce Dekoru, Odak Noktasi', true),
  ('Yalak ve Su Kaplicasi',            'yalak-su-kaplicasi',    (SELECT id FROM cat), 'Dekorasyon', 'Bahce Dekorasyonu, Kus Banyosu', true)
ON CONFLICT (slug) DO NOTHING;

-- Su Ogeleri
WITH cat AS (SELECT id FROM material_categories WHERE slug = 'su-ogeleri')
INSERT INTO materials (name, slug, category_id, material_type, usage_areas, is_published) VALUES
  ('Sus Havuzu',                       'sus-havuzu',        (SELECT id FROM cat), 'Su Ogesi', 'Bahce Odak Noktasi, Dekorasyon', true),
  ('Biyolojik Golet',                  'biyolojik-golet',   (SELECT id FROM cat), 'Su Ogesi', 'Dogal Bahce, Ekosistem', true),
  ('Selale Sistemi',                   'selale-sistemi',    (SELECT id FROM cat), 'Su Ogesi', 'Bahce, Havuz Kenari, Duvar', true),
  ('Fiskiye',                          'fiskiye',           (SELECT id FROM cat), 'Su Ogesi', 'Havuz, Golet, Sus Alani', true),
  ('Sifir Kenarli (Infinity) Havuz',   'infinity-havuz',    (SELECT id FROM cat), 'Havuz',    'Luks Bahce, Otel, Villa', true),
  ('Jakuzi / Spa Sistemi',             'jakuzi-spa',        (SELECT id FROM cat), 'Su Ogesi', 'Teras, Bahce, Kapali Alan', true)
ON CONFLICT (slug) DO NOTHING;

-- Sulama Sistemleri
WITH cat AS (SELECT id FROM material_categories WHERE slug = 'sulama-sistemleri')
INSERT INTO materials (name, slug, category_id, material_type, usage_areas, is_published) VALUES
  ('Damlama Sulama Sistemi',           'damlama-sulama',             (SELECT id FROM cat), 'Sulama',        'Cicek Yatagi, Sebze Bahcesi, Agac Dibi', true),
  ('Pop-up Fiskiye Sistemi',           'popup-fiskiye',              (SELECT id FROM cat), 'Sulama',        'Cim Alan, Genis Bahce', true),
  ('Akilli Sulama Zamanlayicisi',      'akilli-sulama-zamanlayicisi', (SELECT id FROM cat), 'Akilli Sistem', 'Tum Sulama Sistemleri', true),
  ('Yagmurlama Sistemi',               'yagmurlama-sistemi',         (SELECT id FROM cat), 'Sulama',        'Buyuk Cim Alanlar, Spor Sahalari', true),
  ('Mikro Sulama (Saksi / Sera)',      'mikro-sulama',               (SELECT id FROM cat), 'Sulama',        'Saksi, Sera, Kapali Alan Bitkileri', true),
  ('Su Depolama Tanki / Sarnic',       'su-depolama-tanki',          (SELECT id FROM cat), 'Depolama',      'Yagmur Suyu Hasadi, Sulama', true)
ON CONFLICT (slug) DO NOTHING;
