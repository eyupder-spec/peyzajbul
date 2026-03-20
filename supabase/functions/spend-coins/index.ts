import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.peyzajbul.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEAD_COST = 20;

const spendSchema = z.object({
  lead_id: z.string().uuid("Geçersiz lead_id formatı"),
});

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

    const body = spendSchema.parse(await req.json());
    const { lead_id } = body;

    // Check if already purchased
    const { data: existing } = await supabaseAdmin
      .from("lead_purchases")
      .select("id")
      .eq("firm_id", user.id)
      .eq("lead_id", lead_id)
      .maybeSingle();

    if (existing) throw new Error("Bu lead zaten satın alınmış");

    // Check 3-sale limit
    const { count: purchaseCount } = await supabaseAdmin
      .from("lead_purchases")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", lead_id)
      .eq("status", "paid");

    if (purchaseCount !== null && purchaseCount >= 3) {
      throw new Error("Bu müşteri adayı satış limitine ulaştı (Maksimum 3 firma satın alabilir).");
    }

    // Get firm and check balance
    const { data: firm } = await supabaseAdmin
      .from("firms")
      .select("id, coin_balance, company_name")
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

    // Send notification email to lead owner (non-blocking)
    try {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("email, full_name, service_type, city")
        .eq("id", lead_id)
        .single();

      if (lead?.email) {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Peyzajbul <noreply@peyzajbul.com>",
            to: [lead.email],
            subject: "Talebiniz İlgileniliyor! - Peyzajbul",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
                <h1 style="color:#1a1a1a;font-size:22px;margin-bottom:8px;">Harika Haber! 🎉</h1>
                <p style="color:#333;font-size:15px;line-height:1.6;">
                  Sayın <strong>${lead.full_name}</strong>,
                </p>
                <p style="color:#333;font-size:15px;line-height:1.6;">
                  <strong>${firm.company_name || "Bir firma"}</strong> talebinizi aldı ve gün içerisinde sizinle iletişime geçecektir.
                </p>
                <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:20px 0;">
                  <p style="margin:4px 0;color:#555;font-size:14px;">📋 Hizmet: <strong>${lead.service_type}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📍 Şehir: <strong>${lead.city}</strong></p>
                </div>
                <p style="color:#999;font-size:12px;">Bu e-posta Peyzajbul tarafından otomatik olarak gönderilmiştir.</p>
              </div>
            `,
          }),
        });
      }
    } catch (emailErr) {
      console.error("Lead notification email failed:", emailErr);
    }

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
