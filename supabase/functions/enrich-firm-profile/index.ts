import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('Supabase üzerinde GEMINI_API_KEY tanımlanmamış.');
    }

    const { firmId } = await req.json();
    if (!firmId) {
      throw new Error('Firm ID eksik.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the firm to get its details
    const { data: firm, error: firmError } = await supabaseAdmin
      .from('firms')
      .select('company_name, city, district, services')
      .eq('id', firmId)
      .single();

    if (firmError || !firm) {
      throw new Error(`Firma bulunamadı: ${firmError?.message}`);
    }

    // Build the prompt for Gemini
    const hizmetlerText = firm.services && firm.services.length > 0
      ? firm.services.join(', ')
      : 'Peyzaj tasarımı, bahçe bakımı ve genel peyzaj uygulamaları';
    const sehirText = firm.city || 'Türkiye';
    const ilceText = firm.district ? `${firm.district}, ` : '';

    const promptText = `
Sen profesyonel bir marka hikayesi yazarı ve peyzaj uzmanısın. Bize "${firm.company_name}" adlı, ${ilceText}${sehirText}'de bulunan ve ${hizmetlerText} alanında çalışan peyzaj firması için 100-200 kelimelik, müşteriye güven veren, profesyonel bir "Hakkımızda" kurumsal açıklaması yaz.

KRİTİK KURALLAR (ÖZGÜNLÜK ŞARTTI):
1. Kesinlikle başlık atma (örnek: "Açıklama:" gibi ifadeler kullanma), direkt metne başla.
2. Metni DÜMDÜZ BİR BLOK YERİNE 2 veya 3 KISA PARAGRAFA BÖL. Okunması kolay boşluklu bir yapı sun.
3. Bu platformda yüzlerce firma var; senin yazdığın bu metin DİĞERLERİNDEN TAMAMEN FARKLI OLMALI. Klişe peyzaj cümleleri (örn: "Doğayı yaşam alanınıza taşıyoruz", "Yeşilin her tonu" vb.) KULLANMA.
4. Firmanın ismine ve bulunduğu şehre/ilçeye özel bir kimlik yarat. Kimi zaman modern ve yenilikçi, kimi zaman köklü ve güvenilir bir dil seçerek her üretimde rastgele farklı bir marka tonu (tone of voice) kullan. Sayfadaki diğer AI metinlerine benzememesi için cümle yapılarını ve kelime dağarcığını zengin tut.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Gemini API hatası: ${data.error?.message || 'Bilinmeyen hata'}`);
    }

    const candidates = data.candidates?.[0]?.content?.parts || [];
    let generatedText = "";

    for (const part of candidates) {
      if (part.text) {
        generatedText += part.text;
      }
    }

    generatedText = generatedText.trim();
    if (!generatedText) {
      throw new Error('Yapay zeka metin üretemedi.');
    }

    // Update the local database
    const { error: updateError } = await supabaseAdmin
      .from('firms')
      .update({ description: generatedText })
      .eq('id', firmId);

    if (updateError) {
      throw new Error(`Açıklama kaydedilirken veritabanı hatası: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, description: generatedText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[enrich-firm-profile] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message, isDetailedError: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
