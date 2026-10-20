// dispatch-lead-notifications: sends the queued lead notifications (public.notification_log).
//
// Channels: firm_email (Resend), firm_telegram (notify-telegram), homeowner_confirm / homeowner_update
// (Resend, to the lead's own address), admin_digest (Resend, to ADMIN_ALERT_EMAIL, with wa.me
// click-to-chat links the operator taps) and wa_link (wa.me URL for the operator queue, no paid API).
// No notification contains the homeowner's name, phone, email, address or notes.
//
// Auth: header x-dispatch-secret must equal DISPATCH_SECRET (constant-time compare). The function is not
// callable with an anon or user JWT, so it cannot be used as a mail relay. Deploy with --no-verify-jwt.
//
// Request:  POST { "leadId"?: "<uuid>", "limit"?: 1..25 }   (an empty body or {} sweeps the whole queue)
// Response: 200 { processed, sent, failed, skipped, waReady }
// Callers:  route_lead (through internal.call_edge), verify-otp (fire-and-forget) and a pg_cron sweep
//           every 5 minutes that retries queued and failed rows.
//
// Outcome handling: success -> status 'sent'; failure -> 'failed' with next_attempt_at backoff of
// 2 min, 10 min, 1 h, 6 h; after 5 attempts a row stays 'failed'. Missing RESEND_API_KEY marks email rows
// 'failed' with error 'resend_not_configured' instead of throwing.
//
// Required environment (values are never committed):
//   TURNSTILE_SECRET_KEY, OTP_PEPPER, RATE_LIMIT_SALT, DISPATCH_SECRET, RESEND_API_KEY,
//   RESEND_FROM (optional), ADMIN_ALERT_EMAIL, SITE_URL (default https://www.peyzajbul.com),
//   CLAIM_URL_BASE (optional, default SITE_URL + /firma-sahiplen), ALLOWED_ORIGINS (optional),
//   ENV ("dev" for local runs only).
//   SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//   This function itself uses DISPATCH_SECRET, RESEND_API_KEY, RESEND_FROM, ADMIN_ALERT_EMAIL, SITE_URL,
//   CLAIM_URL_BASE.
//
// Deploy (auth is enforced inside each function: Turnstile, leadId + code, x-dispatch-secret):
//   supabase functions deploy create-lead send-otp verify-otp dispatch-lead-notifications --no-verify-jwt

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readEnv, siteUrl } from "../create-lead/env.ts";
import { errorResponse, jsonResponse, logEvent } from "../create-lead/http.ts";
import { areaLabel, budgetLabel, timelineLabel } from "../create-lead/labels.ts";
import { secretsEqual } from "../send-otp/otpCore.ts";
import { DEFAULT_FROM, sendEmail } from "./resend.ts";
import {
  firmPanelUrl,
  renderAdminDigest,
  renderFirmEmail,
  renderHomeownerEmail,
  type AdminDigestKind,
  type FirmContact,
  type RenderedEmail,
  type TemplateLead,
} from "./templates.ts";
import { buildClaimOutreachMessage, buildFirmAlertMessage, buildWaMeUrl } from "./waLink.ts";

