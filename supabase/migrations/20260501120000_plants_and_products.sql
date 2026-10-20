-- ============================================
-- Bitki Rehberi + Firma Ürün Vitrini Sistemi
-- ============================================

-- 1) Kategoriler
CREATE TABLE IF NOT EXISTS public.plant_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '🌿',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2) Bitki Ansiklopedisi (Admin yönetir)
CREATE TABLE IF NOT EXISTS public.plants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  scientific_name text,
  category_id uuid REFERENCES public.plant_categories(id) ON DELETE SET NULL,
  description text,
  watering text CHECK (watering IN ('az', 'orta', 'cok')),
  sunlight text CHECK (sunlight IN ('tam_gunes', 'yari_golge', 'golge')),
  soil_type text,
  growth_speed text CHECK (growth_speed IN ('yavas', 'orta', 'hizli')),
  climate_zones text,
  cover_image_url text,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Firma → Bitki Bağlantısı (Katalogdan seç)
CREATE TABLE IF NOT EXISTS public.firm_plants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  plant_id uuid REFERENCES public.plants(id) ON DELETE CASCADE,
  show_price boolean DEFAULT false,
  price_display text,
  stock_status text DEFAULT 'available' CHECK (stock_status IN ('available', 'limited', 'unavailable')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(firm_id, plant_id)
);

-- 4) Firma Serbest Ürün Vitrini (her şey olabilir)
CREATE TABLE IF NOT EXISTS public.firm_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  show_price boolean DEFAULT false,
  price_display text,
  image_url text,
  category text,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.plant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_products ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "plant_categories_public_read" ON public.plant_categories FOR SELECT USING (true);
CREATE POLICY "plants_public_read" ON public.plants FOR SELECT USING (is_published = true);
CREATE POLICY "firm_plants_public_read" ON public.firm_plants FOR SELECT USING (true);
CREATE POLICY "firm_products_public_read" ON public.firm_products FOR SELECT USING (is_active = true);

-- Firma kendi ürünlerini yönetir
CREATE POLICY "firm_plants_firm_manage" ON public.firm_plants
  FOR ALL USING (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
  );

CREATE POLICY "firm_products_firm_manage" ON public.firm_products
  FOR ALL USING (
    firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid())
  );

-- Admin tüm bitkileri yönetir (service_role bypass)
CREATE POLICY "plants_admin_all" ON public.plants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plant_categories_admin_all" ON public.plant_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SEED DATA: Kategoriler
-- ============================================
INSERT INTO public.plant_categories (name, slug, icon, sort_order) VALUES
  ('Çit & Çevre Bitkileri', 'cit-cevre', '🌿', 1),
  ('Çiçekli Çalılar', 'cicekli-calilar', '🌸', 2),
  ('Sarılıcı & Tırmanıcılar', 'sarilici-tirmaniclar', '🍃', 3),
  ('Süs Ağaçları', 'sus-agaclari', '🌳', 4),
  ('İbreli Ağaçlar', 'ibreli-agaclar', '🌲', 5),
  ('Süs Otları', 'sus-otlari', '🌾', 6),
  ('Tropikal & Sukulent', 'tropikal-sukulent', '🌵', 7),
  ('Mevsimlik Çiçekler', 'mevsimlik-cicekler', '💐', 8),
  ('Çim & Zemin Örtücü', 'cim-zemin-ortucu', '🟩', 9)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: Bitkiler
-- ============================================
DO $$
DECLARE
  cat_cit uuid;
  cat_cicek uuid;
  cat_saril uuid;
  cat_agac uuid;
  cat_ibreli uuid;
  cat_ot uuid;
  cat_tropikal uuid;
  cat_mevsim uuid;
  cat_cim uuid;
