import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTING_SETTINGS,
  ROUTING_STATUS_LABEL_TR,
  buildFirmAlertMessage,
  buildHomeownerContactMessage,
  buildWaMeLink,
  isFirmRoutable,
  rankFirmsForLead,
  trNorm,
  type RoutableFirm,
} from "../../../src/lib/leadRouting.ts";
import { buildFirmAlertMessage as dispatcherAlertMessage } from "../dispatch-lead-notifications/waLink.ts";

// Mirrors the cases of route_lead (supabase/migrations/20261020150200_lead_pipeline_routing.sql).
// The tests live next to the edge functions because that is where this package owns test files.

const LEAD = { city: "Ankara", district: "Çankaya", service_type: "Bahçe Tasarımı" };

let counter = 0;
function firm(overrides: Partial<RoutableFirm> = {}): RoutableFirm {
  counter += 1;
  return {
    id: `firm-${counter}`,
    user_id: `user-${counter}`,
    is_claimed: true,
    is_approved: true,
    is_active: true,
    city: "Ankara",
    district: null,
    services: ["Bahçe Tasarımı"],
    is_premium: false,
    premium_until: null,
    description: null,
    logo_url: null,
    ...overrides,
  };
}

const ids = (ranked: { firm: RoutableFirm }[]) => ranked.map((item) => item.firm.id);
const fixedRandom = () => 0.5;

describe("isFirmRoutable", () => {
  it("needs claimed, approved, active and an owner that is not an admin", () => {
    expect(isFirmRoutable(firm())).toBe(true);
    expect(isFirmRoutable(firm({ is_claimed: false }))).toBe(false);
    expect(isFirmRoutable(firm({ is_approved: false }))).toBe(false);
    expect(isFirmRoutable(firm({ is_active: false }))).toBe(false);
    expect(isFirmRoutable(firm({ user_id: null }))).toBe(false);
    expect(isFirmRoutable(firm({ user_id: "admin-1" }), ["admin-1"])).toBe(false);
    expect(isFirmRoutable(firm({ user_id: "admin-1" }), new Set(["admin-1"]))).toBe(false);
  });
});

