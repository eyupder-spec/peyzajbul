import { LEAD_FORM_CONFIG, LEAD_COPY } from "../../lib/leadFormData";

/**
 * Pure logic of the homeowner status page. Every statement is derived from fields the backend returned;
 * nothing is inferred from time passing, so the page can never claim more than what happened.
 */

export type RoutingStatus =
  | "pending"
  | "routed"
  | "waiting_supply"
  | "needs_review"
  | "rejected"
  | "legacy_unrouted"
  | "unknown";

/** A request that ended without being delivered: the verification window ran out, or it was turned down. */
export type LeadClosure = "expired" | "rejected";

export interface LeadStatusDTO {
  id: string;
  /** First name only, for the greeting; null when the backend does not return it. */
  firstName: string | null;
  serviceLabel: string;
  city: string;
  district: string | null;
  createdAt: string;
  /** When the lead was delivered to its first firm; null until that happened (or when the backend does not say). */
  routedAt: string | null;
  /** The verification code was confirmed (the lead is active or was bought). */
  verified: boolean;
  /** Set when the request is closed for good; nothing is delivered after that. */
  closed: LeadClosure | null;
  routingStatus: RoutingStatus;
  /** Firms the lead was actually delivered to. */
  matchedFirmCount: number;
  /** Firms that unlocked the lead (they received the contact details). */
  acceptedFirmCount: number;
}

export type LeadStage = "awaiting_verification" | "in_review" | "sent" | "accepted" | LeadClosure;

export type TimelineState = "done" | "current" | "upcoming";

export interface TimelineStep {
  key: "received" | "verified" | "routed" | "accepted" | "closed";
  title: string;
  state: TimelineState;
  detail?: string;
}

/** Delivered to at least one firm: the only situation in which the page may say "iletildi". */
export function isRouted(dto: LeadStatusDTO): boolean {
  return !dto.closed && dto.verified && dto.routingStatus === "routed" && dto.matchedFirmCount > 0;
}

export function deriveStage(dto: LeadStatusDTO): LeadStage {
  if (dto.closed) return dto.closed;
  if (!dto.verified) return "awaiting_verification";
  if (dto.acceptedFirmCount > 0) return "accepted";
  if (isRouted(dto)) return "sent";
  return "in_review";
}

export function refCode(id: string): string {
  return `PB-${id.slice(0, 8).toUpperCase()}`;
}

export function formatLeadDate(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function stageTitle(dto: LeadStatusDTO): string {
  switch (deriveStage(dto)) {
    case "awaiting_verification":
      return "Talebiniz kaydedildi, son adım: doğrulama";
    case "in_review":
      return "Talebiniz alındı ve inceleniyor";
    case "sent":
      return `Talebiniz ${dto.matchedFirmCount} firmaya iletildi`;
    case "accepted":
      return `${dto.acceptedFirmCount} firma talebinizi kabul etti`;
    case "expired":
      return "Talebinizin doğrulama süresi doldu";
    case "rejected":
      return "Talebiniz firmalara iletilmedi";
  }
}

/** Headline of the status page; greets the homeowner by first name once the backend returns it. */
export function stageHeading(dto: LeadStatusDTO): string {
  const title = stageTitle(dto);
  return dto.firstName ? `${dto.firstName}, ${title.charAt(0).toLocaleLowerCase("tr")}${title.slice(1)}` : title;
}

/** What the visitor can do next once the request is closed. Gives no reason for a rejection: the page does not know it. */
export const CLOSED_NOTICE: Record<LeadClosure, string> = {
  expired: "Doğrulanmayan talepler firmalara iletilmez. Yeni bir talep oluşturabilirsiniz.",
  rejected: "Bilgilerinizi kontrol edip yeni bir talep oluşturabilir veya WhatsApp ile bize yazabilirsiniz.",
};

const CLOSED_STEP: Record<LeadClosure, TimelineStep> = {
  expired: { key: "closed", title: "Doğrulama süresi doldu", state: "current", detail: "Talebiniz firmalara iletilmedi" },
  rejected: { key: "closed", title: "Talebiniz firmalara iletilmedi", state: "current" },
};

/** "3 firmaya iletildi", with the delivery date when the backend returned one. */
function routedDetail(dto: LeadStatusDTO): string {
  const count = `${dto.matchedFirmCount} firmaya iletildi`;
  const date = dto.routedAt ? formatLeadDate(dto.routedAt) : "";
  return date ? `${count} (${date})` : count;
}

export function buildTimeline(dto: LeadStatusDTO): TimelineStep[] {
  const channel = LEAD_FORM_CONFIG.verifyChannel;
  const receivedStep: TimelineStep = {
    key: "received",
    title: "Talebiniz alındı",
    state: "done",
    detail: formatLeadDate(dto.createdAt) || undefined,
  };

  // A closed request stops here: no step after the closure is promised, and verification shows only if it happened.
  if (dto.closed) {
    const verifiedStep: TimelineStep[] = dto.verified ? [{ key: "verified", title: LEAD_COPY.verifiedStep[channel], state: "done" }] : [];
    return [receivedStep, ...verifiedStep, CLOSED_STEP[dto.closed]];
  }

  const routed = isRouted(dto);
  const accepted = dto.verified && dto.acceptedFirmCount > 0;

  // The past tense appears only once a delivery really happened.
  const pendingTitle = "Uygun firmalara iletilecek";
  const routedStep: TimelineStep = routed
    ? { key: "routed", title: "Uygun firmalara iletildi", state: "done", detail: routedDetail(dto) }
    : dto.verified
      ? {
          key: "routed",
          title: pendingTitle,
          state: "current",
          detail:
            dto.routingStatus === "waiting_supply"
              ? "Bölgenizde şu an uygun firma bulunamadı"
              : "İnceleniyor",
        }
      : { key: "routed", title: pendingTitle, state: "upcoming" };

  const acceptedStep: TimelineStep = accepted
    ? {
        key: "accepted",
        title: "Firmalar sizinle iletişime geçiyor",
        state: "done",
        detail: `${dto.acceptedFirmCount} firma talebinizi kabul etti`,
      }
    : { key: "accepted", title: "Firmalar sizinle iletişime geçiyor", state: routed ? "current" : "upcoming" };

  return [
    receivedStep,
    {
      key: "verified",
      title: dto.verified ? LEAD_COPY.verifiedStep[channel] : LEAD_COPY.verifyTitle[channel],
      state: dto.verified ? "done" : "current",
    },
    routedStep,
    acceptedStep,
  ];
}
