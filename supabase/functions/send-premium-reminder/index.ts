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
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) throw new Error("RESEND_API_KEY eksik");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { firmId } = body;

    // Firma bilgilerini çek
    const { data: firm, error } = await supabase
      .from("firms")
      .select("id, company_name, email, premium_until, city")
      .eq("id", firmId)
      .single();

    if (error || !firm) throw new Error("Firma bulunamadı");
    if (!firm.email) throw new Error("Firmanın e-posta adresi yok");

    const premiumUntil = firm.premium_until ? new Date(firm.premium_until) : null;
    const daysLeft = premiumUntil
      ? Math.ceil((premiumUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const formattedDate = premiumUntil
      ? premiumUntil.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
      : "Belirtilmemiş";

    // Aciliyet rengini belirle
    const urgencyColor = daysLeft !== null && daysLeft <= 3
      ? "#ef4444"
      : daysLeft !== null && daysLeft <= 7
      ? "#f97316"
      : "#eab308";

    const urgencyText = daysLeft === null
      ? "Bitiş tarihiniz belirtilmemiş"
      : daysLeft <= 0
      ? "Premium üyeliğinizin süresi dolmuş"
      : daysLeft === 1
      ? "Premium üyeliğinizin <strong>yarın</strong> süresi dolacak"
      : `Premium üyeliğinizin <strong>${daysLeft} gün</strong> sonra süresi dolacak`;

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg, #854d0e 0%, #a16207 100%);padding:32px 28px;border-radius:12px 12px 0 0;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:28px;">👑</span>
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Premium Üyelik Hatırlatması</h1>
        </div>
        <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Merhaba <strong>${firm.company_name}</strong>,</p>
      </div>

      <!-- Body -->
      <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">

        <!-- Urgency Banner -->
        <div style="background:${urgencyColor}15;border:1px solid ${urgencyColor}40;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
          <p style="margin:0;font-size:15px;color:${urgencyColor};font-weight:600;">
            ⏳ ${urgencyText}
          </p>
        </div>

        <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px;">
          Peyzajbul Premium üyeliğinizin bitiş tarihi yaklaşmaktadır. 
          Üyeliğinizi yenileyerek ayrıcalıklarınızın kesintisiz devam etmesini sağlayabilirsiniz.
        </p>

        <!-- Details Box -->
        <div style="background:#fafafa;border-radius:10px;padding:16px;border:1px solid #f0f0f0;margin-bottom:24px;">
          <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="padding:8px 12px;font-size:13px;color:#888;font-weight:600;width:40%;">Firma Adı</td>
              <td style="padding:8px 12px;font-size:14px;color:#333;">${firm.company_name}</td>
            </tr>
            <tr style="border-top:1px solid #f0f0f0;">
              <td style="padding:8px 12px;font-size:13px;color:#888;font-weight:600;">Premium Bitiş</td>
              <td style="padding:8px 12px;font-size:14px;color:#333;font-weight:700;">${formattedDate}</td>
            </tr>
            ${daysLeft !== null ? `
            <tr style="border-top:1px solid #f0f0f0;">
              <td style="padding:8px 12px;font-size:13px;color:#888;font-weight:600;">Kalan Süre</td>
              <td style="padding:8px 12px;font-size:14px;color:${urgencyColor};font-weight:700;">${daysLeft > 0 ? `${daysLeft} gün` : "Süresi dolmuş"}</td>
            </tr>` : ""}
          </table>
        </div>

        <!-- Premium Benefits -->
        <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 10px;font-size:13px;color:#854d0e;font-weight:700;">👑 Premium Avantajlarınız</p>
          <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#713f12;line-height:1.8;">
            <li>Firma listenizde üst sırada görünme</li>
            <li>Özel müşteri leadleri (doğrudan size yönlendirilen)</li>
            <li>Detaylı hizmet ve SSS bölümleri</li>
            <li>Google Haritalar entegrasyonu</li>
            <li>Önce/Sonra fotoğraf galerisi</li>
          </ul>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://www.peyzajbul.com" 
             style="display:inline-block;background:linear-gradient(135deg,#a16207,#854d0e);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;">
            Premium'u Yenile →
          </a>
        </div>

        <p style="color:#999;font-size:12px;line-height:1.5;margin:0;">
          Bu e-posta Peyzajbul yönetimi tarafından gönderilmiştir. 
          Sorularınız için <a href="mailto:destek@peyzajbul.com" style="color:#a16207;">destek@peyzajbul.com</a> adresine yazabilirsiniz.
        </p>
      </div>

      <!-- Footer -->
      <div style="text-align:center;padding:16px;color:#bbb;font-size:11px;">
        © 2026 Peyzajbul — Türkiye'nin Peyzaj Firma Rehberi
      </div>
    </div>
    `;

    const subjectLine = daysLeft !== null && daysLeft <= 0
      ? `⚠️ Premium üyeliğinizin süresi doldu — ${firm.company_name}`
      : `👑 Premium üyeliğiniz ${daysLeft} gün içinde bitiyor — ${firm.company_name}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Peyzajbul <noreply@peyzajbul.com>",
        to: [firm.email],
        subject: subjectLine,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      throw new Error(`E-posta gönderilemedi: ${errBody}`);
    }

    console.log(`[send-premium-reminder] Mail gönderildi → ${firm.email} (${firm.company_name})`);

    return new Response(
      JSON.stringify({ success: true, sent_to: firm.email, days_left: daysLeft }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("[send-premium-reminder] Hata:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