const FN = "dispatch-lead-notifications";
const MAX_BATCH = 25;
const CONCURRENCY = 5;
const MAX_ERROR_LENGTH = 500;
const BACKOFF_MS = [2 * 60_000, 10 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
const MAX_UNCLAIMED_LINKS = 5;

const requestSchema = z.object({
  leadId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(MAX_BATCH).optional(),
});

interface LogRow {
  id: string;
  dedupe_key: string;
  lead_id: string;
  assignment_id: string | null;
  firm_id: string | null;
  channel: string;
  status: string;
  attempts: number;
}

interface LeadRow extends TemplateLead {
  email: string;
  lead_score: number | null;
  status: string;
  admin_approved: boolean | null;
  project_size: string | null;
}

interface AssignmentRow {
  id: string;
  lead_id: string;
  firm_id: string;
  status: string;
  is_direct: boolean;
}

interface FirmRow {
  id: string;
  user_id: string | null;
  company_name: string;
  email: string | null;
  phone: string | null;
  slug: string | null;
  telegram_chat_id: string | null;
}

interface UnclaimedFirm {
  company_name: string;
  phone: string | null;
  slug: string | null;
}

interface Context {
  leads: Map<string, LeadRow>;
  firms: Map<string, FirmRow>;
  assignments: Map<string, AssignmentRow[]>;
}

type Outcome = "sent" | "failed" | "skipped";

const LEAD_COLUMNS =
  "id, email, service_type, city, district, area_size, project_size, budget, timeline, token_price, lead_score, status, admin_approved, routing_status, status_token, review_flags";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const unique = <T>(values: (T | null | undefined)[]): T[] => [...new Set(values.filter((value): value is T => value != null))];

function truncate(value: string): string {
  return value.length > MAX_ERROR_LENGTH ? value.slice(0, MAX_ERROR_LENGTH) : value;
}

function templateLead(lead: LeadRow): TemplateLead {
  return { ...lead, area_size: lead.area_size ?? lead.project_size };
}

/** Firm-facing messages only go out while the lead is approved and live. */
function leadIsLive(lead: LeadRow): boolean {
  return lead.admin_approved === true && (lead.status === "active" || lead.status === "purchased");
}

function assignedFirmsOf(ctx: Context, leadId: string): AssignmentRow[] {
  return (ctx.assignments.get(leadId) ?? []).filter((assignment) => assignment.status !== "declined");
}

function digestKind(dedupeKey: string): AdminDigestKind {
  if (dedupeKey.includes(":admin:supply_gap:")) return "supply_gap";
  if (dedupeKey.includes(":admin:needs_review")) return "needs_review";
  return "routed";
}

async function loadContext(supabase: SupabaseClient, rows: LogRow[]): Promise<Context> {
  const leadIds = unique(rows.map((row) => row.lead_id));
  const ctx: Context = { leads: new Map(), firms: new Map(), assignments: new Map() };
  if (leadIds.length === 0) return ctx;

  const { data: leads, error: leadsError } = await supabase.from("leads").select(LEAD_COLUMNS).in("id", leadIds);
  if (leadsError) throw new Error("leads_load_failed");
  for (const lead of (leads ?? []) as LeadRow[]) ctx.leads.set(lead.id, lead);

  const { data: assignments, error: assignmentsError } = await supabase
    .from("lead_assignments")
    .select("id, lead_id, firm_id, status, is_direct")
    .in("lead_id", leadIds);
  if (assignmentsError) throw new Error("assignments_load_failed");
  for (const assignment of (assignments ?? []) as AssignmentRow[]) {
    const list = ctx.assignments.get(assignment.lead_id) ?? [];
    list.push(assignment);
    ctx.assignments.set(assignment.lead_id, list);
  }

  const firmIds = unique([
    ...rows.map((row) => row.firm_id),
    ...((assignments ?? []) as AssignmentRow[]).map((assignment) => assignment.firm_id),
  ]);
  if (firmIds.length > 0) {
    const { data: firms, error: firmsError } = await supabase
      .from("firms")
      .select("id, user_id, company_name, email, phone, slug, telegram_chat_id")
      .in("id", firmIds);
    if (firmsError) throw new Error("firms_load_failed");
    for (const firm of (firms ?? []) as FirmRow[]) ctx.firms.set(firm.id, firm);
  }

  return ctx;
}

// ---------------------------------------------------------------------------------------------
// Outcome bookkeeping
// ---------------------------------------------------------------------------------------------

async function markSent(supabase: SupabaseClient, row: LogRow, providerMessageId: string | null): Promise<void> {
  await supabase
    .from("notification_log")
    .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerMessageId, error: null })
    .eq("id", row.id);
}

async function markFailed(supabase: SupabaseClient, row: LogRow, error: string): Promise<void> {
  const step = Math.min(Math.max(row.attempts, 1), BACKOFF_MS.length) - 1;
  await supabase
    .from("notification_log")
    .update({
      status: "failed",
      error: truncate(error),
      next_attempt_at: new Date(Date.now() + BACKOFF_MS[step]).toISOString(),
    })
    .eq("id", row.id);
}

