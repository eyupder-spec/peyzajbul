import { describe, it, expect } from "vitest";
import { KVKK_VERSION, SERVICE_TYPE_TO_LABEL, initialFormData, type LeadFormData } from "../../../lib/leadFormData";
import {
  LeadApiError,
  buildCreateLeadBody,
  mapErrorBody,
  mapLeadStatus,
  parseCreateLeadResponse,
  parseResendResponse,
  parseVerifyResponse,
  readFunctionError,
  recoverStoredLead,
  type CreateLeadContext,
} from "../leadApiCore";

const form: LeadFormData = {
  ...initialFormData,
  serviceType: "sulama-sistemi",
  city: "İzmir",
  district: "Karşıyaka",
  areaSize: "500-1000",
  budget: "75000-200000",
  timeline: "1-3-ay",
  irrigationType: "yeni-kurulum",
  irrigationSystem: "damla",
  waterSource: "kuyu",
  fullName: "  Ayşe Yılmaz ",
  phone: "0532 123 45 67",
  email: "",
  kvkkAccepted: true,
};

const ctx: CreateLeadContext = {
  source: "teklif_al",
  attribution: {
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "bahce",
    gclid: "abc123",
    referrer: "www.google.com",
    landing_path: "/teklif-al",
    captured_at: "2026-10-20T10:00:00.000Z",
  },
  sessionId: "session-1",
  elapsedMs: 41234.6,
  honeypot: "",
  turnstileToken: "tt",
};

