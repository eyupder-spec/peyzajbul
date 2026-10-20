import { describe, it, expect } from "vitest";
import {
  COMMERCIAL_AREA_SIZES,
  COMMERCIAL_BUDGETS,
  COMMERCIAL_PROPERTY_TYPES,
  COMMERCIAL_SERVICES,
  CURRENT_CONDITION_OPTIONS,
  DRAFT_STORAGE_KEY,
  ESTIMATE_TOKEN_PATTERN,
  IRRIGATION_SYSTEM_OPTIONS,
  IRRIGATION_TYPE_OPTIONS,
  LEAD_COPY,
  LEAD_FORM_CONFIG,
  LEAD_SOURCES,
  LEAD_TOTAL_STEPS,
  RESIDENTIAL_AREA_SIZES,
  RESIDENTIAL_BUDGETS,
  RESIDENTIAL_PROPERTY_TYPES,
  RESIDENTIAL_SERVICES,
  SCOPE_OPTIONS,
  SERVICE_TYPE_TO_LABEL,
  TIMELINE_OPTIONS,
  TURKISH_CITIES,
  WATER_SOURCE_OPTIONS,
  emailRequired,
  findCity,
  firstIncompleteStep,
  formatPhone,
  initialFormData,
  maskEmail,
  maskPhone,
  normalizeForSearch,
  normalizePhone,
  parseDraft,
  parseEstimateToken,
  pickDraft,
  resolveLeadSource,
  routesToRegionalFirms,
  sanitizeLeadInput,
  validateEmail,
  validateFullName,
  validatePhone,
  validateStep,
  type LeadFormData,
} from "./leadFormData";

const EXPECTED_OPTION_VALUES = {
  RESIDENTIAL_SERVICES: ["bahce-tasarimi", "bahce-bakimi", "sulama-sistemi", "sert-zemin", "bitki-agac", "havuz-cevresi"],
  COMMERCIAL_SERVICES: ["proje-tasarim-uygulama", "sadece-uygulama", "yesil-cati-teras", "otopark-yol", "havuz-cevresi-ticari", "periyodik-bakim"],
  IRRIGATION_TYPE_OPTIONS: ["yeni-kurulum", "yenileme", "ariza-bakim", "otomasyon"],
  IRRIGATION_SYSTEM_OPTIONS: ["damla", "yagmurlama", "bilmiyorum"],
  WATER_SOURCE_OPTIONS: ["sebeke", "kuyu", "havuz-golet"],
  RESIDENTIAL_PROPERTY_TYPES: ["villa", "site", "yazlik", "tarla-arazi"],
  COMMERCIAL_PROPERTY_TYPES: ["otel", "avm-plaza", "konut-projesi", "okul-hastane", "kamu", "fabrika", "diger"],
  RESIDENTIAL_AREA_SIZES: ["50-alti", "50-150", "150-500", "500-1000", "1000+"],
  COMMERCIAL_AREA_SIZES: ["1000-alti", "1000-5000", "5000-20000", "20000+"],
  CURRENT_CONDITION_OPTIONS: ["bos-toprak", "eski-bahce", "kismen-duzenlenmis", "beton-kapli"],
  RESIDENTIAL_BUDGETS: ["25000-alti", "25000-75000", "75000-200000", "200000+", "bilmiyorum"],
  COMMERCIAL_BUDGETS: ["250000-alti", "250000-750000", "750000-2000000", "2000000+", "teklif-sonrasi"],
  TIMELINE_OPTIONS: ["hemen", "1-ay", "1-3-ay", "3-6-ay", "arastirma"],
  SERVICE_SLUGS_WITH_LABEL: ["bahce-tasarimi", "bahce-bakimi", "sulama-sistemi", "sert-zemin", "bitki-agac", "havuz-cevresi", "proje-tasarim-uygulama", "sadece-uygulama", "yesil-cati-teras", "otopark-yol", "havuz-cevresi-ticari", "periyodik-bakim"],
};

