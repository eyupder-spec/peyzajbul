/**
 * Lead routing helpers shared by the firm panel, the admin explainer and the unit tests.
 *
 * The SQL function `route_lead` (supabase/migrations/20261020150200_lead_pipeline_routing.sql) is the
 * source of truth for which firms a lead is routed to. `rankFirmsForLead` reproduces its eligibility,
 * scoring and tie-break order so tests and a future "neden bu firma?" explainer share one definition.
 *
 * `phone.ts` in supabase/functions/create-lead/ must stay behaviourally identical to `normalizeTrMobile`
 * and `toWhatsAppNumber` here, and `buildFirmAlertMessage` must keep the wording of the dispatcher's
 * wa_link message (supabase/functions/dispatch-lead-notifications/waLink.ts). Tests compare both.
 *
 * Pure TypeScript: no React, no Supabase client, no Deno globals.
 */

// ---------------------------------------------------------------------------------------------
// Status vocabularies (mirror the CHECK constraints of the lead pipeline migrations)
// ---------------------------------------------------------------------------------------------

export type LeadRoutingStatus =
  | "pending"
  | "routed"
  | "waiting_supply"
  | "needs_review"
  | "rejected"
  | "legacy_unrouted";

export type AssignmentStatus = "assigned" | "viewed" | "purchased" | "declined" | "expired";

export type NotificationChannel =
  | "firm_email"
  | "firm_telegram"
  | "admin_digest"
  | "homeowner_confirm"
  | "homeowner_update"
  | "wa_link";

export type NotificationStatus = "queued" | "sending" | "sent" | "failed" | "skipped" | "manual_pending";

export const ROUTING_STATUS_LABEL_TR: Record<LeadRoutingStatus, string> = {
  pending: "Doğrulama bekliyor",
  routed: "Firmalara iletildi",
  waiting_supply: "Bölgenizde firma aranıyor",
  needs_review: "İnceleniyor",
  rejected: "Reddedildi",
  legacy_unrouted: "Eski kayıt",
};

// ---------------------------------------------------------------------------------------------
// Phone numbers and WhatsApp click-to-chat
// ---------------------------------------------------------------------------------------------

/**
 * Normalises a Turkish mobile number to "05XXXXXXXXX".
 * Accepts +90 / 0090 / 90 / 0 prefixes and spaces, dashes, dots or brackets as separators.
 * Returns null for landlines, short numbers and anything containing letters.
 */
export function normalizeTrMobile(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || !/^[\d\s+().-]+$/.test(value)) return null;

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0090")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("90") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  return /^5\d{9}$/.test(digits) ? `0${digits}` : null;
}

/** "905XXXXXXXXX" for wa.me links, or null when the number is not a Turkish mobile. */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  const normalized = normalizeTrMobile(raw);
  return normalized ? `90${normalized.slice(1)}` : null;
}

