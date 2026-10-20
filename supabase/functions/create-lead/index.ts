// create-lead: the only way a lead enters the database.
//
// Pipeline (in this order): body size and JSON -> zod validation -> Turnstile -> rate limits ->
// dedupe -> insert (service role) -> signed photo upload URLs -> first email code.
// The browser no longer inserts into public.leads; status, approval, routing and prices are
// decided here and by database triggers, never by the client.
//
// Two optional request fields come from the cost calculator hand-off: `kaynak` (where the form was opened from)
// is stored as leads.lead_source, and `est` (token of the saved calculator estimate) as leads.estimate_token.
// The estimate is NOT linked here: verify-otp calls public.link_lead_artifacts after the code is confirmed, so an
// unverified lead never claims an estimate. Both columns come from 20261022090000_leadint_lead_columns.sql; until
// it is applied the lead is stored without them.
//
// Request:  POST JSON, see the contract at the top of validate.ts (turnstileToken is required).
// Success:  200 { ok: true, leadId, statusToken, otp: { sent, expiresInSeconds, resendAfterSeconds },
//                 uploads: [{ path, token }], deduped: false }
//           200 { ok: true, deduped: true } when a verified lead for the same email, service and city
//           exists from the last 24 hours (no identifiers are returned).
//           200 { ok: true } for a tripped honeypot (nothing is stored).
// Errors:   { ok: false, code, message, fieldErrors?, retryAfterSeconds? }
//           422 VALIDATION_FAILED, 403 CAPTCHA_FAILED, 429 RATE_LIMITED (+ Retry-After),
//           502 EMAIL_SEND_FAILED (lead is stored as 'unverified'; leadId is returned so the code can
//           be resent), 500 INTERNAL.
//
// Required environment (values are never committed):
//   TURNSTILE_SECRET_KEY, OTP_PEPPER, RATE_LIMIT_SALT, DISPATCH_SECRET, RESEND_API_KEY,
//   RESEND_FROM (optional), ADMIN_ALERT_EMAIL, SITE_URL (default https://www.peyzajbul.com),
//   CLAIM_URL_BASE (optional), ALLOWED_ORIGINS (optional), ENV ("dev" for local runs only).
//   SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//   This function itself uses TURNSTILE_SECRET_KEY, OTP_PEPPER, RATE_LIMIT_SALT, RESEND_API_KEY,
//   RESEND_FROM, ALLOWED_ORIGINS, ENV. A missing TURNSTILE_SECRET_KEY fails closed unless ENV=dev.
//
// Deploy (auth is enforced inside each function: Turnstile, leadId + code, x-dispatch-secret):
//   supabase functions deploy create-lead send-otp verify-otp dispatch-lead-notifications --no-verify-jwt

import { createClient } from "@supabase/supabase-js";
import { issueAndSendOtp } from "../send-otp/otpCore.ts";
import { allowedHostnames, preflightResponse } from "./cors.ts";
import { ConfigError, isDevEnv, requireSecret } from "./env.ts";
import { errorResponse, jsonResponse, logEvent, readJsonBody } from "./http.ts";
import { buildLeadRow, isMissingOptionalColumnError, withoutOptionalColumns } from "./leadRow.ts";
import { CREATE_LEAD_LIMITS, enforceRateLimits, getClientIp, hashKey } from "./limits.ts";
import { verifyTurnstile } from "./turnstile.ts";
import { isHoneypotTripped, parseLeadInput } from "./validate.ts";