describe("rankFirmsForLead", () => {
  it("routes only to claimed firms and skips admin-owned ghost listings", () => {
    const ghosts = Array.from({ length: 30 }, () => firm({ is_claimed: false, user_id: "admin-1" }));
    const claimedA = firm();
    const claimedB = firm();
    const adminClaimed = firm({ user_id: "admin-1" });
    const ranked = rankFirmsForLead(LEAD, [...ghosts, claimedA, adminClaimed, claimedB], DEFAULT_ROUTING_SETTINGS, fixedRandom, {
      adminUserIds: ["admin-1"],
    });
    expect(ids(ranked).sort()).toEqual([claimedA.id, claimedB.id].sort());
    expect(ranked.map((item) => item.rank)).toEqual([1, 2]);
  });

  it("returns nothing when the city has no claimed firm", () => {
    expect(rankFirmsForLead(LEAD, [firm({ is_claimed: false }), firm({ city: "İzmir" })], DEFAULT_ROUTING_SETTINGS, fixedRandom)).toEqual([]);
  });

  it("matches cities regardless of case and Turkish diacritics", () => {
    const istanbul = firm({ city: "ISTANBUL" });
    const ranked = rankFirmsForLead({ ...LEAD, city: "İstanbul" }, [istanbul], DEFAULT_ROUTING_SETTINGS, fixedRandom);
    expect(ids(ranked)).toEqual([istanbul.id]);
    expect(trNorm("  Hakkâri ")).toBe("hakkari");
    expect(trNorm("ŞIRNAK")).toBe("sirnak");
  });

  it("excludes a service mismatch unless the fallback is on", () => {
    const mismatch = firm({ services: ["Sulama Sistemleri"] });
    expect(rankFirmsForLead(LEAD, [mismatch], DEFAULT_ROUTING_SETTINGS, fixedRandom)).toEqual([]);
    const withFallback = rankFirmsForLead(
      LEAD,
      [mismatch],
      { ...DEFAULT_ROUTING_SETTINGS, allowServiceMismatchFallback: true },
      fixedRandom,
    );
    expect(ids(withFallback)).toEqual([mismatch.id]);
    expect(withFallback[0].score).toBe(0);
  });

  it("scores a firm without a services list as generic", () => {
    const generic = firm({ services: [] });
    const exact = firm();
    const ranked = rankFirmsForLead(LEAD, [generic, exact], DEFAULT_ROUTING_SETTINGS, fixedRandom);
    expect(ids(ranked)).toEqual([exact.id, generic.id]);
    expect(ranked.map((item) => item.score)).toEqual([40, 10]);
    expect(ranked[1].reasons).toEqual(["Genel hizmet"]);
  });

  it("boosts the same district and explains it", () => {
    const local = firm({ district: "Çankaya" });
    const other = firm({ district: "Yenimahalle" });
    const ranked = rankFirmsForLead(LEAD, [other, local], DEFAULT_ROUTING_SETTINGS, fixedRandom);
    expect(ids(ranked)).toEqual([local.id, other.id]);
    expect(ranked[0].score).toBe(65);
    expect(ranked[0].reasons).toEqual(["Hizmet uyumu", "Aynı ilçe"]);
  });

  it("labels premium firms but does not let them beat a service and district match", () => {
    const premium = firm({ is_premium: true, premium_until: "2099-01-01T00:00:00Z", services: [] });
    const matching = firm({ district: "Çankaya" });
    const ranked = rankFirmsForLead(LEAD, [premium, matching], DEFAULT_ROUTING_SETTINGS, fixedRandom, {
      now: new Date("2026-10-20T00:00:00Z"),
    });
    expect(ids(ranked)).toEqual([matching.id, premium.id]);
    expect(ranked[1].reasons).toContain("Sponsorlu");
  });

  it("ignores an expired premium", () => {
    const expired = firm({ is_premium: true, premium_until: "2026-01-01T00:00:00Z" });
    const [ranked] = rankFirmsForLead(LEAD, [expired], DEFAULT_ROUTING_SETTINGS, fixedRandom, {
      now: new Date("2026-10-20T00:00:00Z"),
    });
    expect(ranked.reasons).not.toContain("Sponsorlu");
    expect(ranked.score).toBe(40);
  });

  it("adds points for a complete profile only when description and logo exist", () => {
    const complete = firm({ description: "Kurumsal peyzaj", logo_url: "https://cdn.example/logo.png" });
    const noLogo = firm({ description: "Kurumsal peyzaj", logo_url: " " });
    const ranked = rankFirmsForLead(LEAD, [noLogo, complete], DEFAULT_ROUTING_SETTINGS, fixedRandom);
    expect(ids(ranked)).toEqual([complete.id, noLogo.id]);
    expect(ranked[0].score).toBe(45);
    expect(ranked[1].score).toBe(40);
  });

  it("puts the target firm first with rank 1, even without a city or service match", () => {
    const direct = firm({ city: "İzmir", services: ["Sulama Sistemleri"] });
    const strong = firm({ district: "Çankaya" });
    const ranked = rankFirmsForLead({ ...LEAD, target_firm_id: direct.id }, [strong, direct], DEFAULT_ROUTING_SETTINGS, fixedRandom);
    expect(ids(ranked)).toEqual([direct.id, strong.id]);
    expect(ranked[0]).toMatchObject({ rank: 1, isDirect: true });
    expect(ranked[0].reasons[0]).toBe("Size özel");
  });

  it("does not route to an unclaimed target firm", () => {
    const direct = firm({ is_claimed: false });
    expect(rankFirmsForLead({ ...LEAD, target_firm_id: direct.id }, [direct], DEFAULT_ROUTING_SETTINGS, fixedRandom)).toEqual([]);
  });

  it("breaks ties fairly: fewer recent assignments, then the longest wait", () => {
    const busy = firm({ recent_assignments_30d: 5 });
    const rested = firm({ recent_assignments_30d: 1, last_assigned_at: "2026-10-18T00:00:00Z" });
    const longest = firm({ recent_assignments_30d: 1, last_assigned_at: "2026-10-01T00:00:00Z" });
    const never = firm({ recent_assignments_30d: 1, last_assigned_at: null });
    const ranked = rankFirmsForLead(LEAD, [busy, rested, longest, never], { ...DEFAULT_ROUTING_SETTINGS, maxFirms: 4 }, fixedRandom);
    expect(ids(ranked)).toEqual([never.id, longest.id, rested.id, busy.id]);
  });

  it("is deterministic with an injected random function", () => {
    const pool = [firm(), firm(), firm(), firm()];
    const sequence = [0.9, 0.2, 0.6, 0.1];
    const run = () => {
      let index = 0;
      return ids(rankFirmsForLead(LEAD, pool, DEFAULT_ROUTING_SETTINGS, () => sequence[index++ % sequence.length]));
    };
    expect(run()).toEqual(run());
    expect(run()).toEqual([pool[3].id, pool[1].id, pool[2].id]);
  });

  it("returns at most maxFirms minus the firms the lead already has", () => {
    const pool = [firm(), firm(), firm(), firm()];
    expect(rankFirmsForLead(LEAD, pool, DEFAULT_ROUTING_SETTINGS, fixedRandom)).toHaveLength(3);
    const topUp = rankFirmsForLead(LEAD, pool, DEFAULT_ROUTING_SETTINGS, fixedRandom, {
      alreadyAssignedFirmIds: [pool[0].id, pool[1].id],
    });
    expect(topUp).toHaveLength(1);
    expect(topUp[0].rank).toBe(3);
    expect(ids(topUp)).not.toContain(pool[0].id);
  });
});

