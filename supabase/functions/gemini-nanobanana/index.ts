import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Supabase üzerinde GEMINI_API_KEY tanımlanmamış.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tip, mod, stil, adet, aiSeviye, aiEtiket, aiAciklama, ozelTalimat, foto } = await req.json();

    console.log(`[gemini-nanobanana] Generating image-rich design for ${tip}`);

    let parts = [];
    
    // Detailed prompt for image generation + description
    const promptText = `Sen dünyanın en iyi peyzaj mimarısın. Şu verilere göre ${adet} adet büyüleyici, gerçekçi ve ilham verici bahçe tasarımı görseli OLUŞTUR ve her biri için kısa bir açıklama YAP:
Bahçe tipi: ${tip}
Mod: ${mod}
Tasarım stili: ${stil}
AI müdahalesi: ${aiEtiket} — ${aiAciklama}
${ozelTalimat ? `Özel talimatlar: ${ozelTalimat}` : ""}
${foto ? "Ekteki bahçe fotoğrafını referans alarak bu alanı hayal edilen stile dönüştür." : ""}

Her tasarım için:
1. Yüksek kaliteli, fotogerçekçi bir görsel üret.
2. Görselin altında konsept adını ve projenin vizyonunu (2-3 cümle) ekle.
3. Kullanılan 3 ana bitki ismini belirt.

Yanıtın hem görseli (inlineData) hem de metin kısımlarını içermeli. Samimi ve profesyonel bir dil kullan.`;

    parts.push({ text: promptText });

    if (foto) {
      const base64Data = foto.includes(',') ? foto.split(',')[1] : foto;
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      });
    }

    // Using the user-suggested model for image preview
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API Error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: `Gemini API hatası: ${data.error?.message || 'Bilinmeyen hata'}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidates = data.candidates?.[0]?.content?.parts || [];
    let textContent = "";
    let images = [];

    for (const part of candidates) {
      if (part.text) {
        textContent += part.text;
      } else if (part.inline_data || part.inlineData) {
        const imgData = part.inline_data?.data || part.inlineData?.data;
        if (imgData) images.push(imgData);
      }
    }

    return new Response(JSON.stringify({ content: textContent || "Tasarım hazırlandı.", images }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[gemini-nanobanana] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
