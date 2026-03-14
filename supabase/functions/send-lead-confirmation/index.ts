import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Türkçe etiketler
const SERVICE_LABELS: Record<string, string> = {
  "bahce-tasarimi": "Bahçe Tasarımı ve Düzenleme",
  "bahce-bakimi": "Bahçe Bakımı (Periyodik)",
  "sulama-sistemi": "Sulama Sistemi",
  "sert-zemin": "Sert Zemin (Taş/Beton/Deck)",
  "bitki-agac": "Bitki ve Ağaç Dikimi",
  "havuz-cevresi": "Havuz Çevresi Düzenleme",
  "proje-tasarim-uygulama": "Proje Tasarımı ve Uygulama",
  "sadece-uygulama": "Sadece Uygulama",
  "yesil-cati-teras": "Yeşil Çatı / Teras",
  "otopark-yol": "Otopark ve Yol Kenarı",
  "havuz-cevresi-ticari": "Havuz Çevresi",
  "periyodik-bakim": "Periyodik Bakım Anlaşması",
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  residential: "Konut / Bireysel",
  commercial: "Ticari / Kurumsal",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  villa: "Villa / Müstakil Ev",
  site: "Site İçi",
  yazlik: "Yazlık",
  "tarla-arazi": "Tarla / Arazi",
  otel: "Otel / Tatil Köyü",
  "avm-plaza": "AVM / Plaza",
  "konut-projesi": "Konut Projesi",
  "okul-hastane": "Okul / Hastane",
  kamu: "Kamu Alanı",
  fabrika: "Fabrika / Sanayi",
  diger: "Diğer",
};

const CONDITION_LABELS: Record<string, string> = {
  "bos-toprak": "Boş Toprak / Ham Arazi",
  "eski-bahce": "Eski Bahçe Var, Yenilenecek",
  "kismen-duzenlenmis": "Kısmen Düzenlenmiş",
  "beton-kapli": "Beton / Kaldırım Kaplı",
};

const BUDGET_LABELS: Record<string, string> = {
  "25000-alti": "25.000 ₺ altı",
  "25000-75000": "25.000 – 75.000 ₺",
  "75000-200000": "75.000 – 200.000 ₺",
  "200000+": "200.000 ₺ üzeri",
  "250000-alti": "250.000 ₺ altı",
  "250000-750000": "250.000 – 750.000 ₺",
  "750000-2000000": "750.000 – 2.000.000 ₺",
  "2000000+": "2.000.000 ₺ üzeri",
  bilmiyorum: "Henüz Bilmiyorum",
  "teklif-sonrasi": "Teklif Aldıktan Sonra Karar Vereceğim",
};

const TIMELINE_LABELS: Record<string, string> = {
  hemen: "Hemen (1–2 Hafta İçinde)",
  "1-ay": "1 Ay İçinde",
  "1-3-ay": "1–3 Ay İçinde",
  "3-6-ay": "3–6 Ay İçinde",
  arastirma: "Sadece Fiyat Araştırıyorum",
};

const AREA_LABELS: Record<string, string> = {
  "50-alti": "50m² altı",
  "50-150": "50–150 m²",
  "150-500": "150–500 m²",
  "500-1000": "500–1.000 m²",
  "1000+": "1.000 m² üzeri",
  "1000-alti": "1.000 m² altı",
  "1000-5000": "1.000–5.000 m²",
  "5000-20000": "5.000–20.000 m²",
  "20000+": "20.000 m² üzeri",
};

function label(map: Record<string, string>, key: string | null): string {
  if (!key) return "-";
  return map[key] || key.replace(/-/g, " ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      email, fullName, serviceType, projectType, city, district,
      propertyType, areaSize, currentCondition, budget, timeline,
      scope, notes, address,
    } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Resend API key eksik" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Kapsam listesini metne çevir
    const scopeText = Array.isArray(scope) && scope.length > 0
      ? scope.map((s: string) => s.replace(/-/g, " ")).join(", ")
      : null;

    const locationText = district ? `${city}, ${district}` : city;

    // Detay satırları oluştur
    const rows: [string, string][] = [
      ["Proje Türü", label(PROJECT_TYPE_LABELS, projectType)],
      ["Hizmet", label(SERVICE_LABELS, serviceType)],
      ["Konum", locationText || "-"],
      ["Mülk Tipi", label(PROPERTY_TYPE_LABELS, propertyType)],
      ["Alan Büyüklüğü", label(AREA_LABELS, areaSize)],
      ["Mevcut Durum", label(CONDITION_LABELS, currentCondition)],
      ["Bütçe", label(BUDGET_LABELS, budget)],
      ["Zaman Çizelgesi", label(TIMELINE_LABELS, timeline)],
    ];

    if (scopeText) {
      rows.push(["Kapsam", scopeText]);
    }
    if (address) {
      rows.push(["Adres", address]);
    }
    if (notes) {
      rows.push(["Notlar", notes]);
    }

    const detailRows = rows
      .map(
        ([lbl, val]) =>
          `<tr>
            <td style="padding:10px 14px;font-size:13px;color:#888;white-space:nowrap;border-bottom:1px solid #f0f0f0;font-weight:600;">${lbl}</td>
            <td style="padding:10px 14px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">${val}</td>
          </tr>`
      )
      .join("");

    const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg, #166534 0%, #15803d 100%);padding:32px 28px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;font-weight:700;">🌿 Teklif Talebiniz Alındı!</h1>
        <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Merhaba ${fullName || "Değerli Müşterimiz"},</p>
      </div>
      
      <!-- Body -->
      <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        
        <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px;">
          Teklif talebiniz <strong>${today}</strong> tarihinde başarıyla oluşturuldu. 
          Bölgenizdeki uygun peyzaj firmaları talebinizi inceleyecek ve sizinle iletişime geçecektir. 
          İşte talebinizin özeti:
        </p>
        
        <!-- Detail Table -->
        <div style="background:#fafafa;border-radius:10px;overflow:hidden;border:1px solid #f0f0f0;margin-bottom:24px;">
          <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            <tbody>
              ${detailRows}
            </tbody>
          </table>
        </div>
        
        <!-- Info Box -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
            <strong>📞 Sırada Ne Var?</strong><br/>
            Bölgenizdeki profesyonel peyzaj firmaları talebinizi görecek ve sizi arayarak fiyat teklifi sunacaktır. 
            Genellikle 1 saat içerisinde dönüş yapılacaktır.
          </p>
        </div>

        <p style="color:#999;font-size:12px;line-height:1.5;margin:0;">
          Bu e-posta peyzajbul.com üzerinden oluşturduğunuz teklif talebinin özetidir. 
          Herhangi bir sorunuz varsa <a href="mailto:destek@peyzajbul.com" style="color:#16a34a;">destek@peyzajbul.com</a> adresinden bize ulaşabilirsiniz.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="text-align:center;padding:16px;color:#bbb;font-size:11px;">
        © 2026 Peyzajbul — Türkiye'nin Peyzaj Firma Rehberi
      </div>
    </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Peyzajbul <noreply@peyzajbul.com>",
        to: [email],
        subject: `Teklif Talebiniz Alındı — ${label(SERVICE_LABELS, serviceType)} | Peyzajbul`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      // Domain doğrulanmamışsa bile hata fırlatma, lead zaten oluşturuldu
      return new Response(JSON.stringify({ success: false, warning: "E-posta gönderilemedi ama talebiniz oluşturuldu." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-lead-confirmation error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
