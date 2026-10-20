/// <reference lib="deno.ns" />

/**
 * CORS for the Edge Functions.
 *
 * Optional secret: ALLOWED_ORIGINS, a comma separated list of allowed origins
 * (default "https://www.peyzajbul.com,https://peyzajbul.com"). The response
 * never carries "*": an Origin outside the list receives the first allowed
 * origin, which the browser then rejects.
 */

const DEFAULT_ALLOWED_ORIGINS = "https://www.peyzajbul.com,https://peyzajbul.com";

const ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-internal-secret",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
].join(", ");

function allowedOrigins(): string[] {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin && origin !== "*");
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS.split(",");
}

export function corsHeaders(req: Request): Record<string, string> {
  const allowed = allowedOrigins();
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
