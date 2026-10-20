/**
 * Peyzajbul maliyet hesaplayici: fiyat motoru (saf TypeScript, bagimlilik yok).
 *
 * Bu dosya React, ag veya DOM kullanmaz; server component'lerden, istemciden ve vitest'ten
 * ayni sekilde import edilebilir. Arayuzdeki her TL rakami buradan hesaplanir.
 *
 * YONTEM (editoryal tahmin)
 *   Tum birim fiyatlar Peyzajbul rehber yazilarindan (Mart-Mayis 2026) turetilmis ve 2026 piyasa
 *   gozlemleriyle yuvarlanmis ARALIKLARDIR. Gercek firma teklifi veya sozlesme verisi DEGILDIR.
 *   Her satirin sources[] alani hangi yazidan turetildigini yazar. Kural: bir kalem icin birden fazla
 *   kaynak varsa min = alintilanan en dusuklerin minimumu, max = alintilanan en yuksek degerlerin
 *   maksimumu; aralik hicbir zaman kaynaklardan dar olmaz.
 *
 *   Rehber yazilari disaridan kaynak gostermez ve birbirleriyle tutarsizdir (ornegin sulama icin
 *   45-75 TL/m² ile 200-300 TL/m² yan yana yer alir; Istanbul "orta kapsamli" 900-1.400 TL/m² iken
 *   Izmir 200-450 TL/m² verilir). Bu yuzden motor tek bir "dogru" rakam degil, genis zarf (envelope)
 *   araliklari uretir ve sonucu "editoryal tahmin" diye etiketler. Kaynaksiz kalemler (pergola/kameriye,
 *   cit/sinir, su ogesi, bakim, havuz cevresi, ahsap deck, beton baski, cakil/granit) bilerek
 *   fiyatlandirilmaz: toplama girmez ve unpricedLabels icinde "Kesifle netlesir" diye listelenir.
 *
 *   Formul (fiyatli satir):  alan × pay × birim fiyat × kalite × bolge × boyut katsayisi
 *   Katsayilar: TIER_FACTORS (kalite), CITY_FACTOR_GROUPS (bolge; il gruplari
 *   supabase/migrations/20260320070000_dynamic_lead_pricing.sql ile ayni, Anadolu katsayisi rehber
 *   yazisindaki "%20-30 daha uygun" ifadesinden), sizeScale() / irrigationBand() (buyuk alanda m² basina
 *   maliyet duser). Kademe degerleri aralik icinde aynen kullanilir; ancak her kademe sinirindan hemen sonra
 *   katsayi kisa bir rampayla duser (ornek: 100-125 m²). Saf basamak fonksiyonunda 101 m² bahce 100 m²
 *   bahceden ucuz cikardi (alan × katsayi azalirdi); rampalar bunu onler ve toplam her zaman alanla artar.
 *
 *   Yuvarlama: min asagi, max yukari; 100.000 TL altinda 1.000, 500.000 TL altinda 5.000, ustunde
 *   10.000 TL'ye. Min hicbir zaman 1.000 TL'nin altina inmez.
 *
 * YENILEME KURALI (uc ayda bir)
 *   Birim fiyatlar guncellendiginde PRICE_BENCHMARKS_VERSION ve PRICE_BENCHMARKS_UPDATED_AT birlikte
 *   artirilir; arayuzde "Ekim 2026" gibi etiket PRICE_BENCHMARKS_UPDATED_AT'ten uretilir. Gercek
 *   teklif/lead verisi (en az 30 adet) birikince oranlar yeniden kalibre edilir ve ancak o zaman
 *   "editoryal tahmin" ifadesi degistirilir.
 */

export const PRICE_BENCHMARKS_VERSION = "2026-10-editorial-v1";
export const PRICE_BENCHMARKS_UPDATED_AT = "2026-10-20";
/** Arayuzde basilan ay etiketi (PRICE_BENCHMARKS_UPDATED_AT ile birlikte guncellenir). */
export const PRICE_BENCHMARKS_UPDATED_LABEL = "Ekim 2026";
/** Rakamlarin kaynagi: her zaman editoryal, asla 'quote' (firma teklifi) degil. */
export const PRICE_SOURCE = "editorial" as const;

