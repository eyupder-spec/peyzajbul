import { describe, it, expect } from "vitest";
import { CLOSED_NOTICE, buildTimeline, deriveStage, isRouted, refCode, stageHeading, type LeadStatusDTO } from "../leadStatus";

const base: LeadStatusDTO = {
  id: "a1b2c3d4-e5f6-4a7b-8c9d-0123456789ab",
  firstName: null,
  serviceLabel: "Bahçe Tasarımı",
  city: "Ankara",
  district: "Çankaya",
  createdAt: "2026-10-20T10:00:00.000Z",
  routedAt: null,
  verified: true,
  closed: null,
  routingStatus: "pending",
  matchedFirmCount: 0,
  acceptedFirmCount: 0,
};

const dto = (overrides: Partial<LeadStatusDTO>): LeadStatusDTO => ({ ...base, ...overrides });
const step = (lead: LeadStatusDTO, key: string) => buildTimeline(lead).find((item) => item.key === key)!;

describe("deriveStage", () => {
  it("is awaiting_verification until the code was confirmed, whatever else the payload says", () => {
    expect(deriveStage(dto({ verified: false }))).toBe("awaiting_verification");
    expect(deriveStage(dto({ verified: false, routingStatus: "routed", matchedFirmCount: 3, acceptedFirmCount: 1 }))).toBe(
      "awaiting_verification",
    );
  });

  it("is in_review for a verified lead that was not delivered", () => {
    expect(deriveStage(dto({}))).toBe("in_review");
    expect(deriveStage(dto({ routingStatus: "needs_review" }))).toBe("in_review");
    expect(deriveStage(dto({ routingStatus: "waiting_supply" }))).toBe("in_review");
  });

  it("is sent only when routed AND at least one firm received it", () => {
    expect(deriveStage(dto({ routingStatus: "routed", matchedFirmCount: 2 }))).toBe("sent");
    // routed without a delivered firm is NOT sent
    expect(deriveStage(dto({ routingStatus: "routed", matchedFirmCount: 0 }))).toBe("in_review");
    // firms counted but the lead is not in the routed state
    expect(deriveStage(dto({ routingStatus: "pending", matchedFirmCount: 2 }))).toBe("in_review");
    expect(isRouted(dto({ routingStatus: "routed", matchedFirmCount: 0 }))).toBe(false);
  });

  it("is accepted as soon as one firm unlocked the lead", () => {
    expect(deriveStage(dto({ routingStatus: "routed", matchedFirmCount: 3, acceptedFirmCount: 1 }))).toBe("accepted");
  });

  it("is closed for an expired or rejected request, whatever else the payload says", () => {
    expect(deriveStage(dto({ verified: false, closed: "expired" }))).toBe("expired");
    expect(deriveStage(dto({ verified: false, closed: "rejected" }))).toBe("rejected");
    // A closed request is never reported as delivered or accepted, even with stale counters.
    const stale = { routingStatus: "routed", matchedFirmCount: 3, acceptedFirmCount: 1 } as const;
    expect(deriveStage(dto({ ...stale, closed: "rejected" }))).toBe("rejected");
    expect(isRouted(dto({ ...stale, closed: "rejected" }))).toBe(false);
  });
});

describe("buildTimeline", () => {
  it("always has the same four steps in order", () => {
    expect(buildTimeline(dto({})).map((item) => item.key)).toEqual(["received", "verified", "routed", "accepted"]);
  });

  it("an unverified lead shows verification as the current step and claims no delivery", () => {
    const lead = dto({ verified: false, routingStatus: "routed", matchedFirmCount: 4, acceptedFirmCount: 2 });
    expect(step(lead, "received").state).toBe("done");
    expect(step(lead, "verified").state).toBe("current");
    expect(step(lead, "routed")).toMatchObject({ state: "upcoming" });
    expect(step(lead, "routed").detail).toBeUndefined();
    expect(step(lead, "accepted").state).toBe("upcoming");
    expect(step(lead, "accepted").detail).toBeUndefined();
    const text = JSON.stringify(buildTimeline(lead)) + stageHeading(lead);
    expect(text).not.toMatch(/iletildi|kabul etti/);
  });

  it("a verified, undelivered lead is under review", () => {
    const lead = dto({});
    expect(step(lead, "verified").state).toBe("done");
    expect(step(lead, "routed")).toMatchObject({ state: "current", detail: "İnceleniyor" });
    expect(step(lead, "accepted").state).toBe("upcoming");
    expect(JSON.stringify(buildTimeline(lead))).not.toMatch(/iletildi/);
  });

  it("states honestly that no firm was found for the province", () => {
    const lead = dto({ routingStatus: "waiting_supply" });
    expect(step(lead, "routed").detail).toBe("Bölgenizde şu an uygun firma bulunamadı");
    expect(step(lead, "routed").state).toBe("current");
  });

  it("routed with zero delivered firms is not shown as delivered", () => {
    const lead = dto({ routingStatus: "routed", matchedFirmCount: 0 });
    expect(step(lead, "routed").state).toBe("current");
    expect(JSON.stringify(buildTimeline(lead))).not.toMatch(/firmaya iletildi/);
  });

  it("a delivered lead shows the real number of firms and waits for answers", () => {
    const lead = dto({ routingStatus: "routed", matchedFirmCount: 3 });
    expect(step(lead, "routed")).toMatchObject({ state: "done", detail: "3 firmaya iletildi" });
    expect(step(lead, "accepted").state).toBe("current");
    expect(step(lead, "accepted").detail).toBeUndefined();
    expect(stageHeading(lead)).toBe("Talebiniz 3 firmaya iletildi");
  });

  it("adds the delivery date to the routed step only when the backend returned one", () => {
    const delivered = { routingStatus: "routed", matchedFirmCount: 3 } as const;
    expect(step(dto({ ...delivered, routedAt: "2026-10-21T09:00:00.000Z" }), "routed").detail).toBe("3 firmaya iletildi (21 Ekim 2026)");
    expect(step(dto({ ...delivered, routedAt: "not a date" }), "routed").detail).toBe("3 firmaya iletildi");
    // A date alone never turns an undelivered lead into a delivered one.
    expect(step(dto({ routingStatus: "needs_review", routedAt: "2026-10-21T09:00:00.000Z" }), "routed").detail).toBe("İnceleniyor");
  });

  it("the accepted step is done only when acceptedFirmCount is above zero", () => {
    const lead = dto({ routingStatus: "routed", matchedFirmCount: 3, acceptedFirmCount: 2 });
    expect(step(lead, "accepted")).toMatchObject({ state: "done", detail: "2 firma talebinizi kabul etti" });
    expect(stageHeading(lead)).toBe("2 firma talebinizi kabul etti");
  });
});

