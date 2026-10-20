import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  OTP_TTL_SECONDS,
  buildOtpRow,
  generateCode,
  generateSalt,
  hashCode,
  issueAndSendOtp,
  secretsEqual,
  timingSafeEqualHex,
} from "./otpCore.ts";
import { renderOtpEmail } from "./otpEmail.ts";

const ENV: Record<string, string> = { RATE_LIMIT_SALT: "rate-salt", OTP_PEPPER: "pepper", RESEND_API_KEY: "re_test" };
const env = (name: string) => ENV[name];
const NOW = Date.parse("2026-10-20T10:00:00Z");
const LEAD = { id: "11111111-1111-4111-8111-111111111111", email: "Ayse@Example.com" };

describe("generateCode", () => {
  it("returns exactly 6 digits, leading zeros included", () => {
    for (let i = 0; i < 2000; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it("is uniformly distributed over 10k draws (smoke test)", () => {
    const draws = 10_000;
    const first = new Array<number>(10).fill(0);
    const last = new Array<number>(10).fill(0);
    const seen = new Set<string>();
    for (let i = 0; i < draws; i++) {
      const code = generateCode();
      first[Number(code[0])] += 1;
      last[Number(code[5])] += 1;
      seen.add(code);
    }
    // expected 1000 per digit with a standard deviation of about 30
    for (const count of [...first, ...last]) {
      expect(count).toBeGreaterThan(820);
      expect(count).toBeLessThan(1180);
    }
    expect(seen.size).toBeGreaterThan(9800);
  });
});

describe("hashCode", () => {
  it("is deterministic, salt-sensitive and pepper-sensitive", async () => {
    const a = await hashCode("123456", "salt-a", "pepper");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashCode("123456", "salt-a", "pepper")).toBe(a);
    expect(await hashCode("123456", "salt-b", "pepper")).not.toBe(a);
    expect(await hashCode("123456", "salt-a", "other-pepper")).not.toBe(a);
    expect(await hashCode("123457", "salt-a", "pepper")).not.toBe(a);
  });

  it("salts are random hex", () => {
    expect(generateSalt()).toMatch(/^[0-9a-f]{32}$/);
    expect(generateSalt()).not.toBe(generateSalt());
  });
});

describe("constant-time comparison", () => {
  it("timingSafeEqualHex", () => {
    expect(timingSafeEqualHex("abcdef", "abcdef")).toBe(true);
    expect(timingSafeEqualHex("abcdef", "abcdee")).toBe(false);
    expect(timingSafeEqualHex("abcdef", "abcde")).toBe(false);
    expect(timingSafeEqualHex("", "")).toBe(true);
  });

  it("secretsEqual works for secrets of different lengths", async () => {
    expect(await secretsEqual("same-secret", "same-secret")).toBe(true);
    expect(await secretsEqual("same-secret", "same-secreT")).toBe(false);
    expect(await secretsEqual("short", "a-much-longer-secret")).toBe(false);
  });
});

describe("buildOtpRow", () => {
  it("holds the hash and salt, never the code, and expires in 10 minutes", async () => {
    const code = "482913";
    const salt = generateSalt();
    const row = buildOtpRow({
      leadId: LEAD.id,
      email: "ayse@example.com",
      codeHash: await hashCode(code, salt, "pepper"),
      salt,
      sendCount: 2,
      nowMs: NOW,
    });
    expect(Object.keys(row).sort()).toEqual(
      ["attempts", "code_hash", "consumed_at", "email", "expires_at", "last_sent_at", "lead_id", "salt", "send_count"],
    );
    expect(Object.values(row).map(String)).not.toContain(code);
    expect(row.attempts).toBe(0);
    expect(row.consumed_at).toBeNull();
    expect(Date.parse(row.expires_at) - NOW).toBe(OTP_TTL_SECONDS * 1000);
  });
});

interface FakeOptions {
  existing?: { send_count: number; last_sent_at: string } | null;
  rateAllowed?: boolean;
  resend?: { status: number; body: unknown };
  apiKey?: boolean;
}

function setup(options: FakeOptions = {}) {
  const upserts: Record<string, unknown>[] = [];
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  const requests: { url: string; headers: Record<string, string>; body: { subject: string; html: string; to: string[] } }[] = [];

  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: options.existing ?? null, error: null }) }) }),
      upsert: async (row: Record<string, unknown>) => {
        upserts.push(row);
        return { error: null };
      },
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const allowed = options.rateAllowed !== false;
      return { data: [{ allowed, hits: allowed ? 1 : 99, retry_after: 42 }], error: null };
    },
  } as unknown as SupabaseClient;

  const fetchImpl = (async (url: string, init: RequestInit) => {
    requests.push({
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(String(init.body)),
    });
    const resend = options.resend ?? { status: 200, body: { id: "msg_1" } };
    return new Response(JSON.stringify(resend.body), { status: resend.status });
  }) as unknown as typeof fetch;

  const readEnv = options.apiKey === false ? (name: string) => (name === "RESEND_API_KEY" ? undefined : ENV[name]) : env;
  return { client, upserts, rpcCalls, requests, fetchImpl, readEnv };
}

