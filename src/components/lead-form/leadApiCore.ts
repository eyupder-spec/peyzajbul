import {
  KVKK_VERSION,
  LEAD_FORM_CONFIG,
  SERVICE_TYPE_TO_LABEL,
  maskEmail,
  maskPhone,
  normalizePhone,
  parseEstimateToken,
  type LeadFormData,
  type LeadSource,
  type VerifyChannel,
} from "../../lib/leadFormData";
import type { Attribution } from "../../lib/analytics";
import type { LeadClosure, LeadStatusDTO, RoutingStatus } from "./leadStatus";

/**
 * Pure half of the lead API adapter: request body, response parsing and error mapping. It has no Supabase
 * import so unit tests can run it without environment variables. The network half is leadApi.ts.
 *
 * Contract (supabase/functions/create-lead, send-otp, verify-otp and the get_lead_status RPC): when the backend
 * changes, this file and leadApi.ts are the only places that need an edit.
 */

export type LeadApiErrorCode =
  | "validation"
  | "rate_limited"
  | "invalid_code"
  | "expired_code"
  | "locked"
  | "not_found"
  | "captcha"
  | "already_verified"
  | "delivery_failed"
  | "network"
  | "unknown";

export interface SignedUpload {
  path: string;
  token: string;
}

interface LeadApiErrorExtras {
  fieldErrors?: Record<string, string>;
  retryAfterSec?: number;
  attemptsLeft?: number;
  /** Set when the lead was stored although the call failed (the first code could not be delivered). */
  leadId?: string;
  uploads?: SignedUpload[];
}

export class LeadApiError extends Error {
  readonly code: LeadApiErrorCode;
  readonly fieldErrors?: Record<string, string>;
  readonly retryAfterSec?: number;
  readonly attemptsLeft?: number;
  readonly leadId?: string;
  readonly uploads?: SignedUpload[];

  constructor(code: LeadApiErrorCode, message: string, extras: LeadApiErrorExtras = {}) {
    super(message);
    this.name = "LeadApiError";
    this.code = code;
    this.fieldErrors = extras.fieldErrors;
    this.retryAfterSec = extras.retryAfterSec;
    this.attemptsLeft = extras.attemptsLeft;
    this.leadId = extras.leadId;
    this.uploads = extras.uploads;
  }
}

const SERVER_CODE_MAP: Record<string, LeadApiErrorCode> = {
  VALIDATION_FAILED: "validation",
  BAD_REQUEST: "validation",
  PAYLOAD_TOO_LARGE: "validation",
  CAPTCHA_FAILED: "captcha",
  RATE_LIMITED: "rate_limited",
  INVALID_CODE: "invalid_code",
  CODE_EXPIRED: "expired_code",
  LOCKED: "locked",
  NOT_FOUND: "not_found",
  ALREADY_VERIFIED: "already_verified",
  EMAIL_SEND_FAILED: "delivery_failed",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined => (typeof value === "string" && value ? value : undefined);
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function parseUploads(value: unknown): SignedUpload[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const path = asString(item.path);
    const token = asString(item.token);
    return path && token ? [{ path, token }] : [];
  });
}

function flattenFieldErrors(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const flat: Record<string, string> = {};
  for (const [field, messages] of Object.entries(value)) {
    const first = Array.isArray(messages) ? asString(messages[0]) : asString(messages);
    if (first) flat[field] = first;
  }
  return Object.keys(flat).length > 0 ? flat : undefined;
}

/** Maps the shared edge-function error body `{ ok: false, code, message, ... }` to a LeadApiError. */
export function mapErrorBody(body: unknown, status?: number): LeadApiError {
  const record = isRecord(body) ? body : {};
  const serverCode = asString(record.code);
  const code: LeadApiErrorCode = (serverCode && SERVER_CODE_MAP[serverCode]) || (status === 429 ? "rate_limited" : "unknown");
  return new LeadApiError(code, asString(record.message) ?? "İstek tamamlanamadı.", {
    fieldErrors: flattenFieldErrors(record.fieldErrors),
    retryAfterSec: asNumber(record.retryAfterSeconds),
    attemptsLeft: asNumber(record.attemptsLeft),
    leadId: asString(record.leadId),
    uploads: parseUploads(record.uploads),
  });
}

/** Turns what `supabase.functions.invoke` reports for a failed call into a LeadApiError. */
export async function readFunctionError(error: unknown): Promise<LeadApiError> {
  const name = isRecord(error) ? error.name : undefined;
  const context = isRecord(error) ? error.context : undefined;
  if (name === "FunctionsFetchError") return new LeadApiError("network", "Bağlantı hatası.");
  if (isRecord(context) && typeof context.json === "function") {
    let body: unknown = null;
    try {
      body = await (context as unknown as { json: () => Promise<unknown> }).json();
    } catch {
      body = null;
    }
    return mapErrorBody(body, asNumber(context.status));
  }
  return new LeadApiError("unknown", "Beklenmeyen bir hata oluştu.");
}

