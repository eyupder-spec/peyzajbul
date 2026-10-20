import { SERVICE_TYPE_TO_LABEL } from "./labels.ts";
import type { LeadInput } from "./validate.ts";

// Builds the row create-lead inserts into public.leads. Pure module.
//
// Deliberately absent: admin_approved, token_price, price_jeton, assigned_firms, lead_score and
// user_id. The status columns are fixed here and the prices and score come from database triggers,
// so a client can never choose them.

export const TOO_FAST_THRESHOLD_MS = 3000;

export interface LeadRowContext {
  /** Generated up front so the photo paths can be predetermined. */
  leadId: string;
  /** Returns a fresh unique id for each photo path. */
  newPhotoId: () => string;
  /** Existing, approved firm the form was opened from; null otherwise. */
  targetFirmId: string | null;
  ipHash: string;
  nowIso: string;
}

export interface LeadRow {
  id: string;
  project_type: string;
  service_type: string;
  service_slug: string;
  project_size: string;
  area_size: string;
  scope: string[] | null;
  irrigation_type: string | null;
  irrigation_system: string | null;
  water_source: string | null;
  property_type: string | null;
  current_condition: string | null;
  budget: string;
  timeline: string;
  city: string;
  district: string | null;
  address: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  full_name: string;
  phone: string;
  email: string;
  status: "unverified";
  admin_approved: false;
  routing_status: "pending";
  user_id: null;
  review_flags: string[];
  target_firm_id: string | null;
  landing_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  client_session_id: string | null;
  first_touch_at: string | null;
  ip_hash: string;
  kvkk_accepted_at: string;
  kvkk_version: string | null;
  // Exist only after 20261022090000_leadint_lead_columns.sql is applied; see withoutOptionalColumns.
  lead_source: string | null;
  estimate_token: string | null;
}

/** Columns of public.leads that come from the not yet applied migration 20261022090000_leadint_lead_columns.sql. */
export const OPTIONAL_LEAD_COLUMNS = ["lead_source", "estimate_token"] as const;

/** The row without those columns: what create-lead inserts as long as the migration is not applied. */
export function withoutOptionalColumns(row: LeadRow): Omit<LeadRow, (typeof OPTIONAL_LEAD_COLUMNS)[number]> {
  const { lead_source: _source, estimate_token: _token, ...legacy } = row;
  return legacy;
}

/**
 * True for a PostgREST (PGRST204) or Postgres (42703) "unknown column" answer that names one of the optional
 * columns, i.e. the migration is missing. Any other error is a real failure and stays one.
 */
export function isMissingOptionalColumnError(error: { code?: unknown; message?: unknown } | null | undefined): boolean {
  if (!error || (error.code !== "PGRST204" && error.code !== "42703")) return false;
  const message = typeof error.message === "string" ? error.message : "";
  return OPTIONAL_LEAD_COLUMNS.some((column) => message.includes(column));
}

/** Review flags known at creation time. */
export function initialReviewFlags(input: Pick<LeadInput, "elapsedMs">): string[] {
  return typeof input.elapsedMs === "number" && input.elapsedMs < TOO_FAST_THRESHOLD_MS ? ["too_fast"] : [];
}

function validIsoOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** Storage paths inside the lead-photos bucket: "<leadId>/<uuid>.<ext>". */
export function buildPhotoPaths(leadId: string, extensions: string[], newPhotoId: () => string): string[] {
  return extensions.map((ext) => `${leadId}/${newPhotoId()}.${ext}`);
}

export function buildLeadRow(input: LeadInput, context: LeadRowContext): { row: LeadRow; photoPaths: string[] } {
  const photoPaths = buildPhotoPaths(context.leadId, input.photoExts, context.newPhotoId);
  const attribution = input.attribution;

  const row: LeadRow = {
    id: context.leadId,
    project_type: input.projectType,
    // Keeps the label the firm-side screens and firms.services matching use.
    service_type: SERVICE_TYPE_TO_LABEL[input.serviceSlug],
    service_slug: input.serviceSlug,
    project_size: input.areaSize,
    area_size: input.areaSize,
    scope: input.scope.length > 0 ? input.scope : null,
    irrigation_type: input.irrigationType ?? null,
    irrigation_system: input.irrigationSystem ?? null,
    water_source: input.waterSource ?? null,
    property_type: input.propertyType ?? null,
    current_condition: input.currentCondition ?? null,
    budget: input.budget,
    timeline: input.timeline,
    city: input.city,
    district: input.district ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
    photo_urls: photoPaths.length > 0 ? photoPaths : null,
    full_name: input.fullName,
    phone: input.phone,
    email: input.email,
    status: "unverified",
    admin_approved: false,
    routing_status: "pending",
    user_id: null,
    review_flags: initialReviewFlags(input),
    target_firm_id: context.targetFirmId,
    landing_path: attribution.landingPath || null,
    referrer: attribution.referrer || null,
    utm_source: attribution.utmSource || null,
    utm_medium: attribution.utmMedium || null,
    utm_campaign: attribution.utmCampaign || null,
    utm_term: attribution.utmTerm || null,
    utm_content: attribution.utmContent || null,
    gclid: attribution.gclid || null,
    client_session_id: attribution.sessionId || null,
    first_touch_at: validIsoOrNull(attribution.firstTouchAt),
    ip_hash: context.ipHash,
    kvkk_accepted_at: context.nowIso,
    kvkk_version: input.consentVersion ?? null,
    lead_source: input.source ?? null,
    estimate_token: input.estimateToken ?? null,
  };

  return { row, photoPaths };
}
