import { areaLabel, budgetLabel, timelineLabel } from "../create-lead/labels.ts";
import { BRAND, escapeHtml, toSingleLine } from "../create-lead/html.ts";

// Email templates for the lead pipeline. Pure module.
//
// None of these templates accepts or renders homeowner personal data: no name, phone, email, address
// or free-text notes. The homeowner mail is addressed to the lead's own email by the dispatcher.

export interface TemplateLead {
  id: string;
  service_type: string;
  city: string;
  district: string | null;
  /** area slug (area_size, or the legacy project_size) */
  area_size: string | null;
  /** budget slug; shown as a band, never as a figure */
  budget: string | null;
  timeline: string | null;
  token_price: number | null;
  routing_status: string;
  status_token: string | null;
  review_flags: string[] | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface FirmContact {
  company_name: string;
  phone: string | null;
  /** wa.me click-to-chat link, or null when the phone is not a Turkish mobile number */
  waUrl: string | null;
}

export const SUPPORT_EMAIL = "destek@peyzajbul.com";

export function placeOf(lead: Pick<TemplateLead, "city" | "district">): string {
  return lead.district ? `${lead.district}, ${lead.city}` : lead.city;
}

/** "#" plus the first 8 characters of the lead id. */
export function leadRef(leadId: string): string {
  return `#${leadId.slice(0, 8)}`;
}

export function firmPanelUrl(siteUrl: string, leadId: string): string {
  return `${siteUrl}/firma/leadler?lead=${leadId}`;
}

// ---------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------

interface LayoutOptions {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerHtml?: string;
}

function layout({ preheader, heading, bodyHtml, cta, footerHtml }: LayoutOptions): string {
  const button = cta
    ? `<tr><td style="padding:8px 28px 24px;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${BRAND.clay};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 26px;border-radius:8px;">${escapeHtml(cta.label)}</a></td></tr>`
    : "";
  const footer = footerHtml
    ? `<tr><td style="padding:16px 28px 24px;border-top:1px solid ${BRAND.border};color:${BRAND.muted};font-size:13px;line-height:1.6;">${footerHtml}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:0;background:${BRAND.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          <tr><td style="background:${BRAND.forest};padding:18px 28px;color:#ffffff;font-size:20px;font-weight:bold;">Peyzajbul</td></tr>
          <tr><td style="padding:28px 28px 8px;color:${BRAND.ink};font-size:20px;font-weight:bold;line-height:1.3;">${escapeHtml(heading)}</td></tr>
          <tr><td style="padding:8px 28px 16px;color:${BRAND.ink};font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
          ${button}
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function factsTable(rows: [string, string][]): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:${BRAND.muted};font-size:14px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:${BRAND.ink};font-size:14px;font-weight:bold;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px;">${body}</table>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;">${escapeHtml(text)}</p>`;
}

function leadFacts(lead: TemplateLead, withPrice: boolean): [string, string][] {
  const rows: [string, string][] = [
    ["Hizmet", lead.service_type],
    ["Konum", placeOf(lead)],
    ["Alan", areaLabel(lead.area_size)],
    ["Bütçe aralığı", budgetLabel(lead.budget)],
    ["Zamanlama", timelineLabel(lead.timeline)],
  ];
  if (withPrice && lead.token_price !== null) rows.push(["Jeton ücreti", `${lead.token_price} jeton`]);
  return rows;
}

function textFacts(rows: [string, string][]): string {
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

// ---------------------------------------------------------------------------------------------
// Firm email
// ---------------------------------------------------------------------------------------------

export function firmEmailSubject(lead: TemplateLead): string {
  const price = lead.token_price !== null ? ` (${lead.token_price} jeton)` : "";
  return toSingleLine(`Yeni talep: ${lead.service_type} — ${placeOf(lead)}${price}`);
}

export function renderFirmEmail(args: {
  lead: TemplateLead;
  assignedCount: number;
  isDirect: boolean;
  siteUrl: string;
}): RenderedEmail {
  const { lead, assignedCount, isDirect, siteUrl } = args;
  const url = firmPanelUrl(siteUrl, lead.id);
  const rows = leadFacts(lead, true);
  const note = `İletişim bilgileri jeton ile açılır. Bu talep size dahil ${assignedCount} firmaya iletildi.`;
  const directNote = isDirect ? "Bu talep doğrudan firma profilinizden gönderildi." : "";

  const html = layout({
    preheader: `${lead.service_type} — ${placeOf(lead)}`,
    heading: "Bölgenizden yeni bir talep var",
    bodyHtml: `${factsTable(rows)}${directNote ? paragraph(directNote) : ""}${paragraph(note)}`,
    cta: { label: "Talebi Panelde Gör", url },
    footerHtml: `Sorularınız için ${escapeHtml(SUPPORT_EMAIL)}`,
  });

  const text = [
    "Bölgenizden yeni bir talep var",
    "",
    textFacts(rows),
    "",
    directNote,
    note,
    "",
    `Talebi Panelde Gör: ${url}`,
    "",
    `Sorularınız için ${SUPPORT_EMAIL}`,
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n");

  return { subject: firmEmailSubject(lead), html, text };
}

// ---------------------------------------------------------------------------------------------
// Homeowner email
// ---------------------------------------------------------------------------------------------

function homeownerConfirmCopy(routingStatus: string): string {
  switch (routingStatus) {
    case "routed":
      return "Talebiniz alındı ve bölgenizdeki uygun firmalara iletildi. Firmalar talebi inceleyip sizinle iletişime geçer.";
    case "waiting_supply":
      return "Talebiniz alındı. Bölgenizde şu an talebinize uygun kayıtlı firma arıyoruz; bir firma eşleştiğinde e-posta ile haber vereceğiz.";
    case "needs_review":
      return "Talebiniz alındı. Firmalara iletilmeden önce ekibimiz tarafından incelenecek.";
    default:
      return "Talebiniz alındı.";
  }
}

export function renderHomeownerEmail(args: {
  kind: "confirm" | "update";
  lead: TemplateLead;
  siteUrl: string;
}): RenderedEmail {
  const { kind, lead, siteUrl } = args;
  const copy =
    kind === "update"
      ? "Bölgenizde talebinize uygun firmalar bulundu ve talebiniz iletildi. Firmalar talebi inceleyip sizinle iletişime geçer."
      : homeownerConfirmCopy(lead.routing_status);
  const subject = kind === "update" ? "Talebiniz firmalara iletildi - Peyzajbul" : "Talebiniz alındı - Peyzajbul";
  const heading = kind === "update" ? "Talebiniz firmalara iletildi" : "Talebiniz alındı";
  const rows: [string, string][] = [
    ["Hizmet", lead.service_type],
    ["Konum", placeOf(lead)],
  ];
  const statusUrl = lead.status_token ? `${siteUrl}/talep/${lead.id}?t=${encodeURIComponent(lead.status_token)}` : null;

  const html = layout({
    preheader: copy,
    heading,
    bodyHtml: `${paragraph("Merhaba,")}${paragraph(copy)}${factsTable(rows)}`,
    cta: statusUrl ? { label: "Talebimin Durumunu Gör", url: statusUrl } : undefined,
    footerHtml: `Bu e-posta, Peyzajbul üzerinden verdiğiniz teklif talebi nedeniyle gönderildi. Sorularınız için ${escapeHtml(SUPPORT_EMAIL)}`,
  });

  const text = [
    heading,
    "",
    "Merhaba,",
    copy,
    "",
    textFacts(rows),
    ...(statusUrl ? ["", `Talebimin Durumunu Gör: ${statusUrl}`] : []),
    "",
    `Sorularınız için ${SUPPORT_EMAIL}`,
  ].join("\n");

  return { subject, html, text };
}

// ---------------------------------------------------------------------------------------------
// Admin digest
// ---------------------------------------------------------------------------------------------

export type AdminDigestKind = "routed" | "supply_gap" | "needs_review";

function firmLinkList(firms: FirmContact[], linkLabel: string): string {
  if (firms.length === 0) return "";
  const items = firms
    .map((firm) => {
      const phone = firm.phone ? ` (${escapeHtml(firm.phone)})` : "";
      const link = firm.waUrl
        ? ` — <a href="${escapeHtml(firm.waUrl)}" style="color:${BRAND.clay};font-weight:bold;">${escapeHtml(linkLabel)}</a>`
        : " — cep numarası yok";
      return `<li style="margin:0 0 6px;">${escapeHtml(firm.company_name)}${phone}${link}</li>`;
    })
    .join("");
  return `<ul style="margin:0 0 12px;padding-left:20px;">${items}</ul>`;
}

function firmTextList(firms: FirmContact[]): string {
  return firms
    .map((firm) => `- ${firm.company_name}${firm.phone ? ` (${firm.phone})` : ""}: ${firm.waUrl ?? "cep numarası yok"}`)
    .join("\n");
}

export function renderAdminDigest(args: {
  kind: AdminDigestKind;
  lead: TemplateLead;
  /** firms the lead was routed to (routed) */
  assignedFirms: FirmContact[];
  /** unclaimed local listings for claim outreach (supply_gap) */
  unclaimedFirms: FirmContact[];
  siteUrl: string;
}): RenderedEmail {
  const { kind, lead, assignedFirms, unclaimedFirms, siteUrl } = args;
  const ref = leadRef(lead.id);
  const flags = (lead.review_flags ?? []).filter(Boolean);
  const rows = leadFacts(lead, true);
  rows.unshift(["Talep", ref]);
  if (flags.length > 0) rows.push(["İnceleme bayrakları", flags.join(", ")]);

  const headline: Record<AdminDigestKind, string> = {
    routed: `Talep ${ref} ${assignedFirms.length} firmaya iletildi`,
    supply_gap: `Talep ${ref} için bölgede kayıtlı firma yok`,
    needs_review: `Talep ${ref} incelemenizi bekliyor`,
  };

  let section = "";
  let sectionText = "";
  if (kind === "routed") {
    section = `${paragraph("Her firma için WhatsApp bağlantısına dokunduğunuzda mesaj hazır açılır.")}${firmLinkList(assignedFirms, "WhatsApp'ta haber ver")}`;
    sectionText = firmTextList(assignedFirms);
  } else if (kind === "supply_gap") {
    section = `${paragraph("Bu bölgede sahiplenilmiş firma olmadığı için talep bekletiliyor. Aşağıdaki kayıtlı firmalara, bağlantıya dokunarak sahiplenme daveti gönderebilirsiniz.")}${firmLinkList(unclaimedFirms, "Sahiplenme daveti gönder")}`;
    sectionText = firmTextList(unclaimedFirms);
  } else {
    section = paragraph("Talep otomatik onay kurallarına takıldı. Yönetim panelinden inceleyip onaylayabilir ya da reddedebilirsiniz.");
  }

  const html = layout({
    preheader: headline[kind],
    heading: headline[kind],
    bodyHtml: `${factsTable(rows)}${section}`,
    cta: { label: "Yönetim Paneli", url: `${siteUrl}/admin` },
  });

  const text = [headline[kind], "", textFacts(rows), "", sectionText, "", `Yönetim Paneli: ${siteUrl}/admin`]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n");

  return { subject: toSingleLine(`[Peyzajbul] ${headline[kind]} — ${lead.service_type}, ${placeOf(lead)}`), html, text };
}
