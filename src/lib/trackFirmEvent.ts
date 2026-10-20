import { useEffect } from 'react';

/**
 * Tarayıcı tarafı sayaçlar: profil görüntüleme, iletişim tıklamaları ve banner gösterimi.
 * Olaylar POST /api/track ucuna gider (src/app/api/track/route.ts); uç botları ve yabancı
 * kökenleri eler, ziyaretçiyi günlük dönen tuzlu özetle sayar. Hiçbir çerez kullanılmaz.
 *
 * - Oturum içinde aynı (id, tür) ikilisi yalnızca bir kez gönderilir (sessionStorage).
 * - Bir tarayıcıda localStorage `pz_no_track` = '1' ise hiçbir şey gönderilmez. Bu bayrak,
 *   sayaç çağıran herhangi bir sayfa (ör. bir firma profili) `?notrack=1` ile açılınca kurulur;
 *   `?notrack=0` kaldırır. Sahip ve yöneticiler kendi ziyaretlerini böyle istatistikten çıkarır.
 * - Hatalar yutulur: sayaç sayfayı asla bozmaz.
 *
 * BAĞLANMASI GEREKEN ÇAĞRILAR (bu paket bu dosyaları düzenlemez):
 *
 *   WP19, src/components/FirmDetailContent.tsx
 *     useTrackProfileView(firm.id)                      bileşen mount olduğunda
 *     trackFirmEvent(firm.id, 'call_click')             'Telefonu Göster' düğmesi VE tel: bağlantısı
 *     trackFirmEvent(firm.id, 'whatsapp_click')         wa.me bağlantısı
 *     trackFirmEvent(firm.id, 'quote_click')            'Bu Firmadan Teklif Al'
 *     trackFirmEvent(firm.id, 'website_click')          web sitesi bağlantısı
 *
 *   WP10 isterse FirmCard içinde de trackFirmEvent kullanabilir.
 *   Banner gösterim/tıklamaları src/components/BannerAd.tsx içinde zaten trackBannerEvent kullanır.
 */

export type FirmEventType =
  | 'profile_view'
  | 'call_click'
  | 'whatsapp_click'
  | 'quote_click'
  | 'website_click';

export type BannerEventType = 'view' | 'click';

const TRACK_ENDPOINT = '/api/track';
const NO_TRACK_KEY = 'pz_no_track';
const UTM_MAX_LENGTH = 64;

function readStorage(storage: 'local' | 'session', key: string): string | null {
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: 'local' | 'session', key: string, value: string | null): void {
  try {
    const target = storage === 'local' ? window.localStorage : window.sessionStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    // Depolama kapalı olabilir (gizli pencere, engelli site verisi).
  }
}

/** `?notrack=1` bayrağı kurar, `?notrack=0` kaldırır; bayrak varsa true döner. */
function trackingDisabled(): boolean {
  const flag = new URLSearchParams(window.location.search).get('notrack');
  if (flag === '1') writeStorage('local', NO_TRACK_KEY, '1');
  if (flag === '0') writeStorage('local', NO_TRACK_KEY, null);
  return readStorage('local', NO_TRACK_KEY) === '1';
}

/** Aynı oturumda aynı olay ikinci kez gönderilmez. true = gönderilebilir. */
function claimSessionSlot(id: string, type: string): boolean {
  const key = `pz_ev_${id}_${type}`;
  if (readStorage('session', key)) return false;
  writeStorage('session', key, '1');
  return true;
}

function send(payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(TRACK_ENDPOINT, new Blob([body], { type: 'application/json' }));
      if (queued) return;
    }
    void fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined);
  } catch {
    // Sayaç çağrısı kullanıcı akışını asla bozmaz.
  }
}

function readUtm(): { source?: string; medium?: string; campaign?: string } | undefined {
  const params = new URLSearchParams(window.location.search);
  const utm: { source?: string; medium?: string; campaign?: string } = {};
  for (const key of ['source', 'medium', 'campaign'] as const) {
    const value = params.get(`utm_${key}`)?.trim();
    if (value) utm[key] = value.slice(0, UTM_MAX_LENGTH);
  }
  return Object.keys(utm).length > 0 ? utm : undefined;
}

/** Firma profili olayı (görüntüleme veya iletişim tıklaması). */
export function trackFirmEvent(firmId: string, type: FirmEventType): void {
  if (typeof window === 'undefined' || !firmId) return;
  if (trackingDisabled() || !claimSessionSlot(firmId, type)) return;

  const utm = readUtm();
  send({
    kind: 'firm',
    firm_id: firmId,
    type,
    path: window.location.pathname.slice(0, 200),
    ...(utm ? { utm } : {}),
  });
}

/** Banner gösterimi veya tıklaması. */
export function trackBannerEvent(bannerId: string, type: BannerEventType): void {
  if (typeof window === 'undefined' || !bannerId) return;
  if (trackingDisabled() || !claimSessionSlot(bannerId, type)) return;

  send({ kind: 'banner', banner_id: bannerId, type });
}

/** Firma sayfası mount olduğunda bir kez `profile_view` gönderir. */
export function useTrackProfileView(firmId: string | null | undefined): void {
  useEffect(() => {
    if (firmId) trackFirmEvent(firmId, 'profile_view');
  }, [firmId]);
}
