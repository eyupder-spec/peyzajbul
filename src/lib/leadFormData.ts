export const TURKISH_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya",
  "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik",
  "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
  "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri",
  "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya",
  "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
  "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Şırnak", "Sivas",
  "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

export interface LeadFormData {
  projectType: "residential" | "commercial" | "";
  serviceType: string;
  scope: string[];
  irrigationType: string;
  irrigationSystem: string;
  waterSource: string;
  city: string;
  district: string;
  address: string;
  propertyType: string;
  areaSize: string;
  currentCondition: string;
  budget: string;
  timeline: string;
  photos: File[];
  notes: string;
  fullName: string;
  phone: string;
  email: string;
  kvkkAccepted: boolean;
}

export const initialFormData: LeadFormData = {
  projectType: "",
  serviceType: "",
  scope: [],
  irrigationType: "",
  irrigationSystem: "",
  waterSource: "",
  city: "",
  district: "",
  address: "",
  propertyType: "",
  areaSize: "",
  currentCondition: "",
  budget: "",
  timeline: "",
  photos: [],
  notes: "",
  fullName: "",
  phone: "",
  email: "",
  kvkkAccepted: false,
};

// Service options by project type
export const RESIDENTIAL_SERVICES = [
  { value: "bahce-tasarimi", label: "Bahçe Tasarımı ve Düzenleme", icon: "🌿" },
  { value: "bahce-bakimi", label: "Bahçe Bakımı (periyodik)", icon: "✂️" },
  { value: "sulama-sistemi", label: "Sulama Sistemi", icon: "💧" },
  { value: "sert-zemin", label: "Sert Zemin (taş/beton/deck)", icon: "🧱" },
  { value: "bitki-agac", label: "Bitki ve Ağaç Dikimi", icon: "🌳" },
  { value: "havuz-cevresi", label: "Havuz Çevresi Düzenleme", icon: "🏊" },
];

export const COMMERCIAL_SERVICES = [
  { value: "proje-tasarim-uygulama", label: "Proje Tasarımı ve Uygulama", icon: "📐" },
  { value: "sadece-uygulama", label: "Sadece Uygulama (çizim hazır)", icon: "🏗️" },
  { value: "yesil-cati-teras", label: "Yeşil Çatı / Teras", icon: "🌱" },
  { value: "otopark-yol", label: "Otopark ve Yol Kenarı", icon: "🅿️" },
  { value: "havuz-cevresi-ticari", label: "Havuz Çevresi", icon: "🏊" },
  { value: "periyodik-bakim", label: "Periyodik Bakım Anlaşması", icon: "📋" },
];

