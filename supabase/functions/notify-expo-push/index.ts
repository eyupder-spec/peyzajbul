import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { expo_push_token, type, title, body, data: customData } = payload;

    if (!expo_push_token) {
      throw new Error('expo_push_token is required');
    }

    let messageTitle = title;
    let messageBody = body;
    let messageData = customData || {};

    // Varsayılan tipler için otomatik mesaj oluşturma (isteğe bağlı)
    if (type === 'lead_new' && !title) {
      const { service_type, city, district, lead_score } = payload;
      const scoreEmoji = (lead_score ?? 0) >= 70 ? '🔥' : (lead_score ?? 0) >= 50 ? '⚡' : '📋';
      const districtText = district ? ` / ${district}` : '';
      messageTitle = `${scoreEmoji} Yeni İş Fırsatı!`;
      messageBody = `${city}${districtText} bölgesinde yeni bir ${service_type} talebi sizin için eşleşti. Hemen inceleyin!`;
      messageData = { ...messageData, url: 'peyzajbul://leadler' };
    } else if (type === 'low_balance' && !title) {
      messageTitle = '⚠️ Düşük Bakiye Uyarısı';
      messageBody = 'Jeton bakiyeniz azaldı. Yeni iş tekliflerini kaçırmamak için bakiye yükleyebilirsiniz.';
      messageData = { ...messageData, url: 'peyzajbul://profile' };
    } else if (type === 'lead_approved' && !title) {
      messageTitle = '✅ Teklif Talebiniz Onaylandı';
      messageBody = 'Talebiniz pazar yerine düştü. Firmalar sizinle en kısa sürede iletişime geçecektir.';
      messageData = { ...messageData, url: 'peyzajbul://taleplerim' };
    }

    const message = {
      to: expo_push_token,
      sound: 'default',
      title: messageTitle || 'Peyzajbul Bildirimi',
      body: messageBody || 'Yeni bir güncelleme var.',
      data: messageData,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const resultData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Expo API error: ${JSON.stringify(resultData)}`);
    }

    return new Response(JSON.stringify({ success: true, resultData }), {
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

