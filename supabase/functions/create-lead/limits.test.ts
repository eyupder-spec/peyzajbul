import { describe, expect, it } from "vitest";
import { getClientIp } from "./limits.ts";

const headers = (init: Record<string, string>) => new Headers(init);

describe("getClientIp", () => {
  it("prefers cf-connecting-ip, which only Cloudflare can set", () => {
    expect(getClientIp(headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1, 192.0.2.9" }))).toBe("203.0.113.7");
    expect(getClientIp(headers({ "cf-connecting-ip": "  203.0.113.7  " }))).toBe("203.0.113.7");
  });

  it("never returns the first x-forwarded-for hop when cf-connecting-ip is missing", () => {
    // The client chose the first entries; the last one was appended by the nearest proxy.
    expect(getClientIp(headers({ "x-forwarded-for": "198.51.100.1, 192.0.2.9" }))).toBe("192.0.2.9");
    expect(getClientIp(headers({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(getClientIp(headers({ "x-forwarded-for": "spoofed-by-client, 203.0.113.7" }))).not.toBe("spoofed-by-client");
  });

  it("gives a spoofing client one bucket, not one per request", () => {
    const first = getClientIp(headers({ "x-forwarded-for": `${Math.random()}, 203.0.113.7` }));
    const second = getClientIp(headers({ "x-forwarded-for": `${Math.random()}, 203.0.113.7` }));
    expect(first).toBe(second);
  });

  it("uses the only entry of a single-hop header", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(getClientIp(headers({ "x-forwarded-for": " 203.0.113.7 " }))).toBe("203.0.113.7");
  });

  it("ignores empty hops", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "198.51.100.1, 203.0.113.7, " }))).toBe("203.0.113.7");
    expect(getClientIp(headers({ "x-forwarded-for": ",," }))).toBe("unknown");
  });

  it("falls back to unknown without any address header", () => {
    expect(getClientIp(headers({}))).toBe("unknown");
    expect(getClientIp(headers({ "cf-connecting-ip": "   " }))).toBe("unknown");
  });
});