export type CalcService = "bahce-tasarimi" | "sulama-sistemi" | "sert-zemin";
export type QualityTier = "ekonomik" | "standart" | "premium";
export type HardShare = "az" | "orta" | "cok";
export type IrrigationKind = "damla" | "yagmurlama" | "akilli";
export type HardMaterial = "parke-tasi" | "dogal-tas" | "kompozit-deck";

/** bahce-tasarimi add-on anahtarlari; src/lib/leadFormData.ts SCOPE_OPTIONS['bahce-tasarimi'] ile ayni. */
export const GARDEN_ADD_ON_KEYS = [
  "cim-ekimi",
  "bitki-agac-dikimi",
  "tas-ahsap-zemin",
  "pergola-kameriye",
  "cit-sinir",
  "sulama-sistemi",
  "aydinlatma",
  "su-ogesi",
] as const;
export type GardenAddOnKey = (typeof GARDEN_ADD_ON_KEYS)[number];

/** Toplama giren (kaynakli birim fiyati olan) add-on'lar; kalanlar "Keşifle netleşir" olarak listelenir. */
export const PRICED_GARDEN_ADD_ONS: readonly GardenAddOnKey[] = [
  "cim-ekimi",
  "bitki-agac-dikimi",
  "tas-ahsap-zemin",
  "sulama-sistemi",
  "aydinlatma",
];

export const CALC_SERVICES: readonly CalcService[] = ["bahce-tasarimi", "sulama-sistemi", "sert-zemin"];

export interface CalcInputs {
  service: CalcService;
  areaM2: number;
  citySlug: string;
  tier: QualityTier;
  addOns: string[];
  hardShare?: HardShare;
  irrigation?: IrrigationKind;
  hardMaterial?: HardMaterial;
}

export interface EstimateLine {
  key: string;
  label: string;
  minTry: number;
  maxTry: number;
  priced: boolean;
  note?: string;
}

