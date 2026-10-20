// claim-firm: passwordless claim, registration and login for firm owners.
//
// Anonymous endpoint: the one-time code plus the rate limits are the authentication. One POST route,
// the body is {action, ...}. Every response is JSON, either {ok:true,...} or
// {ok:false,error:<code>,message:<Turkish>} with status 400/404/409/429/500/502/503.
//
//   send_otp     {purpose:'claim_firm_email'|'claim_whatsapp'|'register', firm_id|code, email?, register?}
//                -> {ok:true,expires_in:600,resend_after:60,target_hint}
//                register with a phone already in the directory -> 409 phone_exists {firm_id} for a live listing,
//                409 application_pending for an application that is still waiting for review
//   verify_otp   {purpose, firm_id|code, email?, otp}
//                claim_firm_email -> {ok:true,status:'approved',token_hash,email,credit:{granted,amount,reason?}}
//                claim_whatsapp   -> {ok:true,status:'pending',token_hash,whatsapp_code,wa_url}
//                register         -> {ok:true,status:'pending',token_hash}
//   login_send   {email}        -> {ok:true,...}, identical for known and unknown addresses
//   login_verify {email, otp}   -> {ok:true,firm_status:'approved'|'pending'|'none',token_hash?}
//
// token_hash comes from auth.admin.generateLink; the browser turns it into a session with
// supabase.auth.verifyOtp({token_hash, type:'email'}).
//
// Hard rules: the code is never returned, logged or used as a fallback when mail fails (502
// email_failed, 503 email_unavailable); claim_firm_email reads the target address from the database,
// never from the request; phone and e-mail of a listed firm are never overwritten by a claimant.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (platform), RESEND_API_KEY, CLAIM_OTP_PEPPER (random,
// 32+ bytes), CLAIM_FIRST_LEAD_CREDIT (whole coins, default 10, 0 = off), SITE_URL, ALLOWED_ORIGINS
// (default https://www.peyzajbul.com,http://localhost:3000), optional RESEND_FROM and CLAIM_WA_NUMBER
// (E.164 digits of the Peyzajbul WhatsApp line, used for wa_url).
//
// Deploy: supabase functions deploy claim-firm (the default verify_jwt=true accepts the anon key bearer
// that supabase.functions.invoke sends; use --no-verify-jwt with publishable keys).

import { z } from "npm:zod@3.23.8";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { adminClient, HttpError } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { readJson } from "../_shared/http.ts";
import { creditAmount, grantFirstLeadCredit, type CreditResult } from "./credit.ts";
import { deliverMail, renderClaimApprovedEmail, renderClaimOtpEmail, type MailEnv } from "./mail.ts";
import {
  clientIp,
  generateOtp,
  generateWhatsAppCode,
  hashIp,
  hashOtp,
  MAX_PENDING_WHATSAPP_CLAIMS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  otpMatches,
  type OtpPurpose,
  parseIssueOutcome,
  RESEND_COOLDOWN_SECONDS,
  sendLimitArgs,
} from "./otp.ts";
import { ensureProvenUser } from "./user.ts";
import { buildWaUrl, generateFirmSlug, isEmailAddress, maskEmail } from "./util.ts";

// ---------------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------------

const ERRORS = {
  invalid_request: { status: 400, message: "İstek geçersiz. Lütfen bilgileri kontrol edin." },
  not_found: { status: 404, message: "Firma bulunamadı." },
  already_claimed: { status: 409, message: "Bu profil zaten sahiplenilmiş." },
  no_email_on_file: {
    status: 400,
    message: "Bu firma için kayıtlı bir e-posta adresi yok. WhatsApp ile doğrulamayı deneyin.",
  },
  user_has_firm: { status: 409, message: "Bu e-posta başka bir firmaya bağlı" },
  phone_exists: {
    status: 409,
    message: "Firmanız dizinde zaten kayıtlı. Profilinizi bulup sahiplenebilirsiniz.",
  },
  application_pending: {
    status: 409,
    message: "Bu telefon numarasıyla yapılmış bir başvuru zaten inceleniyor. Onaylandığında e-posta ile haber vereceğiz.",
  },
  too_many_pending: {
    status: 409,
    message: "Bu firma için bekleyen çok sayıda talep var. Lütfen WhatsApp üzerinden bize yazın.",
  },
  rate_limited: { status: 429, message: "Çok fazla deneme. Bir saat sonra tekrar deneyin." },
  cooldown: { status: 429, message: "Yeni kod için lütfen kısa bir süre bekleyin." },
  locked: { status: 429, message: "Çok fazla deneme. Bir saat sonra tekrar deneyin." },
  invalid_otp: { status: 400, message: "Kod hatalı." },
  otp_expired: { status: 400, message: "Kodun süresi doldu, yeni kod isteyin." },
  otp_not_found: { status: 400, message: "Önce e-postanıza bir kod isteyin." },
  email_failed: { status: 502, message: "Kod e-postası gönderilemedi. Lütfen birazdan tekrar deneyin." },
  email_unavailable: {
    status: 503,
    message: "E-posta gönderimi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
  },
  not_ready: { status: 503, message: "Hizmet şu an hazır değil. Lütfen daha sonra tekrar deneyin." },
  internal: { status: 500, message: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." },
} as const;

type ErrorCode = keyof typeof ERRORS;

class ClaimError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly extra: Record<string, unknown>;

  constructor(code: ErrorCode, extra: Record<string, unknown> = {}, message?: string) {
    super(message ?? ERRORS[code].message);
    this.name = "ClaimError";
    this.code = code;
    this.status = ERRORS[code].status;
    this.extra = extra;
  }
}

