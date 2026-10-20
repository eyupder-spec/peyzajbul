import { hasAnalyticsConsent } from "@/lib/consent";

const STORAGE_KEY = "pb_vid";

let pageLoadId: string | null = null;

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.padEnd(16, "0");
  }
}

function pageLoadVisitorId(): string {
  pageLoadId ??= randomId();
  return pageLoadId;
}

/**
 * Tahmin kaydi icin anonim ziyaretci kimligi. Kalici kimlik (localStorage 'pb_vid') yalnizca analitik izni
 * verildiyse kullanilir; izin yoksa (veya depolama erisilemezse: gizli pencere, engelli site verisi) yalnizca
 * sayfa yuklemesi boyunca gecerli, ziyaretler arasinda eslestirilemeyen rastgele bir kimlik doner ve daha once
 * kaydedilmis kalici kimlik silinir. Kisisel veri icermez.
 */
export function getVisitorId(): string {
  try {
    if (!hasAnalyticsConsent()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return pageLoadVisitorId();
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && stored.length >= 8 && stored.length <= 64) return stored;
    const created = randomId();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return pageLoadVisitorId();
  }
}
