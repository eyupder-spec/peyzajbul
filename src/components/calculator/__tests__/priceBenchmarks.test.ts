import { describe, expect, it } from "vitest";
import { CITIES } from "../../../lib/cities";
import {
  IRRIGATION_SYSTEM_OPTIONS,
  LEAD_SOURCES,
  RESIDENTIAL_AREA_SIZES,
  RESIDENTIAL_BUDGETS,
  RESIDENTIAL_SERVICES,
  SCOPE_OPTIONS,
  TURKISH_CITIES,
} from "../../../lib/leadFormData";
import {
  PRICE_BENCHMARKS_UPDATED_AT,
  PRICE_BENCHMARKS_VERSION,
  PRICE_SOURCE,
  REFERENCE_GROUPS,
  categorySlugToCalcService,
  cityCostFactor,
  computeEstimate,
  toAreaBucket,
  toBudgetBucket,
  type CalcInputs,
  type EstimateResult,
} from "../../../lib/priceBenchmarks";
import { CALCULATOR_SOURCE } from "../calcOptions";
import { ESTIMATE_TOKEN_PATTERN, buildDirectLeadQuery, buildLeadPrefillQuery, resolveLeadFormCity } from "../prefill";

const base: CalcInputs = {
  service: "bahce-tasarimi",
  areaM2: 300,
  citySlug: "izmir",
  tier: "standart",
  addOns: ["cim-ekimi", "bitki-agac-dikimi", "sulama-sistemi"],
};

function estimate(overrides: Partial<CalcInputs> = {}): EstimateResult {
  const result = computeEstimate({ ...base, ...overrides });
  if (!result) throw new Error("estimate expected");
  return result;
}

function overlaps(result: EstimateResult, low: number, high: number): boolean {
  return result.minTry <= high && result.maxTry >= low;
}

describe("constants", () => {
  it("marks the source as editorial and versions the data", () => {
    expect(PRICE_SOURCE).toBe("editorial");
    expect(PRICE_BENCHMARKS_VERSION).toBe("2026-10-editorial-v1");
    expect(PRICE_BENCHMARKS_UPDATED_AT).toBe("2026-10-20");
  });

  it("names a Peyzajbul blog post in the sources of every priced row", () => {
    for (const group of REFERENCE_GROUPS) {
      for (const row of group.rows) {
        expect(row.sources.length).toBeGreaterThan(0);
        for (const source of row.sources) expect(source).toContain("Peyzajbul rehberi");
      }
    }
  });
});

describe("golden ranges", () => {
  it("Izmir, 300 m2, standart, cim + bitki + sulama overlaps 80.000-130.000 TL", () => {
    expect(overlaps(estimate(), 80000, 130000)).toBe(true);
  });

  it("uses the bracket factors unchanged inside each size bracket (spec arithmetic for Izmir 300 m2)", () => {
    // hazirlik 15.000-27.000 + cim 24.000-72.000 + bitki 18.000-60.000 + sulama 15.000-36.000
    const result = estimate();
    expect(result.minTry).toBe(72000);
    expect(result.maxTry).toBe(195000);
  });

  it("Antalya, 100 m2, standart, full garden overlaps 150.000-180.000 TL", () => {
    const result = estimate({
      areaM2: 100,
      citySlug: "antalya",
      addOns: ["cim-ekimi", "bitki-agac-dikimi", "tas-ahsap-zemin", "aydinlatma", "sulama-sistemi"],
      hardShare: "orta",
    });
    expect(overlaps(result, 150000, 180000)).toBe(true);
  });
});