const fail = (code: ErrorCode, extra: Record<string, unknown> = {}, message?: string) =>
  new ClaimError(code, extra, message);

interface DbError {
  code?: string;
  message: string;
}

/** Schema objects the migrations create; their absence means the migrations were not applied yet. */
const MISSING_OBJECT_CODES = new Set(["42P01", "42703", "42883", "PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

function dbFailure(error: DbError, context: string): Error {
  console.error(`[claim-firm] ${context}:`, error.code, error.message);
  return error.code && MISSING_OBJECT_CODES.has(error.code) ? fail("not_ready") : new Error(`${context} failed`);
}

function unwrap<T>(result: { data: T | null; error: DbError | null }, context: string): T | null {
  if (result.error) throw dbFailure(result.error, context);
  return result.data;
}

// ---------------------------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------------------------

function env(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function siteUrl(): string {
  return (env("SITE_URL") ?? "https://www.peyzajbul.com").replace(/\/+$/, "");
}

function requirePepper(): string {
  const pepper = env("CLAIM_OTP_PEPPER");
  if (!pepper) {
    console.error("[claim-firm] CLAIM_OTP_PEPPER is not configured");
    throw fail("not_ready");
  }
  return pepper;
}

/** The mail settings, or null when RESEND_API_KEY is missing. */
function mailConfig(): MailEnv | null {
  const apiKey = env("RESEND_API_KEY");
  return apiKey ? { apiKey, from: env("RESEND_FROM") } : null;
}

function requireMail(): MailEnv {
  const config = mailConfig();
  if (!config) throw fail("email_unavailable");
  return config;
}

const LOCAL_ORIGIN = "http://localhost:3000";

/** Shared CORS headers; the local development origin is also allowed while ALLOWED_ORIGINS is unset. */
function cors(req: Request): Record<string, string> {
  const headers = corsHeaders(req);
  if (!env("ALLOWED_ORIGINS") && req.headers.get("Origin") === LOCAL_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = LOCAL_ORIGIN;
  }
  return headers;
}

function respond(req: Request, body: Record<string, unknown>, status = 200): Response {
  const headers: Record<string, string> = { ...cors(req), "Content-Type": "application/json" };
  if (status === 429 && typeof body.retry_after === "number") headers["Retry-After"] = String(body.retry_after);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Runs work after the response is sent when the runtime supports it, otherwise inline. Never throws. */
async function runInBackground(label: string, task: () => Promise<unknown>): Promise<void> {
  const guarded = task().catch((err) => console.error(`[claim-firm] ${label} failed:`, err));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(guarded);
  else await guarded;
}

// ---------------------------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------------------------

const CODE_RE = /^[2-9a-hj-km-np-z]{10}$/;

const emailField = z.string().trim().toLowerCase().email().max(254);

function optionalText(max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );
}

const websiteField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(300)
    .refine((value) => !/^http:\/\//i.test(value), "https gerekli")
    .transform((value) => (/^https:\/\//i.test(value) ? value : `https://${value}`))
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname.includes(".") && !url.username && !url.password;
      } catch {
        return false;
      }
    }, "geçersiz adres")
    .optional(),
);

const registerSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 11;
    }, "telefon 10-11 haneli olmalı"),
  city: z.string().trim().min(2).max(60),
  district: optionalText(60),
  address: optionalText(300),
  website: websiteField,
  description: optionalText(1000),
  services: z.array(z.string().trim().min(1).max(60)).max(8),
});

