import type { SupabaseClient } from "@supabase/supabase-js";
import { readEnv, requireSecret, type EnvReader } from "../create-lead/env.ts";
import { hashKey, hitRateLimit, sha256Hex } from "../create-lead/limits.ts";
import { DEFAULT_FROM, sendEmail } from "../dispatch-lead-notifications/resend.ts";
import { renderOtpEmail } from "./otpEmail.ts";

// One-time code core shared by create-lead (first code), send-otp (resend) and verify-otp.
// Only a salted hash of the code is ever stored; the plaintext exists in memory and in the mail.

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS_PER_LEAD = 3;
export const OTP_MAX_ATTEMPTS = 5;
/** Per-ip and per-email send limits (fixed windows, enforced through rate_limit_hit). */
export const OTP_IP_SEND_LIMIT = { max: 10, windowSeconds: 15 * 60 } as const;
export const OTP_EMAIL_SEND_LIMIT = { max: 3, windowSeconds: 60 * 60 } as const;
/** verify-otp: attempts per ip hash. */
export const OTP_IP_VERIFY_LIMIT = { max: 20, windowSeconds: 15 * 60 } as const;

const CODE_RANGE = 1_000_000;
// Largest multiple of CODE_RANGE below 2^32: draws at or above it are discarded (rejection sampling).
const CODE_REJECTION_LIMIT = Math.floor(0x100000000 / CODE_RANGE) * CODE_RANGE;

/** Uniformly distributed 6 digit code (leading zeros allowed) from the platform CSPRNG. */
export function generateCode(): string {
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < CODE_REJECTION_LIMIT) {
      return String(buffer[0] % CODE_RANGE).padStart(6, "0");
    }
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

/** sha256(code:salt:pepper) as hex. The pepper is the OTP_PEPPER secret. */
export function hashCode(code: string, salt: string, pepper: string = requireSecret("OTP_PEPPER")): Promise<string> {
  return sha256Hex(`${code}:${salt}:${pepper}`);
}

/** Constant-time comparison of two hex digests. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** Compares two secrets of any length without leaking where they differ (digests are compared). */
export async function secretsEqual(a: string, b: string): Promise<boolean> {
  return timingSafeEqualHex(await sha256Hex(a), await sha256Hex(b));
}

export interface OtpRow {
  lead_id: string;
  email: string;
  code_hash: string;
  salt: string;
  attempts: number;
  send_count: number;
  expires_at: string;
  last_sent_at: string;
  consumed_at: null;
}

/** The lead_otps upsert payload: hash and salt only, never the code. */
export function buildOtpRow(args: {
  leadId: string;
  email: string;
  codeHash: string;
  salt: string;
  sendCount: number;
  nowMs: number;
}): OtpRow {
  return {
    lead_id: args.leadId,
    email: args.email,
    code_hash: args.codeHash,
    salt: args.salt,
    attempts: 0,
    send_count: args.sendCount,
    expires_at: new Date(args.nowMs + OTP_TTL_SECONDS * 1000).toISOString(),
    last_sent_at: new Date(args.nowMs).toISOString(),
    consumed_at: null,
  };
}

export interface IssueOptions {
  /** Salted hash of the caller's IP; enables the per-ip send limit. */
  ipHash?: string;
  env?: EnvReader;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export type IssueResult =
  | { ok: true; expiresInSeconds: number; resendAfterSeconds: number }
  | { ok: false; code: "RATE_LIMITED"; retryAfterSeconds: number }
  | { ok: false; code: "EMAIL_SEND_FAILED" };

interface ExistingOtp {
  send_count: number;
  last_sent_at: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Issues a fresh code for a lead and mails it to the address stored on the lead.
 * At most 3 codes per lead, 60 s between sends, 10 sends per ip hash per 15 minutes and 3 per email
 * hash per hour. Fails closed: when the mail cannot be sent the caller gets EMAIL_SEND_FAILED and no
 * code leaves this function. Throws on database or configuration errors (callers answer 500).
 */
export async function issueAndSendOtp(
  client: SupabaseClient,
  lead: { id: string; email: string },
  options: IssueOptions = {},
): Promise<IssueResult> {
  const env = options.env ?? readEnv;
  const nowMs = (options.now ?? Date.now)();
  const rateSalt = requireSecret("RATE_LIMIT_SALT", env);
  const pepper = requireSecret("OTP_PEPPER", env);
  const email = lead.email.trim().toLowerCase();

  const { data: existing, error: readError } = await client
    .from("lead_otps")
    .select("send_count, last_sent_at")
    .eq("lead_id", lead.id)
    .maybeSingle<ExistingOtp>();
  if (readError) throw new Error("otp_read_failed");

  if (existing) {
    const lastSentMs = Date.parse(existing.last_sent_at);
    if (existing.send_count >= OTP_MAX_SENDS_PER_LEAD) {
      // The row is purged by the nightly housekeeping job one day after the last send.
      return {
        ok: false,
        code: "RATE_LIMITED",
        retryAfterSeconds: Math.max(1, Math.ceil((lastSentMs + ONE_DAY_MS - nowMs) / 1000)),
      };
    }
    const elapsedSeconds = (nowMs - lastSentMs) / 1000;
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        retryAfterSeconds: Math.max(1, Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds)),
      };
    }
  }

  if (options.ipHash) {
    const ipOutcome = await hitRateLimit(client, {
      bucket: `otp-send:ip:${options.ipHash}`,
      ...OTP_IP_SEND_LIMIT,
    });
    if (!ipOutcome.allowed) return { ok: false, code: "RATE_LIMITED", retryAfterSeconds: ipOutcome.retryAfterSeconds };
  }
  const emailOutcome = await hitRateLimit(client, {
    bucket: `otp-send:email:${await hashKey(rateSalt, `email:${email}`)}`,
    ...OTP_EMAIL_SEND_LIMIT,
  });
  if (!emailOutcome.allowed) {
    return { ok: false, code: "RATE_LIMITED", retryAfterSeconds: emailOutcome.retryAfterSeconds };
  }

  const code = generateCode();
  const salt = generateSalt();
  const codeHash = await hashCode(code, salt, pepper);
  const row = buildOtpRow({
    leadId: lead.id,
    email,
    codeHash,
    salt,
    sendCount: (existing?.send_count ?? 0) + 1,
    nowMs,
  });

  const { error: upsertError } = await client.from("lead_otps").upsert(row, { onConflict: "lead_id" });
  if (upsertError) throw new Error("otp_store_failed");

  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return { ok: false, code: "EMAIL_SEND_FAILED" };

  const mail = renderOtpEmail(code);
  const sent = await sendEmail({
    apiKey,
    from: env("RESEND_FROM") ?? DEFAULT_FROM,
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    // One key per send: the salt is fresh for every code.
    idempotencyKey: `otp-${lead.id}-${salt}`,
    fetchImpl: options.fetchImpl,
  });
  if (!sent.ok) return { ok: false, code: "EMAIL_SEND_FAILED" };

  return { ok: true, expiresInSeconds: OTP_TTL_SECONDS, resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
}
