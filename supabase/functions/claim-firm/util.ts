/**
 * Pure helpers for the claim-firm function: masking, phone keys, the slug and the WhatsApp claim code.
 * No imports and no Deno globals, so otp_test.ts can run them directly.
 */

/** Claim alphabet shared with public.gen_claim_code(): no 0, 1, i, l, o. */
export const CLAIM_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** 'info@firma.com' -> 'i***@firma.com'; null when there is no local part. Mirrors public.claim_mask_email. */
export function maskEmail(email: string | null | undefined): string | null {
  const value = (email ?? "").trim();
  const at = value.indexOf("@");
  if (at < 1) return null;
  return `${value[0]}***${value.slice(at)}`;
}

/** '0532 123 45 42' -> '05** *** ** 42'; null unless the number has 11 national digits. Mirrors public.claim_mask_phone. */
export function maskPhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("90")) digits = `0${digits.slice(2)}`;
  else if (digits.length === 10) digits = `0${digits}`;
  if (digits.length !== 11) return null;
  return `${digits.slice(0, 2)}** *** ** ${digits.slice(-2)}`;
}

/** Last 10 digits of a phone number, the key used to detect a duplicate listing; null when shorter than 10 digits. */
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export function isEmailAddress(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Copy of generateFirmSlug in src/lib/firmUtils.ts: keep in sync with it. */
export function generateFirmSlug(companyName: string, id: string): string {
  const slug = companyName
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/Ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}-${id.slice(0, 8)}`;
}

/** Digits only, for a wa.me number taken from configuration. */
export function waDigits(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

/** https://wa.me/<number>?text=<text>; null when no valid number is configured. */
export function buildWaUrl(number: string | null | undefined, text: string): string | null {
  const digits = waDigits(number);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}
