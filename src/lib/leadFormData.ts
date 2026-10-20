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
  projectType: "residential",
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
  phone: "05",
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

// Maps lead-form service slug → the label string stored in firms.services[]
export const SERVICE_TYPE_TO_LABEL: Record<string, string> = {
  // Residential
  "bahce-tasarimi": "Bahçe Tasarımı",
  "bahce-bakimi": "Bahçe Bakımı & Bahçıvanlık",
  "sulama-sistemi": "Sulama Sistemleri",
  "sert-zemin": "Sert Zemin (Hardscape)",
  "bitki-agac": "Ağaçlandırma & Fidan",
  "havuz-cevresi": "Havuz Yapımı & Çevresi",
  // Commercial
  "proje-tasarim-uygulama": "Peyzaj Mimarlığı",
  "sadece-uygulama": "Peyzaj Mimarlığı",
  "yesil-cati-teras": "Çatı Bahçesi & Teras",
  "otopark-yol": "Sert Zemin (Hardscape)",
  "havuz-cevresi-ticari": "Havuz Yapımı & Çevresi",
  "periyodik-bakim": "Bahçe Bakımı & Bahçıvanlık",
};

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

// ---------------------------------------------------------------------------
// Lead form flow: 3 steps, then verification. Everything below is pure (no imports) so that vitest
// can run it without the "@/" alias. Option `value` strings above are a data contract with the
// create-lead edge function and the lead routing/pricing SQL: never rename them.
// ---------------------------------------------------------------------------

export const LEAD_TOTAL_STEPS = 3;
export type LeadStep = 1 | 2 | 3;

export type LeadSource =
  | "navbar"
  | "hero"
  | "sticky_cta"
  | "firm_profile"
  | "firm_landing"
  | "banner"
  | "blog"
  | "projects"
  | "service_page"
  | "teklif_al"
  | "calculator"
  | "unknown";

/** Allow-list for the `kaynak` query parameter of deep links. */
export const LEAD_SOURCES: readonly LeadSource[] = [
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
];

/** `kaynak` spellings that are not LEAD_SOURCES entries themselves but name one (links written by hand or by other tools). */
const LEAD_SOURCE_ALIASES: ReadonlyArray<readonly [alias: string, source: LeadSource]> = [["maliyet-hesapla", "calculator"]];

/** Allow-listed lead source for a `kaynak` query value; null for anything else, so the caller can fall back to inferring it. */
export function resolveLeadSource(value: string | null | undefined): LeadSource | null {
  const key = value?.trim().toLowerCase() ?? "";
  if (!key) return null;
  return LEAD_SOURCES.find((source) => source === key) ?? LEAD_SOURCE_ALIASES.find(([alias]) => alias === key)?.[1] ?? null;
}

/**
 * Token of a saved calculator estimate (public.estimates.token): exactly 16 letters or digits. The calculator puts
 * it into the `est` query parameter; create-lead validates it again (create-lead/estimate.ts keeps the same rule).
 */
export const ESTIMATE_TOKEN_PATTERN = /^[a-z0-9]{16}$/i;

/** The token in its canonical lower-case form, or null for anything that is not exactly a token. */
export function parseEstimateToken(value: string | null | undefined): string | null {
  return typeof value === "string" && ESTIMATE_TOKEN_PATTERN.test(value) ? value.toLowerCase() : null;
}

/**
 * True when the form was opened from a firm page without a target firm (the firm is not claimed, so it cannot
 * receive the request): the request goes to the firms of the region, and the form has to say so.
 */
export function routesToRegionalFirms(source: LeadSource, targetFirmId: string | undefined): boolean {
  return source === "firm_profile" && !targetFirmId;
}

/** Values another page can pre-fill when it opens the form (hero search, calculator, deep links). */
export type LeadFormInitial = Partial<
  Pick<LeadFormData, "projectType" | "serviceType" | "city" | "district" | "areaSize" | "budget" | "timeline">
>;

export type VerifyChannel = "sms" | "email" | "whatsapp";

export const LEAD_FORM_CONFIG = {
  /** create-lead sends a one-time code by e-mail today. Flip to 'sms' only together with the backend. */
  verifyChannel: "email" as VerifyChannel,
  maxPhotos: 3,
  maxPhotoMb: 5,
};

/** E-mail is mandatory only while the verification code is sent by e-mail. */
export const emailRequired = (): boolean => LEAD_FORM_CONFIG.verifyChannel === "email";