const FN = "create-lead";
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const PHOTO_BUCKET = "lead-photos";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (req.method !== "POST") return errorResponse(req, "METHOD_NOT_ALLOWED");

  let leadId: string | undefined;
  try {
    const body = await readJsonBody(req);
    if (!body.ok) return errorResponse(req, body.code);

    // Bots fill the hidden field; answer like a success and store nothing.
    if (isHoneypotTripped(body.body)) return jsonResponse(req, 200, { ok: true });

    // (1) Validation. Unknown keys such as admin_approved or token_price are dropped here.
    const parsed = parseLeadInput(body.body);
    if (!parsed.success) {
      return errorResponse(req, "VALIDATION_FAILED", { fieldErrors: parsed.fieldErrors });
    }
    const input = parsed.data;

    // (2) Turnstile.
    const ip = getClientIp(req.headers);
    const turnstile = await verifyTurnstile({
      token: input.turnstileToken,
      remoteIp: ip,
      secret: Deno.env.get("TURNSTILE_SECRET_KEY"),
      allowedHostnames: allowedHostnames(),
      isDev: isDevEnv(),
    });
    if (!turnstile.ok) {
      logEvent(FN, `CAPTCHA_FAILED:${turnstile.reason}`);
      return errorResponse(req, "CAPTCHA_FAILED");
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // (3) Rate limits on salted hashes.
    const salt = requireSecret("RATE_LIMIT_SALT");
    const ipHash = await hashKey(salt, `ip:${ip}`);
    const emailHash = await hashKey(salt, `email:${input.email}`);
    const phoneHash = await hashKey(salt, `phone:${input.phone}`);
    const limit = CREATE_LEAD_LIMITS;
    const outcome = await enforceRateLimits(supabase, [
      { bucket: `lead:ip:h:${ipHash}`, ...limit.ipHour },
      { bucket: `lead:ip:d:${ipHash}`, ...limit.ipDay },
      { bucket: `lead:email:h:${emailHash}`, ...limit.emailHour },
      { bucket: `lead:phone:d:${phoneHash}`, ...limit.phoneDay },
    ]);
    if (!outcome.allowed) {
      logEvent(FN, "RATE_LIMITED");
      return errorResponse(req, "RATE_LIMITED", { retryAfterSeconds: outcome.retryAfterSeconds });
    }

    // (4) Dedupe: a verified lead for the same email, service and city in the last 24 hours.
    // Nothing identifying is returned; unverified duplicates are allowed.
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: duplicates, error: dedupeError } = await supabase
      .from("leads")
      .select("id")
      .eq("email", input.email)
      .eq("service_slug", input.serviceSlug)
      .eq("city", input.city)
      .not("email_verified_at", "is", null)
      .gte("created_at", since)
      .limit(1);
    if (dedupeError) throw new Error("dedupe_failed");
    if (duplicates && duplicates.length > 0) {
      return jsonResponse(req, 200, { ok: true, deduped: true });
    }

    // The target firm is kept only when it exists and is approved.
    let targetFirmId: string | null = null;
    if (input.targetFirmId) {
      const { data: firm, error: firmError } = await supabase
        .from("firms")
        .select("id")
        .eq("id", input.targetFirmId)
        .eq("is_approved", true)
        .maybeSingle();
      if (firmError) throw new Error("firm_lookup_failed");
      targetFirmId = firm?.id ?? null;
    }

    // (5) Insert with the service role. If the optional columns do not exist yet, the same lead is stored without them.
    leadId = crypto.randomUUID();
    const { row, photoPaths } = buildLeadRow(input, {
      leadId,
      newPhotoId: () => crypto.randomUUID(),
      targetFirmId,
      ipHash,
      nowIso: new Date().toISOString(),
    });
    let insert = await supabase.from("leads").insert(row).select("id, status_token").single();
    if (insert.error && isMissingOptionalColumnError(insert.error)) {
      logEvent(FN, "LEAD_COLUMNS_MISSING", leadId);
      insert = await supabase.from("leads").insert(withoutOptionalColumns(row)).select("id, status_token").single();
    }
    const { data: inserted, error: insertError } = insert;
    if (insertError || !inserted) throw new Error("lead_insert_failed");

    // (6) Signed upload URLs for the photos the client announced.
    const uploads: { path: string; token: string }[] = [];
    for (const path of photoPaths) {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
      if (error || !data) {
        // verify-otp drops announced photos that never reached the bucket.
        logEvent(FN, "UPLOAD_URL_FAILED", leadId);
        continue;
      }
      uploads.push({ path, token: data.token });
    }

    // (7) First email code. A failure keeps the lead 'unverified' (recoverable from the admin list).
    const otp = await issueAndSendOtp(supabase, { id: leadId, email: input.email }, { ipHash });
    if (!otp.ok) {
      logEvent(FN, otp.code, leadId);
      if (otp.code === "RATE_LIMITED") {
        return errorResponse(req, "RATE_LIMITED", { retryAfterSeconds: otp.retryAfterSeconds, leadId, uploads });
      }
      return errorResponse(req, "EMAIL_SEND_FAILED", { leadId, uploads });
    }

    logEvent(FN, "CREATED", leadId);
    return jsonResponse(req, 200, {
      ok: true,
      leadId,
      statusToken: inserted.status_token,
      otp: { sent: true, expiresInSeconds: otp.expiresInSeconds, resendAfterSeconds: otp.resendAfterSeconds },
      uploads,
      deduped: false,
    });
  } catch (error) {
    logEvent(FN, error instanceof ConfigError ? `CONFIG_MISSING:${error.variable}` : "INTERNAL", leadId);
    return errorResponse(req, "INTERNAL");
  }
});