describe("monotonicity", () => {
  it("a larger area never costs less at equal inputs, checked for every whole m2 across all size breakpoints", () => {
    for (const addOns of [base.addOns, ["cim-ekimi", "tas-ahsap-zemin", "aydinlatma"]]) {
      let previous = estimate({ areaM2: 30, addOns });
      for (let area = 31; area <= 2000; area++) {
        const current = estimate({ areaM2: area, addOns });
        expect(current.minTry, `min at ${area} m2`).toBeGreaterThanOrEqual(previous.minTry);
        expect(current.maxTry, `max at ${area} m2`).toBeGreaterThanOrEqual(previous.maxTry);
        previous = current;
      }
    }
    expect(estimate({ areaM2: 100 }).maxTry).toBeLessThan(estimate({ areaM2: 200 }).maxTry);
    expect(estimate({ areaM2: 100 }).minTry).toBeLessThan(estimate({ areaM2: 200 }).minTry);
    expect(estimate({ areaM2: 100 }).minTry).toBeLessThan(estimate({ areaM2: 101 }).minTry + 1);
  });

  it("irrigation and hard-surface services are monotonic in area too", () => {
    for (const inputs of [
      { service: "sulama-sistemi" as const, addOns: [], irrigation: "akilli" as const },
      { service: "sert-zemin" as const, addOns: [], hardMaterial: "dogal-tas" as const },
    ]) {
      const [first, last] = inputs.service === "sert-zemin" ? [10, 500] : [30, 2000];
      let previous = estimate({ ...inputs, areaM2: first });
      for (let area = first + 1; area <= last; area++) {
        const current = estimate({ ...inputs, areaM2: area });
        expect(current.minTry).toBeGreaterThanOrEqual(previous.minTry);
        expect(current.maxTry).toBeGreaterThanOrEqual(previous.maxTry);
        previous = current;
      }
    }
  });

  it("ekonomik < standart < premium", () => {
    const economy = estimate({ tier: "ekonomik" });
    const standard = estimate({ tier: "standart" });
    const premium = estimate({ tier: "premium" });
    expect(economy.minTry).toBeLessThan(standard.minTry);
    expect(economy.maxTry).toBeLessThan(standard.maxTry);
    expect(standard.minTry).toBeLessThan(premium.minTry);
    expect(standard.maxTry).toBeLessThan(premium.maxTry);
  });

  it("a tier-3 city is cheaper than a tier-1 city, tier-2 sits between", () => {
    const tier1 = estimate({ citySlug: "istanbul" });
    const tier2 = estimate({ citySlug: "ankara" });
    const tier3 = estimate({ citySlug: "van" });
    expect(tier3.maxTry).toBeLessThan(tier2.maxTry);
    expect(tier2.maxTry).toBeLessThan(tier1.maxTry);
    expect(tier3.minTry).toBeLessThan(tier1.minTry);
    expect(cityCostFactor("izmir")).toBe(1);
    expect(cityCostFactor("antalya")).toBe(0.9);
    expect(cityCostFactor("hakkari")).toBe(0.78);
    expect(cityCostFactor("does-not-exist")).toBe(0.78);
  });
});

describe("unpriced add-ons", () => {
  it("pergola, cit and su ogesi add 0 TL and are listed in unpricedLabels", () => {
    const without = estimate();
    const withUnpriced = estimate({ addOns: [...base.addOns, "pergola-kameriye", "cit-sinir", "su-ogesi"] });
    expect(withUnpriced.minTry).toBe(without.minTry);
    expect(withUnpriced.maxTry).toBe(without.maxTry);
    expect(withUnpriced.unpricedLabels).toEqual(["Pergola/kameriye", "Çit ve sınır düzenleme", "Su öğesi (fıskiye/şelale)"]);
    const unpricedLines = withUnpriced.lines.filter((line) => !line.priced);
    expect(unpricedLines).toHaveLength(3);
    for (const line of unpricedLines) {
      expect(line.minTry).toBe(0);
      expect(line.maxTry).toBe(0);
    }
  });

  it("ignores unknown add-on keys", () => {
    expect(estimate({ addOns: [...base.addOns, "bilinmeyen", "__proto__"] })).toEqual(estimate());
  });

  it("returns no estimate for hard-surface materials without a price", () => {
    expect(computeEstimate({ ...base, service: "sert-zemin", hardMaterial: undefined })).toBeNull();
  });
});

