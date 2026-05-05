import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.peyzajbul.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate old codes for this email
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("email", email)
      .eq("used", false);

    // Calculate expiration (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Save new code
    const { error: insertError } = await supabase.from("otp_codes").insert({
      email,
      code,
      expires_at: expiresAt,
    });

    if (insertError) throw insertError;

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Peyzajbul <noreply@peyzajbul.com>",
        to: [email],
        subject: `${code} - Peyzajbul Doğrulama Kodu`,
        html: `
          <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
            Doğrulama kodunuz: ${code}. Teklif talebinizi tamamlamak için bu kodu kullanabilirsiniz.
          </div>
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
            <h1 style="color:#1a1a1a;font-size:24px;margin-bottom:8px;">Doğrulama Kodunuz</h1>
            <p style="color:#666;font-size:14px;margin-bottom:24px;">Teklif talebinizi tamamlamak için aşağıdaki kodu kullanın:</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a1a1a;">${code}</span>
            </div>
            <p style="color:#999;font-size:12px;">Bu kod 5 dakika geçerlidir. Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelin.</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      
      // Check if it's a domain verification issue
      if (errBody.includes("verify a domain") || errBody.includes("testing emails")) {
        return new Response(JSON.stringify({ 
          success: true, 
          debugCode: code,
          message: "Resend domain doğrulanmamış. Geliştirme modu: Kod e-posta ile gönderilemedi ancak test için bu yanıtla döndürüldü." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("E-posta gönderilemedi. Lütfen tekrar deneyin.");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : (err?.message || String(err));
    console.error("send-otp error:", errorMsg, err);
    
    // Return 500 normally but stringify safely
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
