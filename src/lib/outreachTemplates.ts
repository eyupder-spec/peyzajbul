/**
 * Outreach message templates and link helpers for the admin outreach queue.
 *
 * A human sends every message: wa.me click-to-chat from the WhatsApp Business app (at most DAILY_WA_CAP a
 * day), mailto: from the admin's own mailbox, or a phone call. Nothing here talks to a network or a bot.
 *
 * Content rules, enforced by outreachTemplates.test.ts:
 *   - every outbound template states where the data comes from and how to opt out;
 *   - nothing is invented: the profile-view sentence needs a real count, the lead template needs a real lead,
 *     and the price line is only rendered when the caller passes one;
 *   - a WhatsApp message stays under 1000 characters and carries no emoji.
 *
 * Pure TypeScript: no React, no Supabase client, no network.
 */

import { AREA_LABELS, BUDGET_LABELS } from "./formatLead";
import { toWhatsAppNumber } from "./leadRouting";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peyzajbul.com").replace(/\/+$/, "");

/** The Peyzajbul WhatsApp line that claimants write to and that receives removal requests (digits, country code first). */
export const PEYZAJBUL_WA_NUMBER = process.env.NEXT_PUBLIC_CLAIM_WA_NUMBER ?? "905345957147";

/** WhatsApp Business accounts that message unknown numbers in bulk get banned: stay well below that. */
export const DAILY_WA_CAP = 25;

export const SOURCE_DISCLOSURE = "Bilgileriniz kamuya açık kaynaklardan derlenmiştir.";
export const OPT_OUT_LINE = "Listede yer almak istemezseniz KALDIR yazmanız yeterli.";

/** A profile-view count below this is not worth advertising. */
export const MIN_VIEWS_TO_MENTION = 10;

export const WHATSAPP_MAX_LENGTH = 1000;

// ---------------------------------------------------------------------------------------------
// Links and masking
// ---------------------------------------------------------------------------------------------

/** "905xxxxxxxxx" for a Turkish mobile number in any common spelling, else null (landlines, garbage). */
export function normalizeTrMobile(phone: string | null | undefined): string | null {
  return toWhatsAppNumber(phone);
}

