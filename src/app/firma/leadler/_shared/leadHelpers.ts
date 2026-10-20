import { supabase } from "@/lib/supabase/client";
import { callRpc, invokeEdgeFunction, queryUntyped } from "@/app/firma/panel/rpc";

/** leads_for_firms görünümünün firma panelinde kullanılan alanları. */
export type Lead = {
  id: string;
  created_at: string;
  service_type: string;
  project_size: string | null;
  budget: string;
  timeline: string;
  city: string;
  district: string | null;
  full_name: string;
  phone: string;
  email: string;
  lead_score: number | null;
  status: string;
  project_type?: string | null;
  property_type?: string | null;
  current_condition?: string | null;
  address?: string | null;
  notes?: string | null;
  scope?: string[] | null;
  irrigation_type?: string | null;
  irrigation_system?: string | null;
  water_source?: string | null;
  /** lead-photos kovasındaki depolama yolları (satın alımdan sonra dolar). */
  photo_urls?: string[] | null;
  /** Firmanın bu lead için ödeyeceği jeton; null = fiyat henüz belirlenmedi. */
  token_price?: number | null;
  /** Yalnızca bu firmaya özel yönlendirilen lead'lerde, firms.id. */
  target_firm_id?: string | null;
  assignment_id?: string | null;
  viewed_at?: string | null;
  is_purchased?: boolean | null;
  purchase_count?: number | null;
  /** Telefon doğrulaması yapılan lead'lerde görünür (WP05/WP08 ekleyebilir). */
  phone_verified?: boolean | null;
};

/** Bir lead en fazla bu kadar firmaya açılır (spend-coins / purchase_lead sınırı). */
export const MAX_LEAD_BUYERS = 3;

export type LeadOutcome = "reached" | "not_reached" | "won" | "lost";

export const OUTCOME_LABELS: Record<LeadOutcome, string> = {
  reached: "Ulaşıldı",
  not_reached: "Ulaşılamadı",
  won: "İş aldım",
  lost: "Olmadı",
};

export interface LeadOutcomeInfo {
  outcome: LeadOutcome | null;
  valueTry: number | null;
  refundRequestedAt: string | null;
}

export type RefundReason = "wrong_number" | "unreachable" | "not_a_real_request" | "duplicate" | "other";

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  wrong_number: "Numara yanlış",
  unreachable: "Ulaşılamadı",
  not_a_real_request: "Gerçek bir talep değil",
  duplicate: "Mükerrer talep",
  other: "Diğer",
};

export const REFUND_STATUS_LABELS: Record<string, string> = {
  pending: "İade talebi inceleniyor",
  approved: "İade onaylandı",
  rejected: "İade talebi reddedildi",
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case "active":
      return "Yeni";
    case "purchased":
      return "Satın Alındı";
    case "expired":
      return "Süresi Doldu";
    default:
      return status;
  }
};

export const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "active":
      return "default";
    case "purchased":
      return "secondary";
    case "expired":
      return "destructive";
    default:
      return "outline";
  }
};

export interface FomoMessage {
  text: string;
  className: string;
}

/** Gerçek satın alma sayısından üretilen bilgi satırı. Sayı bilinmiyorsa çağıran bunu hiç çağırmaz. */
export const getFomoMessage = (count: number): FomoMessage => {
  if (count <= 0) return { text: "Henüz hiçbir firma açmadı", className: "bg-secondary text-secondary-foreground border-border" };
  if (count === 1) return { text: "1 firma açtı", className: "bg-secondary text-secondary-foreground border-border" };
  if (count < MAX_LEAD_BUYERS) {
    return { text: `${count} firma açtı, ${MAX_LEAD_BUYERS - count} kontenjan kaldı`, className: "bg-accent/10 text-accent border-accent/30" };
  }
  return { text: `${MAX_LEAD_BUYERS} firma açtı, kontenjan doldu`, className: "bg-muted text-muted-foreground border-border" };
};

const RPC_CHUNK = 200;

/**
 * Lead başına satın alma sayısı. Görünüm sayıyı veriyorsa (purchase_count) o kullanılır, aksi halde
 * rpc get_lead_purchase_counts çağrılır. Sayı alınamazsa null döner: arayüz FOMO satırını GÖSTERMEZ
 * ("Henüz kimse almadı" eksik veriden üretilmez).
 */
export async function loadPurchaseCounts(leads: Lead[]): Promise<Record<string, number> | null> {
  const counts: Record<string, number> = {};
  if (leads.length === 0) return counts;

  if (leads.every((lead) => typeof lead.purchase_count === "number")) {
    for (const lead of leads) counts[lead.id] = lead.purchase_count ?? 0;
    return counts;
  }

  const ids = leads.map((lead) => lead.id);
  for (let i = 0; i < ids.length; i += RPC_CHUNK) {
    const { data, error } = await callRpc<{ lead_id: string; purchase_count: number }[]>("get_lead_purchase_counts", {
      p_lead_ids: ids.slice(i, i + RPC_CHUNK),
    });
    if (error || !Array.isArray(data)) return null;
    for (const row of data) counts[row.lead_id] = Number(row.purchase_count) || 0;
  }
  // RPC yalnızca satın alınmış lead'ler için satır döner; kalanların sayısı gerçekten 0'dır.
  for (const id of ids) counts[id] ??= 0;
  return counts;
}

