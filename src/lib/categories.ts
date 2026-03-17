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
    seoArticle: `Peyzaj mimarlığı, açık alanların estetik ve fonksiyonel olarak tasarlanmasını kapsayan profesyonel bir disiplindir. Peyzaj mimarları; konut bahçeleri, ticari alanlar, parklar ve kamusal mekanlar için bütüncül projeler hazırlar. Bitki seçimi, sert zemin tasarımı, su öğeleri ve aydınlatma gibi unsurları bir araya getirerek yaşanabilir ve sürdürülebilir dış mekanlar yaratırlar. Türkiye'de peyzaj mimarlığı hizmeti sunan firmaları rehberimizde bulabilirsiniz.`,
    imageUrl: "https://images.unsplash.com/photo-1558904541-efa843a96f0f?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "bahce-tasarimi",
    label: "Bahçe Tasarımı",
    icon: "🎨",
    shortDescription: "Hayalinizdeki bahçeyi profesyonel tasarımcılarla oluşturun.",
    seoTitle: "Bahçe Tasarımı Firmaları | Peyzajbul",
    seoDescription: "Profesyonel bahçe tasarımı firmaları. Villa, konut ve ticari alanlar için özel bahçe projeleri.",
    seoArticle: `Bahçe tasarımı, dış mekanlarınızı kişisel zevkinize ve ihtiyaçlarınıza göre şekillendiren yaratıcı bir süreçtir. İyi bir bahçe tasarımı; bitki kompozisyonu, yürüyüş yolları, oturma alanları ve dekoratif öğeleri harmanlayarak evinize değer katar. Profesyonel bahçe tasarımcıları, toprağın yapısından iklim koşullarına kadar tüm faktörleri değerlendirerek size özel projeler üretir.`,
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "bahce-bakimi",
    label: "Bahçe Bakımı & Bahçıvanlık",
    icon: "🌿",
    shortDescription: "Düzenli bahçe bakımı, budama ve mevsimsel bakım hizmetleri.",
    seoTitle: "Bahçe Bakımı & Bahçıvanlık Firmaları | Peyzajbul",
    seoDescription: "Profesyonel bahçe bakımı ve bahçıvanlık hizmetleri. Düzenli bakım, budama, gübreleme ve mevsimsel işlemler.",
    seoArticle: `Bahçe bakımı ve bahçıvanlık, yeşil alanlarınızın sağlıklı ve bakımlı kalmasını sağlayan düzenli hizmetlerdir. Çim biçme, yabani ot temizliği, gübreleme, ilaçlama ve mevsimsel bitki değişimleri gibi işlemleri kapsar. Deneyimli bahçıvanlar, bitkilerinizin sağlığını takip eder ve bahçenizin her mevsim canlı kalmasını sağlar.`,
    imageUrl: "https://images.unsplash.com/photo-1416879598555-520eed53bfb8?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "cim-serme",
    label: "Çim Serme & Çim Bakımı",
    icon: "🌱",
    shortDescription: "Rulo çim serimi, tohum ekimi ve profesyonel çim bakımı.",
    seoTitle: "Çim Serme & Çim Bakımı Firmaları | Peyzajbul",
    seoDescription: "Rulo çim serimi ve çim bakımı firmaları. Profesyonel yeşil alan oluşturma hizmetleri.",
    seoArticle: `Çim serme, bahçenize hızlı ve etkili bir şekilde yeşil bir görünüm kazandırmanın en pratik yoludur. Rulo çim uygulaması, tohum ekimine kıyasla çok daha kısa sürede sonuç verir. Profesyonel çim bakımı ise düzenli biçim, sulama, gübreleme ve havalandırma işlemlerini içerir. Doğru çim türü seçimi ve bakım programı ile yıl boyunca yeşil, sağlıklı bir çim alan elde edebilirsiniz.`,
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
    seoArticle: `Sulama sistemleri, bahçenizin düzenli ve verimli bir şekilde sulanmasını sağlayan modern çözümlerdir. Otomatik yağmurlama sistemleri, damla sulama hatları ve akıllı sulama kontrol üniteleri ile su tasarrufu yapılırken bitkileriniz optimal nem seviyesinde tutulur. Profesyonel sulama sistemi firmaları, alanınıza uygun projelendirme ve kurulum hizmeti sunar.`,
    imageUrl: "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "sert-zemin",
    label: "Sert Zemin (Hardscape)",
    icon: "🧱",
    shortDescription: "Taş döşeme, parke, duvar ve sert zemin uygulamaları.",
    seoTitle: "Sert Zemin (Hardscape) Firmaları | Peyzajbul",
    seoDescription: "Sert zemin ve hardscape firmaları. Taş döşeme, parke, istinat duvarı ve dış mekan kaplama hizmetleri.",
    seoArticle: `Sert zemin (hardscape), bahçe ve dış mekanlardaki taş, beton, ahşap ve metal gibi malzemelerle yapılan yapısal uygulamaları kapsar. Yürüyüş yolları, teraslar, istinat duvarları, merdiven ve patioların inşası bu kategoriye girer. Doğru hardscape tasarımı, bahçenize karakter katar ve fonksiyonel kullanım alanları yaratır.`,
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
    seoArticle: `Havuz yapımı, bahçenizi lüks bir yaşam alanına dönüştüren önemli bir yatırımdır. Profesyonel havuz firmaları; betonarme, fiberglass ve prefabrik havuz seçenekleri sunar. Havuz çevresi peyzaj düzenlemesi ise güverte döşeme, bitkilendirme ve aydınlatma ile havuz alanınızı tamamlar.`,
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
    seoArticle: `Dikey bahçeler, duvar yüzeylerini yeşile dönüştüren modern peyzaj uygulamalarıdır. Hem iç hem de dış mekanlarda uygulanabilen dikey bahçe sistemleri, sınırlı alanlarda maksimum yeşillik sağlar. Otomatik sulama ve beslenme sistemleri ile bakımı kolaylaştırılmış çözümler sunan firmalar, mekanlarınıza doğa dokunuşu katar.`,
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000&auto=format&fit=crop", // Replaced below
  },
  {
    slug: "kentsel-peyzaj",
    label: "Kentsel Peyzaj",
    icon: "🏙️",
    shortDescription: "Şehir parkları, meydanlar ve kamusal alan peyzaj projeleri.",
    seoTitle: "Kentsel Peyzaj Firmaları | Peyzajbul",
    seoDescription: "Kentsel peyzaj firmaları. Şehir parkları, meydanlar, bulvarlar ve kamusal alan peyzaj projeleri.",
    seoArticle: `Kentsel peyzaj, şehirlerin yaşanabilirliğini artıran büyük ölçekli peyzaj projelerini kapsar. Parklar, meydanlar, bulvar düzenlemeleri, kıyı peyzajı ve rekreasyon alanları kentsel peyzajın başlıca uygulama alanlarıdır. Bu projeler; belediyeler, kamu kurumları ve özel sektör için uzman peyzaj firmaları tarafından gerçekleştirilir.`,
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
    seoArticle: `Peyzaj malzemeleri, bahçe ve dış mekan projelerinde kullanılan tüm ürünleri kapsar. Dekoratif taşlar, bordürler, bahçe süsleri, saksılar, toprak ürünleri ve bahçe ekipmanları bu kategorideki başlıca ürünlerdir. Kaliteli malzeme seçimi, projenizin uzun ömürlü ve estetik olmasını sağlar.`,
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