export const SUPPORT_WHATSAPP_E164 = "905345957147";
/** One-line swap to "/kvkk" once the dedicated KVKK page ships. */
export const KVKK_URL = "/gizlilik-politikasi";
/**
 * Version of the notice a homeowner accepts; create-lead stores it with the lead (kvkk_version, at most 20
 * characters). Change it together with KVKK_URL whenever the text of the notice changes.
 */
export const KVKK_VERSION = "2026-10";

/** Honest copy shared by the form and the status page. No response-time promises, no numbers. */
export const LEAD_COPY = {
  reassurance: "Ücretsiz • Üyelik gerekmez",
  phoneShare: "Telefon numaranız yalnızca talebinizi kabul eden firmalara gösterilir.",
  /** Shown when the form was opened from the page of a firm that cannot receive the request itself. */
  regionalRouting: "Talebiniz sayfasını açtığınız firmaya değil, bölgenizdeki uygun firmalara iletilir.",
  reviewText: "Talebiniz iş günlerinde incelenir. Uygun firmalara iletildiğinde bu sayfada görürsünüz.",
  optionalSummary: "Daha doğru teklif için ayrıntı ekleyin (isteğe bağlı)",
  optionalHelp: "Not ve fotoğraf eklemek firmaların daha net teklif vermesine yardımcı olur.",
  exitDraft:
    "Formu tamamlamadan çıkarsanız seçimleriniz bu sekmede taslak olarak saklanır; kişisel bilgileriniz saklanmaz.",
  exitVerify:
    "Talebiniz kaydedildi ancak doğrulanmadığı için firmalara iletilmedi. Doğrulamayı şimdi tamamlayabilir veya talep sayfasından sonra devam edebilirsiniz.",
  photoFallback: "Fotoğraflarınızı WhatsApp ile de iletebilirsiniz",
  duplicate:
    "Bu e-posta adresiyle aynı hizmet ve il için yakın zamanda doğrulanmış bir talebiniz zaten var. Yeni bir talep için hizmeti veya ili değiştirebilirsiniz.",
  contactIntro: {
    sms: "Telefonunuza 6 haneli bir doğrulama kodu göndereceğiz.",
    email: "E-posta adresinize 6 haneli bir doğrulama kodu göndereceğiz.",
    whatsapp: "WhatsApp numaranıza 6 haneli bir doğrulama kodu göndereceğiz.",
  } satisfies Record<VerifyChannel, string>,
  verifyTitle: {
    sms: "Telefonunuzu doğrulayın",
    email: "E-posta adresinizi doğrulayın",
    whatsapp: "WhatsApp numaranızı doğrulayın",
  } satisfies Record<VerifyChannel, string>,
  verifyHint: {
    sms: "numarasına gönderilen 6 haneli kodu girin.",
    email: "adresine gönderilen 6 haneli kodu girin.",
    whatsapp: "numarasına gönderilen 6 haneli kodu girin.",
  } satisfies Record<VerifyChannel, string>,
  verifyHintUnknown: {
    sms: "Telefonunuza gönderilen 6 haneli kodu girin.",
    email: "E-posta adresinize gönderilen 6 haneli kodu girin.",
    whatsapp: "WhatsApp numaranıza gönderilen 6 haneli kodu girin.",
  } satisfies Record<VerifyChannel, string>,
  changeContact: {
    sms: "Numarayı değiştir",
    email: "E-posta adresini değiştir",
    whatsapp: "Numarayı değiştir",
  } satisfies Record<VerifyChannel, string>,
  verifiedStep: {
    sms: "Telefonunuz doğrulandı",
    email: "E-posta adresiniz doğrulandı",
    whatsapp: "WhatsApp numaranız doğrulandı",
  } satisfies Record<VerifyChannel, string>,
};

type ProjectKind = "residential" | "commercial";
type Option = { value: string; label: string };

const kindOf = (projectType: LeadFormData["projectType"]): ProjectKind =>
  projectType === "commercial" ? "commercial" : "residential";

export const servicesFor = (projectType: LeadFormData["projectType"]): Option[] =>
  kindOf(projectType) === "commercial" ? COMMERCIAL_SERVICES : RESIDENTIAL_SERVICES;
export const areaSizesFor = (projectType: LeadFormData["projectType"]): Option[] =>
  kindOf(projectType) === "commercial" ? COMMERCIAL_AREA_SIZES : RESIDENTIAL_AREA_SIZES;