// Scope options by service type
export const SCOPE_OPTIONS: Record<string, { label: string; value: string }[]> = {
  "bahce-tasarimi": [
    { value: "cim-ekimi", label: "Çim ekimi/yenileme" },
    { value: "bitki-agac-dikimi", label: "Bitki ve ağaç dikimi" },
    { value: "tas-ahsap-zemin", label: "Taş/ahşap zemin" },
    { value: "pergola-kameriye", label: "Pergola/kameriye" },
    { value: "cit-sinir", label: "Çit ve sınır düzenleme" },
    { value: "sulama-sistemi", label: "Sulama sistemi" },
    { value: "aydinlatma", label: "Aydınlatma" },
    { value: "su-ogesi", label: "Su öğesi (fıskiye/şelale)" },
  ],
  "bahce-bakimi": [
    { value: "cim-bicme", label: "Çim biçme" },
    { value: "budama", label: "Budama ve şekillendirme" },
    { value: "gubreleme", label: "Gübreleme" },
    { value: "ilaclama", label: "İlaçlama ve hastalık kontrolü" },
    { value: "sulama-ayari", label: "Sulama ayarı" },
    { value: "yaprak-temizlik", label: "Yaprak ve temizlik" },
  ],
  "sert-zemin": [
    { value: "dogal-tas", label: "Doğal taş" },
    { value: "beton-baski", label: "Beton/baskı beton" },
    { value: "ahsap-deck", label: "Ahşap deck" },
    { value: "kompozit-deck", label: "Kompozit deck" },
    { value: "parke-tasi", label: "Parke taşı" },
    { value: "cakil-granit", label: "Çakıl/granit" },
  ],
  "bitki-agac": [
    { value: "mevsimlik-cicek", label: "Mevsimlik çiçek dikimi" },
    { value: "cali-gruplar", label: "Çalı grupları" },
    { value: "agac-dikimi", label: "Ağaç dikimi" },
    { value: "cim-serme", label: "Çim serme/ekme" },
    { value: "saksili-bitkiler", label: "Saksılı bitkiler" },
  ],
  "havuz-cevresi": [
    { value: "zemin-kaplama", label: "Zemin kaplama" },
    { value: "bitkilendirme", label: "Bitkilendirme" },
    { value: "aydinlatma", label: "Aydınlatma" },
    { value: "pergola-golgelik", label: "Pergola/gölgelik" },
    { value: "duvar-sinir", label: "Duvar/sınır düzenleme" },
  ],
  // Commercial scope (shared for most commercial services)
  "proje-tasarim-uygulama": [
    { value: "peyzaj-cizim", label: "Peyzaj mimari çizim" },
    { value: "bitkilendirme", label: "Bitkilendirme" },
    { value: "sulama-sistemi", label: "Sulama sistemi" },
    { value: "aydinlatma", label: "Aydınlatma" },
    { value: "sert-zemin", label: "Sert zemin" },
    { value: "spor-alani", label: "Spor alanı" },
    { value: "cocuk-oyun", label: "Çocuk oyun alanı" },
    { value: "periyodik-bakim", label: "Periyodik bakım dahil" },
  ],
  "sadece-uygulama": [
    { value: "bitkilendirme", label: "Bitkilendirme" },
    { value: "sulama-sistemi", label: "Sulama sistemi" },
    { value: "aydinlatma", label: "Aydınlatma" },
    { value: "sert-zemin", label: "Sert zemin" },
    { value: "spor-alani", label: "Spor alanı" },
    { value: "cocuk-oyun", label: "Çocuk oyun alanı" },
    { value: "periyodik-bakim", label: "Periyodik bakım dahil" },
  ],
  "yesil-cati-teras": [
    { value: "bitkilendirme", label: "Bitkilendirme" },
    { value: "sulama-sistemi", label: "Sulama sistemi" },
    { value: "aydinlatma", label: "Aydınlatma" },
    { value: "sert-zemin", label: "Sert zemin" },
    { value: "periyodik-bakim", label: "Periyodik bakım dahil" },
  ],
  "otopark-yol": [
    { value: "bitkilendirme", label: "Bitkilendirme" },
    { value: "sulama-sistemi", label: "Sulama sistemi" },
    { value: "aydinlatma", label: "Aydınlatma" },
    { value: "sert-zemin", label: "Sert zemin" },
    { value: "periyodik-bakim", label: "Periyodik bakım dahil" },
  ],
  "havuz-cevresi-ticari": [
    { value: "zemin-kaplama", label: "Zemin kaplama" },
    { value: "bitkilendirme", label: "Bitkilendirme" },
    { value: "aydinlatma", label: "Aydınlatma" },
    { value: "pergola-golgelik", label: "Pergola/gölgelik" },
    { value: "periyodik-bakim", label: "Periyodik bakım dahil" },
  ],
  "periyodik-bakim": [
    { value: "cim-bicme", label: "Çim biçme" },
    { value: "budama", label: "Budama ve şekillendirme" },
    { value: "gubreleme", label: "Gübreleme" },
    { value: "ilaclama", label: "İlaçlama ve hastalık kontrolü" },
    { value: "sulama-ayari", label: "Sulama ayarı" },
    { value: "yaprak-temizlik", label: "Yaprak ve temizlik" },
  ],
};

