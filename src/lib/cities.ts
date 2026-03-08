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
## ${cityName} Peyzaj Firmaları

${cityName} ilinde profesyonel peyzaj hizmetleri sunan onlarca firma bulunmaktadır. İster yeni bir bahçe tasarımı, ister mevcut alanınızın yenilenmesi, isterse de ticari peyzaj projeleri için güvenilir firmalarla çalışabilirsiniz.

### ${cityName}'da Peyzaj Hizmetleri

${cityName} bölgesinde en çok talep edilen peyzaj hizmetleri arasında **bahçe tasarımı**, **çim serme ve bakımı**, **sulama sistemleri kurulumu**, **peyzaj aydınlatma**, **havuz çevresi düzenleme** ve **ağaçlandırma** yer almaktadır.

### Neden ${cityName}'da Profesyonel Peyzaj Firması Tercih Etmelisiniz?

Profesyonel bir peyzaj firması, bölgenin iklim koşullarına uygun bitki seçimi yaparak uzun ömürlü ve bakımı kolay bahçeler tasarlar. ${cityName}'ın yerel toprak yapısını ve iklim özelliklerini bilen firmalar, projenizin başarılı olmasını sağlar.

### ${cityName} Peyzaj Firması Seçerken Dikkat Edilmesi Gerekenler

- **Referansları ve portföyü inceleyin**: Firmanın daha önce tamamladığı projeleri mutlaka görün.
- **Lisans ve sigorta kontrolü yapın**: Profesyonel firmalar gerekli belgelere sahip olmalıdır.
- **Birden fazla teklif alın**: En az 3 firmadan teklif alarak karşılaştırma yapın.
- **Garanti ve bakım hizmetlerini sorun**: Proje sonrası destek sunan firmaları tercih edin.

Aşağıda ${cityName} ilinde hizmet veren onaylı peyzaj firmalarını inceleyebilir ve ücretsiz teklif alabilirsiniz.
    `.trim(),
  };
}
