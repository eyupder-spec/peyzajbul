import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, fullName, phone } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email ve kod gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Geçersiz veya süresi dolmuş kod" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as used
    await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);

    // Generate random password
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      // Update password
      await supabase.auth.admin.updateUserById(existingUser.id, { password });
      userId = existingUser.id;
    } else {
      // Create user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone },
      });
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Sign in to get session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Send password email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Peyzaj Rehberi <onboarding@resend.dev>",
        to: [email],
        subject: "Hesap Bilgileriniz - Peyzaj Rehberi",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
            <h1 style="color:#1a1a1a;font-size:24px;margin-bottom:8px;">Hesabınız Oluşturuldu!</h1>
            <p style="color:#666;font-size:14px;margin-bottom:24px;">Aşağıdaki bilgilerle giriş yapabilirsiniz:</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>E-posta:</strong> ${email}</p>
              <p style="margin:0;color:#333;font-size:14px;"><strong>Şifre:</strong> ${password}</p>
            </div>
            <p style="color:#999;font-size:12px;">Güvenliğiniz için giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.</p>
          </div>
        `,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        session: signInData?.session || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("verify-otp error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
