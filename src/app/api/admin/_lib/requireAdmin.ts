import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type RequireAdminResult =
  | { ok: true; user: User; supabase: ServerSupabase }
  | { ok: false; response: NextResponse };

const SAFE_METHODS = new Set(["GET", "HEAD"]);

function deny(status: 401 | 403, error: string): RequireAdminResult {
  return {
    ok: false,
    response: NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } }),
  };
}

/** True when an Origin header is present and points at a different host than the one being called. */
function isCrossOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * Authorization gate for every route under /api/admin/**.
 * Call it as the FIRST statement of each handler:
 *
 *   const auth = await requireAdmin(req);
 *   if (!auth.ok) return auth.response;
 *
 * Identity comes from supabase.auth.getUser() (validated by the Auth server, never the
 * unverified cookie session); the admin role is read from user_roles with the caller's own
 * client, which the "Users can read own roles" RLS policy permits.
 */
export async function requireAdmin(req?: Request): Promise<RequireAdminResult> {
  if (req && !SAFE_METHODS.has(req.method) && isCrossOrigin(req)) {
    return deny(403, "Geçersiz istek kaynağı.");
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return deny(401, "Oturum açmanız gerekiyor.");

    const { data: adminRole, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !adminRole) return deny(403, "Bu işlem için admin yetkisi gerekir.");

    return { ok: true, user, supabase };
  } catch (err) {
    console.error("[requireAdmin] failed:", err);
    return deny(403, "Bu işlem için admin yetkisi gerekir.");
  }
}
