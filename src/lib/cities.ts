export type CityData = {
  name: string;
  slug: string;
  plate: string;
};

export const CITIES: CityData[] = [
  { name: "Adana", slug: "adana", plate: "01" },
  { name: "Adıyaman", slug: "adiyaman", plate: "02" },
  { name: "Afyonkarahisar", slug: "afyonkarahisar", plate: "03" },
  { name: "Ağrı", slug: "agri", plate: "04" },
  { name: "Amasya", slug: "amasya", plate: "05" },
  { name: "Ankara", slug: "ankara", plate: "06" },
  { name: "Antalya", slug: "antalya", plate: "07" },
  { name: "Artvin", slug: "artvin", plate: "08" },
  { name: "Aydın", slug: "aydin", plate: "09" },
  { name: "Balıkesir", slug: "balikesir", plate: "10" },
  { name: "Bilecik", slug: "bilecik", plate: "11" },
  { name: "Bingöl", slug: "bingol", plate: "12" },
  { name: "Bitlis", slug: "bitlis", plate: "13" },
  { name: "Bolu", slug: "bolu", plate: "14" },
  { name: "Burdur", slug: "burdur", plate: "15" },
  { name: "Bursa", slug: "bursa", plate: "16" },
  { name: "Çanakkale", slug: "canakkale", plate: "17" },
  { name: "Çankırı", slug: "cankiri", plate: "18" },
  { name: "Çorum", slug: "corum", plate: "19" },
  { name: "Denizli", slug: "denizli", plate: "20" },
  { name: "Diyarbakır", slug: "diyarbakir", plate: "21" },
  { name: "Edirne", slug: "edirne", plate: "22" },
  { name: "Elazığ", slug: "elazig", plate: "23" },
  { name: "Erzincan", slug: "erzincan", plate: "24" },
  { name: "Erzurum", slug: "erzurum", plate: "25" },
  { name: "Eskişehir", slug: "eskisehir", plate: "26" },
  { name: "Gaziantep", slug: "gaziantep", plate: "27" },
  { name: "Giresun", slug: "giresun", plate: "28" },
  { name: "Gümüşhane", slug: "gumushane", plate: "29" },
  { name: "Hakkari", slug: "hakkari", plate: "30" },
  { name: "Hatay", slug: "hatay", plate: "31" },
  { name: "Isparta", slug: "isparta", plate: "32" },
  { name: "Mersin", slug: "mersin", plate: "33" },
  { name: "İstanbul", slug: "istanbul", plate: "34" },
  { name: "İzmir", slug: "izmir", plate: "35" },
  { name: "Kars", slug: "kars", plate: "36" },
  { name: "Kastamonu", slug: "kastamonu", plate: "37" },
  { name: "Kayseri", slug: "kayseri", plate: "38" },
  { name: "Kırklareli", slug: "kirklareli", plate: "39" },
  { name: "Kırşehir", slug: "kirsehir", plate: "40" },
  { name: "Kocaeli", slug: "kocaeli", plate: "41" },
  { name: "Konya", slug: "konya", plate: "42" },
  { name: "Kütahya", slug: "kutahya", plate: "43" },
  { name: "Malatya", slug: "malatya", plate: "44" },
  { name: "Manisa", slug: "manisa", plate: "45" },
  { name: "Kahramanmaraş", slug: "kahramanmaras", plate: "46" },
  { name: "Mardin", slug: "mardin", plate: "47" },
  { name: "Muğla", slug: "mugla", plate: "48" },
  { name: "Muş", slug: "mus", plate: "49" },
  { name: "Nevşehir", slug: "nevsehir", plate: "50" },
  { name: "Niğde", slug: "nigde", plate: "51" },
  { name: "Ordu", slug: "ordu", plate: "52" },
  { name: "Rize", slug: "rize", plate: "53" },
  { name: "Sakarya", slug: "sakarya", plate: "54" },
  { name: "Samsun", slug: "samsun", plate: "55" },
  { name: "Siirt", slug: "siirt", plate: "56" },
  { name: "Sinop", slug: "sinop", plate: "57" },
  { name: "Sivas", slug: "sivas", plate: "58" },
  { name: "Tekirdağ", slug: "tekirdag", plate: "59" },
  { name: "Tokat", slug: "tokat", plate: "60" },
  { name: "Trabzon", slug: "trabzon", plate: "61" },
  { name: "Tunceli", slug: "tunceli", plate: "62" },
  { name: "Şanlıurfa", slug: "sanliurfa", plate: "63" },
  { name: "Uşak", slug: "usak", plate: "64" },
  { name: "Van", slug: "van", plate: "65" },
  { name: "Yozgat", slug: "yozgat", plate: "66" },
  { name: "Zonguldak", slug: "zonguldak", plate: "67" },
  { name: "Aksaray", slug: "aksaray", plate: "68" },
  { name: "Bayburt", slug: "bayburt", plate: "69" },
  { name: "Karaman", slug: "karaman", plate: "70" },
  { name: "Kırıkkale", slug: "kirikkale", plate: "71" },
  { name: "Batman", slug: "batman", plate: "72" },
  { name: "Şırnak", slug: "sirnak", plate: "73" },
  { name: "Bartın", slug: "bartin", plate: "74" },
  { name: "Ardahan", slug: "ardahan", plate: "75" },
  { name: "Iğdır", slug: "igdir", plate: "76" },
  { name: "Yalova", slug: "yalova", plate: "77" },
  { name: "Karabük", slug: "karabuk", plate: "78" },
  { name: "Kilis", slug: "kilis", plate: "79" },
  { name: "Osmaniye", slug: "osmaniye", plate: "80" },
  { name: "Düzce", slug: "duzce", plate: "81" },
];

