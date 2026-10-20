import { describe, expect, it } from "vitest";
import { normalizeTrMobile as normalizeSrc, toWhatsAppNumber as toWaSrc } from "../../../src/lib/leadRouting.ts";
import { normalizeTrMobile, toWhatsAppNumber } from "./phone.ts";

const VALID: [string, string][] = [
  ["+90 532 123 45 67", "05321234567"],
  ["0532-123-4567", "05321234567"],
  ["905321234567", "05321234567"],
  ["5321234567", "05321234567"],
  ["05321234567", "05321234567"],
  ["0090 532 123 45 67", "05321234567"],
  ["(0532) 123 45 67", "05321234567"],
  ["  +90.532.123.45.67 ", "05321234567"],
];

const INVALID: unknown[] = [
  "02121234567", // landline
  "0532123", // too short
  "053212345678", // too long
  "abcdefghij",
  "0532 123 45 6a",
  "tel: 0532 123 45 67",
  "",
  "   ",
  "+1 415 555 2671",
  "04321234567", // not a mobile prefix
  null,
  undefined,
  12345,
];

describe("create-lead phone.ts", () => {
  it.each(VALID)("normalises %s", (raw, expected) => {
    expect(normalizeTrMobile(raw)).toBe(expected);
  });

  it.each(INVALID)("rejects %s", (raw) => {
    expect(normalizeTrMobile(raw as string)).toBeNull();
  });

  it("builds the WhatsApp number from a normalised mobile", () => {
    expect(toWhatsAppNumber("0532 123 45 67")).toBe("905321234567");
    expect(toWhatsAppNumber("0212 123 45 67")).toBeNull();
  });
});

describe("parity with src/lib/leadRouting.ts", () => {
  it.each([...VALID.map(([raw]) => raw), ...INVALID])("agrees on %s", (raw) => {
    expect(normalizeSrc(raw as string)).toBe(normalizeTrMobile(raw as string));
    expect(toWaSrc(raw as string)).toBe(toWhatsAppNumber(raw as string));
  });
});
