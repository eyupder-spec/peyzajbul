import { BlockList, isIP, type LookupFunction } from "node:net";
import { lookup as dnsLookup } from "node:dns";
import { request as httpsRequest } from "node:https";
import type { IncomingMessage } from "node:http";

/**
 * SSRF-safe, bounded image downloader used by the admin photo proxy.
 *
 * Defences, all enforced on EVERY redirect hop:
 *  - https only, default port only, no credentials in the URL
 *  - IP literals and hostnames resolved through DNS must not be private, loopback,
 *    link-local (cloud metadata), multicast or otherwise reserved
 *  - the address that was validated is the address that is connected to (custom
 *    `lookup` on the socket, so there is no resolve-then-connect rebinding window)
 *  - 3 redirects max, 10 s total, 5 MiB max, raster image types only (never SVG),
 *    verified by magic bytes instead of trusting the upstream Content-Type
 */

export type FetchImageErrorCode = "invalid_url" | "blocked" | "too_large" | "bad_type" | "upstream" | "timeout";

export class FetchImageError extends Error {
  readonly code: FetchImageErrorCode;

  constructor(code: FetchImageErrorCode, message?: string) {
    super(message ?? code);
    this.name = "FetchImageError";
    this.code = code;
  }
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_URL_LENGTH = 2048;
const MAX_REDIRECTS = 3;
const TOTAL_TIMEOUT_MS = 10_000;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const blockList = new BlockList();
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];
const BLOCKED_V6: ReadonlyArray<readonly [string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
  // IPv4-mapped (::ffff:a.b.c.d) needs no rule of its own: BlockList.check() resolves the embedded v4
  // address against the v4 ranges above. Adding ::ffff:0:0/96 would block EVERY IPv4 address.
];
for (const [network, prefix] of BLOCKED_V4) blockList.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of BLOCKED_V6) blockList.addSubnet(network, prefix, "ipv6");

/** True when the address is not a publicly routable unicast IP (unparsable input counts as blocked). */
export function isBlockedIp(ip: string): boolean {
  const address = ip.split("%")[0];
  const family = isIP(address);
  if (family === 0) return true;
  return blockList.check(address, family === 4 ? "ipv4" : "ipv6");
}

/** Validates a user supplied image URL and returns the normalised URL, or throws FetchImageError. */
export function assertPublicHttpsUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) throw new FetchImageError("invalid_url");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new FetchImageError("invalid_url");
  }

  if (url.protocol !== "https:") throw new FetchImageError("invalid_url");
  if (url.username || url.password) throw new FetchImageError("invalid_url");
  if (url.port !== "" && url.port !== "443") throw new FetchImageError("invalid_url");

  // WHATWG parsing already normalised decimal/hex/octal IPv4 forms to dotted quads.
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host) throw new FetchImageError("invalid_url");

  if (isIP(host)) {
    if (isBlockedIp(host)) throw new FetchImageError("blocked");
  } else if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchImageError("blocked");
  }

  return url;
}

/** Socket-level DNS hook: rejects the connection if ANY resolved address is non-public. */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) {
      callback(err, "");
      return;
    }
    if (addresses.length === 0 || addresses.some((entry) => isBlockedIp(entry.address))) {
      callback(new FetchImageError("blocked"), "");
      return;
    }
    const usable = options.family === 4 || options.family === 6
      ? addresses.filter((entry) => entry.family === options.family)
      : addresses;
    if (usable.length === 0) {
      callback(new FetchImageError("upstream"), "");
      return;
    }
    if (options.all) {
      callback(null, usable);
    } else {
      callback(null, usable[0].address, usable[0].family);
    }
  });
};

function requestOnce(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        agent: false,
        signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*;q=0.8",
          "Accept-Encoding": "identity",
        },
      },
      resolve,
    );
    req.on("error", reject);
    req.end();
  });
}

function readBody(res: IncomingMessage, signal: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    res.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_IMAGE_BYTES) {
        res.destroy();
        reject(new FetchImageError("too_large"));
        return;
      }
      chunks.push(chunk);
    });
    res.on("end", () => resolve(Buffer.concat(chunks, total)));
    res.on("error", reject);
    res.on("close", () => {
      if (!res.complete) reject(new FetchImageError(signal.aborted ? "timeout" : "upstream"));
    });
  });
}

/** Identifies the real image format from the first bytes. SVG and anything unknown returns null. */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 4 && buf.toString("latin1", 0, 4) === "GIF8") return "image/gif";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && buf.toString("latin1", 4, 8) === "ftyp") {
    const brand = buf.toString("latin1", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

export async function fetchPublicImage(rawUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);

  try {
    let current = assertPublicHttpsUrl(rawUrl);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await requestOnce(current, controller.signal);
      const status = res.statusCode ?? 0;

      if (status >= 300 && status < 400) {
        res.resume();
        const location = res.headers.location;
        if (!location || hop === MAX_REDIRECTS) throw new FetchImageError("upstream");
        let next: string;
        try {
          next = new URL(location, current).toString();
        } catch {
          throw new FetchImageError("upstream");
        }
        current = assertPublicHttpsUrl(next);
        continue;
      }

      if (status < 200 || status >= 300) {
        res.resume();
        throw new FetchImageError("upstream");
      }

      const declaredType = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_CONTENT_TYPES.has(declaredType)) {
        res.destroy();
        throw new FetchImageError("bad_type");
      }
      const declaredLength = Number(res.headers["content-length"]);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
        res.destroy();
        throw new FetchImageError("too_large");
      }

      const buffer = await readBody(res, controller.signal);
      const contentType = sniffImageType(buffer);
      if (!contentType) throw new FetchImageError("bad_type");
      return { buffer, contentType };
    }

    throw new FetchImageError("upstream");
  } catch (err) {
    if (err instanceof FetchImageError) throw err;
    throw new FetchImageError(controller.signal.aborted ? "timeout" : "upstream");
  } finally {
    clearTimeout(timer);
  }
}
