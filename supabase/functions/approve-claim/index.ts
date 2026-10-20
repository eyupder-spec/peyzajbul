// approve-claim: admin decisions on claim requests (claim_requests), called from AdminClaimTab.
//
// POST {claim_id, action, reason?} with the admin's session token (verify_jwt stays false in config.toml:
// the admin check is requireAdmin below).
//   approve       -> {success:true,status:'approved',credit:{granted,amount,reason?},login_url,whatsapp_text,email_sent}
//   reject        -> {success:true,status:'rejected'}
//   revoke        -> {success:true,status:'revoked',owner_restored}   dispute handling, undoes an approval
//   grant_credit  -> {success:true,credit:{...}}                      retry of the first-lead credit
// Errors are {error:<code>} with a status; the detail is logged, never returned.
//
// Ownership moves only through the database function claim_apply_ownership (one transaction). The firm's
// phone and e-mail are never overwritten with claimant-supplied values.
//
// Secrets: RESEND_API_KEY, RESEND_FROM (optional), SITE_URL, CLAIM_FIRST_LEAD_CREDIT (default 10, 0 = off),
// ALLOWED_ORIGINS (optional).

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse, readJson } from "../_shared/http.ts";
import { clampText, isUuid } from "../_shared/security.ts";
import { creditAmount, grantFirstLeadCredit, type CreditResult } from "../claim-firm/credit.ts";
import { deliverMail, renderClaimApprovedEmail } from "../claim-firm/mail.ts";

type AdminClient = SupabaseClient;

class ActionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ActionError";
    this.status = status;
    this.code = code;
  }
}

interface ClaimRow {
  id: string;
  firm_id: string;
  user_id: string;
  status: string;
  kind: string | null;
  verification_method: string | null;
  email_verified_at: string | null;
  email: string | null;
  credit_granted_at: string | null;
}

