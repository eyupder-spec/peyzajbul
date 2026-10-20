import { describe, expect, it } from "vitest";
import { escapeHtml } from "../create-lead/html.ts";
import { SUPPORT_EMAIL, firmEmailSubject, renderAdminDigest, renderFirmEmail, renderHomeownerEmail, type TemplateLead } from "./templates.ts";
import { buildClaimOutreachMessage, buildFirmAlertMessage, buildWaMeUrl } from "./waLink.ts";

const SITE = "https://www.peyzajbul.com";

// Fixture homeowner data that must never show up in any notification.
const HOMEOWNER = {
  full_name: "Ayşe Yılmaz",
  phone: "05321234567",
  email: "ayse.yilmaz@example.com",
  address: "Gül Sokak No 5 Daire 3",
  notes: "<script>alert('notes')</script> kapı zili bozuk",
};

const LEAD: TemplateLead = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  service_type: "Bahçe Tasarımı",
  city: "Ankara",
  district: "Çankaya",
  area_size: "150-500",
  budget: "75000-200000",
  timeline: "1-ay",
  token_price: 15,
  routing_status: "routed",
  status_token: "a".repeat(64),
  review_flags: [],
};

// The dispatcher reads whole lead rows; passing PII along proves the templates ignore it.
const LEAD_WITH_PII = { ...LEAD, ...HOMEOWNER } as TemplateLead;

function expectNoHomeownerData(output: { subject: string; html: string; text: string }) {
  const combined = `${output.subject}\n${output.html}\n${output.text}`;
  for (const value of [HOMEOWNER.full_name, "Ayşe", "Yılmaz", HOMEOWNER.phone, "5321234567", HOMEOWNER.email, HOMEOWNER.address, "kapı zili", "alert("]) {
    expect(combined, value).not.toContain(value);
  }
}

const FIRMS = [
  { company_name: "Yeşil Dünya Peyzaj", phone: "0532 000 11 22", waUrl: "https://wa.me/905320001122?text=Merhaba" },
  { company_name: "<script>x</script> Bahçe", phone: "0212 000 00 00", waUrl: null },
];