const EXPECTED_SCOPE_VALUES: Record<string, string[]> = {
    "bahce-tasarimi": ["cim-ekimi", "bitki-agac-dikimi", "tas-ahsap-zemin", "pergola-kameriye", "cit-sinir", "sulama-sistemi", "aydinlatma", "su-ogesi"],
    "bahce-bakimi": ["cim-bicme", "budama", "gubreleme", "ilaclama", "sulama-ayari", "yaprak-temizlik"],
    "sert-zemin": ["dogal-tas", "beton-baski", "ahsap-deck", "kompozit-deck", "parke-tasi", "cakil-granit"],
    "bitki-agac": ["mevsimlik-cicek", "cali-gruplar", "agac-dikimi", "cim-serme", "saksili-bitkiler"],
    "havuz-cevresi": ["zemin-kaplama", "bitkilendirme", "aydinlatma", "pergola-golgelik", "duvar-sinir"],
    "proje-tasarim-uygulama": ["peyzaj-cizim", "bitkilendirme", "sulama-sistemi", "aydinlatma", "sert-zemin", "spor-alani", "cocuk-oyun", "periyodik-bakim"],
    "sadece-uygulama": ["bitkilendirme", "sulama-sistemi", "aydinlatma", "sert-zemin", "spor-alani", "cocuk-oyun", "periyodik-bakim"],
    "yesil-cati-teras": ["bitkilendirme", "sulama-sistemi", "aydinlatma", "sert-zemin", "periyodik-bakim"],
    "otopark-yol": ["bitkilendirme", "sulama-sistemi", "aydinlatma", "sert-zemin", "periyodik-bakim"],
    "havuz-cevresi-ticari": ["zemin-kaplama", "bitkilendirme", "aydinlatma", "pergola-golgelik", "periyodik-bakim"],
    "periyodik-bakim": ["cim-bicme", "budama", "gubreleme", "ilaclama", "sulama-ayari", "yaprak-temizlik"],
  };

const values = (options: { value: string }[]) => options.map((option) => option.value);

const complete = (overrides: Partial<LeadFormData> = {}): LeadFormData => ({
  ...initialFormData,
  serviceType: "bahce-tasarimi",
  city: "Ankara",
  areaSize: "150-500",
  budget: "25000-75000",
  timeline: "1-ay",
  fullName: "Ayşe Yılmaz",
  phone: "05321234567",
  email: "ayse@example.com",
  kvkkAccepted: true,
  ...overrides,
});

describe("option values stay a stable data contract", () => {
  it("keeps every option value byte-identical", () => {
    expect(values(RESIDENTIAL_SERVICES)).toEqual(EXPECTED_OPTION_VALUES.RESIDENTIAL_SERVICES);
    expect(values(COMMERCIAL_SERVICES)).toEqual(EXPECTED_OPTION_VALUES.COMMERCIAL_SERVICES);
    expect(values(IRRIGATION_TYPE_OPTIONS)).toEqual(EXPECTED_OPTION_VALUES.IRRIGATION_TYPE_OPTIONS);
    expect(values(IRRIGATION_SYSTEM_OPTIONS)).toEqual(EXPECTED_OPTION_VALUES.IRRIGATION_SYSTEM_OPTIONS);
    expect(values(WATER_SOURCE_OPTIONS)).toEqual(EXPECTED_OPTION_VALUES.WATER_SOURCE_OPTIONS);
    expect(values(RESIDENTIAL_PROPERTY_TYPES)).toEqual(EXPECTED_OPTION_VALUES.RESIDENTIAL_PROPERTY_TYPES);
    expect(values(COMMERCIAL_PROPERTY_TYPES)).toEqual(EXPECTED_OPTION_VALUES.COMMERCIAL_PROPERTY_TYPES);
    expect(values(RESIDENTIAL_AREA_SIZES)).toEqual(EXPECTED_OPTION_VALUES.RESIDENTIAL_AREA_SIZES);
    expect(values(COMMERCIAL_AREA_SIZES)).toEqual(EXPECTED_OPTION_VALUES.COMMERCIAL_AREA_SIZES);
    expect(values(CURRENT_CONDITION_OPTIONS)).toEqual(EXPECTED_OPTION_VALUES.CURRENT_CONDITION_OPTIONS);
    expect(values(RESIDENTIAL_BUDGETS)).toEqual(EXPECTED_OPTION_VALUES.RESIDENTIAL_BUDGETS);
    expect(values(COMMERCIAL_BUDGETS)).toEqual(EXPECTED_OPTION_VALUES.COMMERCIAL_BUDGETS);
    expect(values(TIMELINE_OPTIONS)).toEqual(EXPECTED_OPTION_VALUES.TIMELINE_OPTIONS);
    expect(Object.keys(SERVICE_TYPE_TO_LABEL)).toEqual(EXPECTED_OPTION_VALUES.SERVICE_SLUGS_WITH_LABEL);
  });

  it("keeps the scope values per service", () => {
    const actual = Object.fromEntries(Object.entries(SCOPE_OPTIONS).map(([slug, options]) => [slug, values(options)]));
    expect(actual).toEqual(EXPECTED_SCOPE_VALUES);
  });

  it("keeps the labels that routing and pricing match on", () => {
    expect(SERVICE_TYPE_TO_LABEL["bahce-tasarimi"]).toBe("Bahçe Tasarımı");
    expect(SERVICE_TYPE_TO_LABEL["bahce-bakimi"]).toBe("Bahçe Bakımı & Bahçıvanlık");
    expect(SERVICE_TYPE_TO_LABEL["sulama-sistemi"]).toBe("Sulama Sistemleri");
    expect(SERVICE_TYPE_TO_LABEL["sert-zemin"]).toBe("Sert Zemin (Hardscape)");
    expect(SERVICE_TYPE_TO_LABEL["proje-tasarim-uygulama"]).toBe("Peyzaj Mimarlığı");
  });

  it("knows 81 provinces", () => {
    expect(TURKISH_CITIES).toHaveLength(81);
  });
});

