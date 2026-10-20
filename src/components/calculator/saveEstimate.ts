import { hasAnalyticsConsent } from "@/lib/consent";
import { supabase } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/withTimeout";
import { PRICE_BENCHMARKS_VERSION, type CalcInputs, type EstimateResult } from "@/lib/priceBenchmarks";
import { ESTIMATE_TOKEN_PATTERN } from "./prefill";
import { getVisitorId } from "./visitorId";

const SAVE_TIMEOUT_MS = 1500;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

/**
 * public.save_estimate yeni bir RPC'dir; src/lib/supabase/types.ts (WP15) henuz onu tanimiyor, bu yuzden
 * yalnizca bu cagri icin yerel bir tip kullanilir. Types yeniden uretildiginde kaldirilabilir.
 */
interface UntypedRpcBuilder extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  abortSignal(signal: AbortSignal): UntypedRpcBuilder;
}
const untypedSupabase = supabase as unknown as {
  rpc(fn: "save_estimate", args: Record<string, unknown>): UntypedRpcBuilder;
};

/** Kampanya parametreleri bir atif/analitik verisidir: yalnizca analitik izni verildiyse kaydedilir. */
function readUtm(): Record<string, string> | null {
  try {
    if (!hasAnalyticsConsent()) return null;
    const search = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = search.get(key);
      if (value) utm[key] = value.slice(0, 100);
    }
    return Object.keys(utm).length > 0 ? utm : null;
  } catch {
    return null;
  }
}

/**
 * Tahmini estimates tablosuna kaydeder ve 16 karakterlik token dondurur. Yalnizca CTA tiklandiginda cagrilir,
 * 1,5 sn ile sinirlidir ve HER hatada (tablo yok, RPC hatasi, zaman asimi, ag) null doner: hesaplayici
 * veritabani olmadan da calisir ve CTA token olmadan forma yonlendirir.
 */
export async function saveEstimate(inputs: CalcInputs, result: EstimateResult): Promise<string | null> {
  try {
    const { data, error } = await withTimeout(
      async (signal) =>
        await untypedSupabase
          .rpc("save_estimate", {
            p_inputs: inputs,
            p_result: result,
            p_benchmark_version: PRICE_BENCHMARKS_VERSION,
            p_utm: readUtm(),
            p_visitor_id: getVisitorId(),
          })
          .abortSignal(signal),
      SAVE_TIMEOUT_MS,
    );
    if (error || typeof data !== "string" || !ESTIMATE_TOKEN_PATTERN.test(data)) return null;
    return data;
  } catch {
    return null;
  }
}
