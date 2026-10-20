/**
 * First-lead credit: one bonus coin grant per firm when its profile is claimed.
 *
 * Calls the WP04 ledger RPC public.grant_coins(p_firm, p_amount, p_type, p_note, p_idempotency_key),
 * which writes one coin_transactions row and moves coin_balance atomically. The idempotency key
 * 'first_lead_credit:<firm id>' makes a replayed verification, a double click, an admin retry or a
 * re-claim by another user grant nothing a second time.
 *
 * A missing RPC or an RPC error never fails the claim: the result says why nothing was granted and the
 * admin can retry from the claims tab (approve-claim, action grant_credit).
 *
 * Only relative imports and structural types, so approve-claim can import it with its own client.
 */

export const DEFAULT_FIRST_LEAD_CREDIT = 10;
const MAX_FIRST_LEAD_CREDIT = 1000;

/** The part of a Supabase client this module needs. */
export type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;

export type CreditResult =
  | { granted: true; amount: number }
  | { granted: false; amount: number; reason: "disabled" | "already_granted" | "rpc_missing" | "rpc_error" };

/** CLAIM_FIRST_LEAD_CREDIT as a whole number of coins; 0 switches the credit off, junk falls back to the default. */
export function creditAmount(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || raw.trim() === "") return DEFAULT_FIRST_LEAD_CREDIT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return DEFAULT_FIRST_LEAD_CREDIT;
  return Math.min(value, MAX_FIRST_LEAD_CREDIT);
}

export function firstLeadCreditKey(firmId: string): string {
  return `first_lead_credit:${firmId}`;
}

export async function grantFirstLeadCredit(rpc: RpcCaller, firmId: string, amount: number): Promise<CreditResult> {
  if (amount <= 0) return { granted: false, amount: 0, reason: "disabled" };

  const { data, error } = await rpc("grant_coins", {
    p_firm: firmId,
    p_amount: amount,
    p_type: "bonus",
    p_note: "Hoş geldin: ilk talep hediyesi",
    p_idempotency_key: firstLeadCreditKey(firmId),
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { granted: false, amount, reason: "rpc_missing" };
    }
    console.error("[claim-firm] grant_coins failed:", error.code, error.message);
    return { granted: false, amount, reason: "rpc_error" };
  }

  const result = data && typeof data === "object" ? (data as { granted?: unknown; duplicate?: unknown }) : {};
  if (result.granted === true) return { granted: true, amount };
  if (result.duplicate === true) return { granted: false, amount, reason: "already_granted" };
  return { granted: false, amount, reason: "rpc_error" };
}
