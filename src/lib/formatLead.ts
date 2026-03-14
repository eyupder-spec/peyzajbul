export const SERVICE_LABELS: Record<string, string> = {
  "bahce-tasarimi": "Bahçe Tasarımı ve Düzenleme",
  "bahce-bakimi": "Bahçe Bakımı (Periyodik)",
  "sulama-sistemi": "Sulama Sistemi",
  "sert-zemin": "Sert Zemin (Taş/Beton/Deck)",
  "bitki-agac": "Bitki ve Ağaç Dikimi",
  "havuz-cevresi": "Havuz Çevresi Düzenleme",
  "proje-tasarim-uygulama": "Proje Tasarımı ve Uygulama",
  "sadece-uygulama": "Sadece Uygulama",
  "yesil-cati-teras": "Yeşil Çatı / Teras",
  "otopark-yol": "Otopark ve Yol Kenarı",
  "havuz-cevresi-ticari": "Havuz Çevresi",
  "periyodik-bakim": "Periyodik Bakım Anlaşması",
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  residential: "Konut / Bireysel",
  commercial: "Ticari / Kurumsal",
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  villa: "Villa / Müstakil Ev",
  site: "Site İçi",
  yazlik: "Yazlık",
  "tarla-arazi": "Tarla / Arazi",
  otel: "Otel / Tatil Köyü",
  "avm-plaza": "AVM / Plaza",
  "konut-projesi": "Konut Projesi",
  "okul-hastane": "Okul / Hastane",
  kamu: "Kamu Alanı",
  fabrika: "Fabrika / Sanayi",
  diger: "Diğer",
};

export const CONDITION_LABELS: Record<string, string> = {
  "bos-toprak": "Boş Toprak / Ham Arazi",
  "eski-bahce": "Eski Bahçe Var, Yenilenecek",
  "kismen-duzenlenmis": "Kısmen Düzenlenmiş",
  "beton-kapli": "Beton / Kaldırım Kaplı",
};

export const BUDGET_LABELS: Record<string, string> = {
  "25000-alti": "25.000 ₺ altı",
  "25000-75000": "25.000 – 75.000 ₺",
  "75000-200000": "75.000 – 200.000 ₺",
  "200000+": "200.000 ₺ üzeri",
  "250000-alti": "250.000 ₺ altı",
  "250000-750000": "250.000 – 750.000 ₺",
  "750000-2000000": "750.000 – 2.000.000 ₺",
  "2000000+": "2.000.000 ₺ üzeri",
  bilmiyorum: "Henüz Bilmiyorum",
  "teklif-sonrasi": "Teklif Aldıktan Sonra Karar Vereceğim",
};

export const TIMELINE_LABELS: Record<string, string> = {
  hemen: "Hemen (1–2 Hafta İçinde)",
  "1-ay": "1 Ay İçinde",
  "1-3-ay": "1–3 Ay İçinde",
  "3-6-ay": "3–6 Ay İçinde",
  arastirma: "Sadece Fiyat Araştırıyorum",
};

export const AREA_LABELS: Record<string, string> = {
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

export const IRRIGATION_TYPE_LABELS: Record<string, string> = {
  "yeni-kurulum": "Yeni Kurulum",
  "yenileme": "Mevcut Sistemi Yenileme",
  "ariza-bakim": "Arıza ve Bakım",
  "otomasyon": "Otomasyon Ekleme",
};

export const IRRIGATION_SYSTEM_LABELS: Record<string, string> = {
  "damla": "Damla Sulama",
  "yagmurlama": "Yağmurlama",
  "bilmiyorum": "Kararsızım / Öneri Bekliyorum",
};

export const WATER_SOURCE_LABELS: Record<string, string> = {
  "sebeke": "Şebeke",
  "kuyu": "Kuyu",
  "havuz-golet": "Havuz / Gölet",
};

export function getLeadLabel(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "-";
  return map[key] || key.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
