// Turkish mobile number handling. Pure module.
//
// Must stay behaviourally identical to normalizeTrMobile / toWhatsAppNumber in
// src/lib/leadRouting.ts (phone.test.ts runs the same fixtures against both).

/**
 * Normalises a Turkish mobile number to "05XXXXXXXXX".
 * Accepts +90 / 0090 / 90 / 0 prefixes and spaces, dashes, dots or brackets as separators.
 * Returns null for landlines, short numbers and anything containing letters.
 */
export function normalizeTrMobile(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || !/^[\d\s+().-]+$/.test(value)) return null;

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0090")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("90") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  return /^5\d{9}$/.test(digits) ? `0${digits}` : null;
}

/** "905XXXXXXXXX" for wa.me links, or null when the number is not a Turkish mobile. */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  const normalized = normalizeTrMobile(raw);
  return normalized ? `90${normalized.slice(1)}` : null;
}
