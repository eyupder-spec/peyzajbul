import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const jsonHeaders = { "Content-Type": "application/json" };

export interface ExpireDeps {
  admin: SupabaseClient;
  serviceRoleKey: string | undefined;
  cronSecret: string | undefined;
  now: () => Date;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
}

// Sabit sureli karsilastirma: uzunluk farki dahil erken cikis yok
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);

  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export function isAuthorized(req: Request, serviceRoleKey: string | undefined, cronSecret: string | undefined): boolean {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const cronHeader = req.headers.get("x-cron-secret") ?? "";

  const serviceOk = !!serviceRoleKey && !!bearer && timingSafeEqual(bearer, serviceRoleKey);
  const cronOk = !!cronSecret && !!cronHeader && timingSafeEqual(cronHeader, cronSecret);
  return serviceOk || cronOk;
}

// Elle / yedek tetikleyici. Zamanlanmis is 20261020120200_money_expiry_cron.sql
// icindeki pg_cron kaydidir. CORS basligi yoktur: tarayicidan cagrilmaz.
export function createExpireHandler(deps: ExpireDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== "POST" && req.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!isAuthorized(req, deps.serviceRoleKey, deps.cronSecret)) {
      return json({ error: "Unauthorized" }, 401);
    }

    try {
      const { data, error } = await deps.admin.rpc("expire_premiums");
      if (error) throw error;

      return json({ success: true, expired_count: Number(data ?? 0), checked_at: deps.now().toISOString() }, 200);
    } catch (err) {
      console.error("[expire-premiums] failed:", err instanceof Error ? err.message : String(err));
      return json({ success: false, error: "Premium süreleri güncellenemedi" }, 500);
    }
  };
}
