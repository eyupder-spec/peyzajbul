import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEAD_COST = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");

    // Check if already purchased
    const { data: existing } = await supabaseAdmin
      .from("lead_purchases")
      .select("id")
      .eq("firm_id", user.id)
      .eq("lead_id", lead_id)
      .maybeSingle();

    if (existing) throw new Error("Bu lead zaten satın alınmış");

    // Get firm and check balance
    const { data: firm } = await supabaseAdmin
      .from("firms")
      .select("id, coin_balance")
      .eq("user_id", user.id)
      .single();

    if (!firm) throw new Error("Firma bulunamadı");
    if (firm.coin_balance < LEAD_COST) throw new Error("Yetersiz jeton bakiyesi");

    // Deduct coins
    await supabaseAdmin
      .from("firms")
      .update({ coin_balance: firm.coin_balance - LEAD_COST })
      .eq("id", firm.id);

    // Record transaction
    await supabaseAdmin.from("coin_transactions").insert({
      firm_id: firm.id,
      type: "spend",
      amount: -LEAD_COST,
      description: "Lead açma",
      lead_id,
    });

    // Record purchase
    await supabaseAdmin.from("lead_purchases").insert({
      lead_id,
      firm_id: user.id,
      amount: LEAD_COST,
      status: "paid",
    });

    return new Response(
      JSON.stringify({ success: true, new_balance: firm.coin_balance - LEAD_COST }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