describe("firm email", () => {
  it("has the agreed subject, facts, CTA and honest note", () => {
    const mail = renderFirmEmail({ lead: LEAD_WITH_PII, assignedCount: 3, isDirect: false, siteUrl: SITE });
    expect(mail.subject).toBe("Yeni talep: Bahçe Tasarımı — Çankaya, Ankara (15 jeton)");
    expect(mail.html).toContain("Talebi Panelde Gör");
    expect(mail.html).toContain(`${SITE}/firma/leadler?lead=${LEAD.id}`);
    expect(mail.html).toContain("#A64826");
    expect(mail.html).toContain("#1A3D2D");
    expect(mail.html).toContain("#FAF8F5");
    expect(mail.html).toContain("İletişim bilgileri jeton ile açılır. Bu talep size dahil 3 firmaya iletildi.");
    expect(mail.html).toContain("150–500 m²");
    expect(mail.html).toContain("75.000 – 200.000 ₺");
    expect(mail.html).toContain(SUPPORT_EMAIL);
    expect(mail.text).toContain("Talebi Panelde Gör:");
  });

  it("omits the price and the district when they are unknown", () => {
    expect(firmEmailSubject({ ...LEAD, district: null, token_price: null })).toBe("Yeni talep: Bahçe Tasarımı — Ankara");
  });

  it("mentions a direct request", () => {
    const mail = renderFirmEmail({ lead: LEAD, assignedCount: 1, isDirect: true, siteUrl: SITE });
    expect(mail.html).toContain("doğrudan firma profilinizden");
  });

  it("contains no homeowner data and escapes lead text", () => {
    const mail = renderFirmEmail({ lead: LEAD_WITH_PII, assignedCount: 2, isDirect: false, siteUrl: SITE });
    expectNoHomeownerData(mail);

    const hostile = renderFirmEmail({
      lead: { ...LEAD, service_type: "<script>alert(1)</script>", district: '"><img src=x>' },
      assignedCount: 2,
      isDirect: false,
      siteUrl: SITE,
    });
    expect(hostile.html).not.toContain("<script>");
    expect(hostile.html).not.toContain("<img");
    expect(hostile.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(hostile.subject).not.toMatch(/[\r\n]/);
  });
});

describe("homeowner email", () => {
  it("confirms a routed lead with an honest message and the status link", () => {
    const mail = renderHomeownerEmail({ kind: "confirm", lead: LEAD_WITH_PII, siteUrl: SITE });
    expect(mail.html).toContain(
      "Talebiniz alındı ve bölgenizdeki uygun firmalara iletildi. Firmalar talebi inceleyip sizinle iletişime geçer.",
    );
    expect(mail.html).toContain(`${SITE}/talep/${LEAD.id}?t=${"a".repeat(64)}`);
    expect(mail.html).not.toMatch(/1 saat/);
    expectNoHomeownerData(mail);
  });

  it("uses the waiting variant when no firm matched yet", () => {
    const mail = renderHomeownerEmail({ kind: "confirm", lead: { ...LEAD, routing_status: "waiting_supply" }, siteUrl: SITE });
    expect(mail.html).toContain(
      "Bölgenizde şu an talebinize uygun kayıtlı firma arıyoruz; bir firma eşleştiğinde e-posta ile haber vereceğiz.",
    );
  });

  it("says the lead is reviewed when it needs review, without promising a time", () => {
    const mail = renderHomeownerEmail({ kind: "confirm", lead: { ...LEAD, routing_status: "needs_review" }, siteUrl: SITE });
    expect(mail.html).toContain("incelenecek");
    expect(mail.html).not.toMatch(/saat içinde|dakika içinde|hemen/i);
  });

  it("sends the update when a waiting lead found a firm", () => {
    const mail = renderHomeownerEmail({ kind: "update", lead: LEAD_WITH_PII, siteUrl: SITE });
    expect(mail.subject).toBe("Talebiniz firmalara iletildi - Peyzajbul");
    expectNoHomeownerData(mail);
  });

  it("works without a status token", () => {
    const mail = renderHomeownerEmail({ kind: "confirm", lead: { ...LEAD, status_token: null }, siteUrl: SITE });
    expect(mail.html).not.toContain("/talep/");
  });
});

describe("admin digest", () => {
  it("lists the routed firms with wa.me links and escapes company names", () => {
    const mail = renderAdminDigest({
      kind: "routed",
      lead: { ...LEAD_WITH_PII, review_flags: ["target_unclaimed"] },
      assignedFirms: FIRMS,
      unclaimedFirms: [],
      siteUrl: SITE,
    });
    expect(mail.subject).toContain("#0f8fad5b");
    expect(mail.html).toContain("https://wa.me/905320001122?text=Merhaba");
    expect(mail.html).toContain("&lt;script&gt;x&lt;/script&gt; Bahçe");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("cep numarası yok");
    expect(mail.html).toContain("target_unclaimed");
    expectNoHomeownerData(mail);
  });

  it("lists unclaimed firms for outreach when there is no supply", () => {
    const mail = renderAdminDigest({
      kind: "supply_gap",
      lead: { ...LEAD, routing_status: "waiting_supply" },
      assignedFirms: [],
      unclaimedFirms: FIRMS,
      siteUrl: SITE,
    });
    expect(mail.subject).toContain("bölgede kayıtlı firma yok");
    expect(mail.html).toContain("Sahiplenme daveti gönder");
  });

  it("shows the review flags and the admin link for a lead that needs review", () => {
    const mail = renderAdminDigest({
      kind: "needs_review",
      lead: { ...LEAD_WITH_PII, review_flags: ["too_fast", "suspicious_notes"] },
      assignedFirms: [],
      unclaimedFirms: [],
      siteUrl: SITE,
    });
    expect(mail.html).toContain("too_fast, suspicious_notes");
    expect(mail.html).toContain(`${SITE}/admin`);
    expectNoHomeownerData(mail);
  });
});

describe("wa.me links", () => {
  it("builds https://wa.me/905XXXXXXXXX?text=... for Turkish mobile numbers", () => {
    const message = buildFirmAlertMessage(LEAD, `${SITE}/firma/leadler?lead=${LEAD.id}`);
    const url = buildWaMeUrl("0532 123 45 67", message);
    expect(url).toMatch(/^https:\/\/wa\.me\/905321234567\?text=/);
    expect(decodeURIComponent(url?.split("?text=")[1] ?? "")).toBe(message);
    expect(message).not.toContain(HOMEOWNER.phone);
  });

  it("returns null for landlines and garbage", () => {
    expect(buildWaMeUrl("0212 123 45 67", "x")).toBeNull();
    expect(buildWaMeUrl(null, "x")).toBeNull();
    expect(buildWaMeUrl("yok", "x")).toBeNull();
  });

  it("the claim outreach text points at the claim URL", () => {
    const text = buildClaimOutreachMessage(LEAD, `${SITE}/firma-sahiplen/yesil-dunya`);
    expect(text).toBe(
      `Merhaba, Peyzajbul’da Çankaya, Ankara için Bahçe Tasarımı talebi var. Firma profilinizi sahiplenerek talebe teklif verebilirsiniz: ${SITE}/firma-sahiplen/yesil-dunya`,
    );
  });
});

describe("escapeHtml", () => {
  it("escapes the five dangerous characters", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
    expect(escapeHtml(null)).toBe("");
  });
});