async function markSkipped(supabase: SupabaseClient, row: LogRow, reason: string): Promise<void> {
  await supabase.from("notification_log").update({ status: "skipped", error: truncate(reason) }).eq("id", row.id);
}

/** First successful firm channel: record when the firm and the lead were first notified. */
async function markFirmNotified(supabase: SupabaseClient, row: LogRow): Promise<void> {
  const now = new Date().toISOString();
  if (row.assignment_id) {
    await supabase.from("lead_assignments").update({ notified_at: now }).eq("id", row.assignment_id).is("notified_at", null);
  }
  await supabase.from("leads").update({ first_notified_at: now }).eq("id", row.lead_id).is("first_notified_at", null);
}

async function deliverEmail(
  supabase: SupabaseClient,
  row: LogRow,
  to: string,
  mail: RenderedEmail,
): Promise<Outcome> {
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) {
    await markFailed(supabase, row, "resend_not_configured");
    return "failed";
  }
  const result = await sendEmail({
    apiKey,
    from: readEnv("RESEND_FROM") ?? DEFAULT_FROM,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: row.id,
  });
  if (!result.ok) {
    await markFailed(supabase, row, result.error);
    return "failed";
  }
  await markSent(supabase, row, result.id);
  return "sent";
}

// ---------------------------------------------------------------------------------------------
// Channel handlers
// ---------------------------------------------------------------------------------------------

async function firmEmailAddress(supabase: SupabaseClient, firm: FirmRow): Promise<string | null> {
  const direct = firm.email?.trim();
  if (direct && EMAIL_PATTERN.test(direct)) return direct;
  if (!firm.user_id) return null;
  const { data } = await supabase.auth.admin.getUserById(firm.user_id);
  const fallback = data?.user?.email?.trim();
  return fallback && EMAIL_PATTERN.test(fallback) ? fallback : null;
}

async function handleFirmEmail(supabase: SupabaseClient, ctx: Context, row: LogRow): Promise<Outcome> {
  const lead = ctx.leads.get(row.lead_id);
  const firm = row.firm_id ? ctx.firms.get(row.firm_id) : undefined;
  if (!lead || !firm) {
    await markSkipped(supabase, row, "lead_or_firm_missing");
    return "skipped";
  }
  if (!leadIsLive(lead)) {
    await markSkipped(supabase, row, "lead_not_active");
    return "skipped";
  }
  const to = await firmEmailAddress(supabase, firm);
  if (!to) {
    await markSkipped(supabase, row, "no_email");
    return "skipped";
  }

  const assignments = assignedFirmsOf(ctx, lead.id);
  const mail = renderFirmEmail({
    lead: templateLead(lead),
    assignedCount: assignments.length,
    isDirect: assignments.some((assignment) => assignment.id === row.assignment_id && assignment.is_direct),
    siteUrl: siteUrl(),
  });
  const outcome = await deliverEmail(supabase, row, to, mail);
  if (outcome === "sent") await markFirmNotified(supabase, row);
  return outcome;
}

async function handleFirmTelegram(supabase: SupabaseClient, ctx: Context, row: LogRow): Promise<Outcome> {
  const lead = ctx.leads.get(row.lead_id);
  const firm = row.firm_id ? ctx.firms.get(row.firm_id) : undefined;
  if (!lead || !firm) {
    await markSkipped(supabase, row, "lead_or_firm_missing");
    return "skipped";
  }
  if (!leadIsLive(lead)) {
    await markSkipped(supabase, row, "lead_not_active");
    return "skipped";
  }
  const chatId = firm.telegram_chat_id?.trim();
  if (!chatId) {
    await markSkipped(supabase, row, "no_chat_id");
    return "skipped";
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const baseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !baseUrl) {
    await markFailed(supabase, row, "telegram_not_configured");
    return "failed";
  }

  // notify-telegram appends " m²" to the area itself, so the unit is dropped from the label.
  const area = areaLabel(lead.area_size ?? lead.project_size).replace(/\s*m²/g, "").trim();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/functions/v1/notify-telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        chat_id: chatId,
        firm_name: firm.company_name,
        service_type: lead.service_type,
        city: lead.city,
        district: lead.district,
        budget: budgetLabel(lead.budget),
        area_size: area,
        timeline: timelineLabel(lead.timeline),
        lead_score: lead.lead_score,
      }),
    });
  } catch {
    await markFailed(supabase, row, "telegram unreachable");
    return "failed";
  }
  if (!response.ok) {
    await markFailed(supabase, row, `telegram ${response.status}`);
    return "failed";
  }

  await markSent(supabase, row, null);
  await markFirmNotified(supabase, row);
  return "sent";
}