describe("buildCreateLeadBody", () => {
  const body = buildCreateLeadBody(form, ctx);

  it("sends the slug and the label that routing and pricing match on", () => {
    expect(body.serviceType).toBe("sulama-sistemi");
    expect(body.serviceLabel).toBe(SERVICE_TYPE_TO_LABEL["sulama-sistemi"]);
    expect(body.serviceLabel).toBe("Sulama Sistemleri");
  });

  it("sends the phone as digits only and the name trimmed", () => {
    expect(body.phone).toBe("05321234567");
    expect(body.fullName).toBe("Ayşe Yılmaz");
  });

  it("sends null for an empty e-mail and lower-cases a filled one", () => {
    expect(body.email).toBeNull();
    expect(buildCreateLeadBody({ ...form, email: " Ayse@Example.COM " }, ctx).email).toBe("ayse@example.com");
  });

  it("sends null for every untouched optional field", () => {
    expect(body.propertyType).toBeNull();
    expect(body.currentCondition).toBeNull();
    expect(body.notes).toBeNull();
    expect(body.address).toBeNull();
    expect(body.targetFirmId).toBeNull();
    expect(body.scope).toEqual([]);
    expect(body.photoExts).toEqual([]);
  });

  it("maps the attribution to the field names create-lead reads", () => {
    expect(body.attribution).toEqual({
      landingPath: "/teklif-al",
      referrer: "www.google.com",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "bahce",
      utmTerm: undefined,
      utmContent: undefined,
      gclid: "abc123",
      firstTouchAt: "2026-10-20T10:00:00.000Z",
      sessionId: "session-1",
    });
  });

  it("sends where the form was opened from as kaynak, next to the attribution", () => {
    expect(body.kaynak).toBe("teklif_al");
    expect(body.attribution).not.toHaveProperty("source");
    expect(buildCreateLeadBody(form, { ...ctx, source: "calculator" }).kaynak).toBe("calculator");
  });

  it("sends the calculator estimate token only when it has exactly the token format", () => {
    expect(body.est).toBeNull();
    expect(buildCreateLeadBody(form, { ...ctx, estimateToken: "a1b2c3d4e5f60718" }).est).toBe("a1b2c3d4e5f60718");
    expect(buildCreateLeadBody(form, { ...ctx, estimateToken: "A1B2C3D4E5F60718" }).est).toBe("a1b2c3d4e5f60718");
    for (const bad of ["", "short", "a1b2c3d4e5f607180", "a1b2c3d4e5f6071!", " a1b2c3d4e5f6071", "a1b2c3d4e5f60718\n"]) {
      expect(buildCreateLeadBody(form, { ...ctx, estimateToken: bad }).est, JSON.stringify(bad)).toBeNull();
    }
  });

  it("carries the honeypot, the elapsed time, the captcha token and the consent", () => {
    expect(body.website).toBe("");
    expect(body.elapsedMs).toBe(41235);
    expect(body.turnstileToken).toBe("tt");
    expect(body.kvkkAccepted).toBe(true);
    // Which notice was accepted: the backend stores it as kvkk_version (at most 20 characters).
    expect(body.consentVersion).toBe(KVKK_VERSION);
    expect(KVKK_VERSION.length).toBeGreaterThan(0);
    expect(KVKK_VERSION.length).toBeLessThanOrEqual(20);
    expect(buildCreateLeadBody(form, { ...ctx, honeypot: "http://spam" }).website).toBe("http://spam");
  });

  it("announces one jpg per photo and passes the target firm", () => {
    const photos = [new File(["a"], "a.png"), new File(["b"], "b.webp")];
    const withPhotos = buildCreateLeadBody({ ...form, photos }, { ...ctx, targetFirmId: "9f1c0f0e-0000-4000-8000-000000000001" });
    expect(withPhotos.photoExts).toEqual(["jpg", "jpg"]);
    expect(withPhotos.targetFirmId).toBe("9f1c0f0e-0000-4000-8000-000000000001");
  });

  it("never carries fields the server decides itself", () => {
    const keys = Object.keys(body);
    for (const forbidden of ["status", "admin_approved", "token_price", "price_jeton", "user_id", "assigned_firms"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe("mapErrorBody", () => {
  const table: Array<[string, number, string]> = [
    ["VALIDATION_FAILED", 422, "validation"],
    ["BAD_REQUEST", 400, "validation"],
    ["CAPTCHA_FAILED", 403, "captcha"],
    ["RATE_LIMITED", 429, "rate_limited"],
    ["INVALID_CODE", 400, "invalid_code"],
    ["CODE_EXPIRED", 410, "expired_code"],
    ["LOCKED", 429, "locked"],
    ["NOT_FOUND", 404, "not_found"],
    ["ALREADY_VERIFIED", 409, "already_verified"],
    ["EMAIL_SEND_FAILED", 502, "delivery_failed"],
    ["INTERNAL", 500, "unknown"],
  ];

  it.each(table)("maps %s (HTTP %i) to %s", (serverCode, status, expected) => {
    const error = mapErrorBody({ ok: false, code: serverCode, message: "Mesaj" }, status);
    expect(error).toBeInstanceOf(LeadApiError);
    expect(error.code).toBe(expected);
    expect(error.message).toBe("Mesaj");
  });

  it("falls back to the HTTP status and then to unknown", () => {
    expect(mapErrorBody({}, 429).code).toBe("rate_limited");
    expect(mapErrorBody(null, 500).code).toBe("unknown");
    expect(mapErrorBody("boom").code).toBe("unknown");
  });

  it("keeps the first message per field, the retry hint, the remaining attempts and the stored lead", () => {
    const error = mapErrorBody({
      code: "VALIDATION_FAILED",
      fieldErrors: { email: ["Geçerli bir e-posta adresi girin.", "ikinci"], phone: ["Geçerli bir cep telefonu girin."] },
      retryAfterSeconds: 30,
      attemptsLeft: 2,
      leadId: "lead-1",
      uploads: [{ path: "lead-1/a.jpg", token: "t1" }, { path: "", token: "x" }, "junk"],
    });
    expect(error.fieldErrors).toEqual({ email: "Geçerli bir e-posta adresi girin.", phone: "Geçerli bir cep telefonu girin." });
    expect(error.retryAfterSec).toBe(30);
    expect(error.attemptsLeft).toBe(2);
    expect(error.leadId).toBe("lead-1");
    expect(error.uploads).toEqual([{ path: "lead-1/a.jpg", token: "t1" }]);
  });
});

describe("readFunctionError", () => {
  it("reads the JSON body of a failed function call", async () => {
    const context = new Response(JSON.stringify({ ok: false, code: "INVALID_CODE", attemptsLeft: 3 }), { status: 400 });
    const error = await readFunctionError({ name: "FunctionsHttpError", context });
    expect(error.code).toBe("invalid_code");
    expect(error.attemptsLeft).toBe(3);
  });

  it("maps a network failure and an unreadable body", async () => {
    expect((await readFunctionError({ name: "FunctionsFetchError", context: new TypeError("Failed to fetch") })).code).toBe("network");
    const garbage = new Response("<html>", { status: 429 });
    expect((await readFunctionError({ name: "FunctionsHttpError", context: garbage })).code).toBe("rate_limited");
    expect((await readFunctionError(new Error("x"))).code).toBe("unknown");
  });
});

describe("create-lead responses", () => {
  it("parses a created lead", () => {
    const result = parseCreateLeadResponse(
      {
        ok: true,
        leadId: "lead-1",
        statusToken: "tok",
        otp: { sent: true, expiresInSeconds: 600, resendAfterSeconds: 45 },
        uploads: [{ path: "lead-1/a.jpg", token: "t1" }],
        deduped: false,
      },
      "ay***@gmail.com",
    );
    expect(result).toEqual({
      deduped: false,
      leadId: "lead-1",
      statusToken: "tok",
      verification: { channel: "email", destinationMasked: "ay***@gmail.com", resendAfterSec: 45, sent: true },
      uploads: [{ path: "lead-1/a.jpg", token: "t1" }],
    });
  });

  it("returns the duplicate marker without identifiers", () => {
    expect(parseCreateLeadResponse({ ok: true, deduped: true }, "")).toEqual({ deduped: true });
  });

  it("rejects a success body without a lead id (tripped honeypot)", () => {
    expect(() => parseCreateLeadResponse({ ok: true }, "")).toThrow(LeadApiError);
  });

  it("keeps a stored lead usable when only the first e-mail failed", () => {
    const failed = mapErrorBody({ code: "EMAIL_SEND_FAILED", leadId: "lead-9", uploads: [{ path: "lead-9/a.jpg", token: "t" }] }, 502);
    const recovered = recoverStoredLead(failed, "ay***@gmail.com");
    expect(recovered).toMatchObject({ deduped: false, leadId: "lead-9", statusToken: null, verification: { sent: false, resendAfterSec: 0 } });
    expect(recoverStoredLead(mapErrorBody({ code: "RATE_LIMITED", retryAfterSeconds: 120, leadId: "lead-9" }, 429), "")).toMatchObject({
      verification: { sent: false, resendAfterSec: 120 },
    });
    // No stored lead, or an error that is not about delivery: nothing to recover.
    expect(recoverStoredLead(mapErrorBody({ code: "EMAIL_SEND_FAILED" }, 502), "")).toBeNull();
    expect(recoverStoredLead(mapErrorBody({ code: "VALIDATION_FAILED", leadId: "lead-9" }, 422), "")).toBeNull();
  });
});

describe("send-otp and verify-otp responses", () => {
  it("reads the resend interval with a 60 second default", () => {
    expect(parseResendResponse({ ok: true, otp: { sent: true, resendAfterSeconds: 30 } })).toEqual({ resendAfterSec: 30 });
    expect(parseResendResponse({ ok: true })).toEqual({ resendAfterSec: 60 });
  });

  it("parses a verified lead with and without a session", () => {
    expect(
      parseVerifyResponse({
        ok: true,
        verified: true,
        routing: "routed",
        statusToken: "tok",
        session: { access_token: "a", refresh_token: "r", expires_in: 3600 },
      }),
    ).toEqual({ statusToken: "tok", session: { access_token: "a", refresh_token: "r" }, routing: "routed" });
    expect(parseVerifyResponse({ ok: true, verified: true, session: null })).toEqual({ statusToken: null, session: null, routing: null });
  });

  it("never reads a code or secret out of a response", () => {
    const parsed = parseVerifyResponse({ ok: true, verified: true, otp: "123456", code: "123456" });
    expect(JSON.stringify(parsed)).not.toContain("123456");
    expect(() => parseVerifyResponse({ ok: true })).toThrow(LeadApiError);
  });
});

describe("mapLeadStatus", () => {
  const raw = {
    created_at: "2026-10-20T10:00:00+00:00",
    service_type: "Bahçe Tasarımı",
    city: "Ankara",
    district: null,
    status: "active",
    routing_status: "routed",
    notified_count: 3,
    viewed_count: 2,
    purchased_count: 1,
    contacted_firms: [{ company_name: "Örnek Peyzaj", slug: "ornek-peyzaj" }],
  };

  it("maps the RPC payload to the DTO", () => {
    expect(mapLeadStatus("id-1", raw)).toEqual({
      id: "id-1",
      firstName: null,
      serviceLabel: "Bahçe Tasarımı",
      city: "Ankara",
      district: null,
      createdAt: "2026-10-20T10:00:00+00:00",
      routedAt: null,
      verified: true,
      closed: null,
      routingStatus: "routed",
      matchedFirmCount: 3,
      acceptedFirmCount: 1,
    });
  });

  it("reads the id, the first name and the routing time once the RPC returns them", () => {
    const dto = mapLeadStatus("id-from-url", {
      ...raw,
      id: "7d9f6f0e-1111-4222-8333-444455556666",
      first_name: "  Ayşe ",
      routed_at: "2026-10-20T11:30:00+00:00",
    });
    expect(dto).toMatchObject({
      id: "7d9f6f0e-1111-4222-8333-444455556666",
      firstName: "Ayşe",
      routedAt: "2026-10-20T11:30:00+00:00",
    });
  });

  it("keeps the id of the URL and has no first name or routing time when the RPC does not return them", () => {
    expect(mapLeadStatus("id-from-url", { ...raw, first_name: "", routed_at: null })).toMatchObject({
      id: "id-from-url",
      firstName: null,
      routedAt: null,
    });
    expect(mapLeadStatus("id-1", { ...raw, first_name: 42, routed_at: {} })).toMatchObject({ firstName: null, routedAt: null });
  });

  it("limits the first name and never reads the full name", () => {
    expect(mapLeadStatus("id-1", { ...raw, first_name: "A".repeat(200) })?.firstName).toHaveLength(40);
    expect(mapLeadStatus("id-1", { ...raw, full_name: "Ayşe Yılmaz" })?.firstName).toBeNull();
  });

  it("treats the unverified status as not verified and never counts firms it does not know about", () => {
    const dto = mapLeadStatus("id-1", { ...raw, status: "unverified", routing_status: "pending", notified_count: 0, purchased_count: 0 });
    expect(dto).toMatchObject({ verified: false, closed: null, routingStatus: "pending", matchedFirmCount: 0, acceptedFirmCount: 0 });
  });

  it("counts only the active and purchased statuses as verified", () => {
    expect(mapLeadStatus("id-1", { ...raw, status: "active" })).toMatchObject({ verified: true, closed: null });
    expect(mapLeadStatus("id-1", { ...raw, status: "purchased" })).toMatchObject({ verified: true, closed: null });
  });

  it("an expired lead (the cleanup job closes unverified ones) is neither verified nor routed", () => {
    const dto = mapLeadStatus("id-1", { ...raw, status: "expired", routing_status: "pending", notified_count: 0, purchased_count: 0 });
    expect(dto).toMatchObject({ verified: false, closed: "expired", matchedFirmCount: 0, acceptedFirmCount: 0 });
  });

  it("marks a rejected lead as closed whether the lead status or the routing status says so", () => {
    expect(mapLeadStatus("id-1", { ...raw, status: "rejected", routing_status: "pending" })).toMatchObject({
      verified: false,
      closed: "rejected",
    });
    expect(mapLeadStatus("id-1", { ...raw, status: "active", routing_status: "rejected" })).toMatchObject({
      verified: true,
      closed: "rejected",
      routingStatus: "rejected",
    });
  });

  it("claims nothing for a missing or unknown status", () => {
    expect(mapLeadStatus("id-1", { ...raw, status: undefined })).toBeNull();
    expect(mapLeadStatus("id-1", { ...raw, status: "archived" })).toBeNull();
    expect(mapLeadStatus("id-1", { ...raw, status: 1 })).toBeNull();
  });

  it("ignores negative or invalid counts and unknown routing states", () => {
    const dto = mapLeadStatus("id-1", { ...raw, notified_count: -4, purchased_count: "x", routing_status: "mystery" });
    expect(dto).toMatchObject({ matchedFirmCount: 0, acceptedFirmCount: 0, routingStatus: "unknown" });
  });

  it("returns null when there is no payload", () => {
    expect(mapLeadStatus("id-1", null)).toBeNull();
    expect(mapLeadStatus("id-1", "text")).toBeNull();
  });

  it("exposes no contact data", () => {
    const dto = mapLeadStatus("id-1", { ...raw, phone: "05321234567", email: "a@b.co", full_name: "Ayşe Yılmaz", address: "Gül Sk." });
    const text = JSON.stringify(dto);
    expect(text).not.toContain("05321234567");
    expect(text).not.toContain("a@b.co");
    expect(text).not.toContain("Gül Sk.");
    expect(text).not.toContain("Ayşe");
  });
});
