/**
 * Hesaplayici -> teklif formu on doldurma ve atif sozlesmesi.
 *
 * Hesaplayici CTA'si LEAD_FORM_PATH'e (calcOptions.ts) asagidaki sorgu
 * parametreleriyle gider. Yalnizca src/lib/leadFormData.ts sabitlerindeki gecerli degerler uretilir:
 *
 *   hizmet   RESIDENTIAL_SERVICES.value        (bahce-tasarimi | sulama-sistemi | sert-zemin | ...)
 *   alan     RESIDENTIAL_AREA_SIZES.value      (toAreaBucket)
 *   butce    RESIDENTIAL_BUDGETS.value         (toBudgetBucket(midTry)); tahmin yoksa gonderilmez
 *   il       TURKISH_CITIES girdisi            (CITIES slug'indan, aksan/buyuk-kucuk harf bagimsiz eslesir)
 *   ilce     serbest metin, en fazla 40 karakter
 *   kapsam   SCOPE_OPTIONS[hizmet] degerleri, virgulle ayrilmis
 *   sulama   IRRIGATION_SYSTEM_OPTIONS.value   (akilli -> yagmurlama)
 *   not      en fazla 300 karakter (tahmin ozeti)
 *   kaynak   'calculator'                      (LEAD_SOURCES izin listesindeki deger, CALCULATOR_SOURCE)
 *   est      estimates.token (16 karakter), yalnizca save_estimate basarili olduysa
 *
 * SOZLESME (diger paketler icin):
 *   - WP08 (teklif formu): bu parametreleri LeadFormData'ya okur (hizmet->serviceType, alan->areaSize,
 *     butce->budget, il->city, ilce->district, kapsam->scope[], sulama->irrigationSystem, not->notes),
 *     kaynak'i LEAD_SOURCES ile eslestirir ve est degerini create-lead govdesine tasir.
 *   - WP05 (create-lead): kaynak ve est degerlerini kabul edip lead kaydina yazar ve OTP dogrulamasindan
 *     SONRA service role ile public.link_lead_artifacts(lead_id, est) cagirir.
 * Okuyucu henuz yoksa form bos acilir; hesaplayici yine de calisir.
 */

import { CITIES } from "../../lib/cities";
import { IRRIGATION_SYSTEM_OPTIONS, SCOPE_OPTIONS, TURKISH_CITIES } from "../../lib/leadFormData";
import {
  PRICE_BENCHMARKS_UPDATED_LABEL,
  clampArea,
  toAreaBucket,
  toBudgetBucket,
  type CalcInputs,
  type EstimateResult,
  type IrrigationKind,
} from "../../lib/priceBenchmarks";
import { CALCULATOR_SOURCE, TIER_OPTIONS, formatTry, sanitizeDistrict } from "./calcOptions";

const FOLD_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  I: "i",
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
  â: "a",
  Â: "a",
  î: "i",
  Î: "i",
  û: "u",
  Û: "u",
};

/** Aksan ve buyuk/kucuk harf farkini siler: "Hakkâri", "HAKKARI" ve "hakkari" ayni cikar. */
export function foldTurkish(text: string): string {
  return text.replace(/[ıİIçÇğĞöÖşŞüÜâÂîÎûÛ]/g, (char) => FOLD_MAP[char] ?? char).toLowerCase();
}

/** CITIES slug'ini teklif formunun TURKISH_CITIES yazimina cevirir; eslesme yoksa undefined. */
export function resolveLeadFormCity(citySlug: string): string | undefined {
  const city = CITIES.find((entry) => entry.slug === citySlug);
  if (!city) return undefined;
  const folded = foldTurkish(city.name);
  return TURKISH_CITIES.find((name) => foldTurkish(name) === folded);
}

const IRRIGATION_TO_LEAD: Record<IrrigationKind, string> = {
  damla: "damla",
  yagmurlama: "yagmurlama",
  akilli: "yagmurlama",
};

export const ESTIMATE_TOKEN_PATTERN = /^[a-z0-9]{16}$/i;

function scopeValues(inputs: CalcInputs): string[] {
  const allowed = SCOPE_OPTIONS[inputs.service]?.map((option) => option.value) ?? [];
  if (inputs.service === "bahce-tasarimi") {
    return allowed.filter((value) => inputs.addOns.includes(value));
  }
  if (inputs.service === "sert-zemin" && inputs.hardMaterial && allowed.includes(inputs.hardMaterial)) {
    return [inputs.hardMaterial];
  }
  return [];
}

function irrigationValue(inputs: CalcInputs): string | undefined {
  const usesIrrigation =
    inputs.service === "sulama-sistemi" || (inputs.service === "bahce-tasarimi" && inputs.addOns.includes("sulama-sistemi"));
  if (!usesIrrigation) return undefined;
  const value = IRRIGATION_TO_LEAD[inputs.irrigation ?? "yagmurlama"];
  return IRRIGATION_SYSTEM_OPTIONS.some((option) => option.value === value) ? value : undefined;
}

function buildNote(inputs: CalcInputs, result: EstimateResult): string {
  const tier = TIER_OPTIONS.find((option) => option.value === inputs.tier)?.label ?? "Standart";
  return `Maliyet hesaplayıcı tahmini: ${formatTry(result.minTry)}-${formatTry(result.maxTry)} TL (${PRICE_BENCHMARKS_UPDATED_LABEL}, editoryal). Kalite: ${tier}.`.slice(0, 300);
}

/** Hesaplayici sonucundan teklif formu on doldurma parametrelerini uretir (sozlesme yukaridadir). */
export function buildLeadPrefillQuery(
  inputs: CalcInputs,
  result: EstimateResult | null,
  options: { estimateToken?: string; ilce?: string } = {},
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("hizmet", inputs.service);
  params.set("alan", toAreaBucket(clampArea(inputs.service, inputs.areaM2)));
  if (result) params.set("butce", toBudgetBucket(result.midTry));

  const city = resolveLeadFormCity(inputs.citySlug);
  if (city) params.set("il", city);
  const district = sanitizeDistrict(options.ilce);
  if (district) params.set("ilce", district);

  const scope = scopeValues(inputs);
  if (scope.length > 0) params.set("kapsam", scope.join(","));
  const irrigation = irrigationValue(inputs);
  if (irrigation) params.set("sulama", irrigation);

  if (result) params.set("not", buildNote(inputs, result));
  params.set("kaynak", CALCULATOR_SOURCE);
  if (options.estimateToken && ESTIMATE_TOKEN_PATTERN.test(options.estimateToken)) params.set("est", options.estimateToken);
  return params;
}

/** Fiyat motoru olmayan hizmetler (bitki-agac, havuz-cevresi, bahce-bakimi) icin dogrudan form baglantisi parametreleri. */
export function buildDirectLeadQuery(hizmet: string, options: { citySlug?: string; ilce?: string; areaM2?: number } = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("hizmet", hizmet);
  if (options.areaM2 !== undefined) params.set("alan", toAreaBucket(options.areaM2));
  const city = options.citySlug ? resolveLeadFormCity(options.citySlug) : undefined;
  if (city) params.set("il", city);
  const district = sanitizeDistrict(options.ilce);
  if (district) params.set("ilce", district);
  params.set("kaynak", CALCULATOR_SOURCE);
  return params;
}
