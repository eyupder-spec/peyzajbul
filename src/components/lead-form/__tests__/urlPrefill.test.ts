// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  IRRIGATION_SYSTEM_OPTIONS,
  RESIDENTIAL_AREA_SIZES,
  RESIDENTIAL_BUDGETS,
  SCOPE_OPTIONS,
  firstIncompleteStep,
  initialFormData,
  type LeadFormData,
} from "../../../lib/leadFormData";
import { computeEstimate, type CalcInputs } from "../../../lib/priceBenchmarks";
import { LEAD_FORM_PATH } from "../../calculator/calcOptions";
import { buildDirectLeadQuery, buildLeadPrefillQuery } from "../../calculator/prefill";
import { MAX_PREFILL_NOTE_LENGTH, parseLeadPrefill, resolveFormSource, resolvePrefill, type LeadUrlPrefill } from "../urlPrefill";

const TOKEN = "a1b2c3d4e5f60718";

/** What the lead form reads on mount: the query string of the page it was opened on. */
function openFormAt(query: string | URLSearchParams) {
  const search = typeof query === "string" ? query : `?${query.toString()}`;
  window.history.pushState({}, "", `${LEAD_FORM_PATH}${search}`);
  return parseLeadPrefill(window.location.search);
}

/** The form state the widget builds from a link: defaults plus the sanitised pre-fill. */
function formStateFor(fields: Partial<LeadFormData>): LeadFormData {
  return { ...initialFormData, ...fields };
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
});

describe("calculator link -> lead form", () => {
  const inputs: CalcInputs = {
    service: "bahce-tasarimi",
    areaM2: 300,
    citySlug: "izmir",
    tier: "standart",
    addOns: ["cim-ekimi", "bitki-agac-dikimi", "sulama-sistemi"],
    irrigation: "akilli",
  };

  it("pre-fills every field of the link the calculator builds", () => {
    const result = computeEstimate(inputs);
    expect(result).not.toBeNull();
    const query = buildLeadPrefillQuery(inputs, result, { estimateToken: TOKEN, ilce: "Karşıyaka" });

    const prefill = openFormAt(query);

    expect(prefill.fields).toMatchObject({
      projectType: "residential",
      serviceType: "bahce-tasarimi",
      city: "İzmir",
      district: "Karşıyaka",
      areaSize: "150-500",
      scope: ["cim-ekimi", "bitki-agac-dikimi", "sulama-sistemi"],
      irrigationSystem: "yagmurlama",
    });
    expect(RESIDENTIAL_BUDGETS.map((option) => option.value)).toContain(prefill.fields.budget);
    expect(prefill.fields.notes).toContain("Maliyet hesaplayıcı tahmini");
    expect(prefill.source).toBe("calculator");
    expect(prefill.estimateToken).toBe(TOKEN);
  });

  it("starts the visitor at the step after the pre-filled project step", () => {
    const prefill = openFormAt(buildLeadPrefillQuery(inputs, computeEstimate(inputs), { estimateToken: TOKEN }));
    expect(firstIncompleteStep(formStateFor(prefill.fields))).toBe(2);
  });

  it("carries the direct link of a service without a price engine", () => {
    const prefill = openFormAt(buildDirectLeadQuery("bitki-agac", { citySlug: "ankara", areaM2: 80 }));
    expect(prefill.fields).toMatchObject({ serviceType: "bitki-agac", city: "Ankara", areaSize: "50-150" });
    expect(prefill.source).toBe("calculator");
    expect(prefill.estimateToken).toBeNull();
  });
});

