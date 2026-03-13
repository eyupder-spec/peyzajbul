import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PREMIUM_COST = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("Not authenticated");

    // Get firm and check balance
    const { data: firm } = await supabaseAdmin
      .from("firms")
      .select("id, coin_balance, company_name, is_premium, premium_until")
      .eq("user_id", user.id)
      .single();

    if (!firm) throw new Error("Firma bulunamadı");
    if (firm.coin_balance < PREMIUM_COST) throw new Error("Yetersiz jeton bakiyesi");

    const premiumUntil = new Date();
    // If already premium and not expired, add to current date or expiration?
    // Let's keep it simple for now: 1 month from now
    premiumUntil.setMonth(premiumUntil.getMonth() + 1);

    // Update firm (bypass trigger using Admin client)
    const { error: updateError } = await supabaseAdmin
      .from("firms")
      .update({ 
        coin_balance: firm.coin_balance - PREMIUM_COST,
        is_premium: true,
        premium_until: premiumUntil.toISOString()
      })
      .eq("id", firm.id);

    if (updateError) throw updateError;

    // Record transaction
    await supabaseAdmin.from("coin_transactions").insert({
      firm_id: firm.id,
      type: "premium_activation",
      amount: -PREMIUM_COST,
      description: "Premium üyelik aktivasyonu (1 ay)",
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_balance: firm.coin_balance - PREMIUM_COST,
        premium_until: premiumUntil.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