// --- create-lead ------------------------------------------------------------------------------

/** Photos are re-encoded in the browser before upload, so every announced file is a JPEG. */
export const PHOTO_EXTENSION = "jpg";

export interface CreateLeadContext {
  source: LeadSource;
  attribution: Attribution;
  sessionId?: string;
  targetFirmId?: string;
  /** Token of the saved calculator estimate the visitor came from; anything but the exact token format is not sent. */
  estimateToken?: string;
  /** Milliseconds since the form was shown; the backend flags implausibly fast submissions. */
  elapsedMs: number;
  /** Value of the hidden honeypot field (empty for people). */
  honeypot: string;
  turnstileToken?: string;
}

const orNull = (value: string): string | null => (value.trim() ? value.trim() : null);

export function buildCreateLeadBody(data: LeadFormData, ctx: CreateLeadContext) {
  const email = data.email.trim().toLowerCase();
  const attribution = ctx.attribution;
  return {
    projectType: data.projectType || "residential",
    // The backend accepts the slug as `serviceType` (alias of `serviceSlug`) and derives the stored label itself;
    // leads.service_type must keep holding the label because routing and pricing match on it.
    serviceType: data.serviceType,
    serviceLabel: SERVICE_TYPE_TO_LABEL[data.serviceType] ?? data.serviceType,
    areaSize: data.areaSize,
    city: data.city,
    district: orNull(data.district),
    budget: data.budget,
    timeline: data.timeline,
    propertyType: orNull(data.propertyType),
    currentCondition: orNull(data.currentCondition),
    scope: data.scope,
    irrigationType: orNull(data.irrigationType),
    irrigationSystem: orNull(data.irrigationSystem),
    waterSource: orNull(data.waterSource),
    notes: orNull(data.notes),
    address: orNull(data.address),
    fullName: data.fullName.trim(),
    phone: normalizePhone(data.phone),
    email: email || null,
    kvkkAccepted: true as const,
    consentVersion: KVKK_VERSION,
    photoExts: data.photos.map(() => PHOTO_EXTENSION),
    targetFirmId: ctx.targetFirmId ?? null,
    // Where the form was opened from, and the calculator estimate; create-lead links the estimate only after verification.
    kaynak: ctx.source,
    est: parseEstimateToken(ctx.estimateToken),
    attribution: {
      landingPath: attribution.landing_path,
      referrer: attribution.referrer,
      utmSource: attribution.utm_source,
      utmMedium: attribution.utm_medium,
      utmCampaign: attribution.utm_campaign,
      utmTerm: attribution.utm_term,
      utmContent: attribution.utm_content,
      gclid: attribution.gclid,
      firstTouchAt: attribution.captured_at,
      sessionId: ctx.sessionId,
    },
    turnstileToken: ctx.turnstileToken,
    elapsedMs: Math.max(0, Math.round(ctx.elapsedMs)),
    website: ctx.honeypot,
  };
}

export type CreateLeadBody = ReturnType<typeof buildCreateLeadBody>;

export interface LeadVerification {
  channel: VerifyChannel;
  destinationMasked: string;
  /** Seconds until a new code may be requested. */
  resendAfterSec: number;
  /** False when the lead is stored but the first code could not be delivered. */
  sent: boolean;
}

export type CreateLeadResult =
  | { deduped: true }
  | { deduped: false; leadId: string; statusToken: string | null; verification: LeadVerification; uploads: SignedUpload[] };

export const DEFAULT_RESEND_SECONDS = 60;

/** Where the code goes, masked for display. */
export function verifyDestination(data: Pick<LeadFormData, "email" | "phone">): string {
  return LEAD_FORM_CONFIG.verifyChannel === "email" ? maskEmail(data.email) : maskPhone(data.phone);
}

export function parseCreateLeadResponse(body: unknown, destinationMasked: string): CreateLeadResult {
  const record = isRecord(body) ? body : {};
  if (record.deduped === true) return { deduped: true };
  const leadId = asString(record.leadId);
  if (!leadId) throw new LeadApiError("unknown", "Talep oluşturulamadı.");
  const otp = isRecord(record.otp) ? record.otp : {};
  return {
    deduped: false,
    leadId,
    statusToken: asString(record.statusToken) ?? null,
    verification: {
      channel: LEAD_FORM_CONFIG.verifyChannel,
      destinationMasked,
      resendAfterSec: asNumber(otp.resendAfterSeconds) ?? DEFAULT_RESEND_SECONDS,
      sent: otp.sent !== false,
    },
    uploads: parseUploads(record.uploads),
  };
}