describe("every calculator parameter", () => {
  const FULL =
    `hizmet=bahce-tasarimi&alan=500-1000&butce=75000-200000&il=Ankara&ilce=${encodeURIComponent("Çankaya")}` +
    `&kapsam=cim-ekimi,aydinlatma&sulama=damla&not=${encodeURIComponent("Ön bahçe yenilenecek.")}` +
    `&kaynak=maliyet-hesapla&est=${TOKEN}`;

  it("fills the matching fields with allow-listed values", () => {
    const prefill = openFormAt(`?${FULL}`);
    expect(prefill.fields).toEqual({
      projectType: "residential",
      serviceType: "bahce-tasarimi",
      city: "Ankara",
      district: "Çankaya",
      areaSize: "500-1000",
      budget: "75000-200000",
      scope: ["cim-ekimi", "aydinlatma"],
      irrigationSystem: "damla",
      notes: "Ön bahçe yenilenecek.",
    });
    expect(prefill.source).toBe("calculator");
    expect(prefill.estimateToken).toBe(TOKEN);
  });

  it("accepts the area and budget values of the form, nothing else", () => {
    for (const option of RESIDENTIAL_AREA_SIZES) {
      expect(openFormAt(`?hizmet=bahce-tasarimi&alan=${encodeURIComponent(option.value)}`).fields.areaSize).toBe(option.value);
    }
    for (const option of RESIDENTIAL_BUDGETS) {
      expect(openFormAt(`?hizmet=bahce-tasarimi&butce=${encodeURIComponent(option.value)}`).fields.budget).toBe(option.value);
    }
    for (const option of IRRIGATION_SYSTEM_OPTIONS) {
      expect(openFormAt(`?hizmet=sulama-sistemi&sulama=${option.value}`).fields.irrigationSystem).toBe(option.value);
    }
  });

  it("ignores a junk value for each parameter", () => {
    const cases: Array<[query: string, pick: (prefill: LeadUrlPrefill) => unknown, expected: unknown]> = [
      ["hizmet=ucan-daire", (prefill) => prefill.fields.serviceType, undefined],
      ["hizmet=bahce-tasarimi&alan=dev", (prefill) => prefill.fields.areaSize, undefined],
      ["hizmet=bahce-tasarimi&butce=1%20milyon", (prefill) => prefill.fields.budget, undefined],
      ["il=Atlantis", (prefill) => prefill.fields.city, undefined],
      ["hizmet=bahce-tasarimi&kapsam=sihir,sezgi", (prefill) => prefill.fields.scope, []],
      ["hizmet=sulama-sistemi&sulama=sihir", (prefill) => prefill.fields.irrigationSystem, undefined],
      ["kaynak=%3Cscript%3E", (prefill) => prefill.source, null],
      ["est=short", (prefill) => prefill.estimateToken, null],
    ];
    for (const [query, pick, expected] of cases) expect(pick(openFormAt(`?${query}`)), query).toEqual(expected);
  });

  it("keeps the valid parameters next to junk ones", () => {
    const prefill = openFormAt("?hizmet=bahce-tasarimi&alan=500-1000&butce=junk&il=Atlantis&sulama=sihir");
    expect(prefill.fields).toEqual({ projectType: "residential", serviceType: "bahce-tasarimi", areaSize: "500-1000" });
  });

  it("ignores area and budget values that belong to the other project type", () => {
    const prefill = openFormAt("?hizmet=bahce-tasarimi&alan=5000-20000&butce=250000-750000");
    expect(prefill.fields.areaSize).toBeUndefined();
    expect(prefill.fields.budget).toBeUndefined();
    const commercial = openFormAt("?hizmet=proje-tasarim-uygulama&alan=5000-20000&butce=250000-750000");
    expect(commercial.fields).toMatchObject({ projectType: "commercial", areaSize: "5000-20000", budget: "250000-750000" });
  });

  it("keeps only the scope values that exist for the service", () => {
    const options = SCOPE_OPTIONS["sert-zemin"].map((option) => option.value);
    expect(openFormAt(`?hizmet=sert-zemin&kapsam=${options[0]},cim-ekimi,${options[0]},%20${options[1]}`).fields.scope).toEqual([
      options[0],
      options[1],
    ]);
    // Without a valid service there is nothing to check the scope against.
    expect(openFormAt("?kapsam=cim-ekimi").fields.scope).toBeUndefined();
  });

  it("keeps a district only when it belongs to the selected city", () => {
    expect(openFormAt(`?hizmet=bahce-tasarimi&il=Ankara&ilce=${encodeURIComponent("Çankaya")}`).fields.district).toBe("Çankaya");
    expect(openFormAt(`?hizmet=bahce-tasarimi&il=Ankara&ilce=${encodeURIComponent("Kadıköy")}`).fields.district).toBeUndefined();
    expect(openFormAt(`?hizmet=bahce-tasarimi&ilce=${encodeURIComponent("Çankaya")}`).fields.district).toBeUndefined();
  });

  it("matches the province loosely, like the rest of the form", () => {
    expect(openFormAt("?il=istanbul").fields.city).toBe("İstanbul");
  });
});