describe("form defaults and configuration", () => {
  it("has three steps and starts as a residential request", () => {
    expect(LEAD_TOTAL_STEPS).toBe(3);
    expect(initialFormData.projectType).toBe("residential");
  });

  it("requires the e-mail only while the code is sent by e-mail", () => {
    expect(emailRequired()).toBe(LEAD_FORM_CONFIG.verifyChannel === "email");
  });

  it("makes no numeric service-level promise in the shared copy", () => {
    const texts = [LEAD_COPY.reassurance, LEAD_COPY.phoneShare, LEAD_COPY.reviewText].join(" ");
    expect(texts).not.toMatch(/24 saat|en uygun profesyonel/i);
    expect(texts).not.toMatch(/\d/);
  });

  it("tells a visitor from an unclaimed firm page that the region's firms get the request, without naming that firm", () => {
    expect(LEAD_COPY.regionalRouting).toMatch(/bölgenizdeki uygun firmalara iletilir/);
    expect(LEAD_COPY.regionalRouting).not.toMatch(/bu firma/i);
    expect(LEAD_COPY.regionalRouting).not.toMatch(/\d/);
  });
});

describe("regional routing note", () => {
  it("applies to a form opened from a firm page without a target firm", () => {
    expect(routesToRegionalFirms("firm_profile", undefined)).toBe(true);
    expect(routesToRegionalFirms("firm_profile", "")).toBe(true);
  });

  it("does not apply when a target firm receives the request or the form came from elsewhere", () => {
    expect(routesToRegionalFirms("firm_profile", "9f1c0f0e-0000-4000-8000-000000000001")).toBe(false);
    for (const source of LEAD_SOURCES.filter((entry) => entry !== "firm_profile")) {
      expect(routesToRegionalFirms(source, undefined), source).toBe(false);
    }
  });
});

describe("lead sources", () => {
  it("knows the calculator and lists every source once", () => {
    expect(LEAD_SOURCES).toContain("calculator");
    expect(new Set(LEAD_SOURCES).size).toBe(LEAD_SOURCES.length);
  });

  it("resolves a kaynak query value against the allow-list", () => {
    for (const source of LEAD_SOURCES) expect(resolveLeadSource(source)).toBe(source);
    expect(resolveLeadSource(" Hero ")).toBe("hero");
  });

  it("maps kaynak=maliyet-hesapla to the calculator source", () => {
    expect(resolveLeadSource("maliyet-hesapla")).toBe("calculator");
    expect(resolveLeadSource("MALIYET-HESAPLA")).toBe("calculator");
  });

  it("returns null for anything else so the caller infers the source from the page", () => {
    for (const unknown of [null, undefined, "", "  ", "google", "<script>", "constructor", "__proto__", "toString"]) {
      expect(resolveLeadSource(unknown), String(unknown)).toBeNull();
    }
  });
});