describe("rounding and invariants", () => {
  it("min <= mid <= max and values follow the rounding steps", () => {
    for (const area of [30, 77, 150, 300, 640, 1500]) {
      for (const tier of ["ekonomik", "standart", "premium"] as const) {
        const result = estimate({ areaM2: area, tier });
        expect(result.minTry).toBeLessThanOrEqual(result.midTry);
        expect(result.midTry).toBeLessThanOrEqual(result.maxTry);
        expect(result.minTry % 1000).toBe(0);
        expect(result.maxTry % 1000).toBe(0);
        if (result.maxTry >= 500000) expect(result.maxTry % 10000).toBe(0);
        else if (result.maxTry > 100000) expect(result.maxTry % 5000).toBe(0);
        expect(result.minTry).toBeGreaterThanOrEqual(1000);
      }
    }
  });

  it("clamps the area and never returns a minimum below 1.000 TL", () => {
    const tiny = estimate({ areaM2: -5, addOns: [], tier: "ekonomik", citySlug: "van" });
    expect(tiny.minTry).toBeGreaterThanOrEqual(1000);
    const clampedLow = estimate({ areaM2: 1 });
    const clampedHigh = estimate({ areaM2: 99999 });
    expect(clampedLow).toEqual(estimate({ areaM2: 30 }));
    expect(clampedHigh).toEqual(estimate({ areaM2: 2000 }));
    expect(computeEstimate({ ...base, service: "sert-zemin", hardMaterial: "dogal-tas", areaM2: 9000 })).toEqual(
      computeEstimate({ ...base, service: "sert-zemin", hardMaterial: "dogal-tas", areaM2: 500 }),
    );
  });

  it("applies the irrigation floor", () => {
    const small = estimate({ service: "sulama-sistemi", areaM2: 30, irrigation: "damla", addOns: [], tier: "ekonomik", citySlug: "van" });
    expect(small.minTry).toBeGreaterThanOrEqual(8000);
    expect(small.maxTry).toBeGreaterThanOrEqual(15000);
  });

  it("carries the benchmark version and update date", () => {
    const result = estimate();
    expect(result.benchmarkVersion).toBe(PRICE_BENCHMARKS_VERSION);
    expect(result.updatedAt).toBe(PRICE_BENCHMARKS_UPDATED_AT);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });
});

describe("buckets", () => {
  it("toAreaBucket boundaries", () => {
    expect(toAreaBucket(49)).toBe("50-alti");
    expect(toAreaBucket(50)).toBe("50-150");
    expect(toAreaBucket(150)).toBe("50-150");
    expect(toAreaBucket(151)).toBe("150-500");
    expect(toAreaBucket(500)).toBe("150-500");
    expect(toAreaBucket(501)).toBe("500-1000");
    expect(toAreaBucket(1000)).toBe("500-1000");
    expect(toAreaBucket(1001)).toBe("1000+");
  });

  it("toBudgetBucket boundaries", () => {
    expect(toBudgetBucket(24999)).toBe("25000-alti");
    expect(toBudgetBucket(25000)).toBe("25000-75000");
    expect(toBudgetBucket(74999)).toBe("25000-75000");
    expect(toBudgetBucket(75000)).toBe("75000-200000");
    expect(toBudgetBucket(199999)).toBe("75000-200000");
    expect(toBudgetBucket(200000)).toBe("200000+");
  });

  it("buckets are members of the lead form constants", () => {
    for (const area of [10, 49, 50, 150, 151, 500, 1000, 1001, 2000]) {
      expect(RESIDENTIAL_AREA_SIZES.map((option) => option.value)).toContain(toAreaBucket(area));
    }
    for (const mid of [1000, 24999, 25000, 74999, 75000, 200000, 5000000]) {
      expect(RESIDENTIAL_BUDGETS.map((option) => option.value)).toContain(toBudgetBucket(mid));
    }
  });

  it("maps category slugs to calculator services", () => {
    expect(categorySlugToCalcService("bahce-tasarimi")).toBe("bahce-tasarimi");
    expect(categorySlugToCalcService("sulama-sistemleri")).toBe("sulama-sistemi");
    expect(categorySlugToCalcService("sert-zemin")).toBe("sert-zemin");
    expect(categorySlugToCalcService("peyzaj-mimarligi")).toBeUndefined();
  });
});

