import { describe, expect, it } from "vitest";
import { buildCreateLeadBody, type CreateLeadContext } from "../../../src/components/lead-form/leadApiCore.ts";
import * as form from "../../../src/lib/leadFormData.ts";
import * as estimate from "./estimate.ts";
import * as labels from "./labels.ts";
import { OPTIONAL_LEAD_COLUMNS, buildLeadRow, initialReviewFlags, isMissingOptionalColumnError, withoutOptionalColumns } from "./leadRow.ts";
import { isDisposableEmail, isHoneypotTripped, parseLeadInput, sanitizeText } from "./validate.ts";

const BASE = {
  projectType: "residential",
  serviceType: "bahce-tasarimi",
  scope: ["cim-ekimi"],
  city: "Ankara",
  district: "Çankaya",
  address: "Gül Sokak No 5",
  propertyType: "villa",
  areaSize: "150-500",
  currentCondition: "eski-bahce",
  budget: "75000-200000",
  timeline: "1-ay",
  notes: "Ön bahçe yenilenecek.",
  fullName: "Ayşe Yılmaz",
  phone: "0532 123 45 67",
  email: "Ayse.Yilmaz@Example.com",
  kvkkAccepted: true,
  consentVersion: "2026-10",
  turnstileToken: "token",
};

function parse(overrides: Record<string, unknown> = {}) {
  return parseLeadInput({ ...BASE, ...overrides });
}

const values = (options: { value: string }[]) => options.map((option) => option.value);
const sorted = (list: readonly string[]) => [...list].sort();

describe("allow-lists mirror src/lib/leadFormData.ts", () => {
  it("service slugs and labels", () => {
    expect(sorted(labels.SERVICE_SLUGS)).toEqual(sorted(Object.keys(form.SERVICE_TYPE_TO_LABEL)));
    expect(labels.SERVICE_TYPE_TO_LABEL).toEqual(form.SERVICE_TYPE_TO_LABEL);
    const offered = [...values(form.RESIDENTIAL_SERVICES), ...values(form.COMMERCIAL_SERVICES)];
    expect(sorted(labels.SERVICE_SLUGS)).toEqual(sorted(offered));
  });

  it("scope values per service", () => {
    for (const [service, options] of Object.entries(form.SCOPE_OPTIONS)) {
      expect(sorted(labels.SCOPE_VALUES[service as labels.ServiceSlug])).toEqual(sorted(values(options)));
    }
    for (const service of labels.SERVICE_SLUGS) {
      if (!(service in form.SCOPE_OPTIONS)) expect(labels.SCOPE_VALUES[service]).toEqual([]);
    }
  });

  it("irrigation and water source enums", () => {
    expect(sorted(labels.IRRIGATION_TYPES)).toEqual(sorted(values(form.IRRIGATION_TYPE_OPTIONS)));
    expect(sorted(labels.IRRIGATION_SYSTEMS)).toEqual(sorted(values(form.IRRIGATION_SYSTEM_OPTIONS)));
    expect(sorted(labels.WATER_SOURCES)).toEqual(sorted(values(form.WATER_SOURCE_OPTIONS)));
  });

  it("81 cities in the same order", () => {
    expect(form.TURKISH_CITIES).toHaveLength(81);
    expect([...labels.TURKISH_CITIES]).toEqual(form.TURKISH_CITIES);
  });

  it("property types, areas, conditions, budgets and timelines", () => {
    expect(sorted(labels.PROPERTY_TYPES)).toEqual(
      sorted([...values(form.RESIDENTIAL_PROPERTY_TYPES), ...values(form.COMMERCIAL_PROPERTY_TYPES)]),
    );
    expect(sorted(labels.AREA_SIZES)).toEqual(
      sorted([...values(form.RESIDENTIAL_AREA_SIZES), ...values(form.COMMERCIAL_AREA_SIZES)]),
    );
    expect(sorted(labels.CURRENT_CONDITIONS)).toEqual(sorted(values(form.CURRENT_CONDITION_OPTIONS)));
    expect(sorted(labels.BUDGETS)).toEqual(sorted([...values(form.RESIDENTIAL_BUDGETS), ...values(form.COMMERCIAL_BUDGETS)]));
    expect(sorted(labels.TIMELINES)).toEqual(sorted(values(form.TIMELINE_OPTIONS)));
  });

  it("lead sources and the estimate token format", () => {
    expect([...labels.LEAD_SOURCES]).toEqual([...form.LEAD_SOURCES]);
    expect(estimate.ESTIMATE_TOKEN_PATTERN.source).toBe(form.ESTIMATE_TOKEN_PATTERN.source);
    expect(estimate.ESTIMATE_TOKEN_PATTERN.flags).toBe(form.ESTIMATE_TOKEN_PATTERN.flags);
  });

  it("every area, budget and timeline has a display label", () => {
    for (const area of labels.AREA_SIZES) expect(labels.AREA_LABELS[area]).toBeTruthy();
    for (const budget of labels.BUDGETS) expect(labels.BUDGET_LABELS[budget]).toBeTruthy();
    for (const timeline of labels.TIMELINES) expect(labels.TIMELINE_LABELS[timeline]).toBeTruthy();
  });
});

