// How to run: deno test supabase/functions/claim-firm
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { creditAmount, DEFAULT_FIRST_LEAD_CREDIT, firstLeadCreditKey, grantFirstLeadCredit, type RpcCaller } from "./credit.ts";

const FIRM_ID = "0a1b2c3d-1111-4222-8333-444455556666";

function rpcReturning(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const rpc: RpcCaller = (fn, args) => {
    calls.push({ fn, args });
    return Promise.resolve(result);
  };
  return { rpc, calls };
}

Deno.test("creditAmount reads whole coins and falls back to the default", () => {
  assertEquals(creditAmount(undefined), DEFAULT_FIRST_LEAD_CREDIT);
  assertEquals(creditAmount(""), DEFAULT_FIRST_LEAD_CREDIT);
  assertEquals(creditAmount("25"), 25);
  assertEquals(creditAmount("0"), 0);
  assertEquals(creditAmount("-3"), DEFAULT_FIRST_LEAD_CREDIT);
  assertEquals(creditAmount("2.5"), DEFAULT_FIRST_LEAD_CREDIT);
  assertEquals(creditAmount("abc"), DEFAULT_FIRST_LEAD_CREDIT);
  assertEquals(creditAmount("999999"), 1000);
});

Deno.test("grantFirstLeadCredit calls grant_coins with the idempotency key", async () => {
  const { rpc, calls } = rpcReturning({ data: { granted: true, tx_id: "t", new_balance: 10 }, error: null });
  assertEquals(await grantFirstLeadCredit(rpc, FIRM_ID, 10), { granted: true, amount: 10 });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].fn, "grant_coins");
  assertEquals(calls[0].args.p_firm, FIRM_ID);
  assertEquals(calls[0].args.p_amount, 10);
  assertEquals(calls[0].args.p_type, "bonus");
  assertEquals(calls[0].args.p_idempotency_key, `first_lead_credit:${FIRM_ID}`);
  assertEquals(firstLeadCreditKey(FIRM_ID), `first_lead_credit:${FIRM_ID}`);
});

Deno.test("grantFirstLeadCredit reports a replay as already granted", async () => {
  const { rpc } = rpcReturning({ data: { granted: false, duplicate: true, new_balance: 10 }, error: null });
  assertEquals(await grantFirstLeadCredit(rpc, FIRM_ID, 10), { granted: false, amount: 10, reason: "already_granted" });
});

Deno.test("grantFirstLeadCredit never throws when the RPC is missing or fails", async () => {
  const missing = rpcReturning({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
  assertEquals(await grantFirstLeadCredit(missing.rpc, FIRM_ID, 10), { granted: false, amount: 10, reason: "rpc_missing" });

  const undefinedFunction = rpcReturning({ data: null, error: { code: "42883", message: "function does not exist" } });
  assertEquals(await grantFirstLeadCredit(undefinedFunction.rpc, FIRM_ID, 10), {
    granted: false,
    amount: 10,
    reason: "rpc_missing",
  });

  const broken = rpcReturning({ data: null, error: { code: "P0001", message: "firm_not_found" } });
  assertEquals(await grantFirstLeadCredit(broken.rpc, FIRM_ID, 10), { granted: false, amount: 10, reason: "rpc_error" });
});

Deno.test("grantFirstLeadCredit does nothing when the credit is switched off", async () => {
  const { rpc, calls } = rpcReturning({ data: { granted: true }, error: null });
  assertEquals(await grantFirstLeadCredit(rpc, FIRM_ID, 0), { granted: false, amount: 0, reason: "disabled" });
  assertEquals(calls.length, 0);
});