export const budgetsFor = (projectType: LeadFormData["projectType"]): Option[] =>
  kindOf(projectType) === "commercial" ? COMMERCIAL_BUDGETS : RESIDENTIAL_BUDGETS;
export const propertyTypesFor = (projectType: LeadFormData["projectType"]): Option[] =>
  kindOf(projectType) === "commercial" ? COMMERCIAL_PROPERTY_TYPES : RESIDENTIAL_PROPERTY_TYPES;

/** Which project type a service slug belongs to, or null for an unknown slug. */
export function serviceProjectType(slug: string): ProjectKind | null {
  if (RESIDENTIAL_SERVICES.some((s) => s.value === slug)) return "residential";
  if (COMMERCIAL_SERVICES.some((s) => s.value === slug)) return "commercial";
  return null;
}

/** Lower-case, strip diacritics and fold the Turkish dotless i, so "istanbul" finds "İstanbul". */
export function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

/** Canonical city name for a loosely typed value (query string, slug), or null. */
export function findCity(value: string): string | null {
  const needle = normalizeForSearch(value);
  if (!needle) return null;
  return TURKISH_CITIES.find((city) => normalizeForSearch(city) === needle) ?? null;
}

// --- Contact field helpers -------------------------------------------------

/** Digits only; 5xx becomes 05xx; a pasted +90 / 0090 prefix is dropped; at most 11 digits. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("5")) digits = `0${digits}`;
  else if (digits.length > 0 && !digits.startsWith("0")) digits = `05${digits}`;
  return digits.slice(0, 11);
}

/** 05XX XXX XX XX while typing. */
export function formatPhone(value: string): string {
  const d = normalizePhone(value);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
}

/** Each validator returns an error message, or null when the value is acceptable. */
export function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Ad Soyad zorunludur.";
  if (trimmed.length < 3) return "Ad Soyad en az 3 karakter olmalıdır.";
  if (trimmed.length > 80) return "Ad Soyad en fazla 80 karakter olabilir.";
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u.test(trimmed)) return "Ad Soyad yalnızca harf içermelidir.";
  const words = trimmed.split(/\s+/).filter((part) => /\p{L}/u.test(part));
  if (words.length < 2) return "Lütfen ad ve soyadınızı birlikte girin.";
  return null;
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits === "0" || digits === "05") return "Telefon numarası zorunludur.";
  if (digits.length < 11) return "Telefon numarası 11 haneli olmalıdır (05XX XXX XX XX).";
  if (digits.length > 11) return "Telefon numarası en fazla 11 haneli olabilir.";
  if (!digits.startsWith("05")) return "Telefon numarası 05 ile başlamalıdır.";
  return null;
}

/** Optional unless the verification code is sent by e-mail. A filled-in address is always checked. */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return emailRequired() ? "E-posta adresi zorunludur." : null;
  if (trimmed.length > 254) return "E-posta adresi çok uzun.";
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) return "Geçerli bir e-posta adresi girin.";
  return null;
}

/** "ah***@gmail.com": enough for the visitor to recognise the address, useless to anyone else. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.trim().split("@");
  if (!domain) return "";
  return `${local.slice(0, 2)}***@${domain}`;
}

/** "05** *** ** 67". */
export function maskPhone(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length < 11) return "";
  return `${d.slice(0, 2)}** *** ** ${d.slice(9)}`;
}

// --- Step validation --------------------------------------------------------

/** Field errors for one step; an empty object means the step is valid. Keys are LeadFormData field names. */
export function validateStep(step: LeadStep, data: LeadFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!data.serviceType) errors.serviceType = "Lütfen bir hizmet seçin.";
    if (!data.city) errors.city = "Lütfen il seçin.";
    if (!data.areaSize) errors.areaSize = "Lütfen alan büyüklüğünü seçin.";
  } else if (step === 2) {
    if (!data.budget) errors.budget = "Lütfen bütçe aralığını seçin.";
    if (!data.timeline) errors.timeline = "Lütfen başlangıç zamanını seçin.";
  } else {
    const nameError = validateFullName(data.fullName);
    if (nameError) errors.fullName = nameError;
    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;
    if (emailRequired() || data.email.trim()) {
      const emailError = validateEmail(data.email);
      if (emailError) errors.email = emailError;
    }
    if (!data.kvkkAccepted) errors.kvkkAccepted = "Devam etmek için KVKK aydınlatma metnini onaylamanız gerekir.";
  }
  return errors;
}

