import type { SupabaseClient } from "@supabase/supabase-js";
import { parseEstimateToken } from "../create-lead/estimate.ts";
import { isMissingOptionalColumnError } from "../create-lead/leadRow.ts";

// Links the calculator estimate a lead arrived with, once its code has been verified. Pure module: the
// service-role client and the logger are injected.
//
// create-lead keeps the (validated) token in leads.estimate_token; nothing is linked before the visitor proved
// the address. The link itself is public.link_lead_artifacts(p_lead_id, p_estimate_token) from
// 20261021090000_calc_estimates.sql, which only claims an estimate that has no lead yet.
//
// Nothing here may affect the verification: every failure is logged (code only, never the token) and swallowed.

export type EstimateLinkOutcome = "no_estimate" | "linked" | "not_migrated" | "lookup_failed" | "link_failed";

export async function linkEstimateToVerifiedLead(
  client: SupabaseClient,
  leadId: string,
  log: (code: string) => void,
): Promise<EstimateLinkOutcome> {
  try {
    // Selected on its own (not with the other lead columns): before the migration the column does not exist.
    const { data, error } = await client.from("leads").select("estimate_token").eq("id", leadId).maybeSingle();
    if (error) {
      if (isMissingOptionalColumnError(error)) {
        log("ESTIMATE_COLUMN_MISSING");
        return "not_migrated";
      }
      log("ESTIMATE_LOOKUP_FAILED");
      return "lookup_failed";
    }

    const token = parseEstimateToken((data as { estimate_token?: unknown } | null)?.estimate_token);
    if (!token) return "no_estimate";

    const { error: linkError } = await client.rpc("link_lead_artifacts", { p_lead_id: leadId, p_estimate_token: token });
    if (linkError) {
      log("ESTIMATE_LINK_FAILED");
      return "link_failed";
    }
    return "linked";
  } catch {
    log("ESTIMATE_LINK_FAILED");
    return "link_failed";
  }
}
