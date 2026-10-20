// Rate limiting and key hashing for the lead pipeline. Pure module: the Supabase client is injected.

/** Limits for create-lead. Counters live in public.lead_rate_limits (fixed windows). */
export const CREATE_LEAD_LIMITS = {
  ipHour: { max: 5, windowSeconds: 60 * 60 },
  ipDay: { max: 20, windowSeconds: 24 * 60 * 60 },
  emailHour: { max: 3, windowSeconds: 60 * 60 },
  phoneDay: { max: 3, windowSeconds: 24 * 60 * 60 },
} as const;

export interface RateLimitCheck {
  /** Bucket key; must already be a salted hash, never a raw IP, email or phone. */
  bucket: string;
  windowSeconds: number;
  max: number;
}

export type RateLimitOutcome = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** The part of the Supabase client the limiter needs. */
export interface RpcClient {
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** sha256(RATE_LIMIT_SALT + value). Namespace the value yourself ("ip:...", "email:...", "phone:..."). */
export function hashKey(salt: string, value: string): Promise<string> {
  return sha256Hex(`${salt}${value}`);
}

/**
 * cf-connecting-ip, else the LAST x-forwarded-for entry. Every proxy appends the address it received the request
 * from, so the first entry is whatever the client sent (a fresh random value per request would give each request
 * its own rate-limit bucket) while the last one is the hop nearest to this function. Same rule as clientIp in
 * claim-firm/otp.ts.
 */
export function getClientIp(headers: Headers): string {
  const direct = headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop !== "");
  return hops[hops.length - 1] ?? "unknown";
}

interface RateLimitRow {
  allowed?: boolean;
  retry_after?: number;
}

/** Registers one hit. Throws when the limiter itself fails, so callers fail closed. */
export async function hitRateLimit(client: RpcClient, check: RateLimitCheck): Promise<RateLimitOutcome> {
  const { data, error } = await client.rpc("rate_limit_hit", {
    p_bucket: check.bucket,
    p_window_seconds: check.windowSeconds,
    p_max: check.max,
  });
  if (error) throw new Error("rate_limit_unavailable");

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null | undefined;
  if (!row || typeof row.allowed !== "boolean") throw new Error("rate_limit_unavailable");
  if (row.allowed) return { allowed: true };

  const retry = Number(row.retry_after);
  return { allowed: false, retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : check.windowSeconds };
}

/** Checks in order and stops at the first limit that is exceeded. */
export async function enforceRateLimits(client: RpcClient, checks: RateLimitCheck[]): Promise<RateLimitOutcome> {
  for (const check of checks) {
    const outcome = await hitRateLimit(client, check);
    if (!outcome.allowed) return outcome;
  }
  return { allowed: true };
}