describe("messages and links", () => {
  it("the firm alert wording matches the dispatcher's wa_link message", () => {
    const lead = { service_type: "Bahçe Tasarımı", city: "Ankara", district: "Çankaya" };
    const url = "https://www.peyzajbul.com/firma/leadler?lead=abc";
    expect(buildFirmAlertMessage(lead, url)).toBe(dispatcherAlertMessage(lead, url));
    const noDistrict = { service_type: "Sulama Sistemleri", city: "İzmir", district: null };
    expect(buildFirmAlertMessage(noDistrict, url)).toBe(dispatcherAlertMessage(noDistrict, url));
  });

  it("builds a wa.me link only for Turkish mobile numbers", () => {
    const link = buildWaMeLink("0532 123 45 67", "Merhaba & hoş geldiniz");
    expect(link).toBe(`https://wa.me/905321234567?text=${encodeURIComponent("Merhaba & hoş geldiniz")}`);
    expect(buildWaMeLink("0212 123 45 67", "x")).toBeNull();
  });

  it("builds the homeowner contact message", () => {
    const message = buildHomeownerContactMessage({
      firmName: "Yeşil Dünya Peyzaj",
      serviceLabel: "Bahçe Tasarımı",
      city: "Ankara",
      district: "Çankaya",
    });
    expect(message).toContain("Bahçe Tasarımı");
    expect(message).toContain("Yeşil Dünya Peyzaj");
    expect(message).toContain("Çankaya, Ankara");
    expect(message).toMatch(/ne zaman ulaşabilirim\?$/);
  });

  it("labels every routing status in Turkish", () => {
    expect(ROUTING_STATUS_LABEL_TR.waiting_supply).toBe("Bölgenizde firma aranıyor");
    expect(Object.keys(ROUTING_STATUS_LABEL_TR).sort()).toEqual(
      ["legacy_unrouted", "needs_review", "pending", "rejected", "routed", "waiting_supply"],
    );
  });
});
