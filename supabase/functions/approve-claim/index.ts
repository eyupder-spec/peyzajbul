import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.peyzajbul.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the user from the token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Verify caller is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { claim_id, action } = await req.json();

    if (!claim_id || !["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "claim_id and action (approve/reject) required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("claim_requests")
      .select("*")
      .eq("id", claim_id)
      .single();

    if (claimError || !claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (claim.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Claim already processed" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === "reject") {
      await supabaseAdmin
        .from("claim_requests")
        .update({ status: "rejected" })
        .eq("id", claim_id);

      return new Response(JSON.stringify({ success: true, status: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Update firm ownership and email
    const { data: claimantData, error: claimantError } = await supabaseAdmin.auth.admin.getUserById(claim.user_id);
    
    if (claimantError) {
      console.error("Failed to fetch claimant user details:", claimantError);
    }
    
    const updatePayload: any = { user_id: claim.user_id, is_claimed: true };
    if (claimantData?.user?.email) {
      updatePayload.email = claimantData.user.email;
    }

    const { error: firmError } = await supabaseAdmin
      .from("firms")
      .update(updatePayload)
      .eq("id", claim.firm_id);

    if (firmError) throw firmError;

    // 2. Assign firm role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", claim.user_id)
      .eq("role", "firm")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: claim.user_id, role: "firm" });
      if (roleError) throw roleError;
    }

    // 3. Mark claim as approved
    await supabaseAdmin
      .from("claim_requests")
      .update({ status: "approved" })
      .eq("id", claim_id);

    return new Response(
      JSON.stringify({ success: true, status: "approved" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