describe("parseLeadInput accepts every value the form offers", () => {
  it("accepts the base payload and normalises it", () => {
    const result = parse();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.serviceSlug).toBe("bahce-tasarimi");
    expect(result.data.email).toBe("ayse.yilmaz@example.com");
    expect(result.data.phone).toBe("05321234567");
    expect(result.honeypot).toBe(false);
  });

  it("accepts serviceSlug as well as serviceType", () => {
    const { serviceType: _unused, ...rest } = BASE;
    expect(parseLeadInput({ ...rest, serviceSlug: "sert-zemin", scope: [] }).success).toBe(true);
  });

  it.each(Object.keys(form.SERVICE_TYPE_TO_LABEL))("service %s", (slug) => {
    expect(parse({ serviceType: slug, scope: [] }).success).toBe(true);
  });

  it("every scope option of every service", () => {
    for (const [service, options] of Object.entries(form.SCOPE_OPTIONS)) {
      expect(parse({ serviceType: service, scope: values(options) }).success).toBe(true);
    }
  });

  it.each(form.TURKISH_CITIES)("city %s", (city) => {
    expect(parse({ city }).success).toBe(true);
  });

  it("every area, budget, timeline, property type and condition", () => {
    for (const option of [...form.RESIDENTIAL_AREA_SIZES, ...form.COMMERCIAL_AREA_SIZES]) {
      expect(parse({ areaSize: option.value }).success).toBe(true);
    }
    for (const option of [...form.RESIDENTIAL_BUDGETS, ...form.COMMERCIAL_BUDGETS]) {
      expect(parse({ budget: option.value }).success).toBe(true);
    }
    for (const option of form.TIMELINE_OPTIONS) expect(parse({ timeline: option.value }).success).toBe(true);
    for (const option of [...form.RESIDENTIAL_PROPERTY_TYPES, ...form.COMMERCIAL_PROPERTY_TYPES]) {
      expect(parse({ propertyType: option.value }).success).toBe(true);
    }
    for (const option of form.CURRENT_CONDITION_OPTIONS) {
      expect(parse({ currentCondition: option.value }).success).toBe(true);
    }
  });

  it("irrigation details", () => {
    const result = parse({
      serviceType: "sulama-sistemi",
      scope: [],
      irrigationType: form.IRRIGATION_TYPE_OPTIONS[0].value,
      irrigationSystem: form.IRRIGATION_SYSTEM_OPTIONS[0].value,
      waterSource: form.WATER_SOURCE_OPTIONS[0].value,
    });
    expect(result.success).toBe(true);
  });

  it("treats the empty strings of an untouched form as absent", () => {
    const result = parse({
      district: "",
      address: "",
      propertyType: "",
      currentCondition: "",
      irrigationType: "",
      notes: "",
      targetFirmId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.propertyType).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });
});

