/**
 * One-time code primitives for claim-firm.
 *
 * A code is 6 digits from the platform CSPRNG (rejection sampling, no modulo bias), lives 10 minutes
 * and is stored ONLY as HMAC-SHA256(CLAIM_OTP_PEPPER, purpose|target|code). The plaintext exists in
 * memory and in the e-mail, and is never returned, logged or written anywhere else.
 *
 * Pure module: the only import is a pure helper, and the Web Crypto API is global in Deno and Node.
 */

import { timingSafeEqual } from "../_shared/security.ts";
import { CLAIM_ALPHABET } from "./util.ts";

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_PENDING_WHATSAPP_CLAIMS = 3;

/** Send limits, counted from public.claim_otps rows and enforced atomically by public.claim_otp_issue. */
export const SEND_LIMITS = {
  firmPerHour: 3,
  firmPerDay: 8,
  emailPerHour: 3,
  ipPerHour: 15,
} as const;

const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

export type OtpPurpose = "claim_firm_email" | "claim_whatsapp" | "register" | "login";

/** Uniform integer in [0, maxExclusive) from crypto.getRandomValues; draws in the biased tail are discarded. */
export function randomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x100000000) {
    throw new RangeError("maxExclusive must be an integer between 1 and 2^32");
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % maxExclusive;
  }
}

/** Six digits, leading zeros allowed. */
export function generateOtp(): string {
  return String(randomInt(1_000_000)).padStart(6, "0");
}

/** 'PB-' + 4 characters of the claim alphabet, upper-cased: the code the claimant sends over WhatsApp. */
export function generateWhatsAppCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CLAIM_ALPHABET[randomInt(CLAIM_ALPHABET.length)];
  return `PB-${suffix.toUpperCase()}`;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The value stored in claim_otps.code_hash. The target is trimmed and lower-cased so both sides agree. */
export function hashOtp(pepper: string, purpose: OtpPurpose, target: string, otp: string): Promise<string> {
  return hmacHex(pepper, `${purpose}|${target.trim().toLowerCase()}|${otp}`);
}

/** Constant-time check of a submitted code against the stored hash. */
export async function otpMatches(
  pepper: string,
  purpose: OtpPurpose,
  target: string,
  otp: string,
  storedHash: string,
): Promise<boolean> {
  return timingSafeEqual(await hashOtp(pepper, purpose, target, otp), storedHash);
}

/** HMAC of the client address: stored for rate limiting, never the raw IP. */
export function hashIp(pepper: string, ip: string): Promise<string> {
  return hmacHex(pepper, `ip|${ip}`);
}

/**
 * The address the platform saw. cf-connecting-ip is set by Cloudflare in front of the Edge Functions and
 * cannot be chosen by a client. x-forwarded-for is only the fallback: every proxy APPENDS to whatever the
 * client sent, so its first entry is client-controlled (a fresh random value per request would give each
 * request its own rate-limit bucket) while the last one is the hop nearest to this function.
 */
export function clientIp(headers: Headers): string {
  const direct = headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop !== "");
  return hops[hops.length - 1] ?? "unknown";
}

/** The limit arguments of the claim_otp_issue RPC, which counts and inserts in one locked transaction. */
export function sendLimitArgs() {
  return {
    p_cooldown_seconds: RESEND_COOLDOWN_SECONDS,
    p_firm_per_hour: SEND_LIMITS.firmPerHour,
    p_firm_per_day: SEND_LIMITS.firmPerDay,
    p_email_per_hour: SEND_LIMITS.emailPerHour,
    p_ip_per_hour: SEND_LIMITS.ipPerHour,
  };
}

const SEND_REFUSALS = ["cooldown", "firm_hour", "firm_day", "email_hour", "ip_hour"] as const;

export type SendRefusal = (typeof SEND_REFUSALS)[number];

export type IssueOutcome =
  | { allowed: true; id: string }
  | { allowed: false; reason: SendRefusal; retryAfterSeconds: number };

/** Reads the jsonb answer of claim_otp_issue; anything that is not exactly that shape is an error, never "allowed". */
export function parseIssueOutcome(data: unknown): IssueOutcome {
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (row?.allowed === true && typeof row.id === "string" && row.id !== "") {
    return { allowed: true, id: row.id };
  }
  if (row?.allowed === false && SEND_REFUSALS.some((reason) => reason === row.reason)) {
    const retry = Number(row.retry_after);
    return {
      allowed: false,
      reason: row.reason as SendRefusal,
      retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : 60 * 60,
    };
  }
  throw new Error("claim_otp_issue returned an unexpected answer");
}
