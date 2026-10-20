import { describe, expect, it } from "vitest";
import {
  DAILY_WA_CAP,
  OPT_OUT_LINE,
  PEYZAJBUL_WA_NUMBER,
  SITE_URL,
  SOURCE_DISCLOSURE,
  WHATSAPP_MAX_LENGTH,
  budgetLabel,
  buildMailtoLink,
  buildWaLink,
  claimCodeWaText,
  claimUrl,
  maskEmail,
  maskPhone,
  neutralSummary,
  normalizeTrMobile,
  phoneKey,
  profileUrl,
  projectSizeLabel,
  removalRequestWaText,
  renderTemplate,
  supportWaLink,
  type OutreachStep,
  type TemplateLead,
  type TemplateVars,
} from "./outreachTemplates";

const VARS: TemplateVars = {
  firm: "Yeşil Bahçe Peyzaj",
  city: "Ankara",
  district: "Çankaya",
  sender: "Eyüp",
  profileUrl: "https://www.peyzajbul.com/firma/yesil-bahce-peyzaj-0a1b2c3d",
  claimUrl: "https://www.peyzajbul.com/s/k7m2p9x4qa",
};

const LEAD: TemplateLead = {
  service_type: "Bahçe Düzenleme",
  district: "Çankaya",
  city: "Ankara",
  project_size: "250-500 m²",
  budget: "100.000 - 250.000 TL",
};

const OUTBOUND_STEPS: OutreachStep[] = ["day0_intro", "day3_lead", "day7_email", "day10_call", "day14_breakup"];
const WHATSAPP_STEPS: OutreachStep[] = ["day0_intro", "day3_lead", "day14_breakup"];

const render = (step: OutreachStep, extra: Partial<TemplateVars> = {}) =>
  renderTemplate(step, { ...VARS, lead: LEAD, ...extra });

describe("normalizeTrMobile", () => {
  it.each([
    ["0532 123 45 42", "905321234542"],
    ["532 123 45 42", "905321234542"],
    ["5321234542", "905321234542"],
    ["+90 532 123 45 42", "905321234542"],
    ["90 532 123 45 42", "905321234542"],
    ["0090 532 123 45 42", "905321234542"],
    ["0 (532) 123-45-42", "905321234542"],
    ["0532-123-45-42", "905321234542"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeTrMobile(input)).toBe(expected);
  });

  it.each([
    ["landline 02xx", "0212 555 11 77"],
    ["landline 03xx", "0312 555 11 77"],
    ["landline 04xx", "0462 555 11 77"],
    ["landline without zero", "212 555 11 77"],
    ["too short", "0532 123 45"],
    ["too long", "0532 123 45 421"],
    ["letters", "0532 123 45 4x"],
    ["garbage", "abc"],
    ["empty", ""],
    ["only spaces", "   "],
  ])("rejects %s", (_label, input) => {
    expect(normalizeTrMobile(input)).toBeNull();
  });

  it("rejects null and undefined", () => {
    expect(normalizeTrMobile(null)).toBeNull();
    expect(normalizeTrMobile(undefined)).toBeNull();
  });
});