function env(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function loginUrl(): string {
  return `${(env("SITE_URL") ?? "https://www.peyzajbul.com").replace(/\/+$/, "")}/firma/giris`;
}

/** Ready-to-send WhatsApp text: firms that came through the WhatsApp track have no inbox the admin can reach. */
function approvalWhatsAppText(companyName: string, url: string): string {
  return `Merhaba, ${companyName} profil sahiplenme başvurunuz onaylandı. Firma panelinize ${url} adresinden girebilirsiniz: başvuruda kullandığınız e-posta adresini yazın, size 6 haneli bir kod göndereceğiz. Şifre gerekmez.`;
}

function creditBody(result: CreditResult): Record<string, unknown> {
  return result.granted
    ? { granted: true, amount: result.amount }
    : { granted: false, amount: result.amount, reason: result.reason };
}

async function loadClaim(admin: AdminClient, claimId: string): Promise<ClaimRow> {
  const { data, error } = await admin
    .from("claim_requests")
    .select("id, firm_id, user_id, status, kind, verification_method, email_verified_at, email, credit_granted_at")
    .eq("id", claimId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError(404, "claim_not_found");
  return data as ClaimRow;
}

async function grantCredit(admin: AdminClient, claim: ClaimRow): Promise<CreditResult> {
  const amount = creditAmount(env("CLAIM_FIRST_LEAD_CREDIT"));
  const result = await grantFirstLeadCredit((fn, args) => admin.rpc(fn, args), claim.firm_id, amount).catch(
    (err): CreditResult => {
      console.error("[approve-claim] credit failed:", err);
      return { granted: false, amount, reason: "rpc_error" };
    },
  );

  // A replay means the ledger already holds this firm's credit: stop showing the claim as waiting for one.
  if (result.granted || result.reason === "already_granted") {
    const { error } = await admin
      .from("claim_requests")
      .update({ credit_granted_at: new Date().toISOString() })
      .eq("id", claim.id);
    if (error) console.error("[approve-claim] credit stamp failed:", error.code, error.message);
  }
  return result;
}

/** The address that can actually log in is the account's own; the typed claim address is the fallback. */
async function ownerEmail(admin: AdminClient, claim: ClaimRow): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(claim.user_id);
  return data?.user?.email ?? claim.email ?? null;
}

async function approve(admin: AdminClient, adminUserId: string, claim: ClaimRow): Promise<Record<string, unknown>> {
  if (claim.status !== "pending") throw new ActionError(409, "claim_not_pending");
  // Legacy rows were vouched for by hand ('manual'); everything else must have proven its e-mail address.
  if (!claim.email_verified_at && claim.verification_method !== "manual") {
    throw new ActionError(409, "email_not_verified");
  }

  const { error } = await admin.rpc("claim_apply_ownership", { p_claim_id: claim.id, p_approved_by: adminUserId });
  if (error) {
    if (/already_claimed/.test(error.message)) throw new ActionError(409, "already_claimed");
    if (/user_has_firm/.test(error.message)) throw new ActionError(409, "user_has_firm");
    if (/claim_not_pending/.test(error.message)) throw new ActionError(409, "claim_not_pending");
    if (/firm_not_found/.test(error.message)) throw new ActionError(404, "firm_not_found");
    throw error;
  }

  // The firm belongs to the claimant now: nothing below may turn the approval into an error.
  const credit = await grantCredit(admin, claim);
  const url = loginUrl();

  let companyName = "Firmanız";
  let emailSent = false;
  try {
    const { data: firm } = await admin.from("firms").select("company_name").eq("id", claim.firm_id).maybeSingle();
    companyName = firm?.company_name ?? companyName;

    const apiKey = env("RESEND_API_KEY");
    const to = await ownerEmail(admin, claim);
    if (apiKey && to) {
      const mail = renderClaimApprovedEmail({
        companyName,
        loginUrl: url,
        variant: "approved",
        creditAmount: credit.granted ? credit.amount : null,
      });
      const sent = await deliverMail({ apiKey, from: env("RESEND_FROM") }, to, mail, `claim-approved-${claim.id}`);
      emailSent = sent.ok;
      if (!sent.ok) console.error("[approve-claim] approval mail failed:", sent.status, sent.error);
    }
  } catch (err) {
    console.error("[approve-claim] approval notice failed:", err);
  }

  return {
    success: true,
    status: "approved",
    credit: creditBody(credit),
    login_url: url,
    whatsapp_text: approvalWhatsAppText(companyName, url),
    email_sent: emailSent,
  };
}

async function reject(admin: AdminClient, claim: ClaimRow, reason: string): Promise<Record<string, unknown>> {
  if (claim.status !== "pending") throw new ActionError(409, "claim_not_pending");
  const { error } = await admin
    .from("claim_requests")
    .update({ status: "rejected", rejected_reason: reason || null })
    .eq("id", claim.id)
    .eq("status", "pending");
  if (error) throw error;
  return { success: true, status: "rejected" };
}

async function revoke(
  admin: AdminClient,
  adminUserId: string,
  claim: ClaimRow,
  reason: string,
): Promise<Record<string, unknown>> {
  if (claim.status !== "approved") throw new ActionError(409, "claim_not_approved");
  const { data, error } = await admin.rpc("claim_revoke_ownership", {
    p_claim_id: claim.id,
    p_admin: adminUserId,
    p_reason: reason || null,
  });
  if (error) {
    if (/claim_not_approved/.test(error.message)) throw new ActionError(409, "claim_not_approved");
    throw error;
  }
  const restored = data && typeof data === "object" ? (data as { owner_restored?: unknown }).owner_restored : null;
  return { success: true, status: "revoked", owner_restored: restored === true };
}

async function retryCredit(admin: AdminClient, claim: ClaimRow): Promise<Record<string, unknown>> {
  if (claim.status !== "approved") throw new ActionError(409, "claim_not_approved");
  if (claim.credit_granted_at) throw new ActionError(409, "credit_already_granted");
  return { success: true, credit: creditBody(await grantCredit(admin, claim)) };
}

const ACTIONS = ["approve", "reject", "revoke", "grant_credit"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "method_not_allowed" }, 405);

  try {
    const { user, admin } = await requireAdmin(req);
    const body = await readJson(req);
    if (!isUuid(body.claim_id) || !isAction(body.action)) {
      return jsonResponse(req, { error: "invalid_request" }, 400);
    }
    const reason = clampText(body.reason, 200);

    const claim = await loadClaim(admin, body.claim_id);

    switch (body.action) {
      case "approve":
        return jsonResponse(req, await approve(admin, user.id, claim));
      case "reject":
        return jsonResponse(req, await reject(admin, claim, reason));
      case "revoke":
        return jsonResponse(req, await revoke(admin, user.id, claim, reason));
      case "grant_credit":
        return jsonResponse(req, await retryCredit(admin, claim));
    }
  } catch (err) {
    if (err instanceof ActionError) return jsonResponse(req, { error: err.code }, err.status);
    if (err instanceof HttpError) {
      const code = err.status === 401 ? "unauthorized" : err.status === 403 ? "forbidden" : "invalid_request";
      return jsonResponse(req, { error: code }, err.status);
    }
    console.error("[approve-claim] unhandled:", err);
    return jsonResponse(req, { error: "internal" }, 500);
  }
});
