// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.peyzajbul.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("user_id eksik!");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update existing homeowner role to firm or insert new firm role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .eq("role", "homeowner")
      .maybeSingle();

    if (existingRole) {
      const { error: updateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: "firm" })
        .eq("user_id", user_id)
        .eq("role", "homeowner");
      if (updateError) throw updateError;
    } else {
      const { data: firmRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .eq("role", "firm")
        .maybeSingle();
      
      if (!firmRole) {
        const { error: insertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: user_id, role: "firm" });
        if (insertError) throw insertError;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
