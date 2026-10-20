import { isDevEnv, readEnv, type EnvReader } from "./env.ts";

const DEFAULT_ORIGINS = ["https://www.peyzajbul.com", "https://peyzajbul.com"];
const DEV_ORIGIN = "http://localhost:3000";

/** ALLOWED_ORIGINS (comma separated) or the production origins; localhost only when ENV=dev. */
export function allowedOrigins(env: EnvReader = readEnv): string[] {
  const configured = (env("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const origins = configured.length > 0 ? configured : [...DEFAULT_ORIGINS];
  if (isDevEnv(env) && !origins.includes(DEV_ORIGIN)) origins.push(DEV_ORIGIN);
  return origins;
}

/** Hostnames the Turnstile widget may report, derived from the allowed origins. */
export function allowedHostnames(env: EnvReader = readEnv): string[] {
  const hostnames = new Set<string>();
  for (const origin of allowedOrigins(env)) {
    try {
      hostnames.add(new URL(origin).hostname);
    } catch {
      // ignore a malformed entry in ALLOWED_ORIGINS
    }
  }
  return [...hostnames];
}

/** CORS headers for this request: the matching Origin is echoed, never "*". */
export function corsHeaders(req: Request, env: EnvReader = readEnv): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = req.headers.get("Origin");
  if (origin && allowedOrigins(env).includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/** Answer for OPTIONS: 204 for an allowed origin, 403 otherwise. */
export function preflightResponse(req: Request, env: EnvReader = readEnv): Response {
  const headers = corsHeaders(req, env);
  const allowed = "Access-Control-Allow-Origin" in headers;
  return new Response(null, { status: allowed ? 204 : 403, headers });
}
