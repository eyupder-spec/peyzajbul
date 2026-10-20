// Cloudflare Turnstile verification. Pure module: environment values and fetch are injected.

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_ACTION = "lead";
const TIMEOUT_MS = 5000;

export interface TurnstileOptions {
  token: string | undefined;
  remoteIp: string;
  /** TURNSTILE_SECRET_KEY */
  secret: string | undefined;
  /** Hostnames the widget may report (derived from ALLOWED_ORIGINS). */
  allowedHostnames: string[];
  /** ENV === "dev": a missing secret skips the check. Production fails closed. */
  isDev: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

interface SiteverifyResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
}

export async function verifyTurnstile(options: TurnstileOptions): Promise<TurnstileResult> {
  const { token, remoteIp, secret, allowedHostnames, isDev, fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = options;

  if (!secret) {
    return isDev ? { ok: true } : { ok: false, reason: "secret_missing" };
  }
  if (!token || token.length > 2048) {
    return { ok: false, reason: "token_missing" };
  }

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "verify_http_error" };

    const result = (await response.json()) as SiteverifyResponse;
    if (result.success !== true) return { ok: false, reason: "verify_rejected" };
    if (result.action !== undefined && result.action !== TURNSTILE_ACTION) {
      return { ok: false, reason: "action_mismatch" };
    }
    if (!result.hostname || !allowedHostnames.includes(result.hostname)) {
      return { ok: false, reason: "hostname_mismatch" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "verify_unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
