import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createExpireHandler } from "./handler.ts";

const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(
  createExpireHandler({
    admin: createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    serviceRoleKey,
    cronSecret: Deno.env.get("CRON_SECRET"),
    now: () => new Date(),
  }),
);
