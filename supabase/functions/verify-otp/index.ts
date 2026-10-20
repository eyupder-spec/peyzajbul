// verify-otp: confirms the one-time email code of a lead, verifies the lead and routes it to firms.
//
// Request:  POST { "leadId": "<uuid>", "code": "123456" }  (no email: the lead's own address is used)
// Success:  200 { ok: true, leadId, verified: true, routing: 'routed' | 'waiting_supply' | 'needs_review',
//                 statusToken, session: { access_token, refresh_token, ... } | null, isNewUser }
//           session is null for admin, firm and any other non-homeowner account: an email code never
//           grants those sessions. The lead is still verified and routed. session is also null (isNewUser
//           false) when the account steps fail after verification: that never turns into an error response.
// Errors:   { ok: false, code, message, attemptsLeft?, retryAfterSeconds? }
//           400 INVALID_CODE (wrong, missing or already used code), 410 CODE_EXPIRED, 429 LOCKED
//           (5 wrong attempts), 429 RATE_LIMITED (per ip), 422 VALIDATION_FAILED, 500 INTERNAL.
//
// Attempts are reserved atomically in the database before a code is compared, and the code is consumed
// with a single conditional update, so parallel guesses and replays cannot verify a lead twice.
// Once the lead is verified, the cost calculator estimate it arrived with (leads.estimate_token, set by
// create-lead) is linked through public.link_lead_artifacts. That step is best effort: see estimateLink.ts.
// No auth user is ever created with a password and no password mail is sent.
//
// Required environment (values are never committed):
//   TURNSTILE_SECRET_KEY, OTP_PEPPER, RATE_LIMIT_SALT, DISPATCH_SECRET, RESEND_API_KEY,
//   RESEND_FROM (optional), ADMIN_ALERT_EMAIL, SITE_URL (default https://www.peyzajbul.com),
//   CLAIM_URL_BASE (optional), ALLOWED_ORIGINS (optional), ENV ("dev" for local runs only).
//   SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//   This function itself uses OTP_PEPPER, RATE_LIMIT_SALT, DISPATCH_SECRET, ALLOWED_ORIGINS, ENV.
//
// Deploy (auth is enforced inside each function: Turnstile, leadId + code, x-dispatch-secret):
//   supabase functions deploy create-lead send-otp verify-otp dispatch-lead-notifications --no-verify-jwt

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { preflightResponse } from "../create-lead/cors.ts";
import { ConfigError, requireSecret } from "../create-lead/env.ts";
import { errorResponse, jsonResponse, logEvent, readJsonBody } from "../create-lead/http.ts";
import { getClientIp, hashKey, hitRateLimit } from "../create-lead/limits.ts";
import { OTP_IP_VERIFY_LIMIT, OTP_MAX_ATTEMPTS, hashCode, timingSafeEqualHex } from "../send-otp/otpCore.ts";
import { linkEstimateToVerifiedLead } from "./estimateLink.ts";
import { reconcilePhotoPaths } from "./photos.ts";

const FN = "verify-otp";
const PHOTO_BUCKET = "lead-photos";

const requestSchema = z.object({
  leadId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

interface AttemptRow {
  otp_state: "missing" | "consumed" | "expired" | "locked" | "ok";
  otp_hash: string | null;
  otp_salt: string | null;
  otp_attempts: number | null;
}

interface LeadRow {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  status_token: string;
  photo_urls: string[] | null;
}

interface FinalizeResult {
  ok?: boolean;
  routing_status?: string;
  admin_approved?: boolean;
}

interface SessionPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number | null;
  token_type: string;
}

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Finds the account for the lead's email or creates a homeowner account without any password. */
async function resolveUser(
  supabase: SupabaseClient,
  lead: LeadRow,
): Promise<{ userId: string; isNewUser: boolean }> {
  const lookup = async (): Promise<string | null> => {
    const { data, error } = await supabase.rpc("find_auth_user_id_by_email", { p_email: lead.email });
    if (error) throw new Error("user_lookup_failed");
    return typeof data === "string" ? data : null;
  };

  const existing = await lookup();
  if (existing) return { userId: existing, isNewUser: false };

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: lead.email,
    email_confirm: true,
    user_metadata: { full_name: lead.full_name, phone: lead.phone },
  });
  if (error || !created.user) {
    // A parallel request may have created the account a moment ago.
    const retry = await lookup();
    if (retry) return { userId: retry, isNewUser: false };
    throw new Error("user_create_failed");
  }
  return { userId: created.user.id, isNewUser: true };
}

