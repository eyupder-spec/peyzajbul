/// <reference lib="deno.ns" />

/**
 * Authentication and authorization contract shared by the Edge Functions.
 *
 * Exports:
 *   HttpError(status, message)       throw it to answer with {success:false,error} and that status
 *   adminClient()                    service-role Supabase client (bypasses RLS, server side only)
 *   requireUser(req)                 -> {user, token, admin}; 401 without a valid, non-anonymous user session
 *   requireAdmin(req)                requireUser + role 'admin' in user_roles (403 otherwise);
 *                                    also demands the JWT claim aal === 'aal2' when REQUIRE_ADMIN_MFA === 'true'
 *   requireServiceSecret(req)        void; 401 unless x-internal-secret equals INTERNAL_FUNCTION_SECRET
 *                                    or the Bearer token equals SUPABASE_SERVICE_ROLE_KEY
 *   requireAdminOrService(req)       -> {actor: 'service' | 'admin', user?, admin}
 *   rateLimit(admin, key, limit, windowSeconds)
 *                                    throws HttpError(429) once `key` has been hit more than `limit`
 *                                    times in the current fixed window (public.edge_rate_limit_hit)
 *
 * Secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   provided by Supabase
 *   INTERNAL_FUNCTION_SECRET                  random value, 32+ bytes; also stored in the Vault under the same
 *                                             name so database triggers can call the internal functions
 *   ALLOWED_ORIGINS                           optional, see cors.ts
 *   REQUIRE_ADMIN_MFA                         optional, "true" makes requireAdmin demand a TOTP-verified session
 *   WAHA_API_KEY                              optional, used by notify-whatsapp
 *
 * A request that carries only the public anon key is rejected by requireUser:
 * that key is a valid JWT but has no user behind it, so auth.getUser() fails.
 */

import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.57.2";
import { timingSafeEqual } from "./security.ts";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const UNAUTHENTICATED = "Oturum açmanız gerekiyor.";
const UNAUTHORIZED_SERVICE = "Yetkisiz istek.";
const NOT_ADMIN = "Bu işlem için yönetici yetkisi gerekiyor.";
const MFA_REQUIRED = "Yönetici işlemleri için iki adımlı doğrulama gerekiyor.";
const RATE_LIMITED = "Çok fazla istek. Lütfen daha sonra tekrar deneyin.";

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearerToken(req: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec((req.headers.get("Authorization") ?? "").trim());
  return match ? match[1] : null;
}

function jwtClaims(token: string): Record<string, unknown> {
  try {
    const base64 = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return claims && typeof claims === "object" ? claims : {};
  } catch {
    return {};
  }
}

export async function requireUser(
  req: Request,
): Promise<{ user: User; token: string; admin: SupabaseClient }> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, UNAUTHENTICATED);

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user || user.is_anonymous) throw new HttpError(401, UNAUTHENTICATED);

  return { user, token, admin };
}

export async function requireAdmin(
  req: Request,
): Promise<{ user: User; token: string; admin: SupabaseClient }> {
  const context = await requireUser(req);

  const { data: adminRole, error } = await context.admin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw error;
  if (!adminRole) throw new HttpError(403, NOT_ADMIN);

  if (Deno.env.get("REQUIRE_ADMIN_MFA") === "true" && jwtClaims(context.token).aal !== "aal2") {
    throw new HttpError(403, MFA_REQUIRED);
  }

  return context;
}

function isServiceRequest(req: Request): boolean {
  const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  const providedSecret = req.headers.get("x-internal-secret") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = bearerToken(req) ?? "";

  // Both comparisons always run so the outcome of the first cannot be inferred from timing,
  // and an unset secret or key never matches an empty header.
  const secretMatches = timingSafeEqual(providedSecret, expectedSecret);
  const bearerMatches = timingSafeEqual(bearer, serviceKey);
  return (expectedSecret !== "" && providedSecret !== "" && secretMatches) ||
    (serviceKey !== "" && bearer !== "" && bearerMatches);
}

export function requireServiceSecret(req: Request): void {
  if (!isServiceRequest(req)) throw new HttpError(401, UNAUTHORIZED_SERVICE);
}

export async function requireAdminOrService(
  req: Request,
): Promise<{ actor: "service" | "admin"; user?: User; admin: SupabaseClient }> {
  if (isServiceRequest(req)) {
    return { actor: "service", admin: adminClient() };
  }
  const { user, admin } = await requireAdmin(req);
  return { actor: "admin", user, admin };
}

/**
 * Fixed-window counter backed by public.edge_rate_limit_hit (migration
 * 20261020090100_sec_p1_internal_calls.sql). Fails open only while that RPC
 * does not exist yet, so functions keep working before the migration is applied.
 */
export async function rateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const { data, error } = await admin.rpc("edge_rate_limit_hit", {
    p_key: key.slice(0, 200),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    if (error.code === "42883" || error.code === "PGRST202") {
      console.warn("[rateLimit] edge_rate_limit_hit is not installed yet; allowing the request.");
      return;
    }
    throw error;
  }
  if (data === false) throw new HttpError(429, RATE_LIMITED);
}
