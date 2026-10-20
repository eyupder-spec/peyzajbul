export interface Category {
  slug: string;
  label: string;
  icon: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoArticle: string;
  imageUrl: string;
  /** SEO FAQ items for FAQPage structured data */
  faqs?: { question: string; answer: string }[];
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
    imageUrl: "/images/categories/peyzaj-mimarligi-hero.jpg",
    faqs: [
      { question: "Peyzaj mimarlığı hizmeti fiyatları ne kadar?", answer: "Peyzaj mimarlığı proje bedelleri, alan büyüklüğü, tasarım kapsamı ve uygulama detaylarına göre değişir. Net fiyat almak için firmanızla iletişime geçerek ücretsiz keşif ve teklif talep edebilirsiniz." },
      { question: "Peyzaj projesi hazırlanması ne kadar sürer?", answer: "Tipik bir konut bahçesi peyzaj projesi, alanın büyüklüğüne bağlı olarak 1 ila 3 hafta arasında tamamlanır. Büyük ölçekli ticari projelerde bu süre 4-6 haftayı bulabilir." },
      { question: "Peyzaj mimarı seçerken nelere dikkat edilmeli?", answer: "Firmanın daha önce tamamladığı projeleri incelemek, referanslarını kontrol etmek ve portföyündeki işlerin kalitesini değerlendirmek önemlidir. Ayrıca firmanın sizin bütçeniz ve beklentileriniz doğrultusunda esnek çözümler sunabilmesine dikkat edin." },
      { question: "Peyzaj mimarlığı projem için belediye onayı gerekir mi?", answer: "Büyük ölçekli peyzaj düzenlemeleri ve yapısal değişiklikler için belediyeden onay alınması gerekebilir. Profesyonel peyzaj firmaları, proje aşamasında gerekli izin süreçlerini yöneterek size zaman kazandırır." }
    ]
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
    imageUrl: "/images/categories/bahce-tasarimi-hero.jpg",
    faqs: [
      { question: "Bahçe tasarımı fiyatları ne kadar?", answer: "Bahçe tasarım ücretleri, alanın metrekaresi, tasarımın karmaşıklığı ve istenen özelliklere göre değişir. Peyzajbul üzerinden birden fazla firmadan ücretsiz teklif alarak bütçenize en uygun seçeneği değerlendirebilirsiniz." },
      { question: "Küçük bir bahçe için profesyonel tasarım yaptırmaya değer mi?", answer: "Evet, küçük bahçelerde doğru planlama çok daha önemlidir. Profesyonel bir tasarımcı, sınırlı alanı en verimli şekilde kullanarak bahçenizi hem estetik hem fonksiyonel hale getirir." },
      { question: "Bahçe tasarımı ne zaman yapılmalı?", answer: "Bahçe tasarımı için en ideal dönem ilkbahar ve sonbahardır ancak tasarım aşaması yılın her zamanı yapılabilir. Uygulama mevsimine hazırlıklı olmak için kış aylarında projelendirme yaptırmanız önerilir." },
      { question: "Bahçe tasarımı firması seçerken nelere dikkat edilmeli?", answer: "Firmanın daha önce tamamladığı projeleri, müşteri yorumlarını ve uzmanlık alanlarını inceleyin. İhtiyacınıza uygun tarzda (modern, klasik, Akdeniz) deneyimi olan firmaları tercih etmeniz sonuçtan memnun kalmanızı sağlar." }
    ]
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
    imageUrl: "/images/categories/bahce-bakimi-bahcivan-hero.jpg",
    faqs: [
      { question: "Bahçe bakımı fiyatları ne kadar?", answer: "Bahçe bakım ücretleri, bahçenin büyüklüğü, bitki yoğunluğu ve yapılacak işlemlere göre değişir. Düzenli bakım sözleşmeleri genellikle tek seferlik bakıma göre daha avantajlı fiyatlandırılır. Firmalardan ücretsiz teklif alarak karşılaştırma yapabilirsiniz." },
      { question: "Bahçe bakımı ne sıklıkla yapılmalı?", answer: "Bahçe bakımı yaz aylarında haftada bir, kış aylarında ise 2-3 haftada bir yapılmalıdır. Profesyonel firmalar, bahçenizin ihtiyaçlarına göre size özel bir bakım takvimi oluşturur." },
      { question: "Bahçıvan tutmak mı, periyodik bakım hizmeti almak mı avantajlı?", answer: "Tam zamanlı bir bahçıvan yerine periyodik bakım hizmeti almak genellikle daha ekonomiktir. Profesyonel ekipler, ihtiyaç duyduğunuzda gelerek hem işçilik hem malzeme maliyetlerini optimize eder." },
      { question: "Kış aylarında bahçe bakımı gerekli mi?", answer: "Evet, kış bakımı bahçenizin ilkbaharda sağlıklı uyanması için kritiktir. Dökülen yaprakların temizlenmesi, dona karşı koruma önlemleri ve kış budaması gibi işlemler profesyonel ekipler tarafından yapılmalıdır." }
    ]
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
    imageUrl: "/images/categories/cim-serme-bakim-hero.jpg",
    faqs: [
      { question: "Rulo çim serimi fiyatı ne kadar?", answer: "Rulo çim fiyatları, çim türü, metrekare büyüklüğü ve toprak hazırlığı ihtiyacına göre değişir. Toprak tesviyesi, gübreleme ve sulama sistemi gibi ek hizmetler toplam maliyeti etkiler. Firmalardan ücretsiz keşif ve teklif alabilirsiniz." },
      { question: "Rulo çim serildikten sonra ne zaman kullanılabilir?", answer: "Rulo çim serildikten yaklaşık 10-15 gün sonra çim kök salar ve hafif kullanıma uygun hale gelir. Tam kullanım için 3-4 hafta beklenmesi önerilir. Bu süreçte düzenli sulama çok önemlidir." },
      { question: "Çim tohumu mu rulo çim mi daha avantajlı?", answer: "Rulo çim, hızlı sonuç almak isteyenler için idealdir — serildiği anda yeşil bir bahçeye sahip olursunuz. Çim tohumu ise daha ekonomiktir ancak sonuç almak daha uzun sürer ve çimlenme başarısı iklim koşullarına bağlıdır." },
      { question: "Çim bakımı için en uygun zaman nedir?", answer: "İlkbahar (Mart-Nisan) çim ekimi ve bakımı için en ideal dönemdir. Sonbahar ise mevcut çimi güçlendirmek ve havalandırma yapmak için en uygun zamandır. Yaz aylarında düzenli sulama ve biçme işlemleri aksatılmamalıdır." }
    ]
  },
  {
    slug: "agaclandirma",
    label: "Ağaçlandırma & Fidan",
    icon: "🌳",
    shortDescription: "Ağaç dikimi, fidanlık hizmetleri ve ağaçlandırma projeleri.",
    seoTitle: "Ağaçlandırma & Fidan Firmaları | Peyzajbul",
    seoDescription: "Ağaçlandırma ve fidan dikimi firmaları. Profesyonel ağaç dikimi ve fidanlık hizmetleri.",
    seoArticle: `Ağaçlandırma, hem estetik hem de çevresel açıdan büyük öneme sahip bir peyzaj hizmetidir. Doğru ağaç türlerinin seçimi, dikim tekniği ve bakım programı ile uzun ömürlü, sağlıklı ağaçlar yetiştirilir. Fidanlık hizmetleri ise süs bitkilerinden meyve ağaçlarına kadar geniş bir yelpazede fidan temini sağlar.`,
    imageUrl: "/images/categories/agac-fidan-hero.jpg",
    faqs: [
      { question: "Ağaçlandırma maliyeti ne kadar?", answer: "Ağaçlandırma maliyeti; kullanılacak fidan türü, adedi, dikim alanının büyüklüğü ve toprak hazırlığı ihtiyacına göre değişir. Profesyonel firmalar, alan keşfi sonrası size özel fiyatlandırma sunar." },
      { question: "Hangi mevsimde ağaç dikimi yapılmalı?", answer: "İlkbahar ve sonbahar ağaç dikimi için en uygun mevsimlerdir. Kışın yaprağını döken ağaçlar için yapraksız dönemde (Kasım-Mart) dikim önerilirken, herdemyeşil türler ilkbaharda dikilmelidir." },
      { question: "Fidan alırken nelere dikkat edilmeli?", answer: "Fidanın sağlıklı, hastalıksız ve bölge iklimine uygun bir tür olmasına dikkat edilmelidir. Sertifikalı fidanlıklardan alışveriş yapmak, bitki pasaportu bulunan ürünleri tercih etmek uzun vadede başarılı bir ağaçlandırma için önemlidir." }
    ]
  },
  {
    slug: "agac-budama",
    label: "Ağaç Budama & Kesim",
    icon: "✂️",
    shortDescription: "Profesyonel ağaç budama, şekillendirme ve tehlikeli ağaç kesimi.",
    seoTitle: "Ağaç Budama & Kesim Firmaları | Peyzajbul",
    seoDescription: "Ağaç budama ve kesim firmaları. Güvenli budama, şekillendirme ve ağaç kaldırma hizmetleri.",
    seoArticle: `Ağaç budama, ağaçların sağlıklı büyümesini destekleyen ve estetik görünümünü koruyan önemli bir bakım işlemidir. Profesyonel budama teknikleri ile ağaçların şekli düzenlenir, hastalıklı dallar temizlenir ve güvenlik riskleri ortadan kaldırılır. Tehlikeli veya kurumuş ağaçların güvenli şekilde kesilmesi de uzman ekipler tarafından gerçekleştirilir.`,
    imageUrl: "/images/categories/agac-budama-kesim-hero.jpg",
    faqs: [
      { question: "Ağaç budama fiyatları ne kadar?", answer: "Budama ücretleri, ağacın türü, boyutu, dalların kalınlığı ve ulaşılabilirliğine göre değişir. Büyük ve tehlikeli ağaçların budaması özel ekipman gerektirdiğinden maliyet artabilir. En doğru fiyat için firmalardan teklif almanız önerilir." },
      { question: "Ağaç budama ne zaman yapılmalı?", answer: "Genel kural olarak, yaprağını döken ağaçlar kış uykusu döneminde (Kasım-Şubat), herdemyeşil ağaçlar ise ilkbahar veya yaz başında budanır. Meyve ağaçlarının budama zamanı türe göre değişiklik gösterir." },
      { question: "Tehlikeli bir ağacı kesmek için izin gerekir mi?", answer: "Büyük ve anıtsal ağaçlar için belediyeden kesim izni alınması gerekebilir. Profesyonel firmalar, gerekli izin süreçlerini yöneterek yasal yükümlülüklerinizi yerine getirmenize yardımcı olur." },
      { question: "Ağaç budama işlemi ağaca zarar verir mi?", answer: "Doğru teknik ve zamanda yapılan profesyonel budama ağaca zarar vermez, aksine sağlıklı büyümesini destekler. Yanlış budama ise ağacın hastalanmasına ve hatta kurumasına neden olabilir. Bu nedenle mutlaka uzman ekipler tercih edilmelidir." }
    ]
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
    imageUrl: "/images/categories/otomatik-sulama-sistemleri-hero.jpg",
    faqs: [
      { question: "Otomatik sulama sistemi kurulum maliyeti ne kadar?", answer: "Sulama sistemi maliyeti, bahçe büyüklüğü, sistem türü (damlama/yağmurlama), kullanılacak malzeme kalitesi ve işçiliğe göre değişir. Uzun vadede su tasarrufu sayesinde sistem kendini amorti eder. Kesin fiyat için firmalardan teklif alın." },
      { question: "Mevcut bahçeme sonradan otomatik sulama sistemi kurulur mu?", answer: "Evet, mevcut bahçelere de otomatik sulama sistemi kurulumu yapılabilir. Profesyonel firmalar, bitkilere zarar vermeden gerekli hat çekimini ve montajı gerçekleştirir." },
      { question: "Akıllı sulama sistemi ile ne kadar su tasarrufu sağlanır?", answer: "Akıllı sulama sistemleri, geleneksel sulamaya kıyasla %50'ye varan su tasarrufu sağlar. Yağmur sensörleri ve toprak nem sensörleri sayesinde gereksiz sulama tamamen önlenir ve faturalarınızda belirgin düşüş görülür." },
      { question: "Sulama sisteminin bakımı nasıl yapılır?", answer: "Sulama sistemleri yılda en az bir kez profesyonel bakımdan geçmelidir. Kış aylarında donmaya karşı sistemin boşaltılması, filtrelerin temizlenmesi ve başlıkların kontrolü düzenli bakımın temel adımlarıdır." }
    ]
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
    imageUrl: "/images/categories/yapisal-peyzaj-hardscape-hero.jpg",
    faqs: [
      { question: "Sert zemin döşeme fiyatları ne kadar?", answer: "Sert zemin maliyetleri, kullanılan malzeme türü (doğal taş, kilit parke, ahşap deck), alan büyüklüğü ve zemin hazırlığı ihtiyacına göre değişir. En doğru fiyatlandırma için peyzaj firmalarından ücretsiz teklif alabilirsiniz." },
      { question: "Sert zemin uygulaması ne kadar sürer?", answer: "Ortalama bir bahçe için sert zemin uygulaması, alan büyüklüğüne ve işçilik detayına bağlı olarak 3 gün ile 2 hafta arasında tamamlanır. Betonarme işler ve istinat duvarı gibi yapısal işler bu süreyi uzatabilir." },
      { question: "Ahşap deck mi doğal taş mı daha avantajlı?", answer: "Ahşap deck, sıcak ve doğal bir görünüm sunarken düzenli bakım gerektirir. Doğal taş ise çok daha dayanıklıdır ve neredeyse hiç bakım istemez. Seçim, bütçenize, bahçe tarzınıza ve bakım beklentinize bağlıdır." },
      { question: "Sert zemin uygulamasında drenaj neden önemlidir?", answer: "Doğru planlanmış drenaj, su birikintilerini önler, malzemenin ömrünü uzatır ve kayma riskini azaltır. Profesyonel firmalar, zemin hazırlığı aşamasında eğim ve drenaj kanallarını titizlikle hesaplar." }
    ]
  },
  {
    slug: "peyzaj-aydinlatma",
    label: "Peyzaj Aydınlatma",
    icon: "💡",
    shortDescription: "Bahçe ve dış mekan aydınlatma tasarımı ve kurulumu.",
    seoTitle: "Peyzaj Aydınlatma Firmaları | Peyzajbul",
    seoDescription: "Peyzaj aydınlatma firmaları. Bahçe aydınlatma tasarımı, LED sistemler ve dış mekan aydınlatma çözümleri.",
    seoArticle: `Peyzaj aydınlatma, bahçe ve dış mekanlarınızı gece saatlerinde de etkileyici kılan önemli bir tasarım öğesidir. Yol aydınlatma, spot ışıklar, dekoratif fenerler ve LED şerit uygulamaları ile bahçeniz geceleri de büyüleyici bir atmosfere bürünür. Enerji verimli aydınlatma çözümleri hem güvenliği artırır hem de elektrik faturanızı düşürür. Profesyonel bir aydınlatma tasarımı için peyzaj firmalarımızdan destek alabilirsiniz.`,
    imageUrl: "/images/categories/peyzaj-aydinlatma-hero.jpg",
    faqs: [
      { question: "Bahçe aydınlatma sistemi kurulum maliyeti ne kadar?", answer: "Peyzaj aydınlatma maliyeti, kullanılacak armatür sayısı ve türü (LED spot, dekoratif fener, yol lambası), kablo çekimi ve montaj işçiliğine göre değişir. Profesyonel firmalar, aydınlatma planı oluşturarak bütçenize uygun seçenekler sunar." },
      { question: "Bahçe aydınlatmasında hangi ampul türü tercih edilmeli?", answer: "LED ampuller, düşük enerji tüketimi ve uzun ömrü sayesinde peyzaj aydınlatmasında en çok tercih edilen seçenektir. Solar (güneş enerjili) aydınlatmalar ise kablo çekimine gerek kalmaması ve sıfır elektrik maliyetiyle popüler bir alternatiftir." },
      { question: "Peyzaj aydınlatma tasarımında nelere dikkat edilmeli?", answer: "Aydınlatma tasarımında bitkilerin ve yapıların doğru şekilde vurgulanması, göz kamaştırmayan ışık açıları seçilmesi ve enerji verimliliği ön planda tutulmalıdır. İyi bir peyzaj aydınlatma projesi, bahçenizi güvenli ve davetkar kılar." },
      { question: "Dış mekan aydınlatmaları yağmura ve neme dayanıklı mı?", answer: "Kaliteli dış mekan aydınlatma armatürleri IP65 veya üzeri su ve toz koruma sınıfına sahiptir. Profesyonel montajda tüm bağlantılar su geçirmez şekilde izole edilir, böylece sistem yıllarca sorunsuz çalışır." }
    ]
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
    imageUrl: "/images/categories/havuz-yapimi-cevre-duzenleme-hero.jpg",
    faqs: [
      { question: "Havuz yapım maliyeti ne kadar?", answer: "Havuz yapım fiyatları, havuzun büyüklüğü, şekli, kullanılacak malzemeler, filtrasyon sistemi ve isteğe bağlı özelliklere (ısıtma, aydınlatma, otomatik örtü) göre geniş bir aralıkta değişir. Kesin fiyat için firmalardan ücretsiz keşif ve teklif talep edebilirsiniz." },
      { question: "Havuz yapımı ne kadar sürer?", answer: "Ortalama bir betonarme yüzme havuzunun yapım süresi 2 ila 4 ay arasındadır. Prefabrik havuzlar daha kısa sürede (2-4 hafta) monte edilebilir. Süre, hava koşulları ve izin süreçlerine bağlı olarak değişebilir." },
      { question: "Havuz yapımı için izin gerekir mi?", answer: "Müstakil evlerde belirli ölçülerdeki havuzlar için genellikle izin gerekmese de, site ve toplu konut alanlarında yönetim onayı alınması gerekir. Profesyonel firmalar, başvuru süreçlerinde size rehberlik eder." },
      { question: "Havuz çevresi peyzajı neleri kapsar?", answer: "Havuz çevresi düzenlemesi; kaymaz zemin kaplamaları, güneşlenme alanları, duş ve soyunma kabinleri, pergola gölgelikler ve havuza uyumlu bitkilendirmeyi içerir. Doğru peyzaj, havuz keyfinizi artırır ve bahçenizin değerini yükseltir." }
    ]
  },
  {
    slug: "sus-havuzu",
    label: "Süs Havuzu & Şelale",
    icon: "⛲",
    shortDescription: "Dekoratif süs havuzları, şelale ve su öğeleri tasarımı.",
    seoTitle: "Süs Havuzu & Şelale Firmaları | Peyzajbul",
    seoDescription: "Süs havuzu ve şelale yapım firmaları. Dekoratif su öğeleri, çeşme ve gölet tasarımı.",
    seoArticle: `Süs havuzları ve şelaleler, bahçe ve dış mekanlara huzur veren su sesleri ve görsel zenginlik katar. Dekoratif göletler, duvar şelaleleri, fıskiyeler ve modern su öğeleri ile mekanlarınıza doğal bir atmosfer yaratabilirsiniz. Profesyonel firmalar, pompa sistemlerinden aydınlatmaya kadar tüm detayları tasarlar.`,
    imageUrl: "/images/categories/sus-havuzu-hero.jpg",
    faqs: [
      { question: "Süs havuzu yapım maliyeti nedir?", answer: "Süs havuzu fiyatları, havuzun boyutu, kullanılan malzeme (doğal taş, fiberglas, beton), su öğelerinin çeşidi (fıskiye, şelale, heykel) ve pompa sisteminin kalitesine göre değişir. En doğru fiyat için profesyonel firmalardan teklif almanız önerilir." },
      { question: "Süs havuzu bakımı zor mudur?", answer: "Modern süs havuzları, kaliteli filtrasyon ve otomatik su seviye sistemleri sayesinde düşük bakım gerektirir. Düzenli olarak yosun temizliği, pompa bakımı ve kış hazırlığı yapıldığında uzun yıllar sorunsuz çalışır." },
      { question: "Bahçeme şelale yaptırmak için yeterli alanım var mı?", answer: "Şelale sistemleri, küçük bahçeler ve hatta balkonlar için bile uygun kompakt modellerden, büyük bahçelerdeki doğal gölet şelalelerine kadar her ölçekte uygulanabilir. Uzman firmalar, alanınıza uygun çözümler sunar." },
      { question: "Süs havuzu elektrik tüketimi ne kadar?", answer: "Süs havuzlarında kullanılan modern pompalar düşük enerji tüketimiyle çalışır. Güneş enerjili pompa seçenekleri ile işletme maliyetini sıfıra indirmek mümkündür. LED aydınlatmalar da minimum elektrik harcar." }
    ]
  },
  {
    slug: "cati-bahcesi",
    label: "Çatı Bahçesi & Teras",
    icon: "🏢",
    shortDescription: "Çatı bahçesi tasarımı, teras peyzajı ve yeşil çatı uygulamaları.",
    seoTitle: "Çatı Bahçesi & Teras Peyzajı Firmaları | Peyzajbul",
    seoDescription: "Çatı bahçesi ve teras peyzaj firmaları. Yeşil çatı uygulamaları, teras bitkilendirme ve drenaj sistemleri.",
    seoArticle: `Çatı bahçeleri ve teras peyzajı, kentsel alanlarda yeşil alanları artırmanın etkili bir yoludur. Su yalıtımı, drenaj sistemi, hafif toprak karışımları ve uygun bitki seçimi ile çatı ve teraslarınızı yaşayan yeşil alanlara dönüştürebilirsiniz. Yeşil çatılar ısı yalıtımına katkı sağlar ve kent ısı adası etkisini azaltır.`,
    imageUrl: "/images/categories/cati-bahcesi-teras-hero.jpg",
    faqs: [
      { question: "Çatı bahçesi yapım maliyeti ne kadar?", answer: "Çatı bahçesi maliyeti, su yalıtımı, drenaj katmanı, hafif toprak karışımı ve bitki seçimine göre değişir. Yeşil çatı sistemleri, yalıtım sayesinde uzun vadede enerji tasarrufu sağlayarak kendini amorti eder. Kesin fiyat için firmalardan teklif alın." },
      { question: "Çatı bahçesi için su yalıtımı şart mı?", answer: "Evet, çatı bahçesi uygulamalarında profesyonel su yalıtımı kesinlikle zorunludur. Kaliteli bir yalıtım sistemi, su sızıntılarını önler ve binanızın yapısal bütünlüğünü korur. Profesyonel firmalar, yalıtım katmanlarını titizlikle uygular." },
      { question: "Çatı bahçesinde hangi bitkiler kullanılmalı?", answer: "Çatı bahçelerinde rüzgara ve güneşe dayanıklı, az su tüketen, sığ köklü bitkiler tercih edilmelidir. Sedum türleri, lavanta, biberiye, sarmaşıklar ve bazı dekoratif otlar çatı bahçeleri için ideal seçeneklerdir." },
      { question: "Mevcut bir terası çatı bahçesine dönüştürebilir miyim?", answer: "Mevcut teraslar çatı bahçesine dönüştürülebilir ancak öncelikle yapısal taşıma kapasitesi ve yalıtım durumu kontrol edilmelidir. Profesyonel firmalar, gerekli mühendislik hesaplamalarını yaparak güvenli dönüşümü sağlar." }
    ]
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
    imageUrl: "/images/categories/dikey-bahce-hero.jpg",
    faqs: [
      { question: "Dikey bahçe yapım maliyeti ne kadar?", answer: "Dikey bahçe fiyatları, kullanılan sistem türü (keçe panel, hidroponik, modüler saksı), bitki çeşitliliği ve otomatik sulama entegrasyonuna göre değişir. Küçük ölçekli iç mekan uygulamaları daha ekonomik, büyük cephe sistemleri daha kapsamlı bütçe gerektirir." },
      { question: "Dikey bahçe bakımı nasıl yapılır?", answer: "Dikey bahçeler, entegre otomatik sulama sistemleri sayesinde düşük bakım gerektirir. Periyodik olarak bitki besini takviyesi, solan yaprakların temizlenmesi ve sistem kontrolü yapılması yeterlidir. Profesyonel firmalar bakım hizmeti de sunar." },
      { question: "İç mekanda dikey bahçe yapılabilir mi?", answer: "Evet, iç mekan dikey bahçeleri son yıllarda ofislerde, otellerde ve evlerde çok popülerdir. İç mekan uygulamalarında düşük ışık koşullarına dayanıklı bitkiler (salon sarmaşığı, eğrelti otu, spatifilyum gibi) tercih edilir." },
      { question: "Dikey bahçe ses yalıtımı sağlar mı?", answer: "Evet, dikey bahçeler ses emici özelliği sayesinde özellikle iç mekanlarda gürültü seviyesini belirgin şekilde azaltır. Yeşil duvarlar, ses dalgalarını emerek daha sessiz ve huzurlu bir ortam yaratılmasına katkıda bulunur." }
    ]
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
    imageUrl: "/images/categories/kentsel-peyzaj-hero.jpg",
    faqs: [
      { question: "Kentsel peyzaj projelerinin maliyeti nasıl hesaplanır?", answer: "Kentsel peyzaj projeleri, alan büyüklüğü, kapsam (bitkilendirme, sert zemin, aydınlatma, sulama) ve kullanılacak malzeme kalitesine göre projelendirilir. Her proje için ayrı keşif ve fizibilite çalışması yapılır." },
      { question: "Kentsel peyzajda hangi bitkiler tercih edilmeli?", answer: "Kentsel alanlarda kuraklığa dayanıklı, bakımı kolay, hava kirliliğine toleranslı bitki türleri tercih edilmelidir. Ayrıca yerel biyoçeşitliliği destekleyen ve bölge iklimine uyumlu türler seçilmelidir." },
      { question: "Belediye için kentsel peyzaj projesi nasıl yaptırılır?", answer: "Belediyeler ve kamu kurumları, ihale süreciyle kentsel peyzaj firmalarından proje hizmeti alabilir. Peyzajbul üzerinden kamu projelerinde deneyimli büyük ölçekli firmalara doğrudan ulaşabilirsiniz." }
    ]
  },
  {
    slug: "park-oyun-alani",
    label: "Park & Oyun Alanı",
    icon: "🛝",
    shortDescription: "Çocuk oyun alanları, park ekipmanları ve spor alanı yapımı.",
    seoTitle: "Park & Oyun Alanı Firmaları | Peyzajbul",
    seoDescription: "Park ve oyun alanı firmaları. Çocuk parkı ekipmanları, spor alanları ve açık alan fitness alanı yapımı.",
    seoArticle: `Park ve oyun alanları, çocukların güvenli bir şekilde oynayabileceği ve ailelerin vakit geçirebileceği açık mekanlardır. Modern oyun ekipmanları, güvenlik zemin kaplamaları, spor alanları ve fitness parkurları bu kategorideki başlıca hizmetlerdir. Firmalar, güvenlik standartlarına uygun ekipman temini ve montaj hizmeti sunar.`,
    imageUrl: "/images/categories/park-oyun-alani-hero.jpg",
    faqs: [
      { question: "Park ve oyun alanı yapım maliyeti ne kadar?", answer: "Oyun alanı maliyetleri, ekipman çeşidi ve sayısı, güvenlik zemin kaplaması türü ve alan büyüklüğüne göre değişir. Profesyonel firmalar, uluslararası güvenlik standartlarına uygun ekipmanlarla bütçenize uygun projeler sunar." },
      { question: "Çocuk oyun alanı hangi güvenlik standartlarına uygun olmalı?", answer: "Oyun alanlarında TSE ve EN 1176 standartlarına uygun ekipman kullanılmalı, darbe emici güvenlik zemin kaplaması (kauçuk, kum veya sentetik çim) bulunmalı ve ekipmanlar düzenli olarak kontrol edilmelidir." },
      { question: "Site için oyun alanı yaptırmak istiyorum, nelere dikkat etmeliyim?", answer: "Site sakinlerinin yaş grubuna uygun ekipman seçimi, gölgelik alanlar ve ebeveyn oturma bölgeleri planlanmalıdır. Ayrıca oyun alanının konumu, güneş ışığı ve rüzgar durumu göz önünde bulundurulmalıdır." },
      { question: "Park ve oyun alanı bakımı nasıl yapılır?", answer: "Oyun alanları düzenli olarak denetlenmeli, aşınan parçalar değiştirilmeli ve güvenlik zemin kaplaması kontrol edilmelidir. Profesyonel firmalar periyodik bakım hizmeti sunarak ekipmanların ömrünü uzatır." }
    ]
  },
  {
    slug: "cit-pergola",
    label: "Çit & Pergola",
    icon: "🏗️",
    shortDescription: "Bahçe çitleri, pergola ve kameriye yapımı.",
    seoTitle: "Çit & Pergola Firmaları | Peyzajbul",
    seoDescription: "Çit ve pergola firmaları. Ahşap, metal ve PVC çit sistemleri, pergola ve kameriye yapımı.",
    seoArticle: `Çit ve pergola uygulamaları, bahçenize mahremiyet, güvenlik ve estetik değer katan yapısal elemanlardır. Ahşap, metal, PVC ve kompozit malzemelerden üretilen çit sistemleri ile bahçenizi sınırlayabilirsiniz. Pergolalar ise gölgelik alan yaratarak dış mekan yaşam kalitenizi artırır. Kamerayeler ve çardaklar da bu kategorideki popüler uygulamalardır.`,
    imageUrl: "/images/categories/pergola-cit-hero.jpg",
    faqs: [
      { question: "Pergola yapım fiyatları ne kadar?", answer: "Pergola maliyetleri, kullanılan malzeme (ahşap, alüminyum, PVC), boyut ve isteğe bağlı özelliklere (motorlu tente, LED aydınlatma, yan panjur) göre değişir. Alüminyum pergolalar daha dayanıklı olmakla birlikte ahşaba göre daha yüksek maliyetlidir." },
      { question: "Pergola için izin gerekir mi?", answer: "Müstakil evlerde belirli ölçülerdeki pergolalar için genellikle izin gerekmez. Ancak site ve apartmanlarda yönetim onayı alınması, büyük yapılarda ise belediyeden izin alınması gerekebilir." },
      { question: "Bahçe çiti için hangi malzeme daha iyi?", answer: "PVC çitler düşük bakım gerektirir ve neme dayanıklıdır. Ahşap çitler doğal görünüm sunar ancak düzenli bakım ister. Metal çitler (dövme demir, alüminyum) en dayanıklı seçenektir. Seçim bütçenize ve bahçe tarzınıza bağlıdır." },
      { question: "Motorlu pergola tentesi mi sabit pergola mı avantajlı?", answer: "Motorlu tenteli pergolalar, yağmur ve güneşe göre açılıp kapanabilen esnek kullanım sunar. Sabit pergolalar ise daha sağlam ve uzun ömürlüdür. İklim koşullarınız ve kullanım alışkanlıklarınız hangisinin size uygun olduğunu belirler." }
    ]
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
    imageUrl: "/images/categories/peyzaj-malzemeleri-hero.jpg",
    faqs: [
      { question: "Peyzaj malzemeleri fiyatları ne kadar?", answer: "Peyzaj malzemeleri, türüne ve kalitesine göre geniş fiyat aralığına sahiptir. Dekoratif taşlar, bordürler, sulama ekipmanları ve aydınlatma ürünlerinde toptan alımlarda önemli indirimler uygulanır. En güncel fiyatlar için tedarikçilerle iletişime geçebilirsiniz." },
      { question: "Peyzaj malzemelerini toptan nereden satın alabilirim?", answer: "Peyzajbul üzerinden peyzaj malzemesi tedarikçilerine ulaşabilir, toptan ve perakende alım seçeneklerini karşılaştırabilirsiniz. Firma listemizdeki güvenilir tedarikçiler, projeniz için gereken tüm malzemeleri sağlar." },
      { question: "Peyzaj projem için kaç metrekare malzeme gerektiğini nasıl hesaplarım?", answer: "Malzeme miktarı hesaplaması, alan ölçümü ve kullanılacak malzemenin türüne göre yapılır. Profesyonel firmalar, ücretsiz keşif hizmeti ile ihtiyacınız olan malzeme miktarını ve bütçeyi belirlemenize yardımcı olur." }
    ]
  },
  {
    slug: "dogal-tas",
    label: "Doğal Taş & Kaplama",
    icon: "🪨",
    shortDescription: "Doğal taş döşeme, duvar kaplama ve taş işçiliği.",
    seoTitle: "Doğal Taş & Kaplama Firmaları | Peyzajbul",
    seoDescription: "Doğal taş ve kaplama firmaları. Taş döşeme, duvar kaplama, mermer ve granit işçiliği.",
    seoArticle: `Doğal taş uygulamaları, dış mekanlara zamansız bir güzellik ve dayanıklılık kazandırır. Mermer, granit, travertan, bazalt ve arduvaz gibi doğal taşlar; yürüyüş yolları, teraslar, duvar kaplamaları ve merdiven basamaklarında kullanılır. Her taş türünün kendine özgü dokusu ve rengi, mekanlarınıza doğal ve sofistike bir görünüm katar.`,
    imageUrl: "/images/categories/dogal-tas-kaplama-hero.jpg",
    faqs: [
      { question: "Doğal taş döşeme fiyatları ne kadar?", answer: "Doğal taş fiyatları, taş türüne (mermer, granit, traverten, bazalt), kalınlık, yüzey işleme ve döşeme alanına göre değişir. Kesin fiyat için firmalardan ücretsiz keşif ve teklif talep edebilir, bütçenize uygun taş türünü belirleyebilirsiniz." },
      { question: "Doğal taş mı yapay taş mı daha avantajlı?", answer: "Doğal taş, eşsiz doku ve renk çeşitliliği ile dayanıklılık sunar ancak maliyeti daha yüksektir. Yapay taşlar (kültür taşı) daha ekonomiktir ve homojen bir görünüm sağlar. Seçim bütçenize ve proje gereksinimlerinize bağlıdır." },
      { question: "Doğal taş kaplama dış cephede kullanılabilir mi?", answer: "Evet, doğal taş dış cephe kaplamaları hem estetik hem yalıtım açısından mükemmel bir seçenektir. Donmaya dayanıklı, düşük su emme oranına sahip taş türleri (granit, bazalt gibi) dış cephe uygulamaları için idealdir." },
      { question: "Traverten taşının avantajları nelerdir?", answer: "Traverten, doğal gözenekli yapısı sayesinde kaymaz özelliğe sahiptir ve havuz çevresi gibi ıslak alanlar için idealdir. Ayrıca doğal sıcak tonları ve antik görünümü ile bahçe ve teras uygulamalarında sıklıkla tercih edilir." }
    ]
  },
  {
    slug: "bitki-satisi",
    label: "Bitki Satışı & Fidanlık",
    icon: "🌺",
    shortDescription: "Süs bitkileri, mevsimlik çiçekler ve fidan satışı.",
    seoTitle: "Bitki Satışı & Fidanlık Firmaları | Peyzajbul",
    seoDescription: "Bitki satışı ve fidanlık firmaları. Süs bitkileri, mevsimlik çiçekler, iç mekan bitkileri ve fidan satışı.",
    seoArticle: `Bitki satışı ve fidanlık hizmetleri, peyzaj projeleriniz için gereken tüm bitki materyallerini temin etmenizi sağlar. Süs bitkileri, çalılar, mevsimlik çiçekler, yer örtücüler ve iç mekan bitkileri geniş ürün yelpazesinin parçasıdır. Kaliteli fidanlıklar, sağlıklı ve bölge iklimine uygun bitki türleri sunar.`,
    imageUrl: "/images/categories/bitki-satisi-fidanlik-hero.jpg",
    faqs: [
      { question: "Süs bitkisi fiyatları ne kadar?", answer: "Bitki fiyatları, türüne, yaşına, saksı boyutuna ve nadirliğine göre geniş bir aralıkta değişir. Mevsimlik çiçekler daha ekonomikken, büyük boy süs ağaçları ve egzotik türler daha yüksek maliyetlidir. Fidanlıklardan güncel fiyat listesini talep edebilirsiniz." },
      { question: "Hangi bitkiyi nereden satın almalıyım?", answer: "Sertifikalı fidanlıklardan ve bitki pasaportuna sahip ürünler satın almanız, sağlıklı ve hastalıksız bitkiler temin etmenizi sağlar. Peyzajbul üzerinden güvenilir fidanlık ve bitki satışı yapan firmalara ulaşabilirsiniz." },
      { question: "İç mekan bitkileri için en uygun türler hangileridir?", answer: "Az ışıkta yaşayabilen salon sarmaşığı, paşa kılıcı, barış çiçeği ve areka palmiyesi gibi bitkiler iç mekanlar için idealdir. Bu bitkiler düşük bakım gerektirir ve hava temizleme özellikleriyle bilinir." },
      { question: "Bitki alırken sağlıklı olduğunu nasıl anlarım?", answer: "Sağlıklı bir bitkinin yaprakları canlı renklidir, sararma veya lekelenme yoktur. Kökler saksı altından taşmamalı, toprak nemli olmalı ve yaprak altlarında böcek veya hastalık belirtisi bulunmamalıdır." }
    ]
  },
  {
    slug: "toprak-gubre",
    label: "Toprak & Gübre Hizmetleri",
    icon: "🌾",
    shortDescription: "Toprak analizi, gübreleme, toprak ıslahı ve kompost hizmetleri.",
    seoTitle: "Toprak & Gübre Hizmetleri Firmaları | Peyzajbul",
    seoDescription: "Toprak ve gübre hizmetleri sunan firmalar. Toprak analizi, gübreleme programları, kompost ve toprak ıslahı.",
    seoArticle: `Toprak ve gübre hizmetleri, sağlıklı bitki gelişiminin temelini oluşturur. Toprak analizi ile pH, besin değerleri ve yapı tespit edilir; buna göre uygun gübreleme programları oluşturulur. Organik ve kimyasal gübreler, kompost, torf ve toprak ıslah malzemeleri bu kategorideki başlıca ürünlerdir. Doğru toprak yönetimi ile bitkileriniz daha sağlıklı ve verimli büyür.`,
    imageUrl: "/images/categories/toprak-gubre-hero.jpg",
    faqs: [
      { question: "Toprak analizi neden önemlidir?", answer: "Toprak analizi, bahçenizdeki toprağın pH değerini, besin maddesi seviyelerini ve yapısal özelliklerini belirler. Bu sayede hangi gübrelerin ne miktarda kullanılacağı doğru olarak planlanır, gereksiz gübreleme önlenir ve bitkileriniz için optimum büyüme ortamı sağlanır." },
      { question: "Organik gübre mi kimyasal gübre mi daha iyi?", answer: "Organik gübreler toprak yapısını uzun vadede iyileştirir ve çevre dostudur. Kimyasal gübreler ise hızlı etki gösterir. En iyi sonuç için toprak analizi sonuçlarına göre her iki gübre türünün dengeli kullanımı önerilir." },
      { question: "Kompost gübre nasıl kullanılır?", answer: "Kompost, bitkilerin ihtiyaç duyduğu temel besinleri sağlayan doğal bir gübredir. Dikim öncesi toprağa karıştırılır veya mevcut bitkilerin üzerine malç olarak serilir. Yılda 1-2 kez uygulanması toprağın organik madde oranını artırır ve su tutma kapasitesini geliştirir." },
      { question: "Toprak ıslahı nedir ve ne zaman gereklidir?", answer: "Toprak ıslahı, verimsiz veya sorunlu toprakların fiziksel, kimyasal ve biyolojik özelliklerinin iyileştirilmesidir. Ağır killi topraklarda drenaj sorunu, kumlu topraklarda su tutma sorunu varsa toprak ıslahı gerekir. Profesyonel firmalar, toprak yapınıza uygun ıslah programı hazırlar." }
    ]
  }
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