export interface EstimateResult {
  minTry: number;
  maxTry: number;
  midTry: number;
  lines: EstimateLine[];
  unpricedLabels: string[];
  assumptions: string[];
  benchmarkVersion: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Kaynaklar                                                           */
/* ------------------------------------------------------------------ */

// Asagidaki etiketler rakamin izini surmek icin yazilmis betimleyici kaynak adlaridir; blog yazilarinin birebir
// basligi veya alintisi DEGILDIR. Herkese acik sayfa yalnizca PRICE_METHOD_SOURCES_LABEL'i basar. Ayrintili bir
// kaynak listesi yayinlanacaksa baslik ve tarihler once canli blogla dogrulanmalidir.
const SRC_ANTALYA = "Peyzajbul rehberi: Antalya peyzaj maliyetleri 2026 (21 Mayıs 2026)";
const SRC_IZMIR = "Peyzajbul rehberi: İzmir'de villa peyzajı yaptırmak ne kadar, fiyat analizi (2026, 500 m² örneği)";
const SRC_SULAMA = "Peyzajbul rehberi: Otomatik sulama sistemleri fiyatları 2026 (20 Mart 2026)";

/* ------------------------------------------------------------------ */
/* Birim fiyat satirlari (TL/m², standart kalite, 1. grup il, ≤300 m²)  */
/* ------------------------------------------------------------------ */

export interface BenchmarkRow {
  key: string;
  label: string;
  minPerM2: number;
  maxPerM2: number;
  /** Rakamin turetildigi Peyzajbul rehber yazilari. */
  sources: string[];
}

const ROW_HAZIRLIK: BenchmarkRow = {
  key: "hazirlik",
  label: "Zemin hazırlığı",
  minPerM2: 50,
  maxPerM2: 90,
  sources: [`${SRC_ANTALYA}: zemin hazırlığı 50-90 TL/m²`],
};

const ROW_CIM: BenchmarkRow = {
  key: "cim-ekimi",
  label: "Çim ekimi/yenileme",
  minPerM2: 200,
  maxPerM2: 600,
  sources: [`${SRC_ANTALYA}: tohum ile çim 200-350, rulo çim 400-600 TL/m²`],
};

const ROW_BITKI: BenchmarkRow = {
  key: "bitki-agac-dikimi",
  label: "Bitki ve ağaç dikimi",
  minPerM2: 120,
  maxPerM2: 400,
  sources: [`${SRC_ANTALYA}: örnek konsept bitki kalemleri, 100 m² için yaklaşık 12.000-45.000 TL'den türetildi`],
};

const ROW_TAS_AHSAP: BenchmarkRow = {
  key: "tas-ahsap-zemin",
  label: "Taş/ahşap zemin",
  minPerM2: 900,
  maxPerM2: 4500,
  sources: [`${SRC_ANTALYA}: beton parke 900-1.500, kompozit deck 2.000-3.200, doğal taş 2.500-4.500 TL/m²`],
};

const ROW_AYDINLATMA: BenchmarkRow = {
  key: "aydinlatma",
  label: "Aydınlatma",
  minPerM2: 120,
  maxPerM2: 250,
  sources: [`${SRC_ANTALYA}: aydınlatma 100 m² için 12.000-25.000 TL`],
};

const IRRIGATION_ROWS: Record<IrrigationKind, BenchmarkRow> = {
  damla: {
    key: "damla",
    label: "Damla sulama",
    minPerM2: 30,
    maxPerM2: 75,
    sources: [SRC_IZMIR, SRC_SULAMA, SRC_ANTALYA],
  },
  yagmurlama: {
    key: "yagmurlama",
    label: "Yağmurlama sulama",
    minPerM2: 50,
    maxPerM2: 120,
    sources: [SRC_IZMIR, SRC_SULAMA, SRC_ANTALYA],
  },
  akilli: {
    key: "akilli",
    label: "Akıllı (otomasyonlu) sulama",
    minPerM2: 90,
    maxPerM2: 280,
    sources: [SRC_IZMIR, SRC_SULAMA, SRC_ANTALYA],
  },
};

const HARD_MATERIAL_ROWS: Record<HardMaterial, BenchmarkRow> = {
  "parke-tasi": {
    key: "parke-tasi",
    label: "Parke taşı",
    minPerM2: 900,
    maxPerM2: 1500,
    sources: [`${SRC_ANTALYA}: beton parke 900-1.500 TL/m²`],
  },
  "dogal-tas": {
    key: "dogal-tas",
    label: "Doğal taş",
    minPerM2: 2500,
    maxPerM2: 4500,
    sources: [`${SRC_ANTALYA}: doğal taş 2.500-4.500 TL/m²`],
  },
  "kompozit-deck": {
    key: "kompozit-deck",
    label: "Kompozit deck",
    minPerM2: 2000,
    maxPerM2: 3200,
    sources: [`${SRC_ANTALYA}: kompozit deck 2.000-3.200 TL/m²`],
  },
};

/** Sulama toplam tabani (TL): alan ne kadar kucuk olursa olsun kontrol uniteli, vana ve boru isi vardir. */
const IRRIGATION_FLOOR = { minTry: 8000, maxTry: 15000 } as const;

/** Fiyati olmayan kalemler: kaynakli bir sayi yok, toplama girmez. */
const UNPRICED_GARDEN_ITEMS: { key: GardenAddOnKey; label: string }[] = [
  { key: "pergola-kameriye", label: "Pergola/kameriye" },
  { key: "cit-sinir", label: "Çit ve sınır düzenleme" },
  { key: "su-ogesi", label: "Su öğesi (fıskiye/şelale)" },
];

const UNPRICED_NOTE = "Keşifle netleşir";

/** Bahce tasarimi icinde her kalemin uygulandigi alan payi. */
const GARDEN_SHARES = {
  hazirlik: 1,
  "cim-ekimi": 0.4,
  "bitki-agac-dikimi": 0.5,
  aydinlatma: 1,
} as const;
const HARD_SHARES: Record<HardShare, number> = { az: 0.1, orta: 0.2, cok: 0.35 };

/* ------------------------------------------------------------------ */
/* Katsayilar                                                          */
/* ------------------------------------------------------------------ */

export const TIER_FACTORS: Record<QualityTier, number> = { ekonomik: 0.7, standart: 1, premium: 1.8 };

const TIER1_CITIES = ["istanbul", "izmir", "mugla"];
const TIER2_CITIES = ["ankara", "antalya", "bursa", "kocaeli"];

/** Bolge katsayilari ve gruplarin aciklamasi (sayfadaki yontem bolumu de buradan uretilir). */
export const CITY_FACTOR_GROUPS = [
  { id: "tier1", factor: 1, label: "İstanbul, İzmir, Muğla" },
  { id: "tier2", factor: 0.9, label: "Ankara, Antalya, Bursa, Kocaeli" },
  { id: "tier3", factor: 0.78, label: "Diğer iller" },
] as const;

export function cityCostFactor(slug: string): number {
  const normalized = String(slug ?? "").trim().toLowerCase();
  if (TIER1_CITIES.includes(normalized)) return CITY_FACTOR_GROUPS[0].factor;
  if (TIER2_CITIES.includes(normalized)) return CITY_FACTOR_GROUPS[1].factor;
  return CITY_FACTOR_GROUPS[2].factor;
}

function cityGroupLabel(slug: string): string {
  const factor = cityCostFactor(slug);
  return CITY_FACTOR_GROUPS.find((group) => group.factor === factor)?.label ?? CITY_FACTOR_GROUPS[2].label;
}

/** (alan, katsayi) noktalari arasinda dogrusal gecis; ilk noktanin altinda ve son noktanin ustunde sabit. */
type CurvePoint = readonly [number, number];

function interpolate(points: readonly CurvePoint[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

/**
 * Boyut katsayisi (sulama disindaki her m² satiri): ≤100 m² 1,15 · ≤300 m² 1,00 · ≤500 m² 0,92 · ≤1.000 m² 0,82 · ustu 0,72.
 * Kademe degerleri aralik icinde aynen korunur; yalnizca her sinirdan hemen sonra kisa bir gecis rampasi vardir
 * (alan × katsayi bu rampalarda da artar, bkz. dosya basligi).
 */
const SIZE_SCALE_POINTS: readonly CurvePoint[] = [
  [100, 1.15],
  [125, 1],
  [300, 1],
  [340, 0.92],
  [500, 0.92],
  [580, 0.82],
  [1000, 0.82],
  [1200, 0.72],
];

/** Sulama alan bandi katsayisi: ≤100 m² 1,3 · ≤500 m² 1,0 · ustu 0,7 (yine kisa gecis rampalariyla). */
const IRRIGATION_BAND_POINTS: readonly CurvePoint[] = [
  [100, 1.3],
  [160, 1],
  [500, 1],
  [1000, 0.7],
];

export function sizeScale(areaM2: number): number {
  return interpolate(SIZE_SCALE_POINTS, areaM2);
}

export function irrigationBand(areaM2: number): number {
  return interpolate(IRRIGATION_BAND_POINTS, areaM2);
}

/* ------------------------------------------------------------------ */
/* Alan sinirlari ve kovalar                                           */
/* ------------------------------------------------------------------ */

export function getAreaLimits(service: CalcService): { min: number; max: number } {
  if (service === "sert-zemin") return { min: 10, max: 500 };
  return { min: 30, max: 2000 };
}

export function clampArea(service: CalcService, areaM2: number): number {
  const { min, max } = getAreaLimits(service);
  const value = Number.isFinite(areaM2) ? areaM2 : min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** RESIDENTIAL_AREA_SIZES (src/lib/leadFormData.ts) degerlerinden birini dondurur. */
export function toAreaBucket(m2: number): "50-alti" | "50-150" | "150-500" | "500-1000" | "1000+" {
  if (m2 < 50) return "50-alti";
  if (m2 <= 150) return "50-150";
  if (m2 <= 500) return "150-500";
  if (m2 <= 1000) return "500-1000";
  return "1000+";
}

/** RESIDENTIAL_BUDGETS (src/lib/leadFormData.ts) degerlerinden birini dondurur. */
export function toBudgetBucket(midTry: number): "25000-alti" | "25000-75000" | "75000-200000" | "200000+" {
  if (midTry < 25000) return "25000-alti";
  if (midTry < 75000) return "25000-75000";
  if (midTry < 200000) return "75000-200000";
  return "200000+";
}

/** peyzajbul.com kategori slug'ini hesaplayici hizmetine cevirir (hizmet sayfalarina gomme icin). */
export function categorySlugToCalcService(slug: string): CalcService | undefined {
  switch (slug) {
    case "bahce-tasarimi":
      return "bahce-tasarimi";
    case "sulama-sistemleri":
      return "sulama-sistemi";
    case "sert-zemin":
      return "sert-zemin";
    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Yuvarlama                                                           */
/* ------------------------------------------------------------------ */

function roundStep(value: number): number {
  if (value < 100000) return 1000;
  if (value < 500000) return 5000;
  return 10000;
}

function floorRounded(value: number): number {
  const step = roundStep(value);
  return Math.max(1000, Math.floor(value / step) * step);
}

function ceilRounded(value: number): number {
  const step = roundStep(value);
  return Math.max(1000, Math.ceil(value / step) * step);
}

function nearestRounded(value: number): number {
  const step = roundStep(value);
  return Math.round(value / step) * step;
}

/* ------------------------------------------------------------------ */
/* Hesaplama                                                           */
/* ------------------------------------------------------------------ */

interface RawLine {
  key: string;
  label: string;
  rawMin: number;
  rawMax: number;
  note: string;
}

function formatFactor(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatPercent(share: number): string {
  return `%${Math.round(share * 100)}`;
}

const TIER_NAMES: Record<QualityTier, string> = { ekonomik: "Ekonomik", standart: "Standart", premium: "Premium" };
const HARD_SHARE_NAMES: Record<HardShare, string> = { az: "az", orta: "orta", cok: "çok" };

function isTier(value: unknown): value is QualityTier {
  return value === "ekonomik" || value === "standart" || value === "premium";
}

function isIrrigation(value: unknown): value is IrrigationKind {
  return value === "damla" || value === "yagmurlama" || value === "akilli";
}

function isHardShare(value: unknown): value is HardShare {
  return value === "az" || value === "orta" || value === "cok";
}

function isHardMaterial(value: unknown): value is HardMaterial {
  return value === "parke-tasi" || value === "dogal-tas" || value === "kompozit-deck";
}

/**
 * Tahmini hesaplar. Fiyatli bir sonuc uretilemiyorsa (bilinmeyen hizmet, ya da malzemesi
 * fiyatlandirilmayan sert zemin) null doner; arayuz bu durumda dogrudan teklif formuna yonlendirir.
 */
export function computeEstimate(inputs: CalcInputs): EstimateResult | null {
  const service = CALC_SERVICES.includes(inputs.service) ? inputs.service : null;
  if (!service) return null;

  const area = clampArea(service, inputs.areaM2);
  const tier: QualityTier = isTier(inputs.tier) ? inputs.tier : "standart";
  const tierFactor = TIER_FACTORS[tier];
  const cityFactor = cityCostFactor(inputs.citySlug);
  const scale = sizeScale(area);
  const band = irrigationBand(area);
  const addOns = new Set((Array.isArray(inputs.addOns) ? inputs.addOns : []).filter((key) => GARDEN_ADD_ON_KEYS.includes(key as GardenAddOnKey)));

  const lines: RawLine[] = [];
  const unpricedLabels: string[] = [];
  const assumptions: string[] = [];

  const sizedLine = (row: BenchmarkRow, share: number, note: string): RawLine => ({
    key: row.key,
    label: row.label,
    rawMin: area * share * row.minPerM2 * scale * tierFactor * cityFactor,
    rawMax: area * share * row.maxPerM2 * scale * tierFactor * cityFactor,
    note,
  });

  const irrigationLine = (kind: IrrigationKind): RawLine => {
    const row = IRRIGATION_ROWS[kind];
    return {
      key: "sulama-sistemi",
      label: row.label,
      rawMin: Math.max(IRRIGATION_FLOOR.minTry, area * row.minPerM2 * band * tierFactor * cityFactor),
      rawMax: Math.max(IRRIGATION_FLOOR.maxTry, area * row.maxPerM2 * band * tierFactor * cityFactor),
      note: `Alanın tamamı, ${row.minPerM2}-${row.maxPerM2} TL/m² × alan bandı katsayısı`,
    };
  };

  if (service === "bahce-tasarimi") {
    lines.push(sizedLine(ROW_HAZIRLIK, GARDEN_SHARES.hazirlik, "Alanın tamamı"));
    if (addOns.has("cim-ekimi")) {
      lines.push(sizedLine(ROW_CIM, GARDEN_SHARES["cim-ekimi"], `Alan payı ${formatPercent(GARDEN_SHARES["cim-ekimi"])}`));
    }
    if (addOns.has("bitki-agac-dikimi")) {
      lines.push(sizedLine(ROW_BITKI, GARDEN_SHARES["bitki-agac-dikimi"], `Alan payı ${formatPercent(GARDEN_SHARES["bitki-agac-dikimi"])}`));
    }
    let hardShare: HardShare = "orta";
    if (addOns.has("tas-ahsap-zemin")) {
      hardShare = isHardShare(inputs.hardShare) ? inputs.hardShare : "orta";
      lines.push(sizedLine(ROW_TAS_AHSAP, HARD_SHARES[hardShare], `Alan payı ${formatPercent(HARD_SHARES[hardShare])} (${HARD_SHARE_NAMES[hardShare]} sert zemin)`));
    }
    let irrigation: IrrigationKind = "yagmurlama";
    if (addOns.has("sulama-sistemi")) {
      irrigation = isIrrigation(inputs.irrigation) ? inputs.irrigation : "yagmurlama";
      lines.push(irrigationLine(irrigation));
    }
    if (addOns.has("aydinlatma")) {
      lines.push(sizedLine(ROW_AYDINLATMA, GARDEN_SHARES.aydinlatma, "Alanın tamamı"));
    }
    for (const item of UNPRICED_GARDEN_ITEMS) {
      if (addOns.has(item.key)) unpricedLabels.push(item.label);
    }

    assumptions.push("Zemin hazırlığı her projede hesaba katılır.");
    const shareNotes: string[] = [];
    if (addOns.has("cim-ekimi")) shareNotes.push(`çim ekimi ${formatPercent(GARDEN_SHARES["cim-ekimi"])}`);
    if (addOns.has("bitki-agac-dikimi")) shareNotes.push(`bitki ve ağaç dikimi ${formatPercent(GARDEN_SHARES["bitki-agac-dikimi"])}`);
    if (addOns.has("tas-ahsap-zemin")) shareNotes.push(`taş/ahşap zemin ${formatPercent(HARD_SHARES[hardShare])}`);
    if (shareNotes.length > 0) assumptions.push(`Bazı kalemler alanın yalnızca bir bölümüne uygulanır (alan payı): ${shareNotes.join(", ")}.`);
    if (addOns.has("sulama-sistemi")) assumptions.push(`Sulama sistemi: ${IRRIGATION_ROWS[irrigation].label.toLocaleLowerCase("tr-TR")}, toplam alana kurulur.`);
  } else if (service === "sulama-sistemi") {
    const irrigation: IrrigationKind = isIrrigation(inputs.irrigation) ? inputs.irrigation : "yagmurlama";
    lines.push(irrigationLine(irrigation));
    assumptions.push(`Sistem türü: ${IRRIGATION_ROWS[irrigation].label.toLocaleLowerCase("tr-TR")}, toplam alana kurulur.`);
  } else {
    if (!isHardMaterial(inputs.hardMaterial)) return null;
    const row = HARD_MATERIAL_ROWS[inputs.hardMaterial];
    lines.push(sizedLine(row, 1, "Kaplanacak yüzeyin tamamı"));
    lines.push(sizedLine(ROW_HAZIRLIK, 1, "Kaplanacak yüzeyin tamamı"));
    assumptions.push(`Malzeme: ${row.label.toLocaleLowerCase("tr-TR")}; alan, kaplanacak yüzeyin metrekaresidir.`);
  }

  assumptions.push(`Kalite seviyesi: ${TIER_NAMES[tier]} (katsayı ×${formatFactor(tierFactor)}).`);
  assumptions.push(`Bölge katsayısı: ×${formatFactor(cityFactor)} (${cityGroupLabel(inputs.citySlug)}).`);
  assumptions.push(
    service === "sulama-sistemi" || (service === "bahce-tasarimi" && addOns.has("sulama-sistemi"))
      ? `Alan büyüklüğü katsayısı: ×${formatFactor(scale)} (${area} m²); sulamada alan bandı katsayısı ×${formatFactor(band)}.`
      : `Alan büyüklüğü katsayısı: ×${formatFactor(scale)} (${area} m²); büyük alanlarda m² başı maliyet düşer.`,
  );
  assumptions.push("Tutarlar uygulama maliyetinin yaklaşık aralığıdır; proje/çizim bedeli ve keşifte ortaya çıkabilecek ek işler hesaba katılmamıştır, KDV durumu firmadan teyit edilmelidir.");

  const rawMin = lines.reduce((sum, line) => sum + line.rawMin, 0);
  const rawMax = lines.reduce((sum, line) => sum + line.rawMax, 0);
  const minTry = floorRounded(rawMin);
  const maxTry = Math.max(minTry, ceilRounded(rawMax));
  const midTry = Math.min(maxTry, Math.max(minTry, nearestRounded((rawMin + rawMax) / 2)));

  const pricedLines: EstimateLine[] = lines.map((line) => ({
    key: line.key,
    label: line.label,
    minTry: floorRounded(line.rawMin),
    maxTry: ceilRounded(line.rawMax),
    priced: true,
    note: line.note,
  }));
  const unpricedLines: EstimateLine[] = unpricedLabels.map((label) => {
    const item = UNPRICED_GARDEN_ITEMS.find((entry) => entry.label === label);
    return { key: item?.key ?? label, label, minTry: 0, maxTry: 0, priced: false, note: UNPRICED_NOTE };
  });

  return {
    minTry,
    maxTry,
    midTry,
    lines: [...pricedLines, ...unpricedLines],
    unpricedLabels,
    assumptions,
    benchmarkVersion: PRICE_BENCHMARKS_VERSION,
    updatedAt: PRICE_BENCHMARKS_UPDATED_AT,
  };
}

/* ------------------------------------------------------------------ */
/* Referans tablosu (/maliyet-hesapla sayfasi sunucu tarafinda basar)   */
/* ------------------------------------------------------------------ */

export interface ReferenceRow {
  key: string;
  label: string;
  /** Fiyatsiz kalemlerde undefined. */
  minTry?: number;
  maxTry?: number;
  unit: string;
  basis: string;
  sources: string[];
}

export interface ReferenceGroup {
  id: string;
  title: string;
  rows: ReferenceRow[];
}

function referenceRow(row: BenchmarkRow, basis: string): ReferenceRow {
  return { key: row.key, label: row.label, minTry: row.minPerM2, maxTry: row.maxPerM2, unit: "TL/m²", basis, sources: row.sources };
}

/** Standart kalite, 1. grup il, 100-300 m² icin birim fiyat araliklari; katsayilar ayri tabloda. */
export const REFERENCE_GROUPS: readonly ReferenceGroup[] = [
  {
    id: "bahce-tasarimi",
    title: "Bahçe tasarımı ve düzenleme",
    rows: [
      referenceRow(ROW_HAZIRLIK, "Alanın tamamı"),
      referenceRow(ROW_CIM, `Alan payı ${formatPercent(GARDEN_SHARES["cim-ekimi"])}`),
      referenceRow(ROW_BITKI, `Alan payı ${formatPercent(GARDEN_SHARES["bitki-agac-dikimi"])}`),
      referenceRow(ROW_TAS_AHSAP, `Alan payı ${formatPercent(HARD_SHARES.az)}-${formatPercent(HARD_SHARES.cok)} (az-çok)`),
      referenceRow(ROW_AYDINLATMA, "Alanın tamamı"),
    ],
  },
  {
    id: "sulama-sistemi",
    title: "Sulama sistemi",
    rows: (Object.keys(IRRIGATION_ROWS) as IrrigationKind[]).map((kind) =>
      referenceRow(IRRIGATION_ROWS[kind], "Alanın tamamı, alan bandı katsayısıyla"),
    ),
  },
  {
    id: "sert-zemin",
    title: "Sert zemin",
    rows: (Object.keys(HARD_MATERIAL_ROWS) as HardMaterial[]).map((material) =>
      referenceRow(HARD_MATERIAL_ROWS[material], "Kaplanacak yüzeyin tamamı, zemin hazırlığı ayrıca"),
    ),
  },
];

/** Kaynakli bir aralik bulunmadigi icin sayi gosterilmeyen kalemler. */
export const UNPRICED_REFERENCE_ITEMS: readonly string[] = [
  ...UNPRICED_GARDEN_ITEMS.map((item) => item.label),
  "Ahşap deck, beton/baskı beton, çakıl/granit",
  "Bahçe bakımı (periyodik)",
  "Havuz çevresi düzenleme",
];

/** Yontem bolumunde herkese acik basilan genel kaynak ifadesi (tek tek yazi basligi veya tarih icermez). */
export const PRICE_METHOD_SOURCES_LABEL = "Peyzajbul rehber yazıları (Mart-Mayıs 2026)";