describe("buildLeadPrefillQuery", () => {
  const values = (options: readonly { value: string }[]) => options.map((option) => option.value);

  it("produces the contract for the Izmir golden scenario", () => {
    const result = estimate();
    const params = buildLeadPrefillQuery(base, result, { estimateToken: "abcdef0123456789", ilce: "Urla" });
    expect(params.get("hizmet")).toBe("bahce-tasarimi");
    expect(params.get("alan")).toBe("150-500");
    expect(values(RESIDENTIAL_BUDGETS)).toContain(params.get("butce"));
    expect(params.get("il")).toBe("İzmir");
    expect(params.get("ilce")).toBe("Urla");
    expect(params.get("kapsam")).toBe("cim-ekimi,bitki-agac-dikimi,sulama-sistemi");
    expect(params.get("sulama")).toBe("yagmurlama");
    expect(params.get("kaynak")).toBe("calculator");
    expect(params.get("est")).toBe("abcdef0123456789");
    const note = params.get("not") ?? "";
    expect(note.length).toBeLessThanOrEqual(300);
    expect(note).toContain("Ekim 2026");
    expect(note).toContain("editoryal");
  });

  it("kaynak is a member of the lead form LEAD_SOURCES allow-list, otherwise the form drops it", () => {
    expect(LEAD_SOURCES).toContain(CALCULATOR_SOURCE);
    const params = buildLeadPrefillQuery(base, estimate());
    expect(LEAD_SOURCES).toContain(params.get("kaynak"));
    expect(LEAD_SOURCES).toContain(buildDirectLeadQuery("bahce-bakimi").get("kaynak"));
  });

  it("only emits members of the lead form constants", () => {
    const scenarios: CalcInputs[] = [
      base,
      { ...base, service: "sulama-sistemi", irrigation: "akilli", addOns: [] },
      { ...base, service: "sulama-sistemi", irrigation: "damla", addOns: [] },
      { ...base, service: "sert-zemin", hardMaterial: "kompozit-deck", areaM2: 80, addOns: [] },
      { ...base, areaM2: 49, citySlug: "hakkari", addOns: ["tas-ahsap-zemin", "pergola-kameriye", "cit-sinir", "su-ogesi", "aydinlatma"] },
    ];
    for (const inputs of scenarios) {
      const result = computeEstimate(inputs);
      expect(result).not.toBeNull();
      const params = buildLeadPrefillQuery(inputs, result);
      expect(values(RESIDENTIAL_SERVICES)).toContain(params.get("hizmet"));
      expect(values(RESIDENTIAL_AREA_SIZES)).toContain(params.get("alan"));
      expect(values(RESIDENTIAL_BUDGETS)).toContain(params.get("butce"));
      expect(TURKISH_CITIES).toContain(params.get("il"));
      const kapsam = params.get("kapsam");
      if (kapsam) {
        const allowed = values(SCOPE_OPTIONS[inputs.service]);
        for (const value of kapsam.split(",")) expect(allowed).toContain(value);
      }
      const sulama = params.get("sulama");
      if (sulama) expect(values(IRRIGATION_SYSTEM_OPTIONS)).toContain(sulama);
      expect(params.get("est")).toBeNull();
    }
  });

  it("maps akilli irrigation to yagmurlama", () => {
    const inputs: CalcInputs = { ...base, service: "sulama-sistemi", irrigation: "akilli", addOns: [] };
    expect(buildLeadPrefillQuery(inputs, computeEstimate(inputs)).get("sulama")).toBe("yagmurlama");
  });

  it("drops malformed estimate tokens and clamps the district", () => {
    const result = estimate();
    expect(buildLeadPrefillQuery(base, result, { estimateToken: "short" }).get("est")).toBeNull();
    expect(buildLeadPrefillQuery(base, result, { estimateToken: "abcdef0123456789" }).get("est")).toMatch(ESTIMATE_TOKEN_PATTERN);
    const long = buildLeadPrefillQuery(base, result, { ilce: `${"a".repeat(60)}<b>` });
    expect(long.get("ilce")?.length).toBeLessThanOrEqual(40);
    expect(long.get("ilce")).not.toContain("<");
  });

  it("resolves every one of the 81 CITIES slugs to a lead form city", () => {
    expect(CITIES).toHaveLength(81);
    for (const city of CITIES) {
      const resolved = resolveLeadFormCity(city.slug);
      expect(resolved, city.slug).toBeDefined();
      expect(TURKISH_CITIES).toContain(resolved);
    }
    expect(resolveLeadFormCity("hakkari")).toBe("Hakkâri");
    expect(resolveLeadFormCity("izmir")).toBe("İzmir");
    expect(resolveLeadFormCity("igdir")).toBe("Iğdır");
    expect(resolveLeadFormCity("yok")).toBeUndefined();
  });

  it("direct query for services without a price engine carries only form values", () => {
    const params = buildDirectLeadQuery("bahce-bakimi", { citySlug: "ankara", ilce: "Çankaya", areaM2: 200 });
    expect(params.get("hizmet")).toBe("bahce-bakimi");
    expect(values(RESIDENTIAL_SERVICES)).toContain(params.get("hizmet"));
    expect(params.get("alan")).toBe("150-500");
    expect(params.get("il")).toBe("Ankara");
    expect(params.get("kaynak")).toBe("calculator");
    expect(params.get("butce")).toBeNull();
  });
});
