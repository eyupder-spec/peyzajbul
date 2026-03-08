import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const { chat_id, firm_name, service_type, city, district, budget, project_size, timeline, lead_score } = await req.json();

    if (!chat_id) {
      throw new Error('chat_id is required');
    }

    const scoreEmoji = (lead_score ?? 0) >= 70 ? '🔥' : (lead_score ?? 0) >= 50 ? '⚡' : '📋';
    const districtText = district ? ` / ${district}` : '';

    const message = `${scoreEmoji} *Yeni Lead Bildirimi!*

🏢 *${firm_name}* için yeni bir talep geldi:

📌 *Hizmet:* ${service_type}
📍 *Konum:* ${city}${districtText}
💰 *Bütçe:* ${budget}
📐 *Alan:* ${project_size} m²
⏰ *Zaman:* ${timeline}
📊 *Lead Skoru:* ${lead_score ?? 0}/100

👉 Detayları görmek ve iletişim bilgilerini açmak için panele giriş yapın.`;

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
  } catch (error: unknown) {
    console.error('Error sending Telegram notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