type RegisterPayload = z.infer<typeof registerSchema>;

const targetFields = {
  purpose: z.enum(["claim_firm_email", "claim_whatsapp", "register"]),
  firm_id: z.string().uuid().optional(),
  code: z.string().regex(CODE_RE).optional(),
  email: emailField.optional(),
};

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send_otp"), ...targetFields, register: registerSchema.optional() }),
  z.object({ action: z.literal("verify_otp"), ...targetFields, otp: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("login_send"), email: emailField }),
  z.object({ action: z.literal("login_verify"), email: emailField, otp: z.string().regex(/^\d{6}$/) }),
]);

type SendInput = Extract<z.infer<typeof bodySchema>, { action: "send_otp" }>;
type VerifyInput = Extract<z.infer<typeof bodySchema>, { action: "verify_otp" }>;

// ---------------------------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------------------------

interface FirmRow {
  id: string;
  company_name: string;
  email: string | null;
  phone: string;
  is_claimed: boolean;
  is_active: boolean;
  is_approved: boolean;
}

async function loadFirm(admin: SupabaseClient, ref: { firm_id?: string; code?: string }): Promise<FirmRow> {
  let firmId = ref.firm_id;
  if (!firmId && ref.code) {
    const row = unwrap<{ firm_id: string }>(
      await admin.from("firm_claim_codes").select("firm_id").eq("code", ref.code).maybeSingle(),
      "claim code lookup",
    );
    firmId = row?.firm_id;
  }
  if (!firmId) throw fail("not_found");

  const firm = unwrap<FirmRow>(
    await admin
      .from("firms")
      .select("id, company_name, email, phone, is_claimed, is_active, is_approved")
      .eq("id", firmId)
      .maybeSingle(),
    "firm lookup",
  );
  if (!firm || !firm.is_active || !firm.is_approved) throw fail("not_found");
  return firm;
}

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("claim_user_id_by_email", { p_email: email });
  if (error) throw dbFailure(error, "claim_user_id_by_email");
  return typeof data === "string" ? data : null;
}

/** The auth user for an address whose control was just proven with a one-time code (see user.ts). */
function getOrCreateUser(admin: SupabaseClient, email: string): Promise<string> {
  return ensureProvenUser({ auth: admin.auth.admin, findUserId: (address) => findUserIdByEmail(admin, address) }, email);
}

async function issueLoginToken(admin: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    console.error("[claim-firm] generateLink failed:", error?.message);
    return null;
  }
  return hashed;
}

type FirmStatus = "approved" | "pending" | "none";

async function firmStatusForUser(admin: SupabaseClient, userId: string): Promise<FirmStatus> {
  const roles = unwrap<{ role: string }[]>(
    await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "firm"),
    "role lookup",
  );
  const approvedFirms = unwrap<{ id: string }[]>(
    await admin.from("firms").select("id").eq("user_id", userId).eq("is_approved", true).limit(1),
    "owned firm lookup",
  );
  if ((roles?.length ?? 0) > 0 && (approvedFirms?.length ?? 0) > 0) return "approved";

  const pendingClaims = unwrap<{ id: string }[]>(
    await admin.from("claim_requests").select("id").eq("user_id", userId).eq("status", "pending").limit(1),
    "pending claim lookup",
  );
  if ((pendingClaims?.length ?? 0) > 0) return "pending";

  const unapprovedFirms = unwrap<{ id: string }[]>(
    await admin.from("firms").select("id").eq("user_id", userId).eq("is_approved", false).limit(1),
    "unapproved firm lookup",
  );
  return (unapprovedFirms?.length ?? 0) > 0 ? "pending" : "none";
}

// ---------------------------------------------------------------------------------------------
// One-time code rows
// ---------------------------------------------------------------------------------------------

interface OtpKey {
  purpose: OtpPurpose;
  target: string;
  firmId: string | null;
}