/** Kullanıcının kendi 'paid' satın almaları. */
export async function loadOwnPurchasedIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("lead_purchases").select("lead_id").eq("firm_id", userId).eq("status", "paid");
  return new Set((data ?? []).map((row) => row.lead_id));
}

/** Sonuç kolonları migration'ı uygulanmadıysa sorgu hata verir ve boş harita döner (liste bozulmaz). */
export async function loadOutcomes(userId: string): Promise<Record<string, LeadOutcomeInfo>> {
  const { data, error } = await queryUntyped<
    { lead_id: string; outcome: LeadOutcome | null; outcome_value_try: number | null; refund_requested_at: string | null }[]
  >("lead_purchases", (q) =>
    q.select("lead_id, outcome, outcome_value_try, refund_requested_at").eq("firm_id", userId).eq("status", "paid"),
  );
  const result: Record<string, LeadOutcomeInfo> = {};
  if (error || !Array.isArray(data)) return result;
  for (const row of data) {
    result[row.lead_id] = {
      outcome: row.outcome ?? null,
      valueTry: row.outcome_value_try ?? null,
      refundRequestedAt: row.refund_requested_at ?? null,
    };
  }
  return result;
}

/** lead_id -> iade talebi durumu (pending | approved | rejected). Tablo yoksa boş harita. */
export async function loadRefundStatuses(): Promise<Record<string, string>> {
  const { data, error } = await queryUntyped<{ lead_id: string | null; status: string }[]>(
    "lead_refund_requests",
    (q) => q.select("lead_id, status"),
  );
  const result: Record<string, string> = {};
  if (error || !Array.isArray(data)) return result;
  for (const row of data) {
    if (row.lead_id) result[row.lead_id] = row.status;
  }
  return result;
}

export type PurchaseResult =
  | { ok: true; newBalance: number }
  | { ok: false; message: string; code?: string };

/** spend-coins: lead'i açar. İş mantığı hataları (HTTP 200 + error) ve sunucu hataları Türkçe mesaja döner. */
export async function purchaseLead(leadId: string): Promise<PurchaseResult> {
  const result = await invokeEdgeFunction<{ new_balance?: number }>("spend-coins", { lead_id: leadId });
  if (!result.ok) return { ok: false, message: result.message, code: result.code };
  const balance = Number(result.data.new_balance);
  return Number.isFinite(balance)
    ? { ok: true, newBalance: balance }
    : { ok: false, message: "İşlem tamamlanamadı, lütfen tekrar deneyin." };
}

export type OutcomeSaveResult = { ok: true; refundRequestedAt: string | null } | { ok: false; message: string };

/** rpc set_lead_outcome. */
export async function saveLeadOutcome(
  leadId: string,
  outcome: LeadOutcome,
  valueTry: number | null,
): Promise<OutcomeSaveResult> {
  const { data, error } = await callRpc<{ refund_requested_at?: string | null }>("set_lead_outcome", {
    p_lead_id: leadId,
    p_outcome: outcome,
    p_value_try: outcome === "won" ? valueTry : null,
  });
  if (error) return { ok: false, message: "Sonuç kaydedilemedi, lütfen tekrar deneyin." };
  return { ok: true, refundRequestedAt: data?.refund_requested_at ?? null };
}

export type RefundRequestResult = { ok: true; alreadyRequested: boolean } | { ok: false; message: string };

const REFUND_ERROR_MESSAGES: Record<string, string> = {
  refund_window_closed: "İade talep süresi dolduğu için bu lead için iade istenemiyor.",
  invalid_reason: "Geçersiz iade nedeni.",
  not_authenticated: "Oturumunuzun süresi dolmuş, lütfen yeniden giriş yapın.",
};

/** rpc request_lead_refund (WP04). Aynı lead için ikinci talep hata sayılmaz. */
export async function requestLeadRefund(
  leadId: string,
  reason: RefundReason,
  note: string | null,
): Promise<RefundRequestResult> {
  const { error } = await callRpc("request_lead_refund", { p_lead: leadId, p_reason: reason, p_note: note });
  if (!error) return { ok: true, alreadyRequested: false };
  if (error.message === "refund_already_requested") return { ok: true, alreadyRequested: true };
  return { ok: false, message: REFUND_ERROR_MESSAGES[error.message] ?? "İade talebi oluşturulamadı, lütfen destek ile iletişime geçin." };
}

/** Lead'i açan firmanın atamasını 'görüldü' yapar (idempotent, sonuç beklenmez). */
export function markAssignmentViewed(leadId: string): void {
  void callRpc("mark_assignment_viewed", { p_lead_id: leadId });
}

const PHOTO_BUCKET = "lead-photos";
const PHOTO_URL_TTL_SECONDS = 300;

/** Depolama yollarını kısa ömürlü imzalı adreslere çevirir; eski mutlak adresler olduğu gibi geçer. */
export async function resolveLeadPhotoUrls(paths: string[]): Promise<string[]> {
  const urls = await Promise.all(
    paths.map(async (path) => {
      if (/^https?:\/\//i.test(path)) return path;
      const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, PHOTO_URL_TTL_SECONDS);
      return data?.signedUrl ?? null;
    }),
  );
  return urls.filter((url): url is string => Boolean(url));
}
