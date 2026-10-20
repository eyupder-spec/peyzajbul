/**
 * Çerez onayı (Google Consent Mode v2). Bu dosya framework'ten bağımsızdır (react import'u yok):
 * server component olan layout.tsx, CONSENT_BOOTSTRAP_SCRIPT sabitini buradan alır.
 */

export const CONSENT_STORAGE_KEY = "pb_consent";
export const CONSENT_POLICY_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 365;
export const CONSENT_OPEN_EVENT = "peyzajbul:consent-open";
// Çerez politikası sayfasındaki "tercihleri değiştir" düğmesinin gönderdiği ad; banner ikisini de dinler.
export const CONSENT_OPEN_EVENT_ALIAS = "open-consent-settings";
export const CONSENT_CHANGE_EVENT = "peyzajbul:consent-change";
export const GA_MEASUREMENT_ID = "G-4R16SQXM7B";
export const PRIVACY_POLICY_PATH = "/gizlilik-politikasi";
// Ayrı bir çerez politikası sayfası yayınlanana kadar çerez bilgilendirmesi gizlilik politikasına bağlanır.
// Sayfa yayınlandığında yalnızca bu değer "/cerez-politikasi" yapılır; banner ve footer kendiliğinden uyum sağlar.
export const COOKIE_POLICY_PATH: string = PRIVACY_POLICY_PATH;
export const HAS_COOKIE_POLICY_PAGE = COOKIE_POLICY_PATH !== PRIVACY_POLICY_PATH;

export type ConsentState = { v: number; analytics: boolean; ts: string };

const DAY_MS = 24 * 60 * 60 * 1000;

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

// localStorage erişilemezse (gizli pencere, engelli site verisi) seçim oturum boyunca bellekte tutulur.
let memoryConsent: ConsentState | null = null;

function isConsentState(value: unknown): value is ConsentState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.v === "number" &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.ts === "string"
  );
}

function isCurrent(consent: ConsentState): boolean {
  if (consent.v !== CONSENT_POLICY_VERSION) return false;
  const age = Date.now() - Date.parse(consent.ts);
  return Number.isFinite(age) && age <= CONSENT_MAX_AGE_DAYS * DAY_MS;
}

/** Kayıtlı geçerli seçimi döndürür; yoksa, bozuksa, sürümü eskiyse veya 365 günden eskiyse null (yeniden sorulur). */
export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  let stored: ConsentState | null = null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    stored = isConsentState(parsed) ? parsed : null;
  } catch {
    stored = null;
  }
  const consent = stored ?? memoryConsent;
  return consent && isCurrent(consent) ? consent : null;
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

/** Google Analytics çerezlerini (_ga, _ga_*, _gid, _gat*) host ve üst alan adları üzerinde siler. */
export function purgeAnalyticsCookies(): void {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0].trim())
    .filter((name) => name === "_ga" || name === "_gid" || name.startsWith("_ga_") || name.startsWith("_gat"));
  if (names.length === 0) return;

  const hostname = window.location.hostname;
  const labels = hostname.split(".");
  const domains: (string | undefined)[] = [undefined, hostname];
  for (let i = 0; i <= labels.length - 2; i += 1) {
    domains.push(`.${labels.slice(i).join(".")}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}; SameSite=Lax`;
    }
  }
}

export function writeConsent(analytics: boolean): void {
  if (typeof window === "undefined") return;
  const consent: ConsentState = { v: CONSENT_POLICY_VERSION, analytics, ts: new Date().toISOString() };
  memoryConsent = consent;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Depolama kullanılamıyor: seçim yalnızca bu oturum için bellekte kalır.
  }

  const { gtag } = window as GtagWindow;
  if (typeof gtag === "function") {
    gtag("consent", "update", { analytics_storage: analytics ? "granted" : "denied" });
  }
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = !analytics;
  if (!analytics) purgeAnalyticsCookies();

  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/**
 * ES5 satır içi betik (layout'ta beforeInteractive): dataLayer/gtag'i tanımlar, tüm izinleri varsayılan
 * olarak reddeder ve yalnızca geçerli bir analytics:true kaydı varsa analytics_storage'ı açar.
 */
export const CONSENT_BOOTSTRAP_SCRIPT = `(function(){window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});try{var raw=window.localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)});if(raw){var c=JSON.parse(raw);var t=c&&typeof c.ts==='string'?Date.parse(c.ts):NaN;if(c&&c.v===${CONSENT_POLICY_VERSION}&&c.analytics===true&&t===t&&Date.now()-t<=${CONSENT_MAX_AGE_DAYS * DAY_MS}){window.gtag('consent','update',{analytics_storage:'granted'});}}}catch(e){}})();`;
