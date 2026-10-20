/// <reference lib="deno.ns" />

/**
 * DEPRECATED tombstone. Auth: any signed-in, non-anonymous user (requireUser).
 *
 * This function used to write the 'firm' role for any user_id in the request
 * body without authentication. The role is now granted by the database
 * trigger tr_firms_grant_firm_role when an admin approves the firm
 * (migration 20261020090000_sec_p1_firms_guards.sql), so the function performs
 * no database writes. It is kept only because the firm signup form still
 * invokes it and treats an error as fatal.
 *
 * Remove it once the signup flow no longer calls it:
 *   supabase functions delete assign-firm-role
 * and delete the [functions.assign-firm-role] block from supabase/config.toml.
 */

import { requireUser } from "../_shared/auth.ts";
import { serveSecure } from "../_shared/http.ts";

serveSecure(async (req) => {
  await requireUser(req);
  return {
    success: true,
    deprecated: true,
    message: "Firma rolü artık yönetici onayında otomatik atanır.",
  };
});
