/**
 * Maliyet hesaplayici: etiketler, secenekler ve bicimlendirme yardimcilari.
 * Saf modul (React yok); server component'ler ve vitest de import edebilir, bu yuzden goreli import kullanir.
 */

import { CITIES } from "../../lib/cities";
import { SCOPE_OPTIONS, type LeadSource } from "../../lib/leadFormData";
import {
  CALC_SERVICES,
  PRICED_GARDEN_ADD_ONS,
  categorySlugToCalcService,
  clampArea,
  type CalcService,
  type GardenAddOnKey,
  type HardMaterial,
  type HardShare,
  type IrrigationKind,
  type QualityTier,
} from "../../lib/priceBenchmarks";

/** Teklif formunun tek yolu: WP08 formu /talep'e tasirsa yalnizca bu sabit degisir. */
export const LEAD_FORM_PATH = "/teklif-al";
export const CALCULATOR_PATH = "/maliyet-hesapla";
/**
 * Teklif formuna giden her hesaplayici yonlendirmesinin `kaynak` degeri. Form yalnizca LEAD_SOURCES izin
 * listesindeki degerleri kabul eder; LeadSource tipi, listeden cikan bir degerin derlemede yakalanmasini saglar.
 */
export const CALCULATOR_SOURCE: LeadSource = "calculator";

export interface CalculatorPreset {
  hizmet?: CalcService;
  /** src/lib/cities.ts CITIES slug'i */
  il?: string;
  ilce?: string;
  m2?: number;
}

/** `value`, teklif formundaki RESIDENTIAL_SERVICES degeriyle aynidir. */
export interface ServiceChip {
  value: string;
  label: string;
  /** Tanimliysa bu hizmet icin fiyat motoru vardir. */
  calc?: CalcService;
}

export const SERVICE_CHIPS: readonly ServiceChip[] = [
  { value: "bahce-tasarimi", label: "Bahçe tasarımı", calc: "bahce-tasarimi" },
  { value: "sulama-sistemi", label: "Sulama sistemi", calc: "sulama-sistemi" },
  { value: "sert-zemin", label: "Sert zemin", calc: "sert-zemin" },
  { value: "bitki-agac", label: "Bitki ve ağaç dikimi" },
  { value: "havuz-cevresi", label: "Havuz çevresi" },
  { value: "bahce-bakimi", label: "Bahçe bakımı" },
];

export const NO_ESTIMATE_MESSAGE = "Bu hizmet için fiyat aralığı yok - doğrudan teklif alın";

export const TIER_OPTIONS: readonly { value: QualityTier; label: string; description: string }[] = [
  { value: "ekonomik", label: "Ekonomik", description: "Sade malzeme, sınırlı bitki çeşidi" },
  { value: "standart", label: "Standart", description: "Orta segment malzeme ve bitki çeşitliliği" },
  { value: "premium", label: "Premium", description: "Üst segment malzeme, olgun bitki, ayrıntılı işçilik" },
];

export interface AddOnOption {
  value: string;
  label: string;
  /** false ise toplama girmez, "keşifle netleşir" olarak listelenir. */
  priced: boolean;
}

/** SCOPE_OPTIONS['bahce-tasarimi'] ile birebir ayni anahtarlar ve etiketler. */
export const GARDEN_ADD_ONS: readonly AddOnOption[] = SCOPE_OPTIONS["bahce-tasarimi"].map(({ value, label }) => ({
  value,
  label,
  priced: PRICED_GARDEN_ADD_ONS.includes(value as GardenAddOnKey),
}));

export const DEFAULT_GARDEN_ADD_ONS: readonly string[] = ["cim-ekimi", "bitki-agac-dikimi"];

export const HARD_SHARE_OPTIONS: readonly { value: HardShare; label: string }[] = [
  { value: "az", label: "Az (%10)" },
  { value: "orta", label: "Orta (%20)" },
  { value: "cok", label: "Çok (%35)" },
];

export const IRRIGATION_OPTIONS: readonly { value: IrrigationKind; label: string }[] = [
  { value: "damla", label: "Damla sulama" },
  { value: "yagmurlama", label: "Yağmurlama" },
  { value: "akilli", label: "Akıllı (otomasyonlu)" },
];

/** "diger": fiyatlandirilmayan malzemeler (beton baski, ahsap deck, cakil/granit...). */
export type HardMaterialChoice = HardMaterial | "diger";

export const HARD_MATERIAL_OPTIONS: readonly { value: HardMaterialChoice; label: string }[] = [
  { value: "parke-tasi", label: "Parke taşı" },
  { value: "dogal-tas", label: "Doğal taş" },
  { value: "kompozit-deck", label: "Kompozit deck" },
  { value: "diger", label: "Diğer (beton baskı, ahşap deck, çakıl…)" },
];

/** Il secimi icin Turkce alfabetik sirali liste. */
export const CITY_OPTIONS = [...CITIES].sort((a, b) => a.name.localeCompare(b.name, "tr"));

const tryFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/** 185000 -> "185.000" */
export function formatTry(value: number): string {
  return tryFormatter.format(Math.round(value));
}

/** (185000, 340000) -> "185.000 – 340.000 TL" */
export function formatTryRange(minTry: number, maxTry: number): string {
  return `${formatTry(minTry)} – ${formatTry(maxTry)} TL`;
}

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Ilce metnini temizler: kontrol karakterleri ile < > atilir, kirpilir, en fazla 40 karakter. */
export function sanitizeDistrict(value: string | undefined): string {
  return Array.from(value ?? "")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 0x1f && code !== 0x7f && char !== "<" && char !== ">";
    })
    .join("")
    .trim()
    .slice(0, 40);
}

/**
 * /maliyet-hesapla?hizmet=&il=&m2=&ilce= parametrelerini guvenli bir preset'e cevirir:
 * taninmayan her deger sessizce yok sayilir.
 */
export function parseCalculatorPreset(params: Record<string, string | string[] | undefined>): CalculatorPreset {
  const preset: CalculatorPreset = {};

  const hizmet = firstParam(params.hizmet).trim().toLowerCase();
  const service = CALC_SERVICES.find((value) => value === hizmet) ?? categorySlugToCalcService(hizmet);
  if (service) preset.hizmet = service;

  const il = firstParam(params.il).trim().toLowerCase();
  if (CITIES.some((city) => city.slug === il)) preset.il = il;

  const ilce = sanitizeDistrict(firstParam(params.ilce));
  if (ilce) preset.ilce = ilce;

  const m2 = Number(firstParam(params.m2));
  if (Number.isFinite(m2) && m2 > 0) preset.m2 = clampArea(preset.hizmet ?? "bahce-tasarimi", m2);

  return preset;
}