// Irrigation sub-questions
export const IRRIGATION_TYPE_OPTIONS = [
  { value: "yeni-kurulum", label: "Yeni kurulum" },
  { value: "yenileme", label: "Mevcut sistemi yenileme" },
  { value: "ariza-bakim", label: "Arıza ve bakım" },
  { value: "otomasyon", label: "Otomasyon ekleme" },
];

export const IRRIGATION_SYSTEM_OPTIONS = [
  { value: "damla", label: "Damla sulama" },
  { value: "yagmurlama", label: "Yağmurlama" },
  { value: "bilmiyorum", label: "Bilmiyorum, öneri bekliyorum" },
];

export const WATER_SOURCE_OPTIONS = [
  { value: "sebeke", label: "Şebeke" },
  { value: "kuyu", label: "Kuyu" },
  { value: "havuz-golet", label: "Havuz/gölet" },
];

// Property type options
export const RESIDENTIAL_PROPERTY_TYPES = [
  { value: "villa", label: "Villa/Müstakil ev" },
  { value: "site", label: "Site içi" },
  { value: "yazlik", label: "Yazlık" },
  { value: "tarla-arazi", label: "Tarla/Arazi" },
];

export const COMMERCIAL_PROPERTY_TYPES = [
  { value: "otel", label: "Otel/Tatil köyü" },
  { value: "avm-plaza", label: "AVM/Plaza" },
  { value: "konut-projesi", label: "Konut projesi (müteahhit)" },
  { value: "okul-hastane", label: "Okul/Hastane" },
  { value: "kamu", label: "Kamu alanı" },
  { value: "fabrika", label: "Fabrika/Sanayi" },
  { value: "diger", label: "Diğer" },
];

// Area size options
export const RESIDENTIAL_AREA_SIZES = [
  { value: "50-alti", label: "50m² altı" },
  { value: "50-150", label: "50–150 m²" },
  { value: "150-500", label: "150–500 m²" },
  { value: "500-1000", label: "500–1.000 m²" },
  { value: "1000+", label: "1.000 m² üzeri" },
];

export const COMMERCIAL_AREA_SIZES = [
  { value: "1000-alti", label: "1.000 m² altı" },
  { value: "1000-5000", label: "1.000–5.000 m²" },
  { value: "5000-20000", label: "5.000–20.000 m²" },
  { value: "20000+", label: "20.000 m² üzeri" },
];

// Current condition
export const CURRENT_CONDITION_OPTIONS = [
  { value: "bos-toprak", label: "Boş toprak/ham arazi" },
  { value: "eski-bahce", label: "Eski bahçe var, yenilenecek" },
  { value: "kismen-duzenlenmis", label: "Kısmen düzenlenmiş" },
  { value: "beton-kapli", label: "Beton/kaldırım kaplı" },
];

// Budget options
export const RESIDENTIAL_BUDGETS = [
  { value: "25000-alti", label: "25.000 ₺ altı" },
  { value: "25000-75000", label: "25.000 – 75.000 ₺" },
  { value: "75000-200000", label: "75.000 – 200.000 ₺" },
  { value: "200000+", label: "200.000 ₺ üzeri" },
  { value: "bilmiyorum", label: "Henüz bilmiyorum" },
];

export const COMMERCIAL_BUDGETS = [
  { value: "250000-alti", label: "250.000 ₺ altı" },
  { value: "250000-750000", label: "250.000 – 750.000 ₺" },
  { value: "750000-2000000", label: "750.000 – 2.000.000 ₺" },
  { value: "2000000+", label: "2.000.000 ₺ üzeri" },
  { value: "teklif-sonrasi", label: "Teklif aldıktan sonra karar vereceğim" },
];

// Timeline options
export const TIMELINE_OPTIONS = [
  { value: "hemen", label: "Hemen (1–2 hafta içinde)" },
  { value: "1-ay", label: "1 ay içinde" },
  { value: "1-3-ay", label: "1–3 ay içinde" },
  { value: "3-6-ay", label: "3–6 ay içinde" },
  { value: "arastirma", label: "Sadece fiyat araştırıyorum" },
];
