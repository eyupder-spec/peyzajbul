import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { linkEstimateToVerifiedLead } from "./estimateLink.ts";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const TOKEN = "a1b2c3d4e5f60718";

interface FakeOptions {
  /** What `select("estimate_token")` resolves to. */
  lookup?: { data: unknown; error: { code?: string; message?: string } | null };
  /** What `rpc("link_lead_artifacts")` resolves to. */
  link?: { data: unknown; error: { message?: string } | null };
  lookupThrows?: boolean;
  linkThrows?: boolean;
}

/** The two calls of the service-role client this module makes, recorded. */
function fakeClient(options: FakeOptions = {}) {
  const selected: string[] = [];
  const filters: Array<[string, string]> = [];
  const rpc = vi.fn(async (_name: string, _args: Record<string, unknown>) => {
    if (options.linkThrows) throw new Error("network down");
    return options.link ?? { data: null, error: null };
  });
  const client = {
    from: (table: string) => {
      expect(table).toBe("leads");
      return {
        select: (columns: string) => {
          selected.push(columns);
          return {
            eq: (column: string, value: string) => {
              filters.push([column, value]);
              return {
                maybeSingle: async () => {
                  if (options.lookupThrows) throw new Error("network down");
                  return options.lookup ?? { data: { estimate_token: TOKEN }, error: null };
                },
              };
            },
          };
        },
      };
    },
    rpc,
  } as unknown as SupabaseClient;
  return { client, rpc, selected, filters };
}

describe("linkEstimateToVerifiedLead", () => {
  it("links the stored token with the two-argument RPC", async () => {
    const { client, rpc, selected, filters } = fakeClient();
    const log = vi.fn();

    await expect(linkEstimateToVerifiedLead(client, LEAD_ID, log)).resolves.toBe("linked");

    expect(selected).toEqual(["estimate_token"]);
    expect(filters).toEqual([["id", LEAD_ID]]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("link_lead_artifacts", { p_lead_id: LEAD_ID, p_estimate_token: TOKEN });
    expect(log).not.toHaveBeenCalled();
  });

  it("does nothing for a lead without an estimate", async () => {
    for (const data of [null, {}, { estimate_token: null }, { estimate_token: "" }]) {
      const { client, rpc } = fakeClient({ lookup: { data, error: null } });
      const log = vi.fn();
      await expect(linkEstimateToVerifiedLead(client, LEAD_ID, log)).resolves.toBe("no_estimate");
      expect(rpc).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    }
  });

  it("validates the stored value again and never sends a malformed token", async () => {
    for (const stored of [TOKEN.slice(1), `${TOKEN}0`, "'; drop table leads; --", 1234567890123456, TOKEN.slice(0, 15) + "-"]) {
      const { client, rpc } = fakeClient({ lookup: { data: { estimate_token: stored }, error: null } });
      await expect(linkEstimateToVerifiedLead(client, LEAD_ID, vi.fn())).resolves.toBe("no_estimate");
      expect(rpc).not.toHaveBeenCalled();
    }
  });

  it("sends the canonical lower-case token", async () => {
    const { client, rpc } = fakeClient({ lookup: { data: { estimate_token: TOKEN.toUpperCase() }, error: null } });
    await linkEstimateToVerifiedLead(client, LEAD_ID, vi.fn());
    expect(rpc).toHaveBeenCalledWith("link_lead_artifacts", { p_lead_id: LEAD_ID, p_estimate_token: TOKEN });
  });

  it("swallows and logs a failing link without ever throwing", async () => {
    const failures: FakeOptions[] = [
      { link: { data: null, error: { message: 'function public.link_lead_artifacts(uuid, text) does not exist' } } },
      { linkThrows: true },
    ];
    for (const options of failures) {
      const { client } = fakeClient(options);
      const log = vi.fn();
      await expect(linkEstimateToVerifiedLead(client, LEAD_ID, log)).resolves.toBe("link_failed");
      expect(log).toHaveBeenCalledWith("ESTIMATE_LINK_FAILED");
    }
  });

  it("swallows and logs a failing lookup without ever throwing", async () => {
    const failures: FakeOptions[] = [
      { lookup: { data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } } },
    ];
    for (const options of failures) {
      const { client, rpc } = fakeClient(options);
      const log = vi.fn();
      await expect(linkEstimateToVerifiedLead(client, LEAD_ID, log)).resolves.toBe("lookup_failed");
      expect(log).toHaveBeenCalledWith("ESTIMATE_LOOKUP_FAILED");
      expect(rpc).not.toHaveBeenCalled();
    }
    const { client } = fakeClient({ lookupThrows: true });
    const log = vi.fn();
    await expect(linkEstimateToVerifiedLead(client, LEAD_ID, log)).resolves.toBe("link_failed");
    expect(log).toHaveBeenCalledWith("ESTIMATE_LINK_FAILED");
  });

  it("skips quietly until the leads columns exist", async () => {
    const { client, rpc } = fakeClient({
      lookup: { data: null, error: { code: "42703", message: 'column "estimate_token" does not exist' } },
    });
    const log = vi.fn();
    await expect(linkEstimateToVerifiedLead(client, LEAD_ID, log)).resolves.toBe("not_migrated");
    expect(log).toHaveBeenCalledWith("ESTIMATE_COLUMN_MISSING");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("never puts the token or the lead into a log line", async () => {
    const { client } = fakeClient({ link: { data: null, error: { message: `bad token ${TOKEN}` } } });
    const log = vi.fn();
    await linkEstimateToVerifiedLead(client, LEAD_ID, log);
    expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(log.mock.calls)).not.toContain(LEAD_ID);
  });
});