export function getCityBySlug(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getCitySlug(cityName: string): string {
  const found = CITIES.find((c) => c.name === cityName);
  return found?.slug || cityName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function generateCitySeoContent(cityName: string): { title: string; description: string; article: string } {
  return {
    title: `${cityName} Peyzaj Firmaları | En İyi Peyzaj Şirketleri`,
    description: `${cityName} ilindeki en iyi peyzaj firmalarını karşılaştırın. Bahçe tasarımı, peyzaj mimarlığı, sulama sistemleri ve daha fazlası için ücretsiz teklif alın.`,
    article: `
## ${cityName} Peyzaj Firmaları ve Profesyonel Bahçe Çözümleri

${cityName} ilinde profesyonel peyzaj hizmetleri sunan onlarca deneyimli firma bulunmaktadır. Modern şehir yaşamının getirdiği yeşil alan ihtiyacı, ${cityName}'da bahçe tasarımı ve dış mekan düzenleme hizmetlerine olan talebi her geçen gün artırmaktadır. İster yeni bir konut projesi için bahçe tasarımı, ister mevcut ticari alanınızın yenilenmesi, isterse de düzenli periyodik bakım hizmetleri için ${cityName} peyzaj firmaları geniş bir yelpazede çözümler sunar.

### ${cityName}'da Sunulan Başlıca Peyzaj Hizmetleri

${cityName} bölgesindeki firmalar, estetik ve fonksiyonelliği bir araya getiren pek çok farklı uzmanlık alanında hizmet vermektedir:

- **Profesyonel Bahçe Tasarımı ve Projelendirme**: Alanınızın potansiyelini en iyi şekilde kullanan, modern ve klasik çizgileri birleştiren mimari tasarımlar.
- **Rulo Çim ve Tohum Ekelimi**: ${cityName} toprak yapısına en uygun çim türlerinin seçimi ve profesyonel serim işlemleri.
- **Akıllı Sulama Sistemleri**: Su tasarrufu sağlayan, zaman ayarlı otomatik damlama ve yağmurlama sistemleri kurulumu.
- **Aydınlatma Tasarımı**: Bahçenizin geceleri de büyüleyici görünmesini sağlayan enerji verimli LED aydınlatma çözümleri.
- **Sert Zemin ve Hardscape**: Yürüyüş yolları, teras kaplamaları, doğal taş döşemeleri ve istinat duvarı uygulamaları.
- **Bitki Temini ve Dikimi**: Mevsimlik çiçeklerden asırlık ağaçlara kadar zengin bitki seçenekleri.

### Neden ${cityName} İlinde Yerel Bir Peyzaj Firması Seçmelisiniz?

Profesyonel bir peyzaj firmasıyla çalışmak, sadece görsel bir güzellik değil, aynı zamanda uzun vadeli bir yatırım koruması sağlar. ${cityName} ilinin kendine has iklim koşulları ve toprak özelliklerini bilen yerel bir ekip, bitkilerinizin sağlığını riske atmadan en doğru flora seçimini yapar. Özellikle ${cityName}'ın mevsim geçişlerindeki sıcaklık farkları ve yağış rejimi, peyzaj tasarımının sürdürülebilirliği için kritik öneme sahiptir.

### Profesyonel Peyzaj Bakımının Avantajları

Peyzaj sadece bir kez kurulan bir yapı değil, yaşayan bir organizmadır. ${cityName} bölgesinde düzenli bakım hizmeti alarak:
1. Bitkilerinizin hastalık ve zararlılardan korunmasını sağlarsınız.
2. Bahçenizin her mevsim canlı ve bakımlı görünmesini garanti edersiniz.
3. Budama ve gübreleme gibi teknik işlemlerle bitki ömrünü uzatırsınız.
4. Karmaşık sulama ve aydınlatma sistemlerinin teknik arızalarını önceden önlersiniz.

### Sıkça Sorulan Sorular (SSS) - ${cityName} Peyzaj Rehberi

**1. ${cityName}'da peyzaj projesi ne kadar sürer?**
Projenin büyüklüğüne ve kapsamına bağlı olarak, standart bir bahçe düzenlemesi genellikle 1 ile 3 hafta arasında tamamlanır. Büyük ticari projeler veya karmaşık sert zemin uygulamaları daha uzun sürebilir.

**2. ${cityName} iklimine en uygun bitkiler hangileridir?**
Bu sorunun cevabı ${cityName}'ın hangi bölgesinde olduğunuzla ilişkilidir. Ancak genel olarak dayanıklı çalı grupları, bölgeye uyumlu iğne yapraklılar ve yerli örtücü bitkiler en başarılı sonuçları vermektedir.

**3. Bahçe bakımı için ne sıklıkla profesyonel yardım almalıyım?**
İdeal bir görünüm için ${cityName}'da ilkbahar ve sonbahar aylarında yoğun bakım, yazın ise düzenli (2 haftada bir) kontroller önerilir.

Aşağıda **${cityName} peyzaj firmaları** listemizi inceleyerek, projeniz için en uygun iş ortağını bulabilir ve hızlıca teklif formunu doldurarak ücretsiz keşif talebinde bulunabilirsiniz.
    `.trim(),
  };
}