async function handleHomeowner(
  supabase: SupabaseClient,
  ctx: Context,
  row: LogRow,
  kind: "confirm" | "update",
): Promise<Outcome> {
  const lead = ctx.leads.get(row.lead_id);
  if (!lead?.email) {
    await markSkipped(supabase, row, "no_email");
    return "skipped";
  }
  const mail = renderHomeownerEmail({ kind, lead: templateLead(lead), siteUrl: siteUrl() });
  return deliverEmail(supabase, row, lead.email, mail);
}

async function handleAdminDigest(supabase: SupabaseClient, ctx: Context, row: LogRow): Promise<Outcome> {
  const lead = ctx.leads.get(row.lead_id);
  if (!lead) {
    await markSkipped(supabase, row, "lead_missing");
    return "skipped";
  }
  const to = readEnv("ADMIN_ALERT_EMAIL")?.trim();
  if (!to) {
    await markFailed(supabase, row, "admin_email_not_configured");
    return "failed";
  }

  const base = siteUrl();
  const kind = digestKind(row.dedupe_key);
  const forTemplate = templateLead(lead);

  const assignedFirms: FirmContact[] = [];
  const unclaimedFirms: FirmContact[] = [];

  if (kind === "routed") {
    const message = buildFirmAlertMessage(forTemplate, firmPanelUrl(base, lead.id));
    for (const assignment of assignedFirmsOf(ctx, lead.id)) {
      const firm = ctx.firms.get(assignment.firm_id);
      if (!firm) continue;
      assignedFirms.push({ company_name: firm.company_name, phone: firm.phone, waUrl: buildWaMeUrl(firm.phone, message) });
    }
  } else if (kind === "supply_gap") {
    const claimBase = (readEnv("CLAIM_URL_BASE") ?? `${base}/firma-sahiplen`).replace(/\/+$/, "");
    const { data, error } = await supabase.rpc("unclaimed_firms_for_lead", {
      p_lead_id: lead.id,
      p_limit: MAX_UNCLAIMED_LINKS * 3,
    });
    if (error) {
      await markFailed(supabase, row, "unclaimed_lookup_failed");
      return "failed";
    }
    const candidates = ((data ?? []) as UnclaimedFirm[])
      .filter((firm) => firm.slug)
      .map((firm) => ({
        company_name: firm.company_name,
        phone: firm.phone,
        waUrl: buildWaMeUrl(firm.phone, buildClaimOutreachMessage(forTemplate, `${claimBase}/${firm.slug}`)),
      }));
    // Firms that can be reached on WhatsApp first, then the rest.
    unclaimedFirms.push(
      ...[...candidates.filter((firm) => firm.waUrl), ...candidates.filter((firm) => !firm.waUrl)].slice(0, MAX_UNCLAIMED_LINKS),
    );
  }

  const mail = renderAdminDigest({ kind, lead: forTemplate, assignedFirms, unclaimedFirms, siteUrl: base });
  return deliverEmail(supabase, row, to, mail);
}

async function processRow(supabase: SupabaseClient, ctx: Context, row: LogRow): Promise<Outcome> {
  switch (row.channel) {
    case "firm_email":
      return handleFirmEmail(supabase, ctx, row);
    case "firm_telegram":
      return handleFirmTelegram(supabase, ctx, row);
    case "homeowner_confirm":
      return handleHomeowner(supabase, ctx, row, "confirm");
    case "homeowner_update":
      return handleHomeowner(supabase, ctx, row, "update");
    case "admin_digest":
      return handleAdminDigest(supabase, ctx, row);
    default:
      await markSkipped(supabase, row, "unknown_channel");
      return "skipped";
  }
}

