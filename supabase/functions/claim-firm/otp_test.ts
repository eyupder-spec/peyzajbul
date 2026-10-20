// How to run: deno test supabase/functions/claim-firm
import { assert, assertEquals, assertFalse, assertMatch, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  clientIp,
  generateOtp,
  generateWhatsAppCode,
  hashIp,
  hashOtp,
  otpMatches,
  parseIssueOutcome,
  randomInt,
  sendLimitArgs,
} from "./otp.ts";
import {
  buildWaUrl,
  CLAIM_ALPHABET,
  generateFirmSlug,
  isEmailAddress,
  maskEmail,
  maskPhone,
  phoneKey,
} from "./util.ts";

const PEPPER = "test-pepper-0123456789abcdef0123456789abcdef";

Deno.test("generateOtp returns six digits in range", () => {
  for (let i = 0; i < 2000; i++) {
    const otp = generateOtp();
    assertMatch(otp, /^\d{6}$/);
    assert(Number(otp) >= 0 && Number(otp) <= 999_999);
  }
});

Deno.test("generateOtp draws are almost all distinct", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 400; i++) seen.add(generateOtp());
  assert(seen.size > 300, "400 draws should be almost all distinct");
});

Deno.test("randomInt stays inside its bounds and rejects invalid bounds", () => {
  assertEquals(randomInt(1), 0);
  for (let i = 0; i < 500; i++) {
    const value = randomInt(31);
    assert(Number.isInteger(value) && value >= 0 && value < 31);
  }
  let threw = false;
  try {
    randomInt(0);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("generateWhatsAppCode is PB- plus four upper-case claim alphabet characters", () => {
  const allowed = new Set(CLAIM_ALPHABET.toUpperCase());
  for (let i = 0; i < 200; i++) {
    const code = generateWhatsAppCode();
    assertMatch(code, /^PB-[2-9A-HJ-KM-NP-Z]{4}$/);
    for (const char of code.slice(3)) assert(allowed.has(char));
  }
});

Deno.test("hashOtp is a keyed hex digest that never contains the code", async () => {
  const hash = await hashOtp(PEPPER, "claim_firm_email", "info@firma.com", "123456");
  assertMatch(hash, /^[0-9a-f]{64}$/);
  assertFalse(hash.includes("123456"));
  assertEquals(hash, await hashOtp(PEPPER, "claim_firm_email", "info@firma.com", "123456"));
  assert(hash !== (await hashOtp("another-pepper-another-pepper-12345678", "claim_firm_email", "info@firma.com", "123456")));
});

Deno.test("otpMatches accepts only the exact code, purpose and target", async () => {
  const stored = await hashOtp(PEPPER, "claim_firm_email", "info@firma.com", "123456");
  assert(await otpMatches(PEPPER, "claim_firm_email", "info@firma.com", "123456", stored));
  assert(await otpMatches(PEPPER, "claim_firm_email", "  INFO@Firma.com ", "123456", stored), "target is normalised");
  assertFalse(await otpMatches(PEPPER, "claim_firm_email", "info@firma.com", "123457", stored));
  assertFalse(await otpMatches(PEPPER, "login", "info@firma.com", "123456", stored));
  assertFalse(await otpMatches(PEPPER, "claim_firm_email", "other@firma.com", "123456", stored));
  assertFalse(await otpMatches("another-pepper-another-pepper-12345678", "claim_firm_email", "info@firma.com", "123456", stored));
  assertFalse(await otpMatches(PEPPER, "claim_firm_email", "info@firma.com", "123456", "short"));
});

Deno.test("hashIp is deterministic and does not contain the address", async () => {
  const hash = await hashIp(PEPPER, "203.0.113.9");
  assertMatch(hash, /^[0-9a-f]{64}$/);
  assertFalse(hash.includes("203"));
  assertEquals(hash, await hashIp(PEPPER, "203.0.113.9"));
  assert(hash !== (await hashIp(PEPPER, "203.0.113.10")));
});

Deno.test("clientIp prefers cf-connecting-ip, which a client cannot choose", () => {
  assertEquals(
    clientIp(new Headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.77, 10.0.0.1" })),
    "203.0.113.9",
  );
});

Deno.test("clientIp ignores the client-controlled first x-forwarded-for hop", () => {
  // A client that sends its own X-Forwarded-For gets the platform's hop appended after it.
  assertEquals(clientIp(new Headers({ "x-forwarded-for": "198.51.100.77, 203.0.113.9" })), "203.0.113.9");
  assertEquals(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.9 " })), "203.0.113.9");
  assertEquals(clientIp(new Headers({ "x-forwarded-for": " 198.51.100.4 " })), "198.51.100.4");
  assertEquals(clientIp(new Headers({ "x-forwarded-for": "" })), "unknown");
  assertEquals(clientIp(new Headers()), "unknown");
});

Deno.test("maskEmail keeps the first character and the domain", () => {
  assertEquals(maskEmail("info@firma.com"), "i***@firma.com");
  assertEquals(maskEmail(" a@b.co "), "a***@b.co");
  assertEquals(maskEmail("@firma.com"), null);
  assertEquals(maskEmail("no-at-sign"), null);
  assertEquals(maskEmail(null), null);
  assertEquals(maskEmail(""), null);
});

Deno.test("maskPhone hides the middle digits of an 11 digit number", () => {
  assertEquals(maskPhone("0532 123 45 42"), "05** *** ** 42");
  assertEquals(maskPhone("+90 532 123 45 42"), "05** *** ** 42");
  assertEquals(maskPhone("5321234542"), "05** *** ** 42");
  assertEquals(maskPhone("0212 555 11 77"), "02** *** ** 77");
  assertEquals(maskPhone("12345"), null);
  assertEquals(maskPhone(null), null);
});

Deno.test("phoneKey is the last ten digits", () => {
  assertEquals(phoneKey("0532 123 45 42"), "5321234542");
  assertEquals(phoneKey("+90 (532) 123-45-42"), "5321234542");
  assertEquals(phoneKey("123"), null);
  assertEquals(phoneKey(undefined), null);
});

Deno.test("isEmailAddress accepts plain addresses only", () => {
  assert(isEmailAddress("info@firma.com"));
  assertFalse(isEmailAddress("info@firma"));
  assertFalse(isEmailAddress("info firma@x.com"));
  assertFalse(isEmailAddress("a,b@x.com c@y.com"));
});

Deno.test("sendLimitArgs carries the agreed send limits to claim_otp_issue", () => {
  assertEquals(sendLimitArgs(), {
    p_cooldown_seconds: 60,
    p_firm_per_hour: 3,
    p_firm_per_day: 8,
    p_email_per_hour: 3,
    p_ip_per_hour: 15,
  });
});

Deno.test("parseIssueOutcome reads an allowed answer", () => {
  assertEquals(parseIssueOutcome({ allowed: true, id: "0a1b2c3d-1111-4222-8333-444455556666" }), {
    allowed: true,
    id: "0a1b2c3d-1111-4222-8333-444455556666",
  });
});

Deno.test("parseIssueOutcome reads every refusal reason with its retry time", () => {
  for (const reason of ["cooldown", "firm_hour", "firm_day", "email_hour", "ip_hour"] as const) {
    assertEquals(parseIssueOutcome({ allowed: false, reason, retry_after: 41 }), {
      allowed: false,
      reason,
      retryAfterSeconds: 41,
    });
  }
  assertEquals(parseIssueOutcome({ allowed: false, reason: "cooldown", retry_after: 40.2 }), {
    allowed: false,
    reason: "cooldown",
    retryAfterSeconds: 41,
  });
  assertEquals(parseIssueOutcome({ allowed: false, reason: "ip_hour" }), {
    allowed: false,
    reason: "ip_hour",
    retryAfterSeconds: 3600,
  });
});

Deno.test("parseIssueOutcome never treats an unexpected answer as allowed", () => {
  assertThrows(() => parseIssueOutcome(null));
  assertThrows(() => parseIssueOutcome("allowed"));
  assertThrows(() => parseIssueOutcome({}));
  assertThrows(() => parseIssueOutcome({ allowed: true }));
  assertThrows(() => parseIssueOutcome({ allowed: true, id: "" }));
  assertThrows(() => parseIssueOutcome({ allowed: "true", id: "x" }));
  assertThrows(() => parseIssueOutcome({ allowed: false, reason: "whatever", retry_after: 5 }));
});

Deno.test("generateFirmSlug matches the browser helper", () => {
  const id = "0a1b2c3d-1111-4222-8333-444455556666";
  assertEquals(generateFirmSlug("Yeşil Çiçek Peyzaj", id), "yesil-cicek-peyzaj-0a1b2c3d");
  assertEquals(generateFirmSlug("İŞÇİ Ğüneş Ömer & Oğul Ltd.", id), "isci-gunes-omer-ogul-ltd-0a1b2c3d");
  assertEquals(generateFirmSlug("ıspanak ILGAZ", id), "ispanak-ilgaz-0a1b2c3d");
  assertEquals(generateFirmSlug("!!!", id), "-0a1b2c3d");
});

Deno.test("buildWaUrl needs a configured number and encodes Turkish text", () => {
  assertEquals(buildWaUrl(undefined, "x"), null);
  assertEquals(buildWaUrl("12", "x"), null);
  assertEquals(
    buildWaUrl("+90 534 000 00 00", "Peyzajbul sahiplenme kodu: PB-2K9F (Yeşil)"),
    "https://wa.me/905340000000?text=Peyzajbul%20sahiplenme%20kodu%3A%20PB-2K9F%20(Ye%C5%9Fil)",
  );
});