describe("parseLeadInput rejects bad input", () => {
  it("unknown enum values give field errors", () => {
    const service = parse({ serviceType: "ucan-daire" });
    expect(service.success).toBe(false);
    if (!service.success) expect(service.fieldErrors.serviceSlug).toBeDefined();

    for (const override of [
      { city: "Atlantis" },
      { budget: "1 milyon" },
      { timeline: "yarin" },
      { areaSize: "dev" },
      { projectType: "industrial" },
      { propertyType: "saray" },
      { irrigationType: "sihir" },
    ]) {
      expect(parse(override).success, JSON.stringify(override)).toBe(false);
    }
  });

  it("scope values must belong to the service", () => {
    expect(parse({ scope: ["dogal-tas"] }).success).toBe(false);
    expect(parse({ serviceType: "sulama-sistemi", scope: ["cim-ekimi"] }).success).toBe(false);
  });

  it("rejects disposable email domains", () => {
    expect(parse({ email: "x@mailinator.com" }).success).toBe(false);
    expect(parse({ email: "x@sub.yopmail.com" }).success).toBe(false);
    expect(isDisposableEmail("x@example.com")).toBe(false);
  });

  it("requires KVKK consent", () => {
    expect(parse({ kvkkAccepted: false }).success).toBe(false);
    expect(parse({ kvkkAccepted: undefined }).success).toBe(false);
    expect(parse({ kvkkAccepted: "true" }).success).toBe(false);
  });

  it("validates name and phone", () => {
    expect(parse({ fullName: "Ayse" }).success).toBe(false);
    expect(parse({ fullName: "A1 B2" }).success).toBe(false);
    expect(parse({ phone: "02121234567" }).success).toBe(false);
    expect(parse({ phone: "05a21234567" }).success).toBe(false);
  });

  it("limits notes and photos", () => {
    expect(parse({ notes: "a".repeat(1001) }).success).toBe(false);
    expect(parse({ notes: "a".repeat(1000) }).success).toBe(true);
    expect(parse({ photoExts: ["jpg", "png", "webp", "jpeg", "jpg", "png"] }).success).toBe(false);
    expect(parse({ photoExts: ["gif"] }).success).toBe(false);
    expect(parse({ photoExts: ["jpg"], photoCount: 2 }).success).toBe(false);
  });

  it("a non-object body is a validation failure, not a crash", () => {
    expect(parseLeadInput(null).success).toBe(false);
    expect(parseLeadInput("text").success).toBe(false);
  });
});

describe("privileged and unknown fields", () => {
  const PRIVILEGED = {
    admin_approved: true,
    token_price: 1,
    price_jeton: 1,
    assigned_firms: ["00000000-0000-4000-8000-000000000000"],
    status: "active",
    lead_score: 99,
    user_id: "00000000-0000-4000-8000-000000000001",
    routing_status: "routed",
    email_verified_at: "2026-01-01T00:00:00Z",
    review_flags: [],
  };

  it("are dropped by the parser", () => {
    const result = parse(PRIVILEGED);
    expect(result.success).toBe(true);
    if (!result.success) return;
    for (const key of Object.keys(PRIVILEGED)) {
      expect(Object.keys(result.data)).not.toContain(key);
    }
  });

  it("never reach the inserted row", () => {
    const result = parse(PRIVILEGED);
    if (!result.success) throw new Error("expected success");
    const { row } = buildLeadRow(result.data, {
      leadId: "11111111-1111-4111-8111-111111111111",
      newPhotoId: () => "photo",
      targetFirmId: null,
      ipHash: "hash",
      nowIso: "2026-10-20T10:00:00.000Z",
    });
    expect(row.status).toBe("unverified");
    expect(row.admin_approved).toBe(false);
    expect(row.routing_status).toBe("pending");
    expect(row.user_id).toBeNull();
    expect(row.review_flags).toEqual([]);
    for (const key of ["token_price", "price_jeton", "assigned_firms", "lead_score", "email_verified_at"]) {
      expect(row).not.toHaveProperty(key);
    }
  });
});

describe("honeypot", () => {
  it("is flagged when the hidden field is filled", () => {
    expect(isHoneypotTripped({ website: "https://spam.example" })).toBe(true);
    expect(isHoneypotTripped({ website: "   " })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
    const result = parse({ website: "https://spam.example" });
    expect(result.success && result.honeypot).toBe(true);
  });
});

describe("sanitising", () => {
  it("strips HTML and control characters", () => {
    expect(sanitizeText("<b>Merhaba</b>\u0000 bah\u0007çe <script>x</script>")).toBe("Merhaba bahçe x");
    expect(sanitizeText("alan < 500 m2")).toBe("alan 500 m2");
    expect(sanitizeText("a < b > c")).toBe("a c");
    expect(sanitizeText("satır 1\r\nsatır 2", true)).toBe("satır 1\nsatır 2");
    expect(sanitizeText("tek\nsatır")).toBe("tek satır");
  });

  it("applies to notes and address", () => {
    const result = parse({ notes: "<img src=x onerror=alert(1)>Çim ekimi", address: "Gül\u0000 Sok." });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.notes).toBe("Çim ekimi");
    expect(result.data.address).toBe("Gül Sok.");
  });
});

