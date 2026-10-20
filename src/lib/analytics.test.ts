// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsEvents } from "./analytics";

const mocks = vi.hoisted(() => ({
  sendGAEvent: vi.fn(),
  insert: vi.fn(),
  hasConsent: vi.fn(() => true),
}));

vi.mock("@next/third-parties/google", () => ({ sendGAEvent: mocks.sendGAEvent }));
vi.mock("./consent", () => ({ hasAnalyticsConsent: mocks.hasConsent }));
vi.mock("./supabase/client", () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));

/** A fresh module instance per test: the funnel sink keeps its "disabled" flag at module level. */
async function load() {
  vi.resetModules();
  return import("./analytics");
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  mocks.sendGAEvent.mockReset();
  mocks.insert.mockReset();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.hasConsent.mockReset();
  mocks.hasConsent.mockReturnValue(true);
  window.sessionStorage.clear();
  window.history.pushState({}, "", "/");
  Object.defineProperty(document, "referrer", { value: "", configurable: true });
});

describe("sanitize", () => {
  it("drops keys that can carry personal data and keeps harmless ones", async () => {
    const { track } = await load();
    track("cta_click", {
      placement: "hero",
      label: "Teklif Al",
      phone: "05321234567",
      user_email: "a@b.co",
      fullName: "Ayşe Yılmaz",
      notes: "bahçem 300 m2",
      address: "Gül Sokak 1",
      adres: "Gül Sokak 1",
      access_token: "secret",
      otp_code: "123456",
      telefon: "0532",
    } as unknown as AnalyticsEvents["cta_click"]);
    await settle();

    const params = mocks.sendGAEvent.mock.calls[0][2];
    expect(params).toEqual({ placement: "hero", label: "Teklif Al" });
    expect(JSON.stringify(mocks.insert.mock.calls[0][0].props)).toBe(JSON.stringify({ placement: "hero", label: "Teklif Al" }));
  });

  it("truncates long strings to 100 characters and ignores objects and non-finite numbers", async () => {
    const { track } = await load();
    track("cta_click", {
      placement: "x".repeat(300),
      label: { nested: true },
      extra_number: Number.NaN,
      extra_flag: true,
    } as unknown as AnalyticsEvents["cta_click"]);
    await settle();

    const params = mocks.sendGAEvent.mock.calls[0][2];
    expect(params.placement).toHaveLength(100);
    expect(params).not.toHaveProperty("label");
    expect(params).not.toHaveProperty("extra_number");
    expect(params.extra_flag).toBe(true);
  });
});

