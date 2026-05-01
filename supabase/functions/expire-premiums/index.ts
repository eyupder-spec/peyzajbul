import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Süresi dolmuş premium firmaları bul ve güncelle
    const { data, error } = await supabase
      .from("firms")
      .update({ is_premium: false })
      .eq("is_premium", true)
      .lt("premium_until", now)
      .not("premium_until", "is", null)
      .select("id, company_name, premium_until");

    if (error) throw error;

    const updatedCount = data?.length ?? 0;

    console.log(`[expire-premiums] ${updatedCount} firma güncellendi:`, data?.map(f => f.company_name));

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: updatedCount,
        updated_firms: data?.map(f => ({ id: f.id, company_name: f.company_name, premium_until: f.premium_until })),
        checked_at: now,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("[expire-premiums] Hata:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