describe("attribution", () => {
  it("trims, truncates and ignores non-strings", () => {
    const result = parse({
      attribution: {
        landingPath: "  /hizmet/bahce-tasarimi  ",
        referrer: "r".repeat(500),
        utmSource: "google",
        utmMedium: 7,
        gclid: "abc",
        sessionId: "s-1",
        firstTouchAt: "2026-10-01T10:00:00Z",
        extra: "dropped",
      },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const attribution = result.data.attribution;
    expect(attribution.landingPath).toBe("/hizmet/bahce-tasarimi");
    expect(attribution.referrer).toHaveLength(200);
    expect(attribution.utmMedium).toBeUndefined();
    expect(attribution).not.toHaveProperty("extra");
  });

  it("is persisted on the row", () => {
    const result = parse({
      attribution: {
        landingPath: "/hizmet/bahce-tasarimi/ankara",
        referrer: "https://www.google.com/",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "ankara-bahce",
        utmTerm: "peyzaj",
        utmContent: "ad1",
        gclid: "gclid-1",
        sessionId: "session-1",
        firstTouchAt: "2026-10-01T10:00:00Z",
      },
    });
    if (!result.success) throw new Error("expected success");
    const { row } = buildLeadRow(result.data, {
      leadId: "11111111-1111-4111-8111-111111111111",
      newPhotoId: () => "photo",
      targetFirmId: null,
      ipHash: "hash",
      nowIso: "2026-10-20T10:00:00.000Z",
    });
    expect(row).toMatchObject({
      landing_path: "/hizmet/bahce-tasarimi/ankara",
      referrer: "https://www.google.com/",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "ankara-bahce",
      utm_term: "peyzaj",
      utm_content: "ad1",
      gclid: "gclid-1",
      client_session_id: "session-1",
      first_touch_at: "2026-10-01T10:00:00.000Z",
      ip_hash: "hash",
      kvkk_accepted_at: "2026-10-20T10:00:00.000Z",
      kvkk_version: "2026-10",
    });
  });

  it("an unparseable firstTouchAt becomes null", () => {
    const result = parse({ attribution: { firstTouchAt: "yesterday-ish" } });
    if (!result.success) throw new Error("expected success");
    const { row } = buildLeadRow(result.data, {
      leadId: "11111111-1111-4111-8111-111111111111",
      newPhotoId: () => "photo",
      targetFirmId: null,
      ipHash: "hash",
      nowIso: "2026-10-20T10:00:00.000Z",
    });
    expect(row.first_touch_at).toBeNull();
  });
});

describe("lead row", () => {
  it("stores the label, the slug and predetermined photo paths", () => {
    const result = parse({ photoExts: ["jpg", "png"], elapsedMs: 1200 });
    if (!result.success) throw new Error("expected success");
    let counter = 0;
    const { row, photoPaths } = buildLeadRow(result.data, {
      leadId: "11111111-1111-4111-8111-111111111111",
      newPhotoId: () => `p${++counter}`,
      targetFirmId: "22222222-2222-4222-8222-222222222222",
      ipHash: "hash",
      nowIso: "2026-10-20T10:00:00.000Z",
    });
    expect(row.service_type).toBe("Bahçe Tasarımı");
    expect(row.service_slug).toBe("bahce-tasarimi");
    expect(row.project_size).toBe(row.area_size);
    expect(photoPaths).toEqual([
      "11111111-1111-4111-8111-111111111111/p1.jpg",
      "11111111-1111-4111-8111-111111111111/p2.png",
    ]);
    expect(row.photo_urls).toEqual(photoPaths);
    expect(row.target_firm_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(row.review_flags).toEqual(["too_fast"]);
  });

  it("flags only submissions faster than 3 seconds", () => {
    expect(initialReviewFlags({ elapsedMs: 2999 })).toEqual(["too_fast"]);
    expect(initialReviewFlags({ elapsedMs: 3000 })).toEqual([]);
    expect(initialReviewFlags({ elapsedMs: undefined })).toEqual([]);
  });
});

const ROW_CONTEXT = {
  leadId: "11111111-1111-4111-8111-111111111111",
  newPhotoId: () => "photo",
  targetFirmId: null,
  ipHash: "hash",
  nowIso: "2026-10-20T10:00:00.000Z",
};

describe("kaynak and est (calculator hand-off)", () => {
  const TOKEN = "a1b2c3d4e5f60718";

  it("accepts a known source and a well-formed token and keeps them on the row", () => {
    const result = parse({ kaynak: "calculator", est: TOKEN });
    if (!result.success) throw new Error("expected success");
    expect(result.data.source).toBe("calculator");
    expect(result.data.estimateToken).toBe(TOKEN);
    const { row } = buildLeadRow(result.data, ROW_CONTEXT);
    expect(row.lead_source).toBe("calculator");
    expect(row.estimate_token).toBe(TOKEN);
  });

  it("accepts every source of the form", () => {
    for (const source of form.LEAD_SOURCES) {
      const result = parse({ kaynak: source });
      expect(result.success && result.data.source, source).toBe(source);
    }
  });

  it("stores the token in lower case, as save_estimate generates it", () => {
    const result = parse({ est: TOKEN.toUpperCase() });
    expect(result.success && result.data.estimateToken).toBe(TOKEN);
  });

  it("drops an unknown source or a malformed token instead of failing the lead", () => {
    const badSources = ["google", "Calculator", "", " calculator", "x".repeat(40), 7, null, {}, ["calculator"]];
    for (const kaynak of badSources) {
      const result = parse({ kaynak });
      expect(result.success, JSON.stringify(kaynak)).toBe(true);
      if (result.success) expect(result.data).not.toHaveProperty("source");
    }
    const badTokens = ["", TOKEN.slice(1), `${TOKEN}0`, `${TOKEN.slice(0, 15)}-`, ` ${TOKEN}`, `${TOKEN}\n`, "a".repeat(64), 1234567890123456, null, {}];
    for (const est of badTokens) {
      const result = parse({ est });
      expect(result.success, JSON.stringify(est)).toBe(true);
      if (result.success) expect(result.data).not.toHaveProperty("estimateToken");
    }
  });

  it("leaves both columns null when the request carries neither", () => {
    const result = parse();
    if (!result.success) throw new Error("expected success");
    expect(result.data).not.toHaveProperty("source");
    expect(result.data).not.toHaveProperty("estimateToken");
    const { row } = buildLeadRow(result.data, ROW_CONTEXT);
    expect(row.lead_source).toBeNull();
    expect(row.estimate_token).toBeNull();
  });

  it("accepts the body the lead form builds, source and token included", () => {
    const ctx: CreateLeadContext = {
      source: "calculator",
      attribution: { landing_path: "/maliyet-hesapla" },
      estimateToken: TOKEN,
      elapsedMs: 20000,
      honeypot: "",
      turnstileToken: "tt",
    };
    const data: form.LeadFormData = {
      ...form.initialFormData,
      serviceType: "bahce-tasarimi",
      scope: ["cim-ekimi"],
      city: "Ankara",
      areaSize: "150-500",
      budget: "75000-200000",
      timeline: "1-ay",
      fullName: "Ayşe Yılmaz",
      phone: "05321234567",
      email: "ayse@example.com",
      kvkkAccepted: true,
    };
    const result = parseLeadInput(buildCreateLeadBody(data, ctx));
    if (!result.success) throw new Error(JSON.stringify(result.fieldErrors));
    expect(result.data.source).toBe("calculator");
    expect(result.data.estimateToken).toBe(TOKEN);

    const without = parseLeadInput(buildCreateLeadBody(data, { ...ctx, estimateToken: undefined }));
    expect(without.success && without.data).not.toHaveProperty("estimateToken");
  });
});

describe("rows before the leadint migration is applied", () => {
  it("withoutOptionalColumns removes exactly the columns of the migration", () => {
    const result = parse({ kaynak: "hero", est: "a1b2c3d4e5f60718" });
    if (!result.success) throw new Error("expected success");
    const { row } = buildLeadRow(result.data, ROW_CONTEXT);
    const legacy = withoutOptionalColumns(row);
    for (const column of OPTIONAL_LEAD_COLUMNS) expect(legacy).not.toHaveProperty(column);
    const { lead_source: _source, estimate_token: _token, ...rest } = row;
    expect(legacy).toEqual(rest);
    expect([...OPTIONAL_LEAD_COLUMNS]).toEqual(["lead_source", "estimate_token"]);
  });

  it("recognises the answers PostgREST and Postgres give for an unknown optional column", () => {
    expect(
      isMissingOptionalColumnError({ code: "PGRST204", message: "Could not find the 'lead_source' column of 'leads' in the schema cache" }),
    ).toBe(true);
    expect(isMissingOptionalColumnError({ code: "42703", message: 'column "estimate_token" of relation "leads" does not exist' })).toBe(true);
  });

  it("never hides another failure", () => {
    expect(isMissingOptionalColumnError(null)).toBe(false);
    expect(isMissingOptionalColumnError(undefined)).toBe(false);
    expect(isMissingOptionalColumnError({ code: "23505", message: 'duplicate key value violates unique constraint "leads_pkey"' })).toBe(false);
    expect(isMissingOptionalColumnError({ code: "42703", message: 'column "phone" of relation "leads" does not exist' })).toBe(false);
    expect(isMissingOptionalColumnError({ code: "PGRST204", message: "Could not find the 'phone' column of 'leads' in the schema cache" })).toBe(false);
    expect(isMissingOptionalColumnError({ message: "lead_source" })).toBe(false);
    expect(isMissingOptionalColumnError({ code: "42703" })).toBe(false);
  });
});