BEGIN
  SELECT id INTO cat_cit FROM plant_categories WHERE slug = 'cit-cevre';
  SELECT id INTO cat_cicek FROM plant_categories WHERE slug = 'cicekli-calilar';
  SELECT id INTO cat_saril FROM plant_categories WHERE slug = 'sarilici-tirmaniclar';
  SELECT id INTO cat_agac FROM plant_categories WHERE slug = 'sus-agaclari';
  SELECT id INTO cat_ibreli FROM plant_categories WHERE slug = 'ibreli-agaclar';
  SELECT id INTO cat_ot FROM plant_categories WHERE slug = 'sus-otlari';
  SELECT id INTO cat_tropikal FROM plant_categories WHERE slug = 'tropikal-sukulent';
  SELECT id INTO cat_mevsim FROM plant_categories WHERE slug = 'mevsimlik-cicekler';
  SELECT id INTO cat_cim FROM plant_categories WHERE slug = 'cim-zemin-ortucu';

  INSERT INTO public.plants (slug, name, scientific_name, category_id, description, watering, sunlight, growth_speed) VALUES
    -- Çit & Çevre
    ('bodur-taflan','Bodur Taflan','Euonymus japonicus',cat_cit,'Çit ve sınır bitkisi olarak sık kullanılan herdem yeşil tür. Budamaya uygun yapısıyla formal bahçelerin vazgeçilmezi.','orta','tam_gunes','orta'),
    ('simsir','Şimşir','Buxus sempervirens',cat_cit,'Budamaya çok uygun klasik çit ve form bitkisi. Asırlık bahçelerin simgesi, topiary için ideal.','orta','yari_golge','yavas'),
    ('leylandi','Leylandi','Cupressocyparis leylandii',cat_cit,'Hızlı büyüyen çit ve rüzgar kıran ağaç. Kısa sürede mahremiyet sağlar.','orta','tam_gunes','hizli'),
    ('kurtbagri','Kurtbağrı','Ligustrum japonicum',cat_cit,'Yoğun yapılı çit bitkisi. Sık dikimde geçirimsiz çit oluşturur.','orta','tam_gunes','hizli'),
    ('ates-dikeni','Ateş Dikeni','Pyracantha coccinea',cat_cit,'Turuncu kırmızı meyveli çit bitkisi. Kuşları çeker, sonbaharda renk katar.','az','tam_gunes','orta'),
    -- Çiçekli Çalılar
    ('lavanta','Lavanta','Lavandula angustifolia',cat_cicek,'Kuraklığa dayanıklı, hoş kokulu ve mor çiçekli popüler bordür bitkisi. Kelebek ve arıları çeker.','az','tam_gunes','orta'),
    ('ortanca','Ortanca','Hydrangea macrophylla',cat_cicek,'Büyük gösterişli çiçekleriyle gölge bahçelerin vazgeçilmezi. Toprak pH''ına göre renk değiştirebilir.','cok','yari_golge','orta'),
    ('gul','Gül','Rosa spp.',cat_cicek,'Her bahçede kullanılan klasik ve romantik çiçekli bitki. Yüzlerce çeşidiyle renk cümbüşü sunar.','orta','tam_gunes','orta'),
    ('kamelya','Kamelya','Camellia japonica',cat_cicek,'Kış sonu ilkbahar başında çiçek açan zarif bitki. Asit toprak sever.','orta','yari_golge','yavas'),
    ('agac-hatmi','Ağaç Hatmi','Hibiscus syriacus',cat_cicek,'Yazın uzun süre çiçek açan çalı formunda bitki. Tropikal görünüm sunar.','orta','tam_gunes','orta'),
    ('sus-nar','Süs Nar','Punica granatum nana',cat_cicek,'Minyatür nar çiçekleriyle dekoratif çalı. Sonbaharda meyve verir.','az','tam_gunes','yavas'),
    ('zakkum','Zakkum','Nerium oleander',cat_cicek,'Sıcak iklimlerde yaygın kullanılan çiçekli çalı. Kurak koşullara son derece dayanıklı.','az','tam_gunes','hizli'),
    ('alev-agaci-photinia','Alev Ağacı','Photinia fraseri Red Robin',cat_cicek,'Kırmızı genç yapraklarıyla dikkat çeken dekoratif çalı. Yılın dört mevsimi renk sunar.','orta','tam_gunes','orta'),
    -- Sarılıcı & Tırmanıcılar
    ('hanimeli','Hanımeli','Lonicera japonica',cat_saril,'Hoş kokulu sarılıcı bitki. Akşamları özellikle yoğun koku yayar.','orta','yari_golge','hizli'),
    ('sarmasik','Sarmaşık','Hedera helix',cat_saril,'Duvar ve çit kaplamada kullanılan dayanıklı sarılıcı. Gölge toleransı yüksek.','az','golge','hizli'),
    ('begonvil','Begonvil','Bougainvillea glabra',cat_saril,'Akdeniz bahçelerinin renkli sarılıcı bitkisi. Yoğun çiçek açar, kuraklığa dayanır.','az','tam_gunes','hizli'),
    ('arap-yasemini','Arap Yasemini','Jasminum sambac',cat_saril,'Yoğun kokulu beyaz çiçekli sarılıcı. Sıcak iklimlerde sürekli çiçekler.','orta','tam_gunes','orta'),
    ('yasemin','Yasemin','Jasminum officinale',cat_saril,'Kokulu çiçekleriyle pergolalarda kullanılır. Klasik Türk bahçelerinin simgesi.','orta','tam_gunes','orta'),
    -- Süs Ağaçları
    ('sus-erigi','Süs Eriği','Prunus cerasifera',cat_agac,'Mor yapraklı dekoratif ağaç. İlkbaharda pembe çiçekler açar.','orta','tam_gunes','orta'),
    ('akcaagac','Akçaağaç','Acer palmatum',cat_agac,'Sonbahar renkleriyle öne çıkan süs ağacı. Japon bahçelerinin simgesi.','orta','yari_golge','yavas'),
    ('ipek-agaci','İpek Ağacı','Albizia julibrissin',cat_agac,'Pembe çiçekli gölge ağacı. Yaz aylarında çarpıcı görüntü sunar.','orta','tam_gunes','hizli'),
    ('erguvan','Erguvan','Cercis siliquastrum',cat_agac,'İlkbaharda dalları pembe çiçeklerle kaplanan süs ağacı. İstanbul''un simgesi.','orta','tam_gunes','orta'),
    ('oya-agaci','Oya Ağacı','Lagerstroemia indica',cat_agac,'Yaz boyu çiçekli küçük süs ağacı. Sonbahar yaprak rengi de güzeldir.','orta','tam_gunes','orta'),
    ('manolya','Manolya','Magnolia grandiflora',cat_agac,'Büyük beyaz çiçekli gösterişli ağaç. Parlak koyu yeşil yaprakları dekoratif.','orta','tam_gunes','yavas'),
    ('sus-elmasi','Süs Elması','Malus floribunda',cat_agac,'Çiçekli bahçelerde tercih edilen süs ağacı. İlkbaharda pembe beyaz çiçek şöleni.','orta','tam_gunes','orta'),
    ('kizilcik-cornus','Kızılcık','Cornus alba',cat_agac,'Kırmızı dallarıyla kış peyzajında öne çıkar. Sonbahar yaprak rengi de mükemmel.','orta','tam_gunes','orta'),
    ('cinar','Çınar','Platanus orientalis',cat_agac,'Büyük gölge sağlayan peyzaj ağacı. Uzun ömürlü, anıtsal görünüm.','orta','tam_gunes','hizli'),
    ('defne','Defne','Laurus nobilis',cat_agac,'Hem mutfak hem peyzajda kullanılan aromatik ağaç. Herdem yeşil, budamaya uygun.','az','tam_gunes','yavas'),
    ('kaucuk-bitkisi','Kauçuk Bitkisi','Ficus elastica',cat_agac,'Sıcak bölgelerde dış mekânda kullanılan geniş yapraklı bitki. Tropikal hava katar.','orta','yari_golge','orta'),
    -- İbreli Ağaçlar
    ('mazi-thuja','Mazı (Thuja)','Thuja occidentalis',cat_ibreli,'Bahçe çevreleme ve perdeleme için tercih edilen ibreli ağaç. Çeşitli formlarda bulunur.','orta','tam_gunes','orta'),
    ('mavi-ladin','Mavi Ladin','Picea pungens',cat_ibreli,'Mavi tonlu iğneleriyle peyzajın gözdesi. Soğuğa çok dayanıklı.','orta','tam_gunes','yavas'),
    ('limon-servi','Limon Servi','Cupressus macrocarpa Goldcrest',cat_ibreli,'Limon kokulu sarımsı iğneli dekoratif servi. Saksıda da yetişir.','orta','tam_gunes','orta'),
    -- Süs Otları
    ('sus-cimi','Süs Çimi','Pennisetum alopecuroides',cat_ot,'Modern peyzajlarda kullanılan dekoratif çim. Rüzgarda sallanan yapısıyla canlı görüntü.','orta','tam_gunes','orta'),
    ('pampas-otu','Pampas Otu','Cortaderia selloana',cat_ot,'Büyük püskül çiçekli gösterişli süs otu. Bahçeye dramatik etki katar.','az','tam_gunes','hizli'),
    -- Tropikal & Sukulent
    ('kaktus-opuntia','Kaktüs','Opuntia ficus-indica',cat_tropikal,'Kurak peyzajlarda kullanılan sukulent tür. Bakımı çok kolay, kuraklığa mükemmel dayanıklı.','az','tam_gunes','yavas'),
    ('agave','Agave','Agave americana',cat_tropikal,'Modern peyzajlarda kullanılan heykelsi bitki. Uzun ömürlü, çarpıcı görünüm.','az','tam_gunes','yavas'),
    ('yukka','Yukka','Yucca filamentosa',cat_tropikal,'Kuraklığa dayanıklı tropikal görünüm sağlar. Çiçek sapı metrelerce yükselir.','az','tam_gunes','yavas'),
    ('palmiye','Palmiye','Phoenix canariensis',cat_tropikal,'Akdeniz bahçelerinin sembol ağacı. Tropikal atmosfer yaratır.','orta','tam_gunes','yavas'),
    -- Mevsimlik Çiçekler
    ('karanfil','Karanfil','Dianthus barbatus',cat_mevsim,'Renkli bordür çiçeği. Güzel kokulu, uzun çiçeklenme dönemi.','orta','tam_gunes','orta'),
    ('petunya','Petunya','Petunia hybrida',cat_mevsim,'Mevsimlik saksı ve bordür bitkisi. Renk seçenekleri çok geniş.','orta','tam_gunes','hizli'),
    ('sardunya','Sardunya','Pelargonium zonale',cat_mevsim,'Balkon ve bahçelerde yaygın çiçekli bitki. Kısmi kuraklığa dayanır.','orta','tam_gunes','hizli'),
    ('menekse','Menekşe','Viola tricolor',cat_mevsim,'Kış ve bahar döneminde çiçek açan bitki. Soğuğa dayanıklı mevsimlik.','orta','yari_golge','orta'),
    ('gazanya','Gazanya','Gazania rigens',cat_mevsim,'Güneşi seven yer örtücü çiçek. Güneşli havalarda açar.','az','tam_gunes','orta'),
    ('alyssum','Alyssum','Lobularia maritima',cat_mevsim,'Yer örtücü beyaz çiçekli bitki. Ballı kokusu böcekleri çeker.','az','tam_gunes','hizli'),
    ('verbena','Verbena','Verbena hybrida',cat_mevsim,'Uzun süre çiçekli mevsimlik bitki. Sıcağa ve kısmi kuraklığa dayanır.','orta','tam_gunes','hizli'),
    -- Çim
    ('rulo-cim','Çim (Rulo Çim)','Festuca arundinacea',cat_cim,'Bahçelerin temel yeşil zemin bitkisi. Sağlam ve hızlı tutunan rulo çim.','orta','tam_gunes','hizli')
  ON CONFLICT (slug) DO NOTHING;
END $$;
