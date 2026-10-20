import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseTrackBody, type TrackPayload } from './schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Profil/banner sayaç ucu. Her zaman 204 döner (yalnızca şema hatasında 400), sayfa asla bozulmaz.
 *
 * Gizlilik: ham IP ve User-Agent saklanmaz ve loglanmaz. Ziyaretçi, günlük dönen tuzlu bir
 * SHA-256 özetinin ilk 32 hex karakteriyle temsil edilir; günler arası eşleştirilemez.
 * Gerekli ortam değişkenleri (yalnızca sunucu): SUPABASE_SERVICE_ROLE_KEY, TRACK_SALT.
 * Eksikse uç hiçbir şey kaydetmeden 204 döner.
 *
 * Sayaç şişirme: User-Agent istemci tarafından serbestçe seçilir, bu yüzden visitor_hash tek başına
 * tekrar sayımı sınırlamaz. Bunun için User-Agent'a bağlı olmayan ikinci bir özet (ip_hash) da
 * gönderilir ve record_* RPC'leri IP başına tavan uygular (Vercel x-forwarded-for değerini kendisi yazar).
 * Sayılar gösterge niteliğindedir; denetlenmiş veri olarak sunulmamalıdır.
 */

// src/middleware.ts eşleştiricisi /api yolunu dışarıda bıraktığı için bot süzgeci yalnızca burada çalışır.
// Googlebot JavaScript çalıştırır; bu süzgeç olmadan tarayıcı trafiği istatistiği şişirir.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|curl|wget|python|node-fetch|axios/i;

const DEFAULT_SITE_URL = 'https://www.peyzajbul.com';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const NO_STORE = { 'Cache-Control': 'no-store' };

const noContent = () => new Response(null, { status: 204, headers: NO_STORE });
const badRequest = () => new Response(null, { status: 400, headers: NO_STORE });

const warned = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[track] ${message}`);
}

function allowedHosts(): Set<string> {
  const hosts = new Set<string>(LOCAL_HOSTS);
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).hostname;
    const bare = host.replace(/^www\./, '');
    hosts.add(bare);
    hosts.add(`www.${bare}`);
  } catch {
    // Geçersiz site adresi: yalnızca yerel adresler kabul edilir.
  }
  return hosts;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  try {
    return allowedHosts().has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

const ISTANBUL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dailyHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

/** Aynı kişiyi gün içinde tekrar saymamak için: tuz + gün + IP + User-Agent. */
function visitorHash(salt: string, ip: string, userAgent: string): string {
  return dailyHash(`${salt}|${ISTANBUL_DAY.format(new Date())}|${ip}|${userAgent}`);
}

/** IP başına tavan için: User-Agent içermez, bu yüzden User-Agent değiştirerek aşılamaz. */
function ipHash(salt: string, ip: string): string {
  return dailyHash(`ip|${salt}|${ISTANBUL_DAY.format(new Date())}|${ip}`);
}

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    warnOnce('service-key', 'SUPABASE_SERVICE_ROLE_KEY is not set; tracking is disabled');
    return null;
  }
  adminClient ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

/** Sorgu/parça kısmı ve kontrol karakterleri atılır; yalnızca yol kaydedilir. */
function cleanPath(path: string | undefined): string | null {
  if (!path) return null;
  const pathOnly = Array.from(path.split(/[?#]/)[0])
    .filter((char) => char.charCodeAt(0) > 31)
    .join('');
  return pathOnly ? pathOnly.slice(0, 200) : null;
}

async function record(client: SupabaseClient, payload: TrackPayload, visitor: string, ip: string): Promise<void> {
  const { error } =
    payload.kind === 'firm'
      ? await client.rpc('record_firm_event', {
          p_firm_id: payload.firm_id,
          p_event_type: payload.type,
          p_visitor_hash: visitor,
          p_source_path: cleanPath(payload.path),
          p_utm_source: payload.utm?.source ?? null,
          p_utm_medium: payload.utm?.medium ?? null,
          p_utm_campaign: payload.utm?.campaign ?? null,
          p_ip_hash: ip,
        })
      : await client.rpc('record_banner_event', {
          p_banner_id: payload.banner_id,
          p_event_type: payload.type,
          p_visitor_hash: visitor,
          p_ip_hash: ip,
        });

  if (error) warnOnce(`rpc-${payload.kind}`, `${payload.kind} event was not recorded (${error.code ?? 'rpc error'})`);
}

export async function POST(req: Request): Promise<Response> {
  try {
    if (!isAllowedOrigin(req.headers.get('origin'))) return noContent();

    const userAgent = req.headers.get('user-agent') ?? '';
    if (!userAgent || BOT_PATTERN.test(userAgent)) return noContent();

    const parsed = parseTrackBody(await req.text());
    if (!parsed.success) return badRequest();

    const salt = process.env.TRACK_SALT;
    if (!salt) {
      warnOnce('salt', 'TRACK_SALT is not set; tracking is disabled');
      return noContent();
    }

    const client = getAdminClient();
    if (!client) return noContent();

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
    await record(client, parsed.data, visitorHash(salt, ip, userAgent), ipHash(salt, ip));
  } catch {
    // Sayaç hiçbir koşulda sayfayı veya kullanıcıyı etkilemez.
  }
  return noContent();
}
