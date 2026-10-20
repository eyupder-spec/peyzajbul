/**
 * Pure helpers shared by the Edge Functions.
 *
 * This file must stay free of imports and of Deno globals so it can be
 * unit-tested with vitest under Node. Auth, CORS and HTTP plumbing live in
 * auth.ts, cors.ts and http.ts.
 */

const utf8 = new TextEncoder();

/**
 * Constant-time string comparison. Both inputs are compared as UTF-8 bytes,
 * the shorter one is zero-padded and the length difference is folded into the
 * result, so neither content nor length can be probed through timing.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const x = utf8.encode(String(a ?? ""));
  const y = utf8.encode(String(b ?? ""));
  const length = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < length; i++) {
    const xi = i < x.length ? x[i] : 0;
    const yi = i < y.length ? y[i] : 0;
    diff |= xi ^ yi;
  }
  return diff === 0;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

/** Escapes & < > " ' and backtick for safe interpolation into HTML (text and attributes). */
export function escapeHtml(v: unknown): string {
  return String(v ?? "").replace(/[&<>"'`]/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Coerces a value to a trimmed string of at most `max` UTF-16 units. A
 * surrogate pair is never cut in half. null and undefined become "".
 */
export function clampText(v: unknown, max: number): string {
  const text = String(v ?? "").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, Math.max(0, max));
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

const TELEGRAM_CHAT_ID_RE = /^-?\d{5,20}$/;

/** Telegram chat ids are signed integers; groups and channels are negative. */
export function isTelegramChatId(v: unknown): v is string {
  return typeof v === "string" && TELEGRAM_CHAT_ID_RE.test(v);
}

const EXPO_PUSH_TOKEN_RE = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/;

export function isExpoPushToken(v: unknown): v is string {
  return typeof v === "string" && EXPO_PUSH_TOKEN_RE.test(v);
}

/**
 * Normalizes a Turkish mobile number to the WhatsApp form "90XXXXXXXXXX"
 * (12 digits). Accepts 05xx..., 5xx..., +90 5xx... and 90 5xx... with any
 * spacing or punctuation. Returns null for anything else, including landlines.
 */
export function normalizeTrMobile(phone: unknown): string | null {
  if (typeof phone !== "string" && typeof phone !== "number") return null;
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(2);
  if (/^905\d{9}$/.test(digits)) return digits;
  if (/^05\d{9}$/.test(digits)) return `90${digits.slice(1)}`;
  if (/^5\d{9}$/.test(digits)) return `90${digits}`;
  return null;
}

const SCHEME_WITH_AUTHORITY_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const HOST_AND_PORT_RE = /^[^/?#:]+:\d+(?:[/?#]|$)/;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const INTERNAL_SUFFIXES = [".localhost", ".local", ".internal", ".lan"];

/**
 * Validates and canonicalizes a user supplied web address before the server
 * hands it to a crawler or stores it. https:// is prepended when no scheme is
 * given. Throws an Error for anything that is not a public http(s) site:
 * other schemes, userinfo, ports other than 80/443, single-label hosts,
 * localhost and *.local/.internal/.localhost/.lan, IPv6 literals and every IP
 * literal (the URL parser folds decimal, octal and 0x forms such as
 * http://2130706433 into dotted quads, which are all refused, so loopback,
 * RFC 1918, CGNAT 100.64/10, link-local 169.254/16, 0/8 and 224/4+ are covered).
 *
 * DNS is not resolved here, so a public name that points at a private address
 * is out of scope for this check.
 */
export function normalizePublicHttpUrl(input: unknown): string {
  if (typeof input !== "string") throw new Error("Geçersiz web adresi.");
  let candidate = input.trim();
  if (!candidate || candidate.length > 2048 || CONTROL_CHARS_RE.test(candidate)) {
    throw new Error("Geçersiz web adresi.");
  }

  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  } else if (!SCHEME_WITH_AUTHORITY_RE.test(candidate)) {
    // "javascript:...", "mailto:..." and friends are rejected; "example.com:8080/x" is a host and port.
    if (SCHEME_RE.test(candidate) && !HOST_AND_PORT_RE.test(candidate)) {
      throw new Error("Yalnızca http ve https adresleri desteklenir.");
    }
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Geçersiz web adresi.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Yalnızca http ve https adresleri desteklenir.");
  }
  if (url.username || url.password) {
    throw new Error("Kullanıcı bilgisi içeren adresler desteklenmez.");
  }
  // The parser drops a port that equals the scheme default, so any port left must be 80 or 443.
  if (url.port !== "" && url.port !== "80" && url.port !== "443") {
    throw new Error("Bu bağlantı noktası desteklenmiyor.");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !host ||
    host.startsWith("[") ||
    !host.includes(".") ||
    host === "localhost" ||
    IPV4_RE.test(host) ||
    INTERNAL_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw new Error("Bu adres herkese açık bir web sitesi değil.");
  }

  return url.toString();
}