/** https://wa.me/<digits>?text=<text> for a Turkish mobile number; null when the phone is not one. */
export function buildWaLink(phone: string | null | undefined, text: string): string | null {
  const number = normalizeTrMobile(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

/** wa.me link to the Peyzajbul line itself (claim codes, removal requests, support). */
export function supportWaLink(text?: string): string {
  const base = `https://wa.me/${PEYZAJBUL_WA_NUMBER.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function claimUrl(code: string): string {
  return `${SITE_URL}/s/${code}`;
}

export function profileUrl(slug: string): string {
  return `${SITE_URL}/firma/${slug}`;
}

/** 'info@firma.com' -> 'i***@firma.com'; null when there is no local part. Mirrors public.claim_mask_email. */
export function maskEmail(email: string | null | undefined): string | null {
  const value = (email ?? "").trim();
  const at = value.indexOf("@");
  if (at < 1) return null;
  return `${value[0]}***${value.slice(at)}`;
}

/** '0532 123 45 42' -> '05** *** ** 42'; null unless the number has 11 national digits. Mirrors public.claim_mask_phone. */
export function maskPhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("90")) digits = `0${digits.slice(2)}`;
  else if (digits.length === 10) digits = `0${digits}`;
  if (digits.length !== 11) return null;
  return `${digits.slice(0, 2)}** *** ** ${digits.slice(-2)}`;
}

/** Last ten digits of a phone number: the key that identifies a firm whatever the formatting. Null below ten digits. */
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Message that ends up in the claim-code WhatsApp chat, so the admin can match it to a pending claim. */
export function claimCodeWaText(code: string, firmName: string): string {
  return `Peyzajbul sahiplenme kodu: ${code} (${firmName})`;
}

/** Message a firm sends to ask for the removal of its listing. */
export function removalRequestWaText(firmName: string): string {
  return `KALDIR - ${firmName} profilinin Peyzajbul listesinden kaldırılmasını istiyorum.`;
}

// ---------------------------------------------------------------------------------------------
// Neutral listing summary
// ---------------------------------------------------------------------------------------------

export interface NeutralSummaryInput {
  company_name: string;
  city: string;
  district?: string | null;
  /** Comma separated text (CSV rows) or a list. */
  services?: string | string[] | null;
}

function listServices(services: NeutralSummaryInput["services"]): string[] {
  const items = Array.isArray(services) ? services : (services ?? "").split(",");
  return items.map((item) => item.trim()).filter(Boolean);
}

function joinTurkish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ve ${items[items.length - 1]}`;
}

/**
 * Third-person, factual description for listings built from crawled pages. It replaces the scraped
 * first-person marketing text, which the firm never agreed to see republished.
 */
export function neutralSummary(firm: NeutralSummaryInput): string {
  const place = [firm.city, firm.district].map((part) => (part ?? "").trim()).filter(Boolean).join("/");
  const services = listServices(firm.services).slice(0, 3);
  const scope = services.length > 0 ? `${joinTurkish(services)} alanlarında faaliyet gösteren` : "faaliyet gösteren";
  return `${firm.company_name.trim()}, ${place ? `${place} bölgesinde ` : ""}${scope} bir peyzaj firmasıdır.`;
}

// ---------------------------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------------------------

export type OutreachStep = "day0_intro" | "day3_lead" | "day7_email" | "day10_call" | "day14_breakup";
export type TemplateKey = OutreachStep | "removal_ack" | "claim_approved_wa";

/**
 * A real row of the leads table, as stored. Never contains the homeowner's name, phone or e-mail.
 * project_size and budget hold the lead-form slugs ('50-150', '25000-75000'); rows from before the form
 * stored labels, so both spellings are accepted and rendered through projectSizeLabel / budgetLabel.
 */
export interface TemplateLead {
  service_type: string;
  district?: string | null;
  city: string;
  project_size: string;
  budget: string;
  /** The homeowner picked this very firm (leads.target_firm_id): a real signal, worth saying out loud. */
  requestedFirm?: boolean;
}

export interface TemplateVars {
  /** Company name. */
  firm: string;
  city: string;
  district?: string | null;
  /** Who is writing; falls back to "Peyzajbul ekibi". */
  sender?: string | null;
  profileUrl: string;
  claimUrl: string;
  /** Profile views in the last 30 days. The sentence is rendered only for a number of at least 10. */
  views30d?: number | null;
  /** Required by day3_lead. */
  lead?: TemplateLead | null;
  /** Founding-member price line supplied by the pricing package; rendered in day7_email and day14_breakup when present. */
  offer?: string | null;
  /** claim_approved_wa only. */
  loginUrl?: string;
}

export interface RenderedTemplate {
  /** Only the e-mail template has a subject. */
  subject: string | null;
  body: string;
}

const MAX_NAME = 100;
const MAX_FIELD = 60;
const MAX_OFFER = 240;
const DEFAULT_SENDER = "Peyzajbul ekibi";

function clean(value: string | null | undefined, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function place(city: string, district?: string | null): string {
  const d = clean(district, MAX_FIELD);
  return d ? `${clean(city, MAX_FIELD)}/${d}` : clean(city, MAX_FIELD);
}

function footer(): string {
  return `${SOURCE_DISCLOSURE} ${OPT_OUT_LINE}`;
}

function viewsSentence(views: number | null | undefined): string | null {
  return typeof views === "number" && Number.isFinite(views) && views >= MIN_VIEWS_TO_MENTION
    ? `Sayfanız son 30 günde ${Math.floor(views)} kez görüntülendi.`
    : null;
}

function offerLine(offer: string | null | undefined): string | null {
  const text = clean(offer, MAX_OFFER);
  return text || null;
}

/** Budget answers that tell a firm nothing, as slugs and as the labels older lead rows stored. */
const UNINFORMATIVE_BUDGETS = new Set(["bilmiyorum", "teklif-sonrasi", BUDGET_LABELS.bilmiyorum, BUDGET_LABELS["teklif-sonrasi"]]);

/** Label of a lead-form slug; a value that is not a known slug (a label from an older lead row) is kept as it is. */
function slugLabel(labels: Record<string, string>, value: string | null | undefined): string {
  const raw = clean(value, MAX_FIELD);
  return Object.prototype.hasOwnProperty.call(labels, raw) ? labels[raw] : raw;
}

export function projectSizeLabel(value: string | null | undefined): string {
  return slugLabel(AREA_LABELS, value);
}

export function budgetLabel(value: string | null | undefined): string {
  return slugLabel(BUDGET_LABELS, value);
}

/** ' (proje büyüklüğü: 50–150 m², bütçe: 25.000 – 75.000 ₺)'; a budget nobody stated is left out, and so is an empty list. */
function leadDetails(lead: TemplateLead): string {
  const size = projectSizeLabel(lead.project_size);
  const budget = UNINFORMATIVE_BUDGETS.has(clean(lead.budget, MAX_FIELD)) ? "" : budgetLabel(lead.budget);
  const parts = [size ? `proje büyüklüğü: ${size}` : "", budget ? `bütçe: ${budget}` : ""].filter((part) => part !== "");
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

function lines(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join("\n");
}

function whatsApp(body: string): RenderedTemplate {
  if (body.length > WHATSAPP_MAX_LENGTH) {
    throw new Error(`WhatsApp message is ${body.length} characters, the limit is ${WHATSAPP_MAX_LENGTH}`);
  }
  return { subject: null, body };
}

export function renderTemplate(key: TemplateKey, vars: TemplateVars): RenderedTemplate {
  const firm = clean(vars.firm, MAX_NAME);
  const city = clean(vars.city, MAX_FIELD);
  const sender = clean(vars.sender, MAX_FIELD) || DEFAULT_SENDER;

  switch (key) {
    case "day0_intro":
      return whatsApp(
        lines([
          `Merhaba, ben ${sender}, Peyzajbul.com'dan yazıyorum. ${firm} için ${city} rehberimizde ücretsiz bir profil sayfası yayında: ${vars.profileUrl}`,
          viewsSentence(vars.views30d),
          `Bilgilerinizi 2 dakikada güncelleyip sahiplenebilirsiniz: ${vars.claimUrl}`,
          "",
          footer(),
        ]),
      );

    case "day3_lead": {
      const lead = vars.lead;
      if (!lead) throw new Error("day3_lead needs a real lead; never invent demand");
      const requested = lead.requestedFirm ? `, doğrudan ${firm} firmasını seçen` : "";
      return whatsApp(
        lines([
          `Merhaba, ben ${sender}, Peyzajbul.com'dan yazıyorum. ${place(lead.city, lead.district)} bölgesinde yakın zamanda ${clean(lead.service_type, MAX_FIELD)} için${requested} bir talep aldık${leadDetails(lead)}.`,
          `${firm} bu bölgede listeli. Profilinizi sahiplenirseniz bu tür taleplerden haberdar olabilirsiniz: ${vars.claimUrl}`,
          "",
          footer(),
        ]),
      );
    }

    case "day7_email":
      return {
        subject: `${firm} için Peyzajbul profili`,
        body: lines([
          "Merhaba,",
          "",
          `Ben ${sender}, Peyzajbul.com'dan yazıyorum. ${firm} için ${city} rehberimizde ücretsiz bir profil sayfası yayında: ${vars.profileUrl}`,
          viewsSentence(vars.views30d),
          `Bilgilerinizi 2 dakikada güncelleyip sahiplenebilirsiniz: ${vars.claimUrl}`,
          offerLine(vars.offer),
          "",
          footer(),
          "",
          sender,
          "Peyzajbul.com",
        ]),
      };

    case "day10_call":
      return {
        subject: null,
        body: lines([
          `Arama notu: ${firm} (${place(city, vars.district)})`,
          "",
          `1. Kendinizi tanıtın: "Merhaba, ben ${sender}, Peyzajbul.com'dan arıyorum."`,
          `2. Nedenini söyleyin: "${firm} için ${city} rehberimizde ücretsiz bir profil sayfası yayında."`,
          `3. Profil adresi: ${vars.profileUrl}`,
          `4. Sahiplenme: "Bilgilerinizi 2 dakikada güncelleyip sahiplenebilirsiniz. İsterseniz bağlantıyı WhatsApp'tan göndereyim." Bağlantı: ${vars.claimUrl}`,
          `5. Kapanış: "${footer()}"`,
          "6. Sonucu panelde işaretleyin: Yanıt verdi, İlgisiz, Numara hatalı veya Kaldır.",
        ]),
      };

    case "day14_breakup":
      return whatsApp(
        lines([
          `Merhaba, ben ${sender}, Peyzajbul.com'dan yazıyorum. Son bir hatırlatma: ${firm} için ${city} rehberimizdeki profil yayında ve henüz sahiplenilmemiş.`,
          `İlgilenmiyorsanız yanıt vermeniz gerekmez, bu konuda başka mesaj göndermeyeceğim. Sahiplenmek isterseniz: ${vars.claimUrl}`,
          offerLine(vars.offer),
          "",
          footer(),
        ]),
      );

    case "removal_ack":
      return whatsApp(
        lines([
          `Merhaba, talebinizi aldık. ${firm} profili Peyzajbul.com'da yayından kaldırıldı ve size bu konuda başka mesaj göndermeyeceğiz.`,
          "Bir yanlışlık olduğunu düşünüyorsanız bu mesajı yanıtlayabilirsiniz.",
        ]),
      );

    case "claim_approved_wa": {
      // Keep the wording in step with approvalWhatsAppText in supabase/functions/approve-claim/index.ts.
      const url = vars.loginUrl ?? `${SITE_URL}/firma/giris`;
      return whatsApp(
        `Merhaba, ${firm} profil sahiplenme başvurunuz onaylandı. Firma panelinize ${url} adresinden girebilirsiniz: başvuruda kullandığınız e-posta adresini yazın, size 6 haneli bir kod göndereceğiz. Şifre gerekmez.`,
      );
    }
  }
}

/** mailto: link that opens the admin's own mail client with the e-mail template filled in. */
export function buildMailtoLink(to: string, template: RenderedTemplate): string {
  const body = template.body.replace(/\r?\n/g, "\r\n");
  const params = [`subject=${encodeURIComponent(template.subject ?? "")}`, `body=${encodeURIComponent(body)}`];
  return `mailto:${encodeURIComponent(to.trim()).replace(/%40/g, "@")}?${params.join("&")}`;
}
