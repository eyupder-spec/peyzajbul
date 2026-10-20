// send-otp: resend endpoint for the one-time email code of a lead created by create-lead.
//
// Request:  POST { "leadId": "<uuid>" }  (nothing else is read; the destination address always
//           comes from the leads row, so the endpoint cannot be used to mail arbitrary addresses)
// Success:  200 { ok: true, otp: { sent: true, expiresInSeconds: 600, resendAfterSeconds: 60 } }
// Errors:   { ok: false, code, message, retryAfterSeconds? } with 404 NOT_FOUND, 409 ALREADY_VERIFIED,
//           422 VALIDATION_FAILED, 429 RATE_LIMITED, 502 EMAIL_SEND_FAILED, 500 INTERNAL
//
// There is no Turnstile token here by design (tokens are single use). Abuse is bounded because a
// leadId only exists after a Turnstile-gated create-lead, each lead allows 3 codes with 60 s between
// them, and the per-ip (10 per 15 minutes) and per-email (3 per hour) limits apply.
//
// Required environment (values are never committed):
//   TURNSTILE_SECRET_KEY, OTP_PEPPER, RATE_LIMIT_SALT, DISPATCH_SECRET, RESEND_API_KEY,
//   RESEND_FROM (optional), ADMIN_ALERT_EMAIL, SITE_URL (default https://www.peyzajbul.com),
//   CLAIM_URL_BASE (optional), ALLOWED_ORIGINS (optional), ENV ("dev" for local runs only).
//   SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//   This function itself uses OTP_PEPPER, RATE_LIMIT_SALT, RESEND_API_KEY, RESEND_FROM, ALLOWED_ORIGINS, ENV.
//
// Deploy (auth is enforced inside each function: Turnstile, leadId + code, x-dispatch-secret):
//   supabase functions deploy create-lead send-otp verify-otp dispatch-lead-notifications --no-verify-jwt

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { preflightResponse } from "../create-lead/cors.ts";
import { ConfigError, requireSecret } from "../create-lead/env.ts";
import { errorResponse, jsonResponse, logEvent, readJsonBody } from "../create-lead/http.ts";
import { getClientIp, hashKey } from "../create-lead/limits.ts";
import { issueAndSendOtp } from "./otpCore.ts";

const FN = "send-otp";

const requestSchema = z.object({ leadId: z.string().uuid() });

interface LeadRow {
  id: string;
  email: string;
  status: string;
  email_verified_at: string | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (req.method !== "POST") return errorResponse(req, "METHOD_NOT_ALLOWED");

  try {
    const body = await readJsonBody(req);
    if (!body.ok) return errorResponse(req, body.code);

    const parsed = requestSchema.safeParse(body.body);
    if (!parsed.success) {
      return errorResponse(req, "VALIDATION_FAILED", { message: "Geçersiz istek.", fieldErrors: { leadId: ["Geçersiz değer."] } });
    }
    const { leadId } = parsed.data;

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email, status, email_verified_at")
      .eq("id", leadId)
      .maybeSingle<LeadRow>();
    if (leadError) throw new Error("lead_read_failed");
    if (!lead) return errorResponse(req, "NOT_FOUND");
    if (lead.status !== "unverified" || lead.email_verified_at) return errorResponse(req, "ALREADY_VERIFIED");

    const ipHash = await hashKey(requireSecret("RATE_LIMIT_SALT"), `ip:${getClientIp(req.headers)}`);
    const issued = await issueAndSendOtp(supabase, { id: lead.id, email: lead.email }, { ipHash });

    if (!issued.ok) {
      if (issued.code === "RATE_LIMITED") {
        logEvent(FN, "RATE_LIMITED", leadId);
        return errorResponse(req, "RATE_LIMITED", { retryAfterSeconds: issued.retryAfterSeconds });
      }
      logEvent(FN, "EMAIL_SEND_FAILED", leadId);
      return errorResponse(req, "EMAIL_SEND_FAILED", { leadId });
    }

    return jsonResponse(req, 200, {
      ok: true,
      otp: { sent: true, expiresInSeconds: issued.expiresInSeconds, resendAfterSeconds: issued.resendAfterSeconds },
    });
  } catch (error) {
    logEvent(FN, error instanceof ConfigError ? `CONFIG_MISSING:${error.variable}` : "INTERNAL");
    return errorResponse(req, "INTERNAL");
  }
});
