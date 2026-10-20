import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/withTimeout';

export interface PublicStats {
  firmCount: number;
  cityCount: number;
  claimedCount: number;
  approvedReviewCount: number;
  /** null while the public counter RPC is missing, unavailable, or called in the browser. */
  leads30d: number | null;
  /** ISO timestamp of the moment the numbers were read. */
  asOf: string;
}

export type PublicStatKey = 'firms' | 'cities' | 'claimed' | 'reviews' | 'leads30d';

export interface PublicStatItem {
  key: PublicStatKey;
  value: number;
  label: string;
}

/** Below these values a number looks like a weakness, so the stat stays hidden. */
export const STAT_MIN_VISIBLE = { claimed: 10, reviews: 10, leads30d: 25 } as const;

/** Single source for the real support contact (WhatsApp line and e-mail). */
export const SUPPORT_CONTACT = {
  whatsappE164: '905345957147',
  whatsappDisplay: '+90 534 595 71 47',
  email: 'bilgi@peyzajbul.com',
} as const;

export function supportWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${SUPPORT_CONTACT.whatsappE164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

const QUERY_TIMEOUT_MS = 4000;
const CITY_PAGE_SIZE = 1000;
const CITY_MAX_PAGES = 5;
const REVALIDATE_SECONDS = 3600;
const BROWSER_CACHE_MS = 10 * 60 * 1000;

let client: SupabaseClient | null = null;
let browserCache: { at: number; stats: PublicStats } | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: REVALIDATE_SECONDS } } as RequestInit),
    },
  });
  return client;
}

async function countFirms(db: SupabaseClient, claimedOnly: boolean): Promise<number | null> {
  try {
    const { count, error } = await withTimeout(async (signal) => {
      let query = db
        .from('firms')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', true)
        .eq('is_active', true);
      if (claimedOnly) query = query.eq('is_claimed', true);
      return await query.abortSignal(signal);
    }, QUERY_TIMEOUT_MS);
    return error || count === null ? null : count;
  } catch {
    return null;
  }
}

async function countDistinctCities(db: SupabaseClient): Promise<number> {
  const cities = new Set<string>();
  try {
    for (let page = 0; page < CITY_MAX_PAGES; page++) {
      const from = page * CITY_PAGE_SIZE;
      const { data, error } = await withTimeout(
        async (signal) =>
          await db
            .from('firms')
            .select('city')
            .eq('is_approved', true)
            .eq('is_active', true)
            .order('id')
            .range(from, from + CITY_PAGE_SIZE - 1)
            .abortSignal(signal),
        QUERY_TIMEOUT_MS
      );
      if (error || !data) return 0;
      for (const row of data) {
        const city = typeof row.city === 'string' ? row.city.trim().toLocaleLowerCase('tr-TR') : '';
        if (city) cities.add(city);
      }
      if (data.length < CITY_PAGE_SIZE) break;
    }
  } catch {
    return 0;
  }
  return cities.size;
}

async function countApprovedReviews(db: SupabaseClient): Promise<number> {
  try {
    const { count, error } = await withTimeout(
      async (signal) =>
        await db
          .from('firm_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('is_approved', true)
          .abortSignal(signal),
      QUERY_TIMEOUT_MS
    );
    return error || count === null ? 0 : count;
  } catch {
    return 0;
  }
}

/**
 * Lead counter. The leads table is not publicly readable, so this only works once a
 * SECURITY DEFINER function exists; until then (and in the browser) it stays null and hidden.
 */
async function countLeadsLast30Days(db: SupabaseClient): Promise<number | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const { data, error } = await withTimeout(
      async (signal) => await db.rpc('public_lead_count_30d').abortSignal(signal),
      QUERY_TIMEOUT_MS
    );
    if (error || typeof data !== 'number' || !Number.isFinite(data) || data < 0) return null;
    return data;
  } catch {
    return null;
  }
}

/** Live public counters from the anon client. Never throws; null when firms cannot be counted. */
export async function getPublicStats(): Promise<PublicStats | null> {
  const inBrowser = typeof window !== 'undefined';
  if (inBrowser && browserCache && Date.now() - browserCache.at < BROWSER_CACHE_MS) {
    return browserCache.stats;
  }

  try {
    const db = getClient();
    if (!db) return null;

    const [firmCount, cityCount, claimedCount, approvedReviewCount, leads30d] = await Promise.all([
      countFirms(db, false),
      countDistinctCities(db),
      countFirms(db, true),
      countApprovedReviews(db),
      countLeadsLast30Days(db),
    ]);
    if (firmCount === null) return null;

    const stats: PublicStats = {
      firmCount,
      cityCount,
      claimedCount: claimedCount ?? 0,
      approvedReviewCount,
      leads30d,
      asOf: new Date().toISOString(),
    };
    if (inBrowser) browserCache = { at: Date.now(), stats };
    return stats;
  } catch {
    return null;
  }
}

/** Stats worth showing: small numbers are hidden instead of advertised. */
export function visibleStatItems(s: PublicStats): PublicStatItem[] {
  const items: PublicStatItem[] = [];
  if (s.firmCount > 0) {
    items.push({ key: 'firms', value: s.firmCount, label: 'Rehberde listelenen firma' });
  }
  if (s.cityCount > 0) {
    items.push({ key: 'cities', value: s.cityCount, label: 'İlde firma kaydı' });
  }
  if (s.claimedCount >= STAT_MIN_VISIBLE.claimed) {
    items.push({ key: 'claimed', value: s.claimedCount, label: 'Sahiplenilmiş profil' });
  }
  if (s.approvedReviewCount >= STAT_MIN_VISIBLE.reviews) {
    items.push({ key: 'reviews', value: s.approvedReviewCount, label: 'Onaylı değerlendirme' });
  }
  if (s.leads30d !== null && s.leads30d >= STAT_MIN_VISIBLE.leads30d) {
    items.push({ key: 'leads30d', value: s.leads30d, label: 'Son 30 günde iletilen talep' });
  }
  return items;
}

const AS_OF_FORMAT = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatAsOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : AS_OF_FORMAT.format(date);
}
