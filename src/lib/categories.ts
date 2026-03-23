export interface Category {
  slug: string;
  label: string;
  icon: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoArticle: string;
  imageUrl: string;
}

export const CATEGORIES: Category[] = [
  {
    slug: "peyzaj-mimarligi",
    label: "Peyzaj Mimarlığı",
    icon: "📐",
    shortDescription: "Profesyonel peyzaj projesi ve mimari tasarım hizmetleri.",
    seoTitle: "Peyzaj Mimarlığı Firmaları | Peyzajbul",
    seoDescription: "Türkiye'nin en iyi peyzaj mimarlığı firmalarını keşfedin. Profesyonel proje tasarımı, uygulama ve danışmanlık hizmetleri.",
    seoArticle: `
Peyzaj mimarlığı, dış mekanların sadece estetik değil, aynı zamanda ekolojik ve fonksiyonel olarak tasarlanmasını hedefleyen profesyonel bir disiplindir. Bir peyzaj mimarı; konut bahçelerinden kamusal parklara, ticari komplekslerden kentsel meydanlara kadar geniş bir yelpazede yaşam alanları kurgular. 

### Profesyonel Peyzaj Projelendirme Süreci
İyi bir peyzaj mimarlığı hizmeti şu aşamalardan oluşur:
1. **Keşif ve Analiz**: Toprak yapısı, ışık yönü ve mevcut bitki örtüsünün incelenmesi.
2. **Konsept Tasarım**: Müşteri ihtiyaçları ile estetik değerlerin harmanlandığı ilk taslaklar.
3. **Teknik Uygulama Verileri**: Sulama, aydınlatma ve sert zemin detaylarının teknik çizimleri.
4. **Bitkilendirme Planı**: Bölge iklimine en uygun floral türlerin seçimi ve konumlandırılması.

Peyzaj mimarları, sürdürülebilir bir gelecek için biyoçeşitliliği koruyan ve su tasarrufunu ön plana çıkaran projeler üretir. Türkiye'nin en iyi peyzaj mimarlık ofislerini rehberimizde bulabilir, projeleriniz için profesyonel danışmanlık alabilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1558904541-efa843a96f0f?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "bahce-tasarimi",
    label: "Bahçe Tasarımı",
    icon: "🎨",
    shortDescription: "Hayalinizdeki bahçeyi profesyonel tasarımcılarla oluşturun.",
    seoTitle: "Bahçe Tasarımı Firmaları | Peyzajbul",
    seoDescription: "Profesyonel bahçe tasarımı firmaları. Villa, konut ve ticari alanlar için özel bahçe projeleri.",
    seoArticle: `
Bahçe tasarımı, hayalinizdeki dış mekanı gerçeğe dönüştüren yaratıcı bir sanattır. İyi bir tasarım; görsel estetiğin ötesinde, kullanıcının yaşam stilini bahçeye yansıtır. Villa bahçelerinden butik alanlara kadar her metrekare, doğru bir planlamayla fonksiyonel bir yaşam alanına dönüşebilir.

### Bahçe Tasarımında Kritik Unsurlar
- **Sirkülasyon**: Yürüyüş yolları ve oturma alanları arasındaki akışın doğru kurgulanması.
- **Odak Noktaları**: Su öğeleri, heykeller veya özel ağaç formları ile görsel derinlik yaratılması.
- **Fonksiyonel Alanlar**: Çocuk oyun alanları, hobi bahçeleri ve BBQ köşelerinin akıllıca yerleşimi.
- **Mevsimsel Denge**: Bahçenizin sadece baharda değil, kış aylarında da estetik görünmesini sağlayan bitki seçimi.

Hayalinizdeki bahçeyi oluşturmak için uzman tasarımcılarımız ve profesyonel peyzaj firmalarımızdan ücretsiz teklif alabilir, mekanınıza değer katacak projeleri keşfedebilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "bahce-bakimi",
    label: "Bahçe Bakımı & Bahçıvanlık",
    icon: "🌿",
    shortDescription: "Düzenli bahçe bakımı, budama ve mevsimsel bakım hizmetleri.",
    seoTitle: "Bahçe Bakımı & Bahçıvanlık Firmaları | Peyzajbul",
    seoDescription: "Profesyonel bahçe bakımı ve bahçıvanlık hizmetleri. Düzenli bakım, budama, gübreleme ve mevsimsel işlemler.",
    seoArticle: `
Bahçe bakımı ve profesyonel bahçıvanlık hizmetleri, yeşil alanlarınızın sağlığını ve estetiğini uzun vadede koruyan en önemli yatırımdır. Bir bahçe kurulduktan sonra kendi haline bırakıldığında, yabani otlar ve hastalıklar nedeniyle kısa sürede formunu kaybedebilir.

### Periyodik Bahçe Bakımı Neleri Kapsar?
Düzenli bir bakım takvimi şu işlemleri içermelidir:
- **Profesyonel Budama**: Ağaç ve çalıların formunu korumak ve sağlıklı büyümelerini sağlamak için doğru zamanda kesim.
- **Gübreleme ve İlaçlama**: Bitki beslenmesi ve zararlılara karşı mevsimsel koruma önlemleri.
- **Çim Bakımı**: Havalandırma, yabancı ot temizliği ve düzenli biçim işlemleri.
- **Teknik Kontrol**: Sulama kanallarının ve peyzaj aydınlatma sistemlerinin gözden geçirilmesi.

Yaz-kış canlı ve nefes alan bir bahçe için deneyimli ekiplerden periyodik bakım hizmeti alabilir, bitkilerinizin ömrünü uzatabilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1416879598555-520eed53bfb8?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "cim-serme",
    label: "Çim Serme & Çim Bakımı",
    icon: "🌱",
    shortDescription: "Rulo çim serimi, tohum ekimi ve profesyonel çim bakımı.",
    seoTitle: "Çim Serme & Çim Bakımı Firmaları | Peyzajbul",
    seoDescription: "Rulo çim serimi ve çim bakımı firmaları. Profesyonel yeşil alan oluşturma hizmetleri.",
    seoArticle: `
Çim serme ve profesyonel çim bakımı, bahçenizin estetiğini ve yaşanabilirliğini belirleyen en temel unsurdur. Rulo çim (hazır çim) uygulaması ile sadece birkaç gün içerisinde yemyeşil, pürüzsüz ve sağlıklı bir bahçeye sahip olabilirsiniz. 

### Çim Serme & Bakımında Uzmanlık Alanlarımız
- **Rulo Çim Uygulaması**: Toprak hazırlığı, drenaj kontrolü ve kısa sürede kök salan kaliteli rulo çim serimi.
- **Tohum Ekimi & Gübreleme**: Bölge iklimine en uygun çim tohumlarının seçimi ve periyodik gübreleme programları.
- **Havalandırma (Skarifikasyon)**: Mevcut çim alanların nefes almasını sağlayan derinlemesine temizlik ve havalandırma işlemleri.
- **Hastalık ve Zararlı Kontrolü**: Mantar ve böcek zararlılarına karşı bitki pasaportlu, onaylı ilaçlama çözümleri.

Profesyonel bir çim serme hizmeti, sadece görsel bir şölen değil, aynı zamanda mülkünüzün değerini artıran bir yatırımdır. Uzman ekiplerimizden destek alarak uzun yıllar formunu koruyan yeşil alanlara sahip olabilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1592424001802-bd9280453303?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "agaclandirma",
    label: "Ağaçlandırma & Fidan",
    icon: "🌳",
    shortDescription: "Ağaç dikimi, fidanlık hizmetleri ve ağaçlandırma projeleri.",
    seoTitle: "Ağaçlandırma & Fidan Firmaları | Peyzajbul",
    seoDescription: "Ağaçlandırma ve fidan dikimi firmaları. Profesyonel ağaç dikimi ve fidanlık hizmetleri.",
    seoArticle: `Ağaçlandırma, hem estetik hem de çevresel açıdan büyük öneme sahip bir peyzaj hizmetidir. Doğru ağaç türlerinin seçimi, dikim tekniği ve bakım programı ile uzun ömürlü, sağlıklı ağaçlar yetiştirilir. Fidanlık hizmetleri ise süs bitkilerinden meyve ağaçlarına kadar geniş bir yelpazede fidan temini sağlar.`,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "agac-budama",
    label: "Ağaç Budama & Kesim",
    icon: "✂️",
    shortDescription: "Profesyonel ağaç budama, şekillendirme ve tehlikeli ağaç kesimi.",
    seoTitle: "Ağaç Budama & Kesim Firmaları | Peyzajbul",
    seoDescription: "Ağaç budama ve kesim firmaları. Güvenli budama, şekillendirme ve ağaç kaldırma hizmetleri.",
    seoArticle: `Ağaç budama, ağaçların sağlıklı büyümesini destekleyen ve estetik görünümünü koruyan önemli bir bakım işlemidir. Profesyonel budama teknikleri ile ağaçların şekli düzenlenir, hastalıklı dallar temizlenir ve güvenlik riskleri ortadan kaldırılır. Tehlikeli veya kurumuş ağaçların güvenli şekilde kesilmesi de uzman ekipler tarafından gerçekleştirilir.`,
    imageUrl: "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "sulama-sistemleri",
    label: "Sulama Sistemleri",
    icon: "💧",
    shortDescription: "Otomatik sulama sistemi kurulumu ve bakımı.",
    seoTitle: "Sulama Sistemleri Firmaları | Peyzajbul",
    seoDescription: "Otomatik sulama sistemi kurulum ve bakım firmaları. Damla sulama, yağmurlama ve akıllı sulama çözümleri.",
    seoArticle: `
Modern peyzaj tasarımlarının en kritik bileşeni olan otomatik sulama sistemleri, bitkilerinizin sürdürülebilirliği için hayatidir. Doğru planlanmamış bir sulama, en değerli bitkilerin bile kurumasına veya aşırı su tüketimiyle ciddi maliyetlere neden olabilir. Akıllı ve otomatik sistemler, bahçenizdeki nem dengesini optimize eder.

### Akıllı Sulama Çözümleri ve Teknolojiler
- **Damlama Sulama**: Su kaybını minimize eden, doğrudan kök bölgesine hedefli sulama yapan sistemler.
- **Pop-up Yağmurlama**: Çim alanlar için gizlenebilir, geniş açılı ve verimli sulama başlıkları.
- **Wi-Fi & Akıllı Kontrol**: Hava durumu verileriyle senkronize, mobil cihazlardan yönetilebilen kontrol üniteleri.
- **Sensör Entegrasyonu**: Yağmur ve toprak nem sensörleri ile gereksiz sulamanın tamamen önlenmesi.

Doğru bir sulama projesi ile %50'ye varan su tasarrufu sağlayabilir, bahçenizin her mevsim canlı kalmasını garanti altına alabilirsiniz. Profesyonel kurulum ve bakım hizmetleri için uzman ekiplerimize danışın.`,
    imageUrl: "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "sert-zemin",
    label: "Sert Zemin (Hardscape)",
    icon: "🧱",
    shortDescription: "Taş döşeme, parke, duvar ve sert zemin uygulamaları.",
    seoTitle: "Sert Zemin (Hardscape) Firmaları | Peyzajbul",
    seoDescription: "Sert zemin ve hardscape firmaları. Taş döşeme, parke, istinat duvarı ve dış mekan kaplama hizmetleri.",
    seoArticle: `
Sert zemin (hardscape), bir bahçenin iskeletini oluşturan en kritik yapısal unsurdur. Taş, beton, ahşap ve kompozit malzemelerin doğru kullanımı, dış mekanın hem karakterini belirler hem de fonksiyonel kullanım alanları yaratır.

### Sert Zemin Uygulama Alanları
- **Yürüyüş ve Araç Yolları**: Aşınmaya dayanıklı, drenajı iyi yapılmış doğal taş veya kilit parke döşemeleri.
- **Teras ve Oturma Alanları**: Kaymaz özellikli seramik, traverten veya ahşap deck kaplamaları.
- **İstinat Duvarları**: Eğimli arazilerde toprak kaymasını önleyen, dekoratif taşlarla örülen yapısal çözümler.
- **Sınır Belirleyiciler**: Bahçe bölümlerini birbirinden ayıran estetik bordür ve çit temelleri.

Kaliteli bir sert zemin işçiliği, bahçenizin değerini artırırken bakım ihtiyacını minimize eder. Profesyonel ekiplerimizden malzeme seçimi ve uygulama desteği alabilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "peyzaj-aydinlatma",
    label: "Peyzaj Aydınlatma",
    icon: "💡",
    shortDescription: "Bahçe ve dış mekan aydınlatma tasarımı ve kurulumu.",
    seoTitle: "Peyzaj Aydınlatma Firmaları | Peyzajbul",
    seoDescription: "Peyzaj aydınlatma firmaları. Bahçe aydınlatma tasarımı, LED sistemler ve dış mekan aydınlatma çözümleri.",
    seoArticle: `Peyzaj aydınlatma, bahçe ve dış mekanlarınızı gece saatlerinde de etkileyici kılan önemli bir tasarım öğesidir. Yol aydınlatma, spot ışıklar, dekoratif fenerler ve LED şerit uygulamaları ile bahçeniz geceleri de büyüleyici bir atmosfere bürünür. Enerji verimli aydınlatma çözümleri hem güvenliği artırır hem de estetik değer katar.`,
    imageUrl: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "havuz-yapimi",
    label: "Havuz Yapımı & Çevresi",
    icon: "🏊",
    shortDescription: "Yüzme havuzu yapımı ve havuz çevresi peyzaj düzenlemesi.",
    seoTitle: "Havuz Yapımı & Çevresi Firmaları | Peyzajbul",
    seoDescription: "Havuz yapımı ve çevre düzenlemesi firmaları. Yüzme havuzu inşaatı, havuz peyzajı ve bakım hizmetleri.",
    seoArticle: `
Yüzme havuzu yapımı, bir bahçeyi lüks bir yaşam alanına ve kişisel bir tatile dönüştüren en prestijli peyzaj yatırımıdır. Ancak doğru bir havuz projesi; sadece bir çukur kazıp içine su doldurmak değil, mimari uyum, izolasyon ve kusursuz bir mekanik tesisat sürecidir.

### Havuz Yapım Süreçleri
1. **Mimari Projelendirme**: Bahçenin ölçeğine ve evin mimarisine uygun havuz formunun belirlenmesi.
2. **Kaba İnşaat ve İzolasyon**: Sızdırmazlık garantili betonarme yapı ve yüksek kaliteli izolasyon katmanları.
3. **Mekanik Tesisat**: Filtrasyon sistemleri, dozaj pompaları ve isteğe bağlı ısıtma/aydınlatma çözümleri.
4. **Çevre Düzenleme**: Havuz çevresi için kaymaz güneşlenme alanları ve uygun bitkilendirme.

Deneyimli havuz firmalarımız, projenizin başından sonuna kadar tüm teknik detayları yöneterek size uzun yıllar güvenle kullanabileceğiniz havuzlar sunar.`,
    imageUrl: "https://images.unsplash.com/photo-1576013551627-142f77eec821?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "sus-havuzu",
    label: "Süs Havuzu & Şelale",
    icon: "⛲",
    shortDescription: "Dekoratif süs havuzları, şelale ve su öğeleri tasarımı.",
    seoTitle: "Süs Havuzu & Şelale Firmaları | Peyzajbul",
    seoDescription: "Süs havuzu ve şelale yapım firmaları. Dekoratif su öğeleri, çeşme ve gölet tasarımı.",
    seoArticle: `Süs havuzları ve şelaleler, bahçe ve dış mekanlara huzur veren su sesleri ve görsel zenginlik katar. Dekoratif göletler, duvar şelaleleri, fıskiyeler ve modern su öğeleri ile mekanlarınıza doğal bir atmosfer yaratabilirsiniz. Profesyonel firmalar, pompa sistemlerinden aydınlatmaya kadar tüm detayları tasarlar.`,
    imageUrl: "https://images.unsplash.com/photo-1545638515-05d8f6ccfc92?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "cati-bahcesi",
    label: "Çatı Bahçesi & Teras",
    icon: "🏢",
    shortDescription: "Çatı bahçesi tasarımı, teras peyzajı ve yeşil çatı uygulamaları.",
    seoTitle: "Çatı Bahçesi & Teras Peyzajı Firmaları | Peyzajbul",
    seoDescription: "Çatı bahçesi ve teras peyzaj firmaları. Yeşil çatı uygulamaları, teras bitkilendirme ve drenaj sistemleri.",
    seoArticle: `Çatı bahçeleri ve teras peyzajı, kentsel alanlarda yeşil alanları artırmanın etkili bir yoludur. Su yalıtımı, drenaj sistemi, hafif toprak karışımları ve uygun bitki seçimi ile çatı ve teraslarınızı yaşayan yeşil alanlara dönüştürebilirsiniz. Yeşil çatılar ısı yalıtımına katkı sağlar ve kent ısı adası etkisini azaltır.`,
    imageUrl: "https://images.unsplash.com/photo-1540306173004-9a4c0eb500f1?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "dikey-bahce",
    label: "Dikey Bahçe",
    icon: "🌿",
    shortDescription: "İç ve dış mekan dikey bahçe sistemleri ve yeşil duvar uygulamaları.",
    seoTitle: "Dikey Bahçe Firmaları | Peyzajbul",
    seoDescription: "Dikey bahçe ve yeşil duvar firmaları. İç ve dış mekan dikey bitkilendirme sistemleri.",
    seoArticle: `
Dikey bahçeler (yeşil duvarlar), sınırlı alanda maksimum yeşil alan yaratmanın en modern ve estetik yoludur. Özellikle kentsel alanlarda, teraslarda veya iç mekanlarda doğayı dikey düzleme taşıyan bu sistemler, hava kalitesini artırırken mükemmel bir ses ve ısı yalıtımı sağlar.

### Dikey Bahçe Sistemleri ve Avantajları
- **Hidroponik Sistemler**: Topraksız, su ve besin solüsyonu ile bitki besleyen profesyonel modüller.
- **Keçe Panel Sistemleri**: Hafif yapısı ile her türlü duvara kolayca adapte edilebilen ekonomik çözümler.
- **Modüler Saksı Sistemleri**: Değiştirilebilir bitki hazneleri ile kolay bakım imkanı sunan yapılar.
- **Psikolojik ve Çevresel Etki**: İç mekanlarda stresi azaltırken, dış mekanlarda bina cephesini korur.

Otomatik sulama ve besleme üniteleri ile entegre dikey bahçe projeleri için uzman firmalarımızdan keşif ve projelendirme desteği alabilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "kentsel-peyzaj",
    label: "Kentsel Peyzaj",
    icon: "🏙️",
    shortDescription: "Şehir parkları, meydanlar ve kamusal alan peyzaj projeleri.",
    seoTitle: "Kentsel Peyzaj Firmaları | Peyzajbul",
    seoDescription: "Kentsel peyzaj firmaları. Şehir parkları, meydanlar, bulvarlar ve kamusal alan peyzaj projeleri.",
    seoArticle: `
Kentsel peyzaj, şehirlerin yaşanabilirliğini, estetiğini ve ekolojik dengesini artıran büyük ölçekli projeleri kapsar. Parklar, meydanlar, sahil şeridi düzenlemeleri ve kamusal rekreasyon alanları, kentsel peyzajın temel taşlarıdır.

### Kentsel Peyzajın Temel Bileşenleri
1. **Kamusal Alan Tasarımı**: İnsan odaklı, erişilebilir ve güvenli şehir meydanları ve parkların kurgulanması.
2. **Kentsel Ekoloji**: Şehir içindeki biyoçeşitliliğin korunması ve yeşil koridorların oluşturulması.
3. **Rekreasyon Alanları**: Çocuk parkları, spor alanları ve yürüyüş parkurlarının fonksiyonel yerleşimi.
4. **Altyapı Entegrasyonu**: Yağmur suyu yönetimi (yağmur bahçeleri) ve sürdürülebilir drenaj çözümleri.

Büyük ölçekli kentsel projeler için deneyimli peyzaj ofisleri ve uygulama firmalarımızla iletişime geçebilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1496851473196-e26508c21494?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "park-oyun-alani",
    label: "Park & Oyun Alanı",
    icon: "🛝",
    shortDescription: "Çocuk oyun alanları, park ekipmanları ve spor alanı yapımı.",
    seoTitle: "Park & Oyun Alanı Firmaları | Peyzajbul",
    seoDescription: "Park ve oyun alanı firmaları. Çocuk parkı ekipmanları, spor alanları ve açık alan fitness alanı yapımı.",
    seoArticle: `Park ve oyun alanları, çocukların güvenli bir şekilde oynayabileceği ve ailelerin vakit geçirebileceği açık mekanlardır. Modern oyun ekipmanları, güvenlik zemin kaplamaları, spor alanları ve fitness parkurları bu kategorideki başlıca hizmetlerdir. Firmalar, güvenlik standartlarına uygun ekipman temini ve montaj hizmeti sunar.`,
    imageUrl: "https://images.unsplash.com/photo-1603517436065-27663e803fb9?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "cit-pergola",
    label: "Çit & Pergola",
    icon: "🏗️",
    shortDescription: "Bahçe çitleri, pergola ve kameriye yapımı.",
    seoTitle: "Çit & Pergola Firmaları | Peyzajbul",
    seoDescription: "Çit ve pergola firmaları. Ahşap, metal ve PVC çit sistemleri, pergola ve kameriye yapımı.",
    seoArticle: `Çit ve pergola uygulamaları, bahçenize mahremiyet, güvenlik ve estetik değer katan yapısal elemanlardır. Ahşap, metal, PVC ve kompozit malzemelerden üretilen çit sistemleri ile bahçenizi sınırlayabilirsiniz. Pergolalar ise gölgelik alan yaratarak dış mekan yaşam kalitenizi artırır. Kamerayeler ve çardaklar da bu kategorideki popüler uygulamalardır.`,
    imageUrl: "https://images.unsplash.com/photo-1601625906233-f661cc3bb3f7?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "peyzaj-malzemeleri",
    label: "Peyzaj Malzemeleri Satışı",
    icon: "🪨",
    shortDescription: "Peyzaj taşları, dekoratif malzemeler ve bahçe ekipmanları satışı.",
    seoTitle: "Peyzaj Malzemeleri Satışı | Peyzajbul",
    seoDescription: "Peyzaj malzemeleri satan firmalar. Dekoratif taşlar, bordürler, bahçe ekipmanları ve peyzaj ürünleri.",
    seoArticle: `
Kaliteli peyzaj uygulamalarının temelinde doğru ve dayanıklı malzeme seçimi yatar. Peyzaj malzemeleri; dekoratif unsurlardan teknik altyapı ürünlerine kadar çok geniş bir yelpazeyi kapsar.

### Başlıca Peyzaj Malzemeleri ve Ürün Grupları
- **Dekoratif Taşlar ve Bordürler**: Dolomit, podima, dere taşı ve sınırlayıcı plastik/metal bordürler.
- **Zemin Kaplama Ürünleri**: Doğal taşlar, kilit parkeler, ahşap deck ve kompozit malzemeler.
- **Toprak ve Gübre**: Bitki besleyici torf karışımları, organik gübreler ve bitki ıslah ürünleri.
- **Aydınlatma ve Sulama**: Solar lambalar, pop-up fıskiyeler, damlama hortumları ve kontrol üniteleri.

Projeniz için ihtiyacınız olan tüm malzemeleri toptan veya perakende olarak temin edebileceğiniz güvenilir tedarikçileri listemizde bulabilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1416879598555-520eed53bfb8?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "dogal-tas",
    label: "Doğal Taş & Kaplama",
    icon: "🪨",
    shortDescription: "Doğal taş döşeme, duvar kaplama ve taş işçiliği.",
    seoTitle: "Doğal Taş & Kaplama Firmaları | Peyzajbul",
    seoDescription: "Doğal taş ve kaplama firmaları. Taş döşeme, duvar kaplama, mermer ve granit işçiliği.",
    seoArticle: `Doğal taş uygulamaları, dış mekanlara zamansız bir güzellik ve dayanıklılık kazandırır. Mermer, granit, travertan, bazalt ve arduvaz gibi doğal taşlar; yürüyüş yolları, teraslar, duvar kaplamaları ve merdiven basamaklarında kullanılır. Her taş türünün kendine özgü dokusu ve rengi, mekanlarınıza doğal ve sofistike bir görünüm katar.`,
    imageUrl: "https://images.unsplash.com/photo-1590487332857-4b711e51b635?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "bitki-satisi",
    label: "Bitki Satışı & Fidanlık",
    icon: "🌺",
    shortDescription: "Süs bitkileri, mevsimlik çiçekler ve fidan satışı.",
    seoTitle: "Bitki Satışı & Fidanlık Firmaları | Peyzajbul",
    seoDescription: "Bitki satışı ve fidanlık firmaları. Süs bitkileri, mevsimlik çiçekler, iç mekan bitkileri ve fidan satışı.",
    seoArticle: `Bitki satışı ve fidanlık hizmetleri, peyzaj projeleriniz için gereken tüm bitki materyallerini temin etmenizi sağlar. Süs bitkileri, çalılar, mevsimlik çiçekler, yer örtücüler ve iç mekan bitkileri geniş ürün yelpazesinin parçasıdır. Kaliteli fidanlıklar, sağlıklı ve bölge iklimine uygun bitki türleri sunar.`,
    imageUrl: "https://images.unsplash.com/photo-1459156212016-c812468e2115?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "toprak-gubre",
    label: "Toprak & Gübre Hizmetleri",
    icon: "🌾",
    shortDescription: "Toprak analizi, gübreleme, toprak ıslahı ve kompost hizmetleri.",
    seoTitle: "Toprak & Gübre Hizmetleri Firmaları | Peyzajbul",
    seoDescription: "Toprak ve gübre hizmetleri sunan firmalar. Toprak analizi, gübreleme programları, kompost ve toprak ıslahı.",
    seoArticle: `Toprak ve gübre hizmetleri, sağlıklı bitki gelişiminin temelini oluşturur. Toprak analizi ile pH, besin değerleri ve yapı tespit edilir; buna göre uygun gübreleme programları oluşturulur. Organik ve kimyasal gübreler, kompost, torf ve toprak ıslah malzemeleri bu kategorideki başlıca ürünlerdir. Doğru toprak yönetimi ile bitkileriniz daha sağlıklı ve verimli büyür.`,
    imageUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
];

export const SERVICE_LABELS = CATEGORIES.map((c) => c.label);

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getAllCategories(): Category[] {
  return CATEGORIES;
}

export function getCategoryByLabel(label: string): Category | undefined {
  return CATEGORIES.find((c) => c.label === label);
}