describe("greeting", () => {
  it("has no greeting without a first name", () => {
    expect(stageHeading(dto({ firstName: null }))).toBe("Talebiniz alındı ve inceleniyor");
  });

  it("greets by first name in front of every stage heading", () => {
    expect(stageHeading(dto({ firstName: "Ayşe" }))).toBe("Ayşe, talebiniz alındı ve inceleniyor");
    expect(stageHeading(dto({ firstName: "Ayşe", verified: false }))).toBe("Ayşe, talebiniz kaydedildi, son adım: doğrulama");
    expect(stageHeading(dto({ firstName: "Ayşe", routingStatus: "routed", matchedFirmCount: 3 }))).toBe(
      "Ayşe, talebiniz 3 firmaya iletildi",
    );
    expect(stageHeading(dto({ firstName: "İlker", routingStatus: "routed", matchedFirmCount: 3, acceptedFirmCount: 2 }))).toBe(
      "İlker, 2 firma talebinizi kabul etti",
    );
    expect(stageHeading(dto({ firstName: "Ayşe", verified: false, closed: "expired" }))).toBe(
      "Ayşe, talebinizin doğrulama süresi doldu",
    );
  });

  it("does not change what the heading claims", () => {
    const lead = dto({ firstName: "Ayşe", verified: false, routingStatus: "routed", matchedFirmCount: 4, acceptedFirmCount: 2 });
    expect(stageHeading(lead)).not.toMatch(/iletildi|kabul etti/);
  });
});

describe("closed requests", () => {
  const expired = dto({ verified: false, closed: "expired" });
  const rejected = dto({ verified: false, closed: "rejected", routingStatus: "rejected" });

  it("an expired request says the verification window ran out and never claims verification", () => {
    expect(stageHeading(expired)).toBe("Talebinizin doğrulama süresi doldu");
    expect(buildTimeline(expired).map((item) => item.key)).toEqual(["received", "closed"]);
    expect(step(expired, "closed")).toMatchObject({ title: "Doğrulama süresi doldu", state: "current" });
    const text = JSON.stringify(buildTimeline(expired)) + stageHeading(expired);
    expect(text).not.toMatch(/doğrulandı|iletildi|kabul etti|inceleniyor/);
    expect(CLOSED_NOTICE.expired).toMatch(/Yeni bir talep oluşturabilirsiniz/);
  });

  it("a rejected request is never shown as under review", () => {
    expect(stageHeading(rejected)).toBe("Talebiniz firmalara iletilmedi");
    expect(buildTimeline(rejected).map((item) => item.key)).toEqual(["received", "closed"]);
    const text = JSON.stringify(buildTimeline(rejected)) + stageHeading(rejected);
    expect(text).not.toMatch(/doğrulandı|inceleniyor|kabul etti/);
    expect(text).not.toMatch(/firmaya iletildi/);
  });

  it("a rejected request that was verified keeps the verified step, still without any later step", () => {
    const verifiedThenRejected = dto({ closed: "rejected", routingStatus: "rejected" });
    expect(buildTimeline(verifiedThenRejected).map((item) => item.key)).toEqual(["received", "verified", "closed"]);
    expect(step(verifiedThenRejected, "verified").state).toBe("done");
  });

  it("offers a way forward without giving a reason for the rejection", () => {
    expect(CLOSED_NOTICE.rejected).toMatch(/yeni bir talep/);
    expect(CLOSED_NOTICE.rejected).not.toMatch(/spam|sahte|uygunsuz/i);
  });
});

describe("refCode", () => {
  it("is PB- plus the first eight hex characters in upper case", () => {
    expect(refCode(base.id)).toBe("PB-A1B2C3D4");
    expect(refCode(base.id)).toMatch(/^PB-[0-9A-F]{8}$/);
  });
});