describe("issueAndSendOtp", () => {
  it("stores only a hash and mails the code with an idempotency key", async () => {
    const { client, upserts, requests, fetchImpl, readEnv } = setup();
    const result = await issueAndSendOtp(client, LEAD, { ipHash: "iphash", env: readEnv, fetchImpl, now: () => NOW });

    expect(result).toEqual({ ok: true, expiresInSeconds: 600, resendAfterSeconds: 60 });
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.url).toBe("https://api.resend.com/emails");
    expect(request.headers["Idempotency-Key"]).toMatch(/^otp-/);
    expect(request.body.to).toEqual(["ayse@example.com"]);

    const code = /^(\d{6}) - Peyzajbul doğrulama kodu$/.exec(request.body.subject)?.[1];
    expect(code).toBeDefined();
    expect(upserts).toHaveLength(1);
    const row = upserts[0] as { code_hash: string; salt: string; send_count: number };
    expect(row.code_hash).toBe(await hashCode(code as string, row.salt, "pepper"));
    expect(row.send_count).toBe(1);
    expect(Object.keys(row)).not.toContain("code");
    expect(Object.values(row).map(String)).not.toContain(code);
  });

  it("fails closed when Resend rejects the mail and never returns the code", async () => {
    const { client, requests, fetchImpl, readEnv } = setup({
      resend: { status: 403, body: { message: "You can only send testing emails to your own email address. Verify a domain." } },
    });
    const result = await issueAndSendOtp(client, LEAD, { env: readEnv, fetchImpl, now: () => NOW });
    expect(result).toEqual({ ok: false, code: "EMAIL_SEND_FAILED" });
    expect(requests).toHaveLength(1);
    const code = /^(\d{6})/.exec(requests[0].body.subject)?.[1] as string;
    expect(JSON.stringify(result)).not.toContain(code);
  });

  it("fails closed without a Resend key", async () => {
    const { client, requests, fetchImpl, readEnv } = setup({ apiKey: false });
    expect(await issueAndSendOtp(client, LEAD, { env: readEnv, fetchImpl, now: () => NOW })).toEqual({
      ok: false,
      code: "EMAIL_SEND_FAILED",
    });
    expect(requests).toHaveLength(0);
  });

  it("allows at most 3 codes per lead", async () => {
    const { client, upserts, requests, fetchImpl, readEnv } = setup({
      existing: { send_count: 3, last_sent_at: new Date(NOW - 5 * 60_000).toISOString() },
    });
    const result = await issueAndSendOtp(client, LEAD, { env: readEnv, fetchImpl, now: () => NOW });
    expect(result).toMatchObject({ ok: false, code: "RATE_LIMITED" });
    expect(upserts).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });

  it("enforces the 60 second cooldown", async () => {
    const { client, requests, fetchImpl, readEnv } = setup({
      existing: { send_count: 1, last_sent_at: new Date(NOW - 20_000).toISOString() },
    });
    const result = await issueAndSendOtp(client, LEAD, { env: readEnv, fetchImpl, now: () => NOW });
    expect(result).toEqual({ ok: false, code: "RATE_LIMITED", retryAfterSeconds: 40 });
    expect(requests).toHaveLength(0);
  });

  it("increments send_count and resets attempts on a later resend", async () => {
    const { client, upserts, fetchImpl, readEnv } = setup({
      existing: { send_count: 1, last_sent_at: new Date(NOW - 120_000).toISOString() },
    });
    const result = await issueAndSendOtp(client, LEAD, { env: readEnv, fetchImpl, now: () => NOW });
    expect(result.ok).toBe(true);
    expect(upserts[0]).toMatchObject({ send_count: 2, attempts: 0, consumed_at: null });
  });

  it("stops when the per-ip or per-email limiter says no", async () => {
    const { client, upserts, requests, rpcCalls, fetchImpl, readEnv } = setup({ rateAllowed: false });
    const result = await issueAndSendOtp(client, LEAD, { ipHash: "iphash", env: readEnv, fetchImpl, now: () => NOW });
    expect(result).toEqual({ ok: false, code: "RATE_LIMITED", retryAfterSeconds: 42 });
    expect(rpcCalls[0]).toMatchObject({ fn: "rate_limit_hit", args: { p_bucket: "otp-send:ip:iphash", p_max: 10, p_window_seconds: 900 } });
    expect(upserts).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });

  it("limits sends per hashed email, never per raw address", async () => {
    const { client, rpcCalls, fetchImpl, readEnv } = setup();
    await issueAndSendOtp(client, LEAD, { env: readEnv, fetchImpl, now: () => NOW });
    const emailBucket = rpcCalls.find((call) => String(call.args.p_bucket).startsWith("otp-send:email:"));
    expect(emailBucket).toBeDefined();
    expect(String(emailBucket?.args.p_bucket)).not.toContain("example.com");
    expect(emailBucket?.args).toMatchObject({ p_max: 3, p_window_seconds: 3600 });
  });
});

describe("renderOtpEmail", () => {
  it("is Turkish, branded and carries the code", () => {
    const mail = renderOtpEmail("042913");
    expect(mail.subject).toBe("042913 - Peyzajbul doğrulama kodu");
    expect(mail.html).toContain("#1A3D2D");
    expect(mail.html).toContain("#FAF8F5");
    expect(mail.html).toContain("Doğrulama kodunuz 10 dakika geçerlidir. Bu işlemi siz yapmadıysanız bu e-postayı dikkate almayın.");
    expect(mail.text).toContain("042913");
  });
});