/** wa_link rows: fill the wa.me URL and hand them to the operator queue ('manual_pending'). */
async function prepareWaLinks(
  supabase: SupabaseClient,
  leadId: string | undefined,
  limit: number,
): Promise<{ ready: number; skipped: number }> {
  let query = supabase
    .from("notification_log")
    .select("id, dedupe_key, lead_id, assignment_id, firm_id, channel, status, attempts")
    .eq("channel", "wa_link")
    .eq("status", "queued")
    .order("created_at")
    .limit(limit);
  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error) throw new Error("wa_queue_load_failed");
  const rows = (data ?? []) as LogRow[];
  if (rows.length === 0) return { ready: 0, skipped: 0 };

  const ctx = await loadContext(supabase, rows);
  const base = siteUrl();
  let ready = 0;
  let skipped = 0;

  for (const row of rows) {
    const lead = ctx.leads.get(row.lead_id);
    const firm = row.firm_id ? ctx.firms.get(row.firm_id) : undefined;
    let reason: string | null = null;
    let waUrl: string | null = null;

    if (!lead || !firm) {
      reason = "lead_or_firm_missing";
    } else if (!leadIsLive(lead)) {
      reason = "lead_not_active";
    } else {
      waUrl = buildWaMeUrl(firm.phone, buildFirmAlertMessage(templateLead(lead), firmPanelUrl(base, lead.id)));
      if (!waUrl) reason = "invalid_phone";
    }

    if (waUrl) {
      await supabase.from("notification_log").update({ status: "manual_pending", wa_url: waUrl, error: null }).eq("id", row.id).eq("status", "queued");
      ready += 1;
    } else {
      await supabase.from("notification_log").update({ status: "skipped", error: reason }).eq("id", row.id).eq("status", "queued");
      skipped += 1;
    }
  }

  return { ready, skipped };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return errorResponse(req, "METHOD_NOT_ALLOWED");

  const expected = Deno.env.get("DISPATCH_SECRET");
  const provided = req.headers.get("x-dispatch-secret");
  // Fails closed: without a configured secret nothing is accepted.
  if (!expected || !provided || !(await secretsEqual(provided, expected))) {
    return errorResponse(req, "UNAUTHORIZED");
  }

  try {
    const text = await req.text();
    const parsed = requestSchema.safeParse(text.trim() === "" ? {} : JSON.parse(text));
    if (!parsed.success) return errorResponse(req, "VALIDATION_FAILED", { message: "Geçersiz istek." });
    const { leadId, limit = MAX_BATCH } = parsed.data;

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const wa = await prepareWaLinks(supabase, leadId, limit);

    const { data: claimed, error: claimError } = await supabase.rpc("claim_notification_batch", {
      p_limit: limit,
      p_lead_id: leadId ?? null,
    });
    if (claimError) throw new Error("claim_failed");
    const rows = (claimed ?? []) as LogRow[];

    const ctx = await loadContext(supabase, rows);
    const counts = { sent: 0, failed: 0, skipped: wa.skipped };

    for (let start = 0; start < rows.length; start += CONCURRENCY) {
      const chunk = rows.slice(start, start + CONCURRENCY);
      const settled = await Promise.allSettled(chunk.map((row) => processRow(supabase, ctx, row)));
      for (const [index, result] of settled.entries()) {
        if (result.status === "fulfilled") {
          counts[result.value] += 1;
        } else {
          // The row was claimed ('sending'); record a generic failure so it is retried with backoff.
          logEvent(FN, "ROW_FAILED", chunk[index].lead_id);
          await markFailed(supabase, chunk[index], "unexpected_error");
          counts.failed += 1;
        }
      }
    }

    return jsonResponse(req, 200, { processed: rows.length, ...counts, waReady: wa.ready });
  } catch (error) {
    logEvent(FN, error instanceof SyntaxError ? "BAD_JSON" : "INTERNAL");
    return error instanceof SyntaxError ? errorResponse(req, "BAD_REQUEST") : errorResponse(req, "INTERNAL");
  }
});
