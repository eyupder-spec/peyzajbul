/**
 * Write-time check for firms.google_maps_url, shared by the firm owner's landing editor and the admin firm dialog.
 *
 * The render side (getSafeMapEmbedUrl / getHttpUrl in components/premium-landing/PremiumLandingPage.tsx) stays the
 * enforcement: it only lets Google embed addresses into an iframe and shows everything else as a plain link. This check
 * keeps unusable values (javascript:, data:, http:, pasted iframe markup, unbounded text) out of the table in the first
 * place, so the stored value is always a single https:// address.
 */

export const MAX_MAP_URL_LENGTH = 2048;

export type MapUrlCheck = { ok: true; url: string | null } | { ok: false; message: string };

const INVALID_MESSAGE = "Geçerli bir harita adresi girin (örn. https://www.google.com/maps/embed?...).";

/**
 * "" clears the field (url: null). Anything else must be one https:// address without spaces or credentials;
 * the returned url is the trimmed input.
 */
export function validateMapUrl(input: string | null | undefined): MapUrlCheck {
  const value = input ?? "";
  if (value === "") return { ok: true, url: null };

  const raw = value.trim();
  if (raw === "") {
    return { ok: false, message: "Harita adresi yalnızca boşluklardan oluşamaz. Alanı boş bırakın veya https:// ile başlayan bir adres yazın." };
  }
  if (raw.length > MAX_MAP_URL_LENGTH) {
    return { ok: false, message: `Harita adresi çok uzun (en fazla ${MAX_MAP_URL_LENGTH} karakter).` };
  }
  if (/<\s*iframe/i.test(raw)) {
    return { ok: false, message: 'Harita kodunun tamamını değil, yalnızca src="..." içindeki https:// adresini yapıştırın.' };
  }
  if (!/^https:\/\//i.test(raw)) {
    return { ok: false, message: "Harita adresi https:// ile başlamalıdır." };
  }
  if (/\s/.test(raw)) return { ok: false, message: INVALID_MESSAGE };

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
      return { ok: false, message: INVALID_MESSAGE };
    }
  } catch {
    return { ok: false, message: INVALID_MESSAGE };
  }

  return { ok: true, url: raw };
}
