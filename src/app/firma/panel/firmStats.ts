import { callRpc } from "./rpc";

export interface FirmEventCounts {
  profile_view: number;
  call_click: number;
  whatsapp_click: number;
  quote_click: number;
  website_click: number;
}

export interface FirmDailyPoint {
  d: string;
  profile_view: number;
  call_click: number;
  whatsapp_click: number;
  quote_click: number;
}

export interface FirmEventStats {
  /** Sayacın ilk kaydı (tüm tablo); firmaya özel değildir. */
  tracking_since: string | null;
  days: number;
  current: FirmEventCounts;
  previous: FirmEventCounts;
  daily: FirmDailyPoint[];
}

export interface FounderSlots {
  cap: number;
  taken: number;
  remaining: number;
}

export interface BannerStatsRow {
  banner_id: string;
  title: string;
  placement: string;
  views: number;
  clicks: number;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toCounts(raw: unknown): FirmEventCounts {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    profile_view: num(r.profile_view),
    call_click: num(r.call_click),
    whatsapp_click: num(r.whatsapp_click),
    quote_click: num(r.quote_click),
    website_click: num(r.website_click),
  };
}

/** Karşılaşılan iletişim tıklamaları: arama + WhatsApp + teklif talebi. */
export function contactClicks(counts: FirmEventCounts): number {
  return counts.call_click + counts.whatsapp_click + counts.quote_click;
}

/** Arama ve WhatsApp tıklamaları (Pro sayfasındaki değer cümlesi için). */
export function callOrWhatsappClicks(counts: FirmEventCounts): number {
  return counts.call_click + counts.whatsapp_click;
}

export function hasAnyEvent(counts: FirmEventCounts): boolean {
  return Object.values(counts).some((value) => value > 0);
}

/**
 * Firmanın son `days` günlük sayaçları (rpc get_firm_event_stats). RPC yoksa (migration
 * uygulanmadı) veya hata verirse null döner; çağıran taraf bloğu sessizce gizler.
 */
export async function fetchFirmEventStats(firmId: string, days: number): Promise<FirmEventStats | null> {
  const { data, error } = await callRpc<Record<string, unknown>>("get_firm_event_stats", {
    p_firm_id: firmId,
    p_days: days,
  });
  if (error || !data) {
    if (error) console.warn("[firma] profil istatistikleri alınamadı:", error.code ?? error.message);
    return null;
  }

  const daily = Array.isArray(data.daily) ? (data.daily as Record<string, unknown>[]) : [];
  return {
    tracking_since: typeof data.tracking_since === "string" ? data.tracking_since : null,
    days: num(data.days) || days,
    current: toCounts(data.current),
    previous: toCounts(data.previous),
    daily: daily.map((row) => ({
      d: String(row.d ?? ""),
      profile_view: num(row.profile_view),
      call_click: num(row.call_click),
      whatsapp_click: num(row.whatsapp_click),
      quote_click: num(row.quote_click),
    })),
  };
}

/** Kurucu Üye kontenjanı (rpc get_founder_slots). Hata veya eksik RPC: null (sayı gösterilmez). */
export async function fetchFounderSlots(cap?: number): Promise<FounderSlots | null> {
  const { data, error } = await callRpc<Record<string, unknown>>(
    "get_founder_slots",
    cap === undefined ? undefined : { p_cap: cap },
  );
  if (error || !data) return null;

  const total = Number(data.cap);
  const taken = Number(data.taken);
  const remaining = Number(data.remaining);
  if (![total, taken, remaining].every(Number.isFinite)) return null;
  return { cap: total, taken, remaining: Math.max(0, remaining) };
}

/** Firmanın kendi sponsor bannerlarının raporu (rpc get_my_banner_stats). Hata: boş liste. */
export async function fetchMyBannerStats(days: number): Promise<BannerStatsRow[]> {
  const { data, error } = await callRpc<Record<string, unknown>[]>("get_my_banner_stats", { p_days: days });
  if (error || !Array.isArray(data)) return [];

  return data.map((row) => ({
    banner_id: String(row.banner_id ?? ""),
    title: String(row.title ?? ""),
    placement: String(row.placement ?? ""),
    views: num(row.views),
    clicks: num(row.clicks),
  }));
}
