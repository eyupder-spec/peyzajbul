const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.peyzajbul.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const { chat_id, firm_name, service_type, city, district, budget, project_size, area_size, timeline, lead_score } = await req.json();

    if (!chat_id) {
      throw new Error('chat_id is required');
    }

    const areaValue = area_size || project_size || '-';
    const scoreEmoji = (lead_score ?? 0) >= 70 ? '🔥' : (lead_score ?? 0) >= 50 ? '⚡' : '📋';
    const districtText = district ? ` / ${district}` : '';

    const message = `${scoreEmoji} *Yeni Müşteri Adayı!*
\n🏢 *${firm_name}* için yeni bir talep geldi:
\n📌 *Hizmet:* ${service_type}\n📍 *Konum:* ${city}${districtText}\n💰 *Bütçe:* ${budget}\n📐 *Alan:* ${areaValue} m²\n⏰ *Zaman:* ${timeline}\n📊 *Aday Skoru:* ${lead_score ?? 0}/100
\n👉 Detayları görmek ve iletişim bilgilerini açmak için panele giriş yapın:
🔗 https://www.peyzajbul.com/firma/giris`;

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Telegram API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
