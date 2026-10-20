// Allow-lists and display labels for the lead form.
//
// These mirror src/lib/leadFormData.ts (owned by the lead form package). A parity test in
// validate.test.ts compares them with that file, so adding or renaming an option there fails
// loudly here instead of surfacing as a 422 in production. Pure module: no Deno globals.

export const PROJECT_TYPES = ["residential", "commercial"] as const;

export const SERVICE_SLUGS = [
  "bahce-tasarimi",
  "bahce-bakimi",
  "sulama-sistemi",
  "sert-zemin",
  "bitki-agac",
  "havuz-cevresi",
  "proje-tasarim-uygulama",
  "sadece-uygulama",
  "yesil-cati-teras",
  "otopark-yol",
  "havuz-cevresi-ticari",
  "periyodik-bakim",
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

/** Service slug -> the label stored in leads.service_type and matched against firms.services[]. */
export const SERVICE_TYPE_TO_LABEL: Record<ServiceSlug, string> = {
  "bahce-tasarimi": "Bahçe Tasarımı",
  "bahce-bakimi": "Bahçe Bakımı & Bahçıvanlık",
  "sulama-sistemi": "Sulama Sistemleri",
  "sert-zemin": "Sert Zemin (Hardscape)",
  "bitki-agac": "Ağaçlandırma & Fidan",
  "havuz-cevresi": "Havuz Yapımı & Çevresi",
  "proje-tasarim-uygulama": "Peyzaj Mimarlığı",
  "sadece-uygulama": "Peyzaj Mimarlığı",
  "yesil-cati-teras": "Çatı Bahçesi & Teras",
  "otopark-yol": "Sert Zemin (Hardscape)",
  "havuz-cevresi-ticari": "Havuz Yapımı & Çevresi",
  "periyodik-bakim": "Bahçe Bakımı & Bahçıvanlık",
};

const MAINTENANCE_SCOPE = [
  "cim-bicme",
  "budama",
  "gubreleme",
  "ilaclama",
  "sulama-ayari",
  "yaprak-temizlik",
] as const;

const COMMERCIAL_SCOPE = [
  "bitkilendirme",
  "sulama-sistemi",
  "aydinlatma",
  "sert-zemin",
  "periyodik-bakim",
] as const;

/** Scope values accepted per service. Irrigation has no scope (it uses the irrigation fields). */
export const SCOPE_VALUES: Record<ServiceSlug, readonly string[]> = {
  "bahce-tasarimi": [
    "cim-ekimi",
    "bitki-agac-dikimi",
    "tas-ahsap-zemin",
    "pergola-kameriye",
    "cit-sinir",
    "sulama-sistemi",
    "aydinlatma",
    "su-ogesi",
  ],
  "bahce-bakimi": MAINTENANCE_SCOPE,
  "sulama-sistemi": [],
  "sert-zemin": ["dogal-tas", "beton-baski", "ahsap-deck", "kompozit-deck", "parke-tasi", "cakil-granit"],
  "bitki-agac": ["mevsimlik-cicek", "cali-gruplar", "agac-dikimi", "cim-serme", "saksili-bitkiler"],
  "havuz-cevresi": ["zemin-kaplama", "bitkilendirme", "aydinlatma", "pergola-golgelik", "duvar-sinir"],
  "proje-tasarim-uygulama": [
    "peyzaj-cizim",
    "bitkilendirme",
    "sulama-sistemi",
    "aydinlatma",
    "sert-zemin",
    "spor-alani",
    "cocuk-oyun",
    "periyodik-bakim",
  ],
  "sadece-uygulama": [
    "bitkilendirme",
    "sulama-sistemi",
    "aydinlatma",
    "sert-zemin",
    "spor-alani",
    "cocuk-oyun",
    "periyodik-bakim",
  ],
  "yesil-cati-teras": COMMERCIAL_SCOPE,
  "otopark-yol": COMMERCIAL_SCOPE,
  "havuz-cevresi-ticari": ["zemin-kaplama", "bitkilendirme", "aydinlatma", "pergola-golgelik", "periyodik-bakim"],
  "periyodik-bakim": MAINTENANCE_SCOPE,
};

export const IRRIGATION_TYPES = ["yeni-kurulum", "yenileme", "ariza-bakim", "otomasyon"] as const;
export const IRRIGATION_SYSTEMS = ["damla", "yagmurlama", "bilmiyorum"] as const;
export const WATER_SOURCES = ["sebeke", "kuyu", "havuz-golet"] as const;

export const PROPERTY_TYPES = [
  "villa",
  "site",
  "yazlik",
  "tarla-arazi",
  "otel",
  "avm-plaza",
  "konut-projesi",
  "okul-hastane",
  "kamu",
  "fabrika",
  "diger",
] as const;

export const AREA_SIZES = [
  "50-alti",
  "50-150",
  "150-500",
  "500-1000",
  "1000+",
  "1000-alti",
  "1000-5000",
  "5000-20000",
  "20000+",
] as const;

export const AREA_LABELS: Record<(typeof AREA_SIZES)[number], string> = {
  "50-alti": "50m² altı",
  "50-150": "50–150 m²",
  "150-500": "150–500 m²",
  "500-1000": "500–1.000 m²",
  "1000+": "1.000 m² üzeri",
  "1000-alti": "1.000 m² altı",
  "1000-5000": "1.000–5.000 m²",
  "5000-20000": "5.000–20.000 m²",
  "20000+": "20.000 m² üzeri",
};

export const CURRENT_CONDITIONS = ["bos-toprak", "eski-bahce", "kismen-duzenlenmis", "beton-kapli"] as const;

export const BUDGETS = [
  "25000-alti",
  "25000-75000",
  "75000-200000",
  "200000+",
  "bilmiyorum",
  "250000-alti",
  "250000-750000",
  "750000-2000000",
  "2000000+",
  "teklif-sonrasi",
] as const;

export const BUDGET_LABELS: Record<(typeof BUDGETS)[number], string> = {
  "25000-alti": "25.000 ₺ altı",
  "25000-75000": "25.000 – 75.000 ₺",
  "75000-200000": "75.000 – 200.000 ₺",
  "200000+": "200.000 ₺ üzeri",
  bilmiyorum: "Henüz belirsiz",
  "250000-alti": "250.000 ₺ altı",
  "250000-750000": "250.000 – 750.000 ₺",
  "750000-2000000": "750.000 – 2.000.000 ₺",
  "2000000+": "2.000.000 ₺ üzeri",
  "teklif-sonrasi": "Teklif sonrası karar verilecek",
};

export const TIMELINES = ["hemen", "1-ay", "1-3-ay", "3-6-ay", "arastirma"] as const;

export const TIMELINE_LABELS: Record<(typeof TIMELINES)[number], string> = {
  hemen: "Hemen (1–2 hafta içinde)",
  "1-ay": "1 ay içinde",
  "1-3-ay": "1–3 ay içinde",
  "3-6-ay": "3–6 ay içinde",
  arastirma: "Sadece fiyat araştırıyor",
};

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
  "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
] as const;

/** Where the form was opened from (`kaynak`); stored as leads.lead_source. Mirrors LEAD_SOURCES in leadFormData.ts. */
export const LEAD_SOURCES = [
  "navbar",
  "hero",
  "sticky_cta",
  "firm_profile",
  "firm_landing",
  "banner",
  "blog",
  "projects",
  "service_page",
  "teklif_al",
  "calculator",
  "unknown",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const MAX_PHOTOS = 5;

/** Label for an area slug; falls back to the raw value for legacy data. */
export function areaLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return (AREA_LABELS as Record<string, string>)[value] ?? value;
}

/** Budget band label (never an exact figure); falls back to the raw value for legacy data. */
export function budgetLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return (BUDGET_LABELS as Record<string, string>)[value] ?? value;
}

export function timelineLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return (TIMELINE_LABELS as Record<string, string>)[value] ?? value;
}