describe("calculator estimate token", () => {
  const token = "a1b2c3d4e5f60718";

  it("accepts exactly 16 letters or digits", () => {
    expect(ESTIMATE_TOKEN_PATTERN.test(token)).toBe(true);
    expect(parseEstimateToken(token)).toBe(token);
    expect(parseEstimateToken("0123456789abcdef")).toBe("0123456789abcdef");
    expect(parseEstimateToken("ZZZZzzzz99990000")).toBe("zzzzzzzz99990000");
  });

  it("rejects every other length and character", () => {
    const bad = [
      "",
      token.slice(1),
      `${token}0`,
      `${token.slice(0, 15)}-`,
      `${token.slice(0, 15)}_`,
      `${token.slice(0, 15)}ş`,
      ` ${token.slice(1)}`,
      `${token}\n`,
      `${token.slice(0, 8)} ${token.slice(8)}`,
      "a".repeat(64),
    ];
    for (const value of bad) expect(parseEstimateToken(value), JSON.stringify(value)).toBeNull();
    expect(parseEstimateToken(null)).toBeNull();
    expect(parseEstimateToken(undefined)).toBeNull();
  });
});

describe("phone helpers", () => {
  it("normalizes to digits and prefixes 5xx numbers with 0", () => {
    expect(normalizePhone("5321234567")).toBe("05321234567");
    expect(normalizePhone("0532 123 45 67")).toBe("05321234567");
    expect(normalizePhone("+90 532 123 45 67")).toBe("05321234567");
    expect(normalizePhone("0090 532 123 45 67")).toBe("05321234567");
    expect(normalizePhone("05321234567999")).toBe("05321234567");
    expect(normalizePhone("")).toBe("");
  });

  it("formats as 05XX XXX XX XX while typing", () => {
    expect(formatPhone("05")).toBe("05");
    expect(formatPhone("0532")).toBe("0532");
    expect(formatPhone("05321")).toBe("0532 1");
    expect(formatPhone("05321234")).toBe("0532 123 4");
    expect(formatPhone("0532123456")).toBe("0532 123 45 6");
    expect(formatPhone("5321234567")).toBe("0532 123 45 67");
  });

  it("validates 11 digits starting with 05", () => {
    expect(validatePhone("0532 123 45 67")).toBeNull();
    expect(validatePhone("05321234567")).toBeNull();
    expect(validatePhone("5321234567")).not.toBeNull();
    expect(validatePhone("0532123456")).not.toBeNull();
    expect(validatePhone("053212345678")).not.toBeNull();
    expect(validatePhone("02121234567")).not.toBeNull();
    expect(validatePhone("05")).not.toBeNull();
    expect(validatePhone("")).not.toBeNull();
  });

  it("masks a number without revealing the middle digits", () => {
    expect(maskPhone("05321234567")).toBe("05** *** ** 67");
    expect(maskPhone("0532")).toBe("");
  });
});

describe("name helpers", () => {
  it("accepts two words with Turkish letters, apostrophes and hyphens", () => {
    expect(validateFullName("Ayşe Yılmaz")).toBeNull();
    expect(validateFullName("Ömer Çağlar Şahin")).toBeNull();
    expect(validateFullName("Sean O'Brien")).toBeNull();
    expect(validateFullName("Ali Veli-Kaya")).toBeNull();
    expect(validateFullName("Mehmet D’Arcy")).toBeNull();
  });

  it("rejects a single word, short input, digits and empty input", () => {
    expect(validateFullName("Ayşe")).not.toBeNull();
    expect(validateFullName("Al")).not.toBeNull();
    expect(validateFullName("Ayşe 123")).not.toBeNull();
    expect(validateFullName("   ")).not.toBeNull();
    expect(validateFullName("")).not.toBeNull();
  });
});

describe("e-mail helpers", () => {
  it("masks the local part", () => {
    expect(maskEmail("ayse.yilmaz@gmail.com")).toBe("ay***@gmail.com");
    expect(maskEmail("not-an-email")).toBe("");
  });

  it("always rejects a malformed address once something is typed", () => {
    expect(validateEmail("ayse@example")).not.toBeNull();
    expect(validateEmail("ayse@example.com")).toBeNull();
  });

  it("treats an empty address as an error only when e-mail is required", () => {
    expect(validateEmail("") === null).toBe(!emailRequired());
  });
});