/** A create-lead failure that happened after the lead was stored: the visitor can still verify by requesting a new code. */
export function recoverStoredLead(error: LeadApiError, destinationMasked: string): CreateLeadResult | null {
  if (!error.leadId) return null;
  if (error.code !== "delivery_failed" && error.code !== "rate_limited") return null;
  return {
    deduped: false,
    leadId: error.leadId,
    statusToken: null,
    verification: {
      channel: LEAD_FORM_CONFIG.verifyChannel,
      destinationMasked,
      resendAfterSec: error.retryAfterSec ?? 0,
      sent: false,
    },
    uploads: error.uploads ?? [],
  };
}

// --- send-otp / verify-otp -----------------------------------------------------------------------

export interface VerifyResult {
  statusToken: string | null;
  session: { access_token: string; refresh_token: string } | null;
  routing: "routed" | "waiting_supply" | "needs_review" | null;
  /** The lead was already verified elsewhere; nothing new happened. */
  alreadyVerified?: boolean;
}

export function parseResendResponse(body: unknown): { resendAfterSec: number } {
  const otp = isRecord(body) && isRecord(body.otp) ? body.otp : {};
  return { resendAfterSec: asNumber(otp.resendAfterSeconds) ?? DEFAULT_RESEND_SECONDS };
}

export function parseVerifyResponse(body: unknown): VerifyResult {
  const record = isRecord(body) ? body : {};
  if (record.verified !== true) throw new LeadApiError("unknown", "Doğrulama tamamlanamadı.");
  const session = isRecord(record.session) ? record.session : null;
  const accessToken = session ? asString(session.access_token) : undefined;
  const refreshToken = session ? asString(session.refresh_token) : undefined;
  const routing = record.routing;
  return {
    statusToken: asString(record.statusToken) ?? null,
    session: accessToken && refreshToken ? { access_token: accessToken, refresh_token: refreshToken } : null,
    routing: routing === "routed" || routing === "waiting_supply" || routing === "needs_review" ? routing : null,
  };
}

// --- get_lead_status -----------------------------------------------------------------------------

const ROUTING_STATUSES: readonly RoutingStatus[] = [
  "pending",
  "routed",
  "waiting_supply",
  "needs_review",
  "rejected",
  "legacy_unrouted",
];

const count = (value: unknown): number => {
  const n = asNumber(value);
  return n !== undefined && n > 0 ? Math.floor(n) : 0;
};

const LEAD_STATUSES = ["unverified", "active", "purchased", "expired", "rejected"] as const;
const MAX_FIRST_NAME_LENGTH = 40;

/**
 * Maps the get_lead_status payload to the DTO. The RPC returns counts of firms that were notified and of firms
 * that bought the lead, plus the lead id, the first name only (greeting) and when the lead was routed; the last
 * three are absent until migration 20261022090100_leadint_status_greeting.sql is applied. "Verified" is read from the positive statuses only (active, purchased): 'expired' (the
 * verification window ran out) and 'rejected' never count as verified. Returns null for a payload that is not an
 * object (bad token or unknown lead) and for a status this page does not know, so it claims nothing about it.
 */
export function mapLeadStatus(id: string, raw: unknown): LeadStatusDTO | null {
  if (!isRecord(raw)) return null;
  const status = LEAD_STATUSES.find((known) => known === raw.status);
  if (!status) return null;
  const notified = count(raw.notified_count);
  const purchased = count(raw.purchased_count);
  const routing = raw.routing_status;
  const routingStatus = ROUTING_STATUSES.find((known) => known === routing) ?? "unknown";
  let closed: LeadClosure | null = null;
  if (status === "expired") closed = "expired";
  else if (status === "rejected" || routingStatus === "rejected") closed = "rejected";
  return {
    id: asString(raw.id) ?? id,
    firstName: asString(raw.first_name)?.trim().slice(0, MAX_FIRST_NAME_LENGTH) || null,
    serviceLabel: asString(raw.service_type) ?? "",
    city: asString(raw.city) ?? "",
    district: asString(raw.district) ?? null,
    createdAt: asString(raw.created_at) ?? "",
    routedAt: asString(raw.routed_at) ?? null,
    verified: status === "active" || status === "purchased",
    closed,
    routingStatus,
    matchedFirmCount: Math.max(notified, purchased),
    acceptedFirmCount: purchased,
  };
}