describe("track", () => {
  it("sends the event to GA4 as an event call", async () => {
    const { track } = await load();
    track("lead_step_view", { step: 1, source: "hero" });
    expect(mocks.sendGAEvent).toHaveBeenCalledWith("event", "lead_step_view", { step: 1, source: "hero" });
  });

  it("does not call GA4 without analytics consent, but still records the first-party event", async () => {
    mocks.hasConsent.mockReturnValue(false);
    const { track } = await load();
    track("lead_step_view", { step: 1, source: "hero" });
    await settle();
    expect(mocks.sendGAEvent).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("keeps the lead id out of GA4 and puts it only into the first-party row", async () => {
    const { track } = await load();
    track(
      "lead_verified",
      { source: "teklif_al", service: "bahce-tasarimi", city: "Ankara", seconds_since_submit: 42 },
      { leadId: "3f2b8c1e-0000-4000-8000-000000000001" },
    );
    await settle();

    expect(JSON.stringify(mocks.sendGAEvent.mock.calls)).not.toContain("3f2b8c1e");
    expect(mocks.sendGAEvent.mock.calls[0][2]).not.toHaveProperty("lead_id");
    const row = mocks.insert.mock.calls[0][0];
    expect(row.event).toBe("lead_verified");
    expect(row.props.lead_id).toBe("3f2b8c1e-0000-4000-8000-000000000001");
    expect(row.path).toBe("/");
    expect(row.session_id).toBeTruthy();
  });

  it("stores only the path, never the query string", async () => {
    window.history.pushState({}, "", "/talep/abc?t=secret-token");
    const { track } = await load();
    track("lead_status_view", { stage: "sent" });
    await settle();
    expect(mocks.insert.mock.calls[0][0].path).toBe("/talep/abc");
  });

  it("does not insert events outside the first-party allow-list", async () => {
    const { track } = await load();
    track("page_view" as never);
    await settle();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("never throws, even when GA4 throws", async () => {
    mocks.sendGAEvent.mockImplementation(() => {
      throw new Error("GA down");
    });
    const { track } = await load();
    expect(() => track("lead_step_view", { step: 1, source: "hero" })).not.toThrow();
  });
});

describe("first-party sink", () => {
  it("switches itself off after the first error (missing table or RLS) and track still never throws", async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'relation "funnel_events" does not exist' } });
    const { track } = await load();

    expect(() => track("lead_step_view", { step: 1, source: "hero" })).not.toThrow();
    await settle();
    expect(mocks.insert).toHaveBeenCalledTimes(1);

    track("lead_step_view", { step: 2, source: "hero" });
    track("lead_submit", {
      source: "hero",
      service: "bahce-tasarimi",
      city: "Ankara",
      area_size: "150-500",
      budget: "25000-75000",
      timeline: "1-ay",
      has_photos: false,
      has_target_firm: false,
    });
    await settle();
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    // GA4 is unaffected.
    expect(mocks.sendGAEvent).toHaveBeenCalledTimes(3);
  });

  it("also switches off when the insert rejects", async () => {
    mocks.insert.mockRejectedValue(new Error("network"));
    const { track } = await load();
    track("lead_step_view", { step: 1, source: "hero" });
    await settle();
    track("lead_step_view", { step: 2, source: "hero" });
    await settle();
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
});

describe("trackOnce", () => {
  it("fires an event only once per key, also across module reloads (page refresh)", async () => {
    const first = await load();
    const params = { source: "hero", service: "bahce-tasarimi", city: "Ankara", seconds_since_submit: 10 } as const;
    first.trackOnce("lead_verified:abc", "lead_verified", params, { leadId: "abc" });
    first.trackOnce("lead_verified:abc", "lead_verified", params, { leadId: "abc" });
    first.trackOnce("lead_verified:other", "lead_verified", params, { leadId: "other" });
    await settle();
    expect(mocks.sendGAEvent).toHaveBeenCalledTimes(2);

    const reloaded = await load();
    reloaded.trackOnce("lead_verified:abc", "lead_verified", params, { leadId: "abc" });
    await settle();
    expect(mocks.sendGAEvent).toHaveBeenCalledTimes(2);
  });
});

describe("inferSource", () => {
  it("maps paths to lead sources", async () => {
    const { inferSource } = await load();
    const table: Array<[string, string]> = [
      ["/", "hero"],
      ["/teklif-al", "teklif_al"],
      ["/firma/ornek-peyzaj", "firm_profile"],
      ["/hizmet/bahce-tasarimi/istanbul", "service_page"],
      ["/hizmetler/bahce-tasarimi", "service_page"],
      ["/blog/bahce-bakimi", "blog"],
      ["/projeler", "projects"],
      ["/maliyet-hesapla", "calculator"],
      ["/firmalar", "unknown"],
      ["/hakkimizda", "unknown"],
    ];
    for (const [path, expected] of table) expect(inferSource(path), path).toBe(expected);
  });
});

describe("identity and attribution", () => {
  it("keeps one random session id per tab session", async () => {
    const { getSessionId } = await load();
    const id = getSessionId();
    expect(id).toBeTruthy();
    expect(getSessionId()).toBe(id);
    expect(window.sessionStorage.getItem("pz_sid")).toBe(id);
  });

  it("captures first-touch attribution once and keeps only the referrer host and the landing path", async () => {
    window.history.pushState({}, "", "/teklif-al?utm_source=google&utm_medium=cpc&utm_campaign=bahce&gclid=abc123");
    Object.defineProperty(document, "referrer", { value: "https://www.google.com/search?q=peyzaj", configurable: true });
    const { captureAttribution, getAttribution } = await load();

    const first = captureAttribution();
    expect(first).toMatchObject({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "bahce",
      gclid: "abc123",
      referrer: "www.google.com",
      landing_path: "/teklif-al",
    });
    expect(first.captured_at).toBeTruthy();
    expect(JSON.stringify(first)).not.toContain("q=peyzaj");

    window.history.pushState({}, "", "/blog?utm_source=newsletter");
    const second = captureAttribution();
    expect(second).toEqual(first);
    expect(getAttribution()).toEqual(first);
  });

  it("ignores an internal referrer", async () => {
    Object.defineProperty(document, "referrer", { value: `${window.location.origin}/firmalar`, configurable: true });
    const { captureAttribution } = await load();
    expect(captureAttribution().referrer).toBeUndefined();
  });
});