/** Magic-link session for a homeowner account, minted through a separate anon-key client. */
async function mintSession(supabase: SupabaseClient, email: string): Promise<SessionPayload | null> {
  const { data: link, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) return null;

  const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error: verifyError } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (verifyError || !data.session) return null;

  const { access_token, refresh_token, expires_in, expires_at, token_type } = data.session;
  return { access_token, refresh_token, expires_in, expires_at: expires_at ?? null, token_type };
}

/** Log code of a failed account step: our own snake_case codes only, never a provider message. */
function accountErrorCode(error: unknown): string {
  return error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "unexpected";
}

/** Fire-and-forget call so alerts do not depend on pg_net or the Vault being configured. */
function triggerDispatch(leadId: string): void {
  const secret = Deno.env.get("DISPATCH_SECRET");
  const baseUrl = Deno.env.get("SUPABASE_URL");
  if (!secret || !baseUrl) {
    logEvent(FN, "DISPATCH_NOT_CONFIGURED", leadId);
    return;
  }

  const task = fetch(`${baseUrl}/functions/v1/dispatch-lead-notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-dispatch-secret": secret },
    body: JSON.stringify({ leadId }),
  })
    .then((response) => {
      if (!response.ok) logEvent(FN, `DISPATCH_HTTP_${response.status}`, leadId);
    })
    .catch(() => logEvent(FN, "DISPATCH_FAILED", leadId));

  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(task);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (req.method !== "POST") return errorResponse(req, "METHOD_NOT_ALLOWED");

  let leadId: string | undefined;
  try {
    const body = await readJsonBody(req);
    if (!body.ok) return errorResponse(req, body.code);

    const parsed = requestSchema.safeParse(body.body);
    if (!parsed.success) {
      return errorResponse(req, "VALIDATION_FAILED", {
        message: "Doğrulama kodu 6 haneli olmalıdır.",
        fieldErrors: { code: ["Doğrulama kodu 6 haneli olmalıdır."] },
      });
    }
    leadId = parsed.data.leadId;
    const { code } = parsed.data;

    const supabase = serviceClient();

    // Per-ip attempt limit.
    const ipHash = await hashKey(requireSecret("RATE_LIMIT_SALT"), `ip:${getClientIp(req.headers)}`);
    const ipOutcome = await hitRateLimit(supabase, { bucket: `otp-verify:ip:${ipHash}`, ...OTP_IP_VERIFY_LIMIT });
    if (!ipOutcome.allowed) {
      logEvent(FN, "RATE_LIMITED", leadId);
      return errorResponse(req, "RATE_LIMITED", { retryAfterSeconds: ipOutcome.retryAfterSeconds });
    }

    // Reserve one attempt (row lock in the database) and read the stored hash.
    const { data: attemptData, error: attemptError } = await supabase.rpc("lead_otp_register_attempt", {
      p_lead_id: leadId,
      p_max_attempts: OTP_MAX_ATTEMPTS,
    });
    if (attemptError) throw new Error("attempt_register_failed");
    const attempt = (Array.isArray(attemptData) ? attemptData[0] : attemptData) as AttemptRow | undefined;
    if (!attempt) throw new Error("attempt_register_failed");

    if (attempt.otp_state === "missing" || attempt.otp_state === "consumed") {
      return errorResponse(req, "INVALID_CODE");
    }
    if (attempt.otp_state === "expired") {
      return errorResponse(req, "CODE_EXPIRED");
    }
    if (attempt.otp_state === "locked" || !attempt.otp_hash || !attempt.otp_salt) {
      logEvent(FN, "LOCKED", leadId);
      return errorResponse(req, "LOCKED");
    }

    const submittedHash = await hashCode(code, attempt.otp_salt);
    if (!timingSafeEqualHex(submittedHash, attempt.otp_hash)) {
      const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - (attempt.otp_attempts ?? OTP_MAX_ATTEMPTS));
      return errorResponse(req, "INVALID_CODE", {
        attemptsLeft,
        message: attemptsLeft > 0 ? `Kod hatalı. ${attemptsLeft} deneme hakkınız kaldı.` : "Kod hatalı. Yeni kod isteyin.",
      });
    }

    // Consume atomically: a race or a replay cannot verify the lead twice.
    const { data: consumed, error: consumeError } = await supabase
      .from("lead_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("lead_id", leadId)
      .is("consumed_at", null)
      .select("lead_id");
    if (consumeError) throw new Error("otp_consume_failed");
    if (!consumed || consumed.length === 0) {
      return errorResponse(req, "INVALID_CODE");
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email, full_name, phone, status_token, photo_urls")
      .eq("id", leadId)
      .maybeSingle<LeadRow>();
    if (leadError || !lead) throw new Error("lead_read_failed");

    // Keep only the photos that actually reached the bucket.
    if (lead.photo_urls && lead.photo_urls.length > 0) {
      const { data: objects, error: listError } = await supabase.storage.from(PHOTO_BUCKET).list(leadId, { limit: 100 });
      if (!listError && objects) {
        const kept = reconcilePhotoPaths(lead.photo_urls, leadId, objects.map((object) => object.name));
        if (kept.length !== lead.photo_urls.length) {
          const { error: photoError } = await supabase
            .from("leads")
            .update({ photo_urls: kept.length > 0 ? kept : null })
            .eq("id", leadId);
          if (photoError) logEvent(FN, "PHOTO_RECONCILE_FAILED", leadId);
        }
      }
    }

    const { data: finalizeData, error: finalizeError } = await supabase.rpc("finalize_verified_lead", {
      p_lead_id: leadId,
    });
    const finalized = finalizeData as FinalizeResult | null;
    if (finalizeError || !finalized?.ok) {
      // Give the code back so the visitor can try again instead of being stuck.
      await supabase.from("lead_otps").update({ consumed_at: null }).eq("lead_id", leadId);
      throw new Error("finalize_failed");
    }

    // The lead is verified and routed from here on. Alerts go out first and nothing below may turn the
    // verification into an error: the account link can be repaired later, a routed lead cannot be undone.
    triggerDispatch(leadId);
    await linkEstimateToVerifiedLead(supabase, leadId, (code) => logEvent(FN, code, leadId));

    const routing =
      finalized.routing_status === "routed" || finalized.routing_status === "waiting_supply"
        ? finalized.routing_status
        : "needs_review";

    let session: SessionPayload | null = null;
    let isNewUser = false;
    try {
      // Account for the lead owner: found by email or created without a password.
      const account = await resolveUser(supabase, lead);
      const { error: ownerError } = await supabase.from("leads").update({ user_id: account.userId }).eq("id", leadId);
      if (ownerError) throw new Error("lead_owner_failed");

      // Admin, firm and any other non-homeowner account never get a session from an email code, so only an
      // explicit "not privileged" answer mints one (an error or an unexpected value yields no session).
      const { data: privileged, error: privilegedError } = await supabase.rpc("user_is_privileged", {
        p_uid: account.userId,
      });
      if (privilegedError) throw new Error("privilege_check_failed");
      if (privileged === false) {
        session = await mintSession(supabase, lead.email);
        if (!session) logEvent(FN, "SESSION_NOT_MINTED", leadId);
      }
      isNewUser = account.isNewUser;
    } catch (accountError) {
      session = null;
      isNewUser = false;
      logEvent(FN, `ACCOUNT_STEP_FAILED:${accountErrorCode(accountError)}`, leadId);
    }

    logEvent(FN, "VERIFIED", leadId);
    return jsonResponse(req, 200, {
      ok: true,
      leadId,
      verified: true,
      routing,
      statusToken: lead.status_token,
      session,
      isNewUser,
    });
  } catch (error) {
    logEvent(FN, error instanceof ConfigError ? `CONFIG_MISSING:${error.variable}` : "INTERNAL", leadId);
    return errorResponse(req, "INTERNAL");
  }
});