/** https://wa.me/905XXXXXXXXX?text=... or null when the phone is not a Turkish mobile number. */
export function buildWaMeLink(rawPhone: string | null | undefined, message: string): string | null {
  const number = toWhatsAppNumber(rawPhone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

function placeOf(city: string, district?: string | null): string {
  return district ? `${district}, ${city}` : city;
}

/** Prefilled message a firm sends to the homeowner after it bought the lead. */
export function buildHomeownerContactMessage(args: {
  firmName: string;
  serviceLabel: string;
  city: string;
  district?: string | null;
}): string {
  const { firmName, serviceLabel, city, district } = args;
  return `Merhaba, Peyzajbul üzerinden verdiğiniz ${placeOf(city, district)} bölgesindeki ${serviceLabel} talebini gördüm. Ben ${firmName}. Projenizi konuşmak için size ne zaman ulaşabilirim?`;
}

/** Alert for a firm a lead was routed to; contains no homeowner data. */
export function buildFirmAlertMessage(
  lead: { service_type: string; city: string; district?: string | null },
  panelUrl: string,
): string {
  return `Merhaba, Peyzajbul üzerinden ${placeOf(lead.city, lead.district)} için yeni bir ${lead.service_type} talebi size iletildi. Detayları panelden görebilirsiniz: ${panelUrl}`;
}

// ---------------------------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------------------------

export interface RoutingSettings {
  maxFirms: number;
  serviceMatchPoints: number;
  genericServicePoints: number;
  districtPoints: number;
  premiumPoints: number;
  profilePoints: number;
  /** lead_routing_settings.allow_service_mismatch_fallback; off unless an admin enables it */
  allowServiceMismatchFallback?: boolean;
}

export const DEFAULT_ROUTING_SETTINGS: RoutingSettings = {
  maxFirms: 3,
  serviceMatchPoints: 40,
  genericServicePoints: 10,
  districtPoints: 25,
  premiumPoints: 10,
  profilePoints: 5,
};

export interface RoutableLead {
  city: string;
  district?: string | null;
  /** The label stored in leads.service_type (SERVICE_TYPE_TO_LABEL), compared with firms.services[]. */
  service_type: string;
  target_firm_id?: string | null;
}

/** firms row (plus two optional fairness figures the caller may compute from lead_assignments). */
export interface RoutableFirm {
  id: string;
  user_id: string | null;
  is_claimed?: boolean | null;
  is_approved?: boolean | null;
  is_active?: boolean | null;
  city: string | null;
  district?: string | null;
  services?: string[] | null;
  is_premium?: boolean | null;
  premium_until?: string | null;
  description?: string | null;
  logo_url?: string | null;
  /** assignments received in the last 30 days (default 0) */
  recent_assignments_30d?: number;
  /** timestamp of the latest assignment; null or undefined means never */
  last_assigned_at?: string | null;
}

export interface RankedFirm<F extends RoutableFirm = RoutableFirm> {
  firm: F;
  /** 1-based position, continuing after firms the lead already has */
  rank: number;
  score: number;
  /** Turkish reason labels, same strings route_lead writes to lead_assignments.reasons */
  reasons: string[];
  isDirect: boolean;
}

export interface RankOptions {
  /** auth user ids that hold the admin role (the ghost listings are owned by them) */
  adminUserIds?: ReadonlySet<string> | readonly string[];
  /** firms the lead is already assigned to; they are skipped and occupy slots */
  alreadyAssignedFirmIds?: readonly string[];
  now?: Date;
}

const TR_FOLD_FROM = "İıŞşĞğÜüÖöÇçÂâÎîÛû";
const TR_FOLD_TO = "iissgguuooccaaiiuu";

/** Same folding as public.tr_norm: Turkish characters to ASCII, trimmed, lower case. */
export function trNorm(text: string | null | undefined): string {
  const trimmed = (text ?? "").trim();
  let folded = "";
  for (const char of trimmed) {
    const index = TR_FOLD_FROM.indexOf(char);
    folded += index === -1 ? char : TR_FOLD_TO[index];
  }
  return folded.toLowerCase();
}

function hasAdminOwner(userId: string, adminUserIds: ReadonlySet<string> | readonly string[]): boolean {
  return adminUserIds instanceof Set
    ? adminUserIds.has(userId)
    : (adminUserIds as readonly string[]).includes(userId);
}

/** Claimed, approved, active and not owned by an admin account (the unclaimed ghost listings). */
export function isFirmRoutable(
  firm: Pick<RoutableFirm, "user_id" | "is_claimed" | "is_approved" | "is_active">,
  adminUserIds: ReadonlySet<string> | readonly string[] = [],
): boolean {
  return (
    firm.is_claimed === true &&
    firm.is_approved === true &&
    firm.is_active === true &&
    !!firm.user_id &&
    !hasAdminOwner(firm.user_id, adminUserIds)
  );
}

function isPresent(value: string | null | undefined): boolean {
  return !!value && value.trim() !== "";
}

function timeOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

interface Candidate<F extends RoutableFirm> {
  firm: F;
  isDirect: boolean;
  score: number;
  reasons: string[];
  recent: number;
  lastAssigned: number | null;
  tieBreak: number;
}

/**
 * Ranks the firms a lead would be routed to, exactly as route_lead does:
 *  - eligible: routable firms in the lead's city whose services contain the lead's service (or list none;
 *    any firm when allowServiceMismatchFallback is on); the firm the homeowner chose (target_firm_id)
 *    needs no city or service match
 *  - score: service match 40 (no services listed 10), same district 25, active premium 10, complete profile 5
 *  - order: direct target first, score desc, assignments in the last 30 days asc, last assignment asc
 *    (never first), then a random tie-break (injectable for deterministic tests)
 *  - at most maxFirms minus the firms the lead already has
 */
export function rankFirmsForLead<F extends RoutableFirm>(
  lead: RoutableLead,
  firms: readonly F[],
  settings: RoutingSettings = DEFAULT_ROUTING_SETTINGS,
  randomFn: () => number = Math.random,
  options: RankOptions = {},
): RankedFirm<F>[] {
  const adminUserIds = options.adminUserIds ?? [];
  const alreadyAssigned = options.alreadyAssignedFirmIds ?? [];
  const nowMs = (options.now ?? new Date()).getTime();
  const leadCity = trNorm(lead.city);
  const leadService = trNorm(lead.service_type);
  const leadDistrict = lead.district ? trNorm(lead.district) : null;

  const candidates: Candidate<F>[] = [];
  for (const firm of firms) {
    if (alreadyAssigned.includes(firm.id)) continue;
    if (!isFirmRoutable(firm, adminUserIds)) continue;

    const isDirect = !!lead.target_firm_id && firm.id === lead.target_firm_id;
    const services = firm.services ?? [];
    const serviceExact = services.some((service) => trNorm(service) === leadService);
    const serviceGeneric = services.length === 0;
    const cityMatch = trNorm(firm.city) === leadCity;

    if (!isDirect) {
      if (!cityMatch) continue;
      if (!serviceExact && !serviceGeneric && !settings.allowServiceMismatchFallback) continue;
    }

    const sameDistrict = leadDistrict !== null && !!firm.district && trNorm(firm.district) === leadDistrict;
    const premiumUntil = timeOf(firm.premium_until);
    const premiumActive = firm.is_premium === true && (premiumUntil === null || premiumUntil > nowMs);
    const profileComplete = isPresent(firm.description) && isPresent(firm.logo_url);

    let score = serviceExact ? settings.serviceMatchPoints : serviceGeneric ? settings.genericServicePoints : 0;
    if (sameDistrict) score += settings.districtPoints;
    if (premiumActive) score += settings.premiumPoints;
    if (profileComplete) score += settings.profilePoints;

    const reasons: string[] = [];
    if (isDirect) reasons.push("Size özel");
    if (serviceExact) reasons.push("Hizmet uyumu");
    else if (serviceGeneric) reasons.push("Genel hizmet");
    if (sameDistrict) reasons.push("Aynı ilçe");
    if (premiumActive) reasons.push("Sponsorlu");
    if (profileComplete) reasons.push("Eksiksiz profil");

    candidates.push({
      firm,
      isDirect,
      score,
      reasons,
      recent: firm.recent_assignments_30d ?? 0,
      lastAssigned: timeOf(firm.last_assigned_at),
      tieBreak: randomFn(),
    });
  }

  candidates.sort((a, b) => {
    if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
    if (a.score !== b.score) return b.score - a.score;
    if (a.recent !== b.recent) return a.recent - b.recent;
    if (a.lastAssigned !== b.lastAssigned) {
      if (a.lastAssigned === null) return -1;
      if (b.lastAssigned === null) return 1;
      return a.lastAssigned - b.lastAssigned;
    }
    return a.tieBreak - b.tieBreak;
  });

  const freeSlots = Math.max(settings.maxFirms - alreadyAssigned.length, 0);
  return candidates.slice(0, freeSlots).map((candidate, index) => ({
    firm: candidate.firm,
    rank: alreadyAssigned.length + index + 1,
    score: candidate.score,
    reasons: candidate.reasons,
    isDirect: candidate.isDirect,
  }));
}