describe("validateStep", () => {
  it("step 1 needs service, city and area size", () => {
    expect(Object.keys(validateStep(1, initialFormData)).sort()).toEqual(["areaSize", "city", "serviceType"]);
    expect(validateStep(1, complete())).toEqual({});
  });

  it("step 2 needs budget and timeline only; the optional details are not required", () => {
    expect(Object.keys(validateStep(2, complete({ budget: "", timeline: "" }))).sort()).toEqual(["budget", "timeline"]);
    expect(validateStep(2, complete({ propertyType: "", currentCondition: "", scope: [], notes: "" }))).toEqual({});
  });

  it("step 3 needs name, phone, consent and (with e-mail verification) a valid e-mail", () => {
    const empty = validateStep(3, complete({ fullName: "", phone: "05", email: "", kvkkAccepted: false }));
    expect(Object.keys(empty)).toEqual(expect.arrayContaining(["fullName", "phone", "kvkkAccepted"]));
    expect("email" in empty).toBe(emailRequired());
    expect(validateStep(3, complete())).toEqual({});
  });

  it("step 3 checks a filled-in e-mail even when it is optional", () => {
    expect(validateStep(3, complete({ email: "broken" })).email).toBeTruthy();
  });
});

describe("firstIncompleteStep", () => {
  it("starts at step 1 when something is missing and never on step 3", () => {
    expect(firstIncompleteStep(initialFormData)).toBe(1);
    expect(firstIncompleteStep(complete({ areaSize: "" }))).toBe(1);
    expect(firstIncompleteStep(complete())).toBe(2);
    expect(firstIncompleteStep(complete({ budget: "", timeline: "" }))).toBe(2);
  });
});

describe("draft", () => {
  it("uses a versioned storage key", () => {
    expect(DRAFT_STORAGE_KEY).toBe("pz_lead_draft_v1");
  });

  it("keeps choices but never contact data, photos or consent", () => {
    const draft = pickDraft(
      complete({ photos: [new File(["x"], "a.jpg", { type: "image/jpeg" })], address: "Gizli Mah. 1", notes: "not" }),
    );
    for (const key of ["fullName", "phone", "email", "photos", "kvkkAccepted", "address"]) {
      expect(draft).not.toHaveProperty(key);
    }
    expect(draft).toMatchObject({ serviceType: "bahce-tasarimi", city: "Ankara", areaSize: "150-500", notes: "not" });
    expect(JSON.stringify(draft)).not.toContain("ayse@example.com");
    expect(JSON.stringify(draft)).not.toContain("05321234567");
  });

  it("restores a stored draft and drops unknown or inconsistent values", () => {
    const raw = JSON.stringify({
      v: 1,
      step: 2,
      data: { serviceType: "bahce-tasarimi", city: "İstanbul", areaSize: "20000+", budget: "200000+", timeline: "yarin", scope: ["cim-ekimi", "uydurma"] },
    });
    const restored = parseDraft(raw);
    expect(restored?.step).toBe(2);
    expect(restored?.data).toMatchObject({ serviceType: "bahce-tasarimi", city: "İstanbul", budget: "200000+", scope: ["cim-ekimi"] });
    // 20000+ is a commercial area size, the service is residential: dropped.
    expect(restored?.data.areaSize).toBeUndefined();
    expect(restored?.data.timeline).toBeUndefined();
  });

  it("ignores garbage", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("{not json")).toBeNull();
    expect(parseDraft('"text"')).toBeNull();
  });
});

describe("pre-fill sanitising", () => {
  it("accepts known services and derives the project type from them", () => {
    expect(sanitizeLeadInput({ serviceType: "periyodik-bakim" })).toMatchObject({ serviceType: "periyodik-bakim", projectType: "commercial" });
    expect(sanitizeLeadInput({ serviceType: "<script>" })).toEqual({});
  });

  it("matches provinces loosely and rejects unknown ones", () => {
    expect(sanitizeLeadInput({ city: "istanbul" }).city).toBe("İstanbul");
    expect(sanitizeLeadInput({ city: "IĞDIR" }).city).toBe("Iğdır");
    expect(sanitizeLeadInput({ city: "Atlantis" }).city).toBeUndefined();
  });
});

describe("Turkish-aware search", () => {
  it("folds case, diacritics and the dotless i", () => {
    expect(normalizeForSearch("İstanbul")).toBe("istanbul");
    expect(normalizeForSearch("Şanlıurfa")).toBe("sanliurfa");
    expect(normalizeForSearch("Iğdır")).toBe("igdir");
    expect(normalizeForSearch("Hakkâri")).toBe("hakkari");
  });

  it("finds a province from a plain-ASCII query", () => {
    expect(findCity("istanbul")).toBe("İstanbul");
    expect(findCity("sanliurfa")).toBe("Şanlıurfa");
    expect(findCity("")).toBeNull();
  });
});