describe("links", () => {
  it("encodes Turkish characters in wa.me links", () => {
    const text = "Merhaba, şöyle çalışır: ğüişöç İ & 100% (test)";
    const link = buildWaLink("0532 123 45 42", text);
    expect(link).toBe(`https://wa.me/905321234542?text=${encodeURIComponent(text)}`);
    expect(link).toContain("%C5%9F");
    expect(link).not.toContain(" ");
    expect(link).not.toContain("&");
  });

  it("returns null for a number that cannot receive WhatsApp", () => {
    expect(buildWaLink("0212 555 11 77", "x")).toBeNull();
    expect(buildWaLink(null, "x")).toBeNull();
  });

  it("builds claim, profile and support links from one base", () => {
    expect(SITE_URL).not.toMatch(/\/$/);
    expect(claimUrl("k7m2p9x4qa")).toBe(`${SITE_URL}/s/k7m2p9x4qa`);
    expect(profileUrl("firma-0a1b2c3d")).toBe(`${SITE_URL}/firma/firma-0a1b2c3d`);
    expect(supportWaLink()).toBe(`https://wa.me/${PEYZAJBUL_WA_NUMBER}`);
    expect(supportWaLink("KALDIR")).toBe(`https://wa.me/${PEYZAJBUL_WA_NUMBER}?text=KALDIR`);
  });

  it("builds the claim-code and removal messages", () => {
    expect(claimCodeWaText("PB-2K9F", "Yeşil Bahçe")).toBe("Peyzajbul sahiplenme kodu: PB-2K9F (Yeşil Bahçe)");
    expect(removalRequestWaText("Yeşil Bahçe")).toMatch(/^KALDIR/);
  });

  it("builds a mailto link with CRLF line breaks", () => {
    const link = buildMailtoLink("firma@ornek.com", { subject: "Konu: ş", body: "Satır 1\nSatır 2" });
    expect(link.startsWith("mailto:firma@ornek.com?")).toBe(true);
    expect(link).toContain(`subject=${encodeURIComponent("Konu: ş")}`);
    expect(link).toContain("Sat%C4%B1r%201%0D%0ASat%C4%B1r%202");
  });
});

describe("masking", () => {
  it("masks e-mail addresses", () => {
    expect(maskEmail("info@firma.com")).toBe("i***@firma.com");
    expect(maskEmail("@firma.com")).toBeNull();
    expect(maskEmail("")).toBeNull();
    expect(maskEmail(null)).toBeNull();
  });

  it("masks phone numbers", () => {
    expect(maskPhone("0532 123 45 42")).toBe("05** *** ** 42");
    expect(maskPhone("+90 532 123 45 42")).toBe("05** *** ** 42");
    expect(maskPhone("12345")).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
  });
});

describe("phoneKey", () => {
  it("is the last ten digits whatever the formatting", () => {
    expect(phoneKey("0532 123 45 42")).toBe("5321234542");
    expect(phoneKey("+90 (532) 123-45-42")).toBe("5321234542");
    expect(phoneKey("5321234542")).toBe("5321234542");
    expect(phoneKey("0212 555 11 77")).toBe("2125551177");
  });

  it("is null for anything shorter than ten digits", () => {
    expect(phoneKey("12345")).toBeNull();
    expect(phoneKey("")).toBeNull();
    expect(phoneKey(null)).toBeNull();
  });
});

describe("neutralSummary", () => {
  it("describes the firm in the third person with its first three services", () => {
    expect(
      neutralSummary({
        company_name: "Yeşil Bahçe Peyzaj",
        city: "Ankara",
        district: "Çankaya",
        services: "Bahçe Düzenleme, Peyzaj Tasarımı, Çim Serimi, Sulama Sistemi",
      }),
    ).toBe("Yeşil Bahçe Peyzaj, Ankara/Çankaya bölgesinde Bahçe Düzenleme, Peyzaj Tasarımı ve Çim Serimi alanlarında faaliyet gösteren bir peyzaj firmasıdır.");
  });

  it("leaves out the place when the city is not known yet", () => {
    expect(neutralSummary({ company_name: "Dal Peyzaj", city: "", services: "Budama, Çim Serimi" })).toBe(
      "Dal Peyzaj, Budama ve Çim Serimi alanlarında faaliyet gösteren bir peyzaj firmasıdır.",
    );
  });

  it("never starts the place with a slash when only the district is known", () => {
    expect(neutralSummary({ company_name: "Dal Peyzaj", city: "", district: "Çankaya", services: [] })).toBe(
      "Dal Peyzaj, Çankaya bölgesinde faaliyet gösteren bir peyzaj firmasıdır.",
    );
  });

  it("copes with a missing district and a missing service list", () => {
    expect(neutralSummary({ company_name: "Dal Peyzaj", city: "İzmir", services: [] })).toBe(
      "Dal Peyzaj, İzmir bölgesinde faaliyet gösteren bir peyzaj firmasıdır.",
    );
    expect(neutralSummary({ company_name: "Dal Peyzaj", city: "İzmir", services: ["Budama"] })).toBe(
      "Dal Peyzaj, İzmir bölgesinde Budama alanlarında faaliyet gösteren bir peyzaj firmasıdır.",
    );
  });
});