describe("the note", () => {
  it("accepts up to the length the calculator writes", () => {
    const note = "x".repeat(MAX_PREFILL_NOTE_LENGTH);
    expect(openFormAt(`?not=${note}`).fields.notes).toBe(note);
  });

  it("ignores a longer note instead of cutting it", () => {
    expect(openFormAt(`?not=${"x".repeat(MAX_PREFILL_NOTE_LENGTH + 1)}`).fields.notes).toBeUndefined();
  });

  it("drops markup and control characters and collapses whitespace", () => {
    const prefill = openFormAt(`?not=${encodeURIComponent("<b>Merhaba</b>\n\n  dünya\u0000")}`);
    expect(prefill.fields.notes).toBe("Merhaba dünya");
  });

  it("ignores a note that is empty after cleaning", () => {
    expect(openFormAt(`?not=${encodeURIComponent("  <> \n")}`).fields.notes).toBeUndefined();
  });
});

describe("kaynak and est", () => {
  it("maps maliyet-hesapla to the calculator source", () => {
    expect(openFormAt("?kaynak=maliyet-hesapla").source).toBe("calculator");
    expect(openFormAt("?kaynak=Maliyet-Hesapla").source).toBe("calculator");
  });

  it("attributes a calculator link to the calculator although the page passes its own generic source", () => {
    const fromUrl = openFormAt("?kaynak=maliyet-hesapla").source;
    expect(resolveFormSource(fromUrl, "teklif_al", () => "unknown")).toBe("calculator");
  });

  it("falls back to the source of the host component, then to the guess from the path", () => {
    expect(resolveFormSource(null, "teklif_al", () => "unknown")).toBe("teklif_al");
    expect(resolveFormSource(null, undefined, () => "firm_profile")).toBe("firm_profile");
  });

  it("does not guess the source when the link or the host already knows it", () => {
    const infer = vi.fn(() => "unknown" as const);
    resolveFormSource("calculator", undefined, infer);
    resolveFormSource(null, "hero", infer);
    expect(infer).not.toHaveBeenCalled();
  });

  it("accepts the sources of LEAD_SOURCES and nothing else", () => {
    expect(openFormAt("?kaynak=calculator").source).toBe("calculator");
    expect(openFormAt("?kaynak=hero").source).toBe("hero");
    expect(openFormAt("?kaynak=google").source).toBeNull();
    expect(openFormAt("?kaynak=constructor").source).toBeNull();
    expect(openFormAt("").source).toBeNull();
  });

  it("accepts only an exact 16 character token", () => {
    expect(openFormAt(`?est=${TOKEN}`).estimateToken).toBe(TOKEN);
    expect(openFormAt(`?est=${TOKEN.toUpperCase()}`).estimateToken).toBe(TOKEN);
    for (const bad of [TOKEN.slice(1), `${TOKEN}0`, `${TOKEN.slice(0, 15)}-`, `%20${TOKEN}`, `${TOKEN}%0A`, "", "a".repeat(64)]) {
      expect(openFormAt(`?est=${bad}`).estimateToken, bad).toBeNull();
    }
  });
});

describe("resolvePrefill", () => {
  it("applies the same rules to the initial prop of the widget", () => {
    expect(resolvePrefill({ serviceType: "sert-zemin", city: "ankara", district: "Çankaya", budget: "zengin" })).toEqual({
      projectType: "residential",
      serviceType: "sert-zemin",
      city: "Ankara",
      district: "Çankaya",
    });
  });
});