/** First step that still needs input. Never 3: the contact step is never skipped into automatically. */
export function firstIncompleteStep(data: LeadFormData): 1 | 2 {
  return Object.keys(validateStep(1, data)).length > 0 ? 1 : 2;
}

// --- Draft (sessionStorage) and pre-fill sanitising --------------------------

export const DRAFT_STORAGE_KEY = "pz_lead_draft_v1";

export type LeadDraft = Omit<LeadFormData, "fullName" | "phone" | "email" | "photos" | "kvkkAccepted" | "address">;

/** What may be kept between visits of the form: choices only, never contact data, photos or consent. */
export function pickDraft(data: LeadFormData): LeadDraft {
  return {
    projectType: data.projectType,
    serviceType: data.serviceType,
    scope: data.scope,
    irrigationType: data.irrigationType,
    irrigationSystem: data.irrigationSystem,
    waterSource: data.waterSource,
    city: data.city,
    district: data.district,
    propertyType: data.propertyType,
    areaSize: data.areaSize,
    currentCondition: data.currentCondition,
    budget: data.budget,
    timeline: data.timeline,
    notes: data.notes,
  };
}

const allowed = (options: Option[], value: unknown): string =>
  typeof value === "string" && options.some((o) => o.value === value) ? value : "";

/**
 * Keeps only values that exist in the option lists (draft restore, URL pre-fill, `initial` prop).
 * Unknown or inconsistent values are dropped, so nothing the visitor or a link supplies can reach the request body.
 */
export function sanitizeLeadInput(input: Partial<LeadFormData>): Partial<LeadFormData> {
  const out: Partial<LeadFormData> = {};
  const serviceKind = typeof input.serviceType === "string" ? serviceProjectType(input.serviceType) : null;
  const projectType: ProjectKind | null =
    serviceKind ?? (input.projectType === "residential" || input.projectType === "commercial" ? input.projectType : null);
  if (projectType) out.projectType = projectType;
  if (serviceKind) out.serviceType = input.serviceType;

  if (typeof input.city === "string") {
    const city = findCity(input.city);
    if (city) out.city = city;
  }
  if (typeof input.district === "string" && input.district.length > 0 && input.district.length <= 80) {
    out.district = input.district;
  }
  const area = allowed(areaSizesFor(projectType ?? "residential"), input.areaSize);
  if (area) out.areaSize = area;
  const budget = allowed(budgetsFor(projectType ?? "residential"), input.budget);
  if (budget) out.budget = budget;
  const timeline = allowed(TIMELINE_OPTIONS, input.timeline);
  if (timeline) out.timeline = timeline;
  const propertyType = allowed(propertyTypesFor(projectType ?? "residential"), input.propertyType);
  if (propertyType) out.propertyType = propertyType;
  const condition = allowed(CURRENT_CONDITION_OPTIONS, input.currentCondition);
  if (condition) out.currentCondition = condition;
  const irrigationType = allowed(IRRIGATION_TYPE_OPTIONS, input.irrigationType);
  if (irrigationType) out.irrigationType = irrigationType;
  const irrigationSystem = allowed(IRRIGATION_SYSTEM_OPTIONS, input.irrigationSystem);
  if (irrigationSystem) out.irrigationSystem = irrigationSystem;
  const waterSource = allowed(WATER_SOURCE_OPTIONS, input.waterSource);
  if (waterSource) out.waterSource = waterSource;

  if (Array.isArray(input.scope) && serviceKind && input.serviceType) {
    const scopeOptions = SCOPE_OPTIONS[input.serviceType] ?? [];
    out.scope = [...new Set(input.scope)].filter((v) => scopeOptions.some((o) => o.value === v));
  }
  if (typeof input.notes === "string" && input.notes.length > 0) out.notes = input.notes.slice(0, 1000);
  return out;
}

/** Parses the stored draft; returns null for anything missing, malformed or from another version. */
export function parseDraft(raw: string | null): { data: Partial<LeadFormData>; step: 1 | 2 } | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { step, data } = parsed as { step?: unknown; data?: unknown };
    if (typeof data !== "object" || data === null) return null;
    return { data: sanitizeLeadInput(data as Partial<LeadFormData>), step: step === 2 ? 2 : 1 };
  } catch {
    return null;
  }
}