interface OtpRow {
  id: string;
  code_hash: string;
  payload: unknown;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

const OTP_COLUMNS = "id, code_hash, payload, attempts, expires_at, consumed_at, created_at";

async function latestOtp(admin: SupabaseClient, key: OtpKey): Promise<OtpRow | null> {
  let query = admin
    .from("claim_otps")
    .select(OTP_COLUMNS)
    .eq("purpose", key.purpose)
    .eq("target_email", key.target);
  query = key.firmId ? query.eq("firm_id", key.firmId) : query.is("firm_id", null);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw dbFailure(error, "otp lookup");
  return (data as OtpRow | null) ?? null;
}

/**
 * Rows older than two days are of no use to the rate limits (24 h at most) and hold addresses and registration
 * payloads, so each send trims them. The funnel does not count these rows: claim_otp_events keeps that.
 */
async function purgeOldOtps(admin: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from("claim_otps").delete().lt("created_at", cutoff);
  if (error) console.error("[claim-firm] otp purge failed:", error.code, error.message);
}

/** Invalidates the older unconsumed codes of one purpose and target, so only the newest one verifies. */
async function invalidateOlderOtps(admin: SupabaseClient, key: OtpKey, keepId: string): Promise<void> {
  let query = admin
    .from("claim_otps")
    .update({ consumed_at: new Date().toISOString() })
    .is("consumed_at", null)
    .eq("purpose", key.purpose)
    .eq("target_email", key.target)
    .neq("id", keepId);
  query = key.firmId ? query.eq("firm_id", key.firmId) : query.is("firm_id", null);
  const { error } = await query;
  if (error) console.error("[claim-firm] otp invalidate failed:", error.code, error.message);
}

async function markOtpConsumed(admin: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await admin
    .from("claim_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id)
    .is("consumed_at", null)
    .select("id");
  if (error) throw dbFailure(error, "otp consume");
  return (data?.length ?? 0) > 0;
}

async function releaseOtp(admin: SupabaseClient, id: string): Promise<void> {
  const { error } = await admin.from("claim_otps").update({ consumed_at: null }).eq("id", id);
  if (error) console.error("[claim-firm] otp release failed:", error.code, error.message);
}

/**
 * Checks a submitted code and consumes the row. At most OTP_MAX_ATTEMPTS guesses can ever be compared
 * against one row: each comparison first spends an attempt through claim_otp_attempt, one atomic UPDATE.
 */
async function consumeOtp(admin: SupabaseClient, key: OtpKey, otp: string, pepper: string): Promise<OtpRow> {
  const row = await latestOtp(admin, key);
  if (!row) throw fail("otp_not_found");
  if (row.attempts >= OTP_MAX_ATTEMPTS) throw fail("locked");
  if (row.consumed_at || Date.parse(row.expires_at) <= Date.now()) throw fail("otp_expired");

  const { data, error } = await admin.rpc("claim_otp_attempt", { p_id: row.id, p_max: OTP_MAX_ATTEMPTS });
  if (error) throw dbFailure(error, "claim_otp_attempt");
  if (typeof data !== "number") {
    // Another request spent the last attempt, consumed or expired the row between the read and now.
    const current = await latestOtp(admin, key);
    throw fail(current && current.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "otp_expired");
  }

  const matches = await otpMatches(pepper, key.purpose, key.target, otp, row.code_hash);
  if (!matches) {
    const left = OTP_MAX_ATTEMPTS - data;
    if (left <= 0) {
      await markOtpConsumed(admin, row.id);
      throw fail("locked");
    }
    throw fail("invalid_otp", { attempts_left: left }, `Kod hatalı. Kalan deneme: ${left}`);
  }

  if (!(await markOtpConsumed(admin, row.id))) throw fail("otp_expired");
  return row;
}

/**
 * Consumes the code, then runs the work. A ClaimError keeps the code consumed (the situation will not
 * change by retrying it); any other failure gives the code back so the user is not locked out by a
 * transient fault.
 */
async function withOtp<T>(
  admin: SupabaseClient,
  key: OtpKey,
  otp: string,
  pepper: string,
  work: (row: OtpRow) => Promise<T>,
): Promise<T> {
  const row = await consumeOtp(admin, key, otp, pepper);
  try {
    return await work(row);
  } catch (err) {
    if (!(err instanceof ClaimError)) await releaseOtp(admin, row.id);
    throw err;
  }
}

// ---------------------------------------------------------------------------------------------
// Claim requests
// ---------------------------------------------------------------------------------------------

interface ClaimInsert {
  firmId: string;
  userId: string;
  kind: "claim" | "register";
  method: "firm_email" | "whatsapp" | "register_email";
  phone: string;
  email: string;
  ipHash: string;
}

/** Creates the pending claim, or refreshes the one this user already has for the firm. */
async function savePendingClaim(
  admin: SupabaseClient,
  claim: ClaimInsert,
  options: { whatsappCode?: boolean } = {},
): Promise<{ id: string; whatsappCode: string | null }> {
  const verified = {
    verification_method: claim.method,
    email: claim.email,
    email_verified_at: new Date().toISOString(),
    ip_hash: claim.ipHash,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = unwrap<{ id: string; whatsapp_code: string | null }>(
      await admin
        .from("claim_requests")
        .select("id, whatsapp_code")
        .eq("firm_id", claim.firmId)
        .eq("user_id", claim.userId)
        .eq("status", "pending")
        .maybeSingle(),
      "pending claim lookup",
    );

    if (existing) {
      const code = options.whatsappCode ? (existing.whatsapp_code ?? generateWhatsAppCode()) : existing.whatsapp_code;
      const { error } = await admin
        .from("claim_requests")
        .update({ ...verified, whatsapp_code: code })
        .eq("id", existing.id);
      if (error) throw dbFailure(error, "pending claim update");
      return { id: existing.id, whatsappCode: code };
    }

    const code = options.whatsappCode ? generateWhatsAppCode() : null;
    const { data, error } = await admin
      .from("claim_requests")
      .insert({
        firm_id: claim.firmId,
        user_id: claim.userId,
        status: "pending",
        kind: claim.kind,
        phone: claim.phone,
        whatsapp_code: code,
        ...verified,
      })
      .select("id")
      .single();
    if (!error && data) return { id: data.id, whatsappCode: code };
    // 23505: a parallel request created this user's pending claim, or another pending claim drew the same
    // short WhatsApp code. Look again and, if needed, draw a new code.
    if (error?.code !== "23505") throw dbFailure(error ?? { message: "no row" }, "claim insert");
  }
  throw new Error("claim insert failed: unique conflict after 5 tries");
}

async function rejectClaim(admin: SupabaseClient, claimId: string, reason: string): Promise<void> {
  const { error } = await admin
    .from("claim_requests")
    .update({ status: "rejected", rejected_reason: reason })
    .eq("id", claimId);
  if (error) console.error("[claim-firm] claim reject failed:", error.code, error.message);
}

/** A firm accepts at most 3 pending WhatsApp claims; the claimant's own earlier request does not count against them. */
async function assertPendingRoom(admin: SupabaseClient, firmId: string, email: string): Promise<void> {
  const { count, error } = await admin
    .from("claim_requests")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", firmId)
    .eq("status", "pending");
  if (error) throw dbFailure(error, "pending claim count");
  if ((count ?? 0) < MAX_PENDING_WHATSAPP_CLAIMS) return;

  const own = unwrap<{ id: string }[]>(
    await admin
      .from("claim_requests")
      .select("id")
      .eq("firm_id", firmId)
      .eq("status", "pending")
      .eq("email", email)
      .limit(1),
    "own pending claim lookup",
  );
  if ((own?.length ?? 0) === 0) throw fail("too_many_pending");
}

// ---------------------------------------------------------------------------------------------
// send_otp
// ---------------------------------------------------------------------------------------------

interface Subject {
  firm: FirmRow | null;
  target: string;
}

/** Who a code is for. claim_firm_email always uses the address stored on the firm, never one from the request. */
async function resolveSubject(admin: SupabaseClient, input: SendInput | VerifyInput): Promise<Subject> {
  if (input.purpose === "register") {
    if (!input.email) throw fail("invalid_request", { fields: ["email"] });
    return { firm: null, target: input.email };
  }

  if (!input.firm_id && !input.code) throw fail("invalid_request", { fields: ["firm_id"] });
  const firm = await loadFirm(admin, input);
  if (firm.is_claimed) throw fail("already_claimed");

  if (input.purpose === "claim_firm_email") {
    const listed = (firm.email ?? "").trim().toLowerCase();
    if (!isEmailAddress(listed)) throw fail("no_email_on_file");
    return { firm, target: listed };
  }

  if (!input.email) throw fail("invalid_request", { fields: ["email"] });
  return { firm, target: input.email };
}

/**
 * Refuses a registration whose phone number is already in the directory. A live listing is claimable, so the
 * client is sent to its page (phone_exists); an application that is still waiting for review has no page, and
 * sending the applicant there would end on "invalid link" (application_pending).
 */
async function assertPhoneUnlisted(admin: SupabaseClient, phone: string): Promise<void> {
  const { data, error } = await admin.rpc("claim_find_firm_by_phone", { p_phone: phone });
  if (error) throw dbFailure(error, "claim_find_firm_by_phone");

  const match = (Array.isArray(data) ? data[0] : data) as { firm_id?: unknown; is_approved?: unknown } | null | undefined;
  if (!match || typeof match.firm_id !== "string") return;
  if (match.is_approved !== true) throw fail("application_pending");
  throw fail("phone_exists", { firm_id: match.firm_id });
}

/**
 * Shared by send_otp and login_send. The rate limits and the insert are one database transaction
 * (claim_otp_issue, under advisory locks), so parallel requests cannot all read "nothing sent yet" and then
 * all send. Throws cooldown / rate_limited when a limit is hit; otherwise the code row exists.
 */
async function issueOtp(
  admin: SupabaseClient,
  key: OtpKey,
  pepper: string,
  ipHash: string,
  now: number,
  payload: RegisterPayload | null,
): Promise<{ id: string; otp: string }> {
  const otp = generateOtp();
  const { data, error } = await admin.rpc("claim_otp_issue", {
    p_purpose: key.purpose,
    p_firm_id: key.firmId,
    p_target_email: key.target,
    p_code_hash: await hashOtp(pepper, key.purpose, key.target, otp),
    p_payload: payload,
    p_ip_hash: ipHash,
    p_expires_at: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(),
    ...sendLimitArgs(),
  });
  if (error) throw dbFailure(error, "claim_otp_issue");

  const outcome = parseIssueOutcome(data);
  if (!outcome.allowed) {
    throw fail(outcome.reason === "cooldown" ? "cooldown" : "rate_limited", {
      retry_after: outcome.retryAfterSeconds,
    });
  }
  return { id: outcome.id, otp };
}

const otpAnswer = { expires_in: OTP_TTL_SECONDS, resend_after: RESEND_COOLDOWN_SECONDS };

async function handleSend(req: Request, admin: SupabaseClient, input: SendInput): Promise<Record<string, unknown>> {
  const pepper = requirePepper();
  const mail = requireMail();
  const subject = await resolveSubject(admin, input);

  if (input.purpose === "register") {
    if (!input.register) throw fail("invalid_request", { fields: ["register"] });
    await assertPhoneUnlisted(admin, input.register.phone);
  } else if (input.purpose === "claim_whatsapp" && subject.firm) {
    await assertPendingRoom(admin, subject.firm.id, subject.target);
  }

  const key: OtpKey = { purpose: input.purpose, target: subject.target, firmId: subject.firm?.id ?? null };
  const now = Date.now();
  const ipHash = await hashIp(pepper, clientIp(req.headers));

  const stored = await issueOtp(admin, key, pepper, ipHash, now, input.register ?? null);
  const message = renderClaimOtpEmail({
    purpose: key.purpose,
    code: stored.otp,
    companyName: subject.firm?.company_name,
  });
  const sent = await deliverMail(mail, subject.target, message, `claim-otp-${stored.id}`);
  if (!sent.ok) {
    console.error("[claim-firm] otp mail failed:", sent.status, sent.error);
    await markOtpConsumed(admin, stored.id);
    throw fail("email_failed");
  }

  await invalidateOlderOtps(admin, key, stored.id);
  await purgeOldOtps(admin);
  return { ok: true, ...otpAnswer, target_hint: maskEmail(subject.target) };
}

// ---------------------------------------------------------------------------------------------
// verify_otp
// ---------------------------------------------------------------------------------------------

function creditBody(result: CreditResult): Record<string, unknown> {
  return result.granted
    ? { granted: true, amount: result.amount }
    : { granted: false, amount: result.amount, reason: result.reason };
}

async function completeFirmEmailClaim(
  admin: SupabaseClient,
  firm: FirmRow,
  email: string,
  ipHash: string,
): Promise<Record<string, unknown>> {
  // The firm may have been claimed while the code was on its way.
  if ((await loadFirm(admin, { firm_id: firm.id })).is_claimed) throw fail("already_claimed");

  const userId = await getOrCreateUser(admin, email);
  const claim = await savePendingClaim(admin, {
    firmId: firm.id,
    userId,
    kind: "claim",
    method: "firm_email",
    phone: firm.phone,
    email,
    ipHash,
  });

  const { error } = await admin.rpc("claim_apply_ownership", { p_claim_id: claim.id, p_approved_by: null });
  if (error) {
    if (/already_claimed/.test(error.message)) {
      await rejectClaim(admin, claim.id, "already_claimed");
      throw fail("already_claimed");
    }
    if (/user_has_firm/.test(error.message)) {
      await rejectClaim(admin, claim.id, "user_has_firm");
      throw fail("user_has_firm");
    }
    throw dbFailure(error, "claim_apply_ownership");
  }

  // From here on the firm belongs to the claimant: nothing below may fail the request.
  const amount = creditAmount(env("CLAIM_FIRST_LEAD_CREDIT"));
  const credit = await grantFirstLeadCredit((fn, args) => admin.rpc(fn, args), firm.id, amount).catch(
    (err): CreditResult => {
      console.error("[claim-firm] credit failed:", err);
      return { granted: false, amount, reason: "rpc_error" };
    },
  );
  if (credit.granted) {
    const { error: stampError } = await admin
      .from("claim_requests")
      .update({ credit_granted_at: new Date().toISOString() })
      .eq("id", claim.id);
    if (stampError) console.error("[claim-firm] credit stamp failed:", stampError.code, stampError.message);
  }

  const tokenHash = await issueLoginToken(admin, email);

  const mailEnv = mailConfig();
  if (mailEnv) {
    const message = renderClaimApprovedEmail({
      companyName: firm.company_name,
      loginUrl: `${siteUrl()}/firma/giris`,
      variant: "verified",
      creditAmount: credit.granted ? credit.amount : null,
    });
    await runInBackground("approved mail", async () => {
      const sent = await deliverMail(mailEnv, email, message, `claim-approved-${claim.id}`);
      if (!sent.ok) console.error("[claim-firm] approved mail failed:", sent.status, sent.error);
    });
  }

  return { ok: true, status: "approved", token_hash: tokenHash, email, credit: creditBody(credit) };
}

async function completeWhatsAppClaim(
  admin: SupabaseClient,
  firm: FirmRow,
  email: string,
  ipHash: string,
): Promise<Record<string, unknown>> {
  if ((await loadFirm(admin, { firm_id: firm.id })).is_claimed) throw fail("already_claimed");
  await assertPendingRoom(admin, firm.id, email);

  const userId = await getOrCreateUser(admin, email);
  const claim = await savePendingClaim(
    admin,
    { firmId: firm.id, userId, kind: "claim", method: "whatsapp", phone: firm.phone, email, ipHash },
    { whatsappCode: true },
  );
  if (!claim.whatsappCode) throw new Error("claim saved without a WhatsApp code");

  const tokenHash = await issueLoginToken(admin, email);
  const waUrl = buildWaUrl(
    env("CLAIM_WA_NUMBER"),
    `Peyzajbul sahiplenme kodu: ${claim.whatsappCode} (${firm.company_name})`,
  );

  return { ok: true, status: "pending", token_hash: tokenHash, whatsapp_code: claim.whatsappCode, wa_url: waUrl };
}

async function completeRegistration(
  admin: SupabaseClient,
  rawPayload: unknown,
  email: string,
  ipHash: string,
): Promise<Record<string, unknown>> {
  const parsed = registerSchema.safeParse(rawPayload);
  if (!parsed.success) throw new Error("stored registration payload is invalid");
  const payload = parsed.data;

  await assertPhoneUnlisted(admin, payload.phone);

  const userId = await getOrCreateUser(admin, email);
  const owned = unwrap<{ id: string }[]>(
    await admin.from("firms").select("id").eq("user_id", userId).limit(1),
    "owned firm lookup",
  );
  if ((owned?.length ?? 0) > 0) throw fail("user_has_firm");

  const firmId = crypto.randomUUID();
  const { error: firmError } = await admin.from("firms").insert({
    id: firmId,
    user_id: userId,
    company_name: payload.company_name,
    phone: payload.phone,
    email,
    city: payload.city,
    district: payload.district ?? null,
    address: payload.address ?? null,
    website: payload.website ?? null,
    description: payload.description ?? null,
    services: payload.services,
    // Keep in sync with generateFirmSlug in src/lib/firmUtils.ts.
    slug: generateFirmSlug(payload.company_name, firmId),
    is_approved: false,
    is_claimed: false,
    is_active: true,
  });
  if (firmError) throw dbFailure(firmError, "firm insert");

  const { error: provenanceError } = await admin.from("firm_provenance").insert({
    firm_id: firmId,
    source_type: "self_registered",
    imported_by: userId,
  });
  if (provenanceError) console.error("[claim-firm] provenance insert failed:", provenanceError.code, provenanceError.message);

  try {
    await savePendingClaim(admin, {
      firmId,
      userId,
      kind: "register",
      method: "register_email",
      phone: payload.phone,
      email,
      ipHash,
    });
  } catch (err) {
    // No request, no listing: do not leave an orphaned unapproved firm behind.
    const { error: cleanupError } = await admin.from("firms").delete().eq("id", firmId);
    if (cleanupError) console.error("[claim-firm] orphan firm cleanup failed:", cleanupError.code, cleanupError.message);
    throw err;
  }

  return { ok: true, status: "pending", token_hash: await issueLoginToken(admin, email) };
}

async function handleVerify(req: Request, admin: SupabaseClient, input: VerifyInput): Promise<Record<string, unknown>> {
  const pepper = requirePepper();
  const subject = await resolveSubject(admin, input);
  const key: OtpKey = { purpose: input.purpose, target: subject.target, firmId: subject.firm?.id ?? null };
  const ipHash = await hashIp(pepper, clientIp(req.headers));

  return await withOtp(admin, key, input.otp, pepper, (row) => {
    if (input.purpose === "claim_firm_email" && subject.firm) {
      return completeFirmEmailClaim(admin, subject.firm, subject.target, ipHash);
    }
    if (input.purpose === "claim_whatsapp" && subject.firm) {
      return completeWhatsAppClaim(admin, subject.firm, subject.target, ipHash);
    }
    return completeRegistration(admin, row.payload, subject.target, ipHash);
  });
}

// ---------------------------------------------------------------------------------------------
// login_send / login_verify
// ---------------------------------------------------------------------------------------------

/**
 * The same answer for a known and an unknown address. A code row is written either way, so the rate limits
 * behave identically too; only a user who is a firm owner or has a pending request receives the mail,
 * and it is sent after the response so the timing does not give the difference away.
 */
async function handleLoginSend(
  req: Request,
  admin: SupabaseClient,
  input: { email: string },
): Promise<Record<string, unknown>> {
  const pepper = requirePepper();
  const mail = requireMail();
  const key: OtpKey = { purpose: "login", target: input.email, firmId: null };
  const now = Date.now();
  const ipHash = await hashIp(pepper, clientIp(req.headers));

  const stored = await issueOtp(admin, key, pepper, ipHash, now, null);
  await invalidateOlderOtps(admin, key, stored.id);
  await purgeOldOtps(admin);

  const userId = await findUserIdByEmail(admin, input.email);
  const eligible = userId !== null && (await firmStatusForUser(admin, userId)) !== "none";
  if (eligible) {
    const message = renderClaimOtpEmail({ purpose: "login", code: stored.otp });
    await runInBackground("login mail", async () => {
      const sent = await deliverMail(mail, input.email, message, `claim-otp-${stored.id}`);
      if (!sent.ok) console.error("[claim-firm] login mail failed:", sent.status, sent.error);
    });
  }

  return { ok: true, ...otpAnswer };
}

async function handleLoginVerify(
  req: Request,
  admin: SupabaseClient,
  input: { email: string; otp: string },
): Promise<Record<string, unknown>> {
  const pepper = requirePepper();
  const key: OtpKey = { purpose: "login", target: input.email, firmId: null };

  return await withOtp(admin, key, input.otp, pepper, async () => {
    const userId = await findUserIdByEmail(admin, input.email);
    if (!userId) throw fail("invalid_otp");

    const status = await firmStatusForUser(admin, userId);
    if (status !== "approved") return { ok: true, firm_status: status };

    const tokenHash = await issueLoginToken(admin, input.email);
    if (!tokenHash) throw new Error("login link could not be created");
    return { ok: true, firm_status: status, token_hash: tokenHash };
  });
}

// ---------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") {
    return respond(req, { ok: false, error: "method_not_allowed", message: "Yöntem desteklenmiyor." }, 405);
  }

  try {
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) {
      throw fail("invalid_request", { fields: [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))] });
    }

    const admin = adminClient();
    const input = parsed.data;
    switch (input.action) {
      case "send_otp":
        return respond(req, await handleSend(req, admin, input));
      case "verify_otp":
        return respond(req, await handleVerify(req, admin, input));
      case "login_send":
        return respond(req, await handleLoginSend(req, admin, input));
      case "login_verify":
        return respond(req, await handleLoginVerify(req, admin, input));
    }
  } catch (err) {
    if (err instanceof ClaimError) {
      return respond(req, { ok: false, error: err.code, message: err.message, ...err.extra }, err.status);
    }
    if (err instanceof HttpError) {
      return respond(req, { ok: false, error: "invalid_request", message: err.message }, err.status);
    }
    console.error("[claim-firm] unhandled:", err);
    return respond(req, { ok: false, error: "internal", message: ERRORS.internal.message }, ERRORS.internal.status);
  }
}

Deno.serve(handle);
