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
    const { email, code, fullName, phone, leadId } = await req.json();
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

    // Check if user already exists (email ile arama — listUsers yerine daha verimli)
    const { data: existingUserData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Email bazlı arama: getUserByEmail benzeri bir kontrol
    let existingUser = null;
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    if (allUsers?.users) {
      existingUser = allUsers.users.find((u: any) => u.email === email) || null;
    }

    let userId: string;
    let password: string | null = null;
    let isNewUser = false;

    if (existingUser) {
      // Mevcut kullanıcı — şifresini DEĞİŞTİRME, sadece oturumunu aç
      userId = existingUser.id;

      // Kullanıcı metadata'sını güncelle (isim/telefon değişmişse)
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: fullName || existingUser.user_metadata?.full_name,
          phone: phone || existingUser.user_metadata?.phone,
        },
      });
    } else {
      // Yeni kullanıcı — hesap oluştur
      isNewUser = true;

      // Rastgele şifre oluştur
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
      password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone },
      });
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Update unverified lead to active and assign user
    if (leadId) {
      const { error: leadUpdateError } = await supabase
        .from("leads")
        .update({
          status: "active",
          user_id: userId,
        })
        .eq("id", leadId);

      if (leadUpdateError) {
        console.error("Failed to update unverified lead:", leadUpdateError);
      }
    }

    // Oturum aç (mevcut kullanıcı için OTP-tabanlı, yeni kullanıcı için şifreyle)
    let session = null;

    if (isNewUser && password) {
      // Yeni kullanıcı: Şifreyle giriş yap
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      session = signInData?.session || null;
    } else {
      // Mevcut kullanıcı: Magic link tarzı token oluştur (admin API ile)
      const { data: signInData } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      // Token ile oturum oluştur
      if (signInData?.properties?.hashed_token) {
        const { data: verifyData } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: signInData.properties.hashed_token,
        });
        session = verifyData?.session || null;
      }
    }

    // SADECE YENİ KULLANICI İSE şifre bilgi maili gönder
    if (isNewUser && password) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Peyzajbul <noreply@peyzajbul.com>",
            to: [email],
            subject: "Hesap Bilgileriniz - Peyzajbul",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
                <h1 style="color:#1a1a1a;font-size:24px;margin-bottom:8px;">Hesabınız Oluşturuldu!</h1>
                <p style="color:#666;font-size:14px;margin-bottom:24px;">Peyzajbul'da sizin için bir hesap oluşturduk. Aşağıdaki bilgilerle <a href="https://www.peyzajbul.com/hesabim" style="color:#10b981;font-weight:bold;">hesabım</a> sayfasından giriş yapabilirsiniz:</p>
                <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin-bottom:24px;">
                  <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>E-posta:</strong> ${email}</p>
                  <p style="margin:0;color:#333;font-size:14px;"><strong>Şifre:</strong> ${password}</p>
                </div>
                <p style="color:#999;font-size:12px;">Güvenliğiniz için giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.</p>
              </div>
            `,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        session,
        isNewUser,
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