describe("renderTemplate content rules", () => {
  it.each(OUTBOUND_STEPS)("%s carries the source disclosure and the opt-out line", (step) => {
    const { body } = render(step);
    expect(body).toContain(SOURCE_DISCLOSURE);
    expect(body).toContain(OPT_OUT_LINE);
    expect(SOURCE_DISCLOSURE).toBe("Bilgileriniz kamuya açık kaynaklardan derlenmiştir.");
    expect(OPT_OUT_LINE).toBe("Listede yer almak istemezseniz KALDIR yazmanız yeterli.");
  });

  it.each(WHATSAPP_STEPS)("%s stays within the WhatsApp length limit even with maximal inputs", (step) => {
    const long = "ş".repeat(400);
    const { body } = render(step, {
      firm: long,
      city: long,
      sender: long,
      views30d: 123456,
      offer: long,
      lead: { service_type: long, district: long, city: long, project_size: long, budget: long, requestedFirm: true },
    });
    expect(body.length).toBeLessThanOrEqual(WHATSAPP_MAX_LENGTH);
  });

  it.each(OUTBOUND_STEPS)("%s uses no emoji", (step) => {
    expect(render(step, { views30d: 50, offer: "Kurucu Üye fiyatı" }).body).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("gives only the e-mail template a subject", () => {
    expect(render("day7_email").subject).toBe("Yeşil Bahçe Peyzaj için Peyzajbul profili");
    for (const step of ["day0_intro", "day3_lead", "day10_call", "day14_breakup"] as const) {
      expect(render(step).subject).toBeNull();
    }
  });
});

describe("day0_intro", () => {
  it("follows the agreed wording", () => {
    const { body } = render("day0_intro");
    expect(body.startsWith("Merhaba, ben Eyüp, Peyzajbul.com'dan yazıyorum. Yeşil Bahçe Peyzaj için Ankara rehberimizde ücretsiz bir profil sayfası yayında: ")).toBe(true);
    expect(body).toContain(VARS.profileUrl);
    expect(body).toContain(`Bilgilerinizi 2 dakikada güncelleyip sahiplenebilirsiniz: ${VARS.claimUrl}`);
  });

  it.each([undefined, null, 0, 9, Number.NaN])("leaves the views sentence out for %s", (views) => {
    expect(render("day0_intro", { views30d: views as number | null | undefined }).body).not.toContain("görüntülendi");
  });

  it.each([
    [10, "Sayfanız son 30 günde 10 kez görüntülendi."],
    [123, "Sayfanız son 30 günde 123 kez görüntülendi."],
  ])("renders the views sentence for %s views", (views, sentence) => {
    expect(render("day0_intro", { views30d: views }).body).toContain(sentence);
  });

  it("falls back to a neutral sender name", () => {
    expect(render("day0_intro", { sender: "  " }).body).toContain("ben Peyzajbul ekibi,");
  });
});

describe("day3_lead", () => {
  it("refuses to render without a real lead", () => {
    expect(() => renderTemplate("day3_lead", VARS)).toThrow(/real lead/);
    expect(() => renderTemplate("day3_lead", { ...VARS, lead: null })).toThrow(/real lead/);
  });

  it("says so when the homeowner picked this very firm", () => {
    expect(render("day3_lead").body).not.toContain("doğrudan");
    const { body } = render("day3_lead", { lead: { ...LEAD, requestedFirm: true } });
    expect(body).toContain("için, doğrudan Yeşil Bahçe Peyzaj firmasını seçen bir talep aldık");
    expect(body).toContain(SOURCE_DISCLOSURE);
    expect(body).toContain(OPT_OUT_LINE);
  });

  it("uses the lead's own facts and nothing personal", () => {
    const { body } = render("day3_lead");
    expect(body).toContain("Ankara/Çankaya bölgesinde yakın zamanda Bahçe Düzenleme için bir talep aldık");
    expect(body).toContain("250-500 m²");
    expect(body).toContain("100.000 - 250.000 TL");
    expect(body).toContain(VARS.claimUrl);
  });

  it("turns the slugs the lead form stores into readable labels", () => {
    const { body } = render("day3_lead", { lead: { ...LEAD, project_size: "50-150", budget: "25000-75000" } });
    expect(body).toContain("(proje büyüklüğü: 50–150 m², bütçe: 25.000 – 75.000 ₺).");
    expect(body).not.toMatch(/50-150|25000/);
  });

  it.each(["bilmiyorum", "teklif-sonrasi", "Henüz Bilmiyorum", "Teklif Aldıktan Sonra Karar Vereceğim"])(
    "leaves the budget out when the homeowner gave none (%s)",
    (budget) => {
      const { body } = render("day3_lead", { lead: { ...LEAD, project_size: "150-500", budget } });
      expect(body).toContain("(proje büyüklüğü: 150–500 m²).");
      expect(body).not.toContain("bütçe");
      expect(body).not.toMatch(/bilmiyorum|Bilmiyorum|Karar/);
    },
  );

  it("drops the whole bracket when neither size nor budget is known", () => {
    const { body } = render("day3_lead", { lead: { ...LEAD, project_size: "", budget: "bilmiyorum" } });
    expect(body).toContain("için bir talep aldık.");
    expect(body).not.toContain("(");
  });
});

describe("lead labels", () => {
  it("maps lead-form slugs and keeps anything else as it is", () => {
    expect(projectSizeLabel("1000-5000")).toBe("1.000–5.000 m²");
    expect(budgetLabel("200000+")).toBe("200.000 ₺ üzeri");
    expect(projectSizeLabel("250-500 m²")).toBe("250-500 m²");
    expect(budgetLabel("100.000 - 250.000 TL")).toBe("100.000 - 250.000 TL");
    expect(budgetLabel("constructor")).toBe("constructor");
    expect(projectSizeLabel(null)).toBe("");
  });
});

describe("price line", () => {
  const OFFER = "Kurucu Üye fiyatı: ilk 12 ay 490 TL/ay";

  it("is omitted unless the caller passes an offer", () => {
    for (const step of OUTBOUND_STEPS) expect(render(step).body).not.toContain("Kurucu");
  });

  it("is rendered in the e-mail and the break-up message when passed", () => {
    expect(render("day7_email", { offer: OFFER }).body).toContain(OFFER);
    expect(render("day14_breakup", { offer: OFFER }).body).toContain(OFFER);
    expect(render("day0_intro", { offer: OFFER }).body).not.toContain(OFFER);
    expect(render("day3_lead", { offer: OFFER }).body).not.toContain(OFFER);
  });

  it("ignores a blank offer", () => {
    expect(render("day14_breakup", { offer: "   " }).body).not.toContain("   ");
  });
});

describe("day10_call and day14_breakup", () => {
  it("builds a call script with the profile and claim links", () => {
    const { body } = render("day10_call");
    expect(body).toContain("Arama notu: Yeşil Bahçe Peyzaj (Ankara/Çankaya)");
    expect(body).toContain(VARS.profileUrl);
    expect(body).toContain(VARS.claimUrl);
  });

  it("promises no further messages only because the queue really stops after it", () => {
    const { body } = render("day14_breakup");
    expect(body).toContain("başka mesaj göndermeyeceğim");
    expect(body).toContain(VARS.claimUrl);
  });
});

describe("replies", () => {
  it("acknowledges a removal without asking anything", () => {
    const { body } = renderTemplate("removal_ack", VARS);
    expect(body).toContain("yayından kaldırıldı");
    expect(body).not.toContain(VARS.claimUrl);
  });

  it("tells an approved owner how to log in without a password", () => {
    const { body } = renderTemplate("claim_approved_wa", { ...VARS, loginUrl: "https://www.peyzajbul.com/firma/giris" });
    expect(body).toContain("https://www.peyzajbul.com/firma/giris");
    expect(body).toContain("Şifre gerekmez");
  });
});

describe("limits", () => {
  it("keeps the daily WhatsApp cap at 25", () => {
    expect(DAILY_WA_CAP).toBe(25);
  });
});
