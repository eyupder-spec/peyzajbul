/// <reference lib="deno.ns" />

/**
 * Writes a firm's "Hakkımızda" description with Gemini and saves it to firms.description.
 *
 * Auth: admins only (requireAdmin); authentication failures answer 401/403.
 * Failures while generating or saving the text keep the historical shape
 * HTTP 200 + {success:false, error, isDetailedError:true}, because the admin
 * panel shows data.error to the admin.
 * Secrets: GEMINI_API_KEY.
 */

import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { readJson, serveSecure } from "../_shared/http.ts";
import { clampText, isUuid } from "../_shared/security.ts";

serveSecure(async (req) => {
  const { admin } = await requireAdmin(req);

  const body = await readJson(req);
  const firmId = body.firmId;
  if (!isUuid(firmId)) {
    throw new HttpError(400, 'Geçersiz firma kimliği.');
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('Supabase üzerinde GEMINI_API_KEY tanımlanmamış.');
    }

    // Fetch the firm to get its details
    const { data: firm, error: firmError } = await admin
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

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      }),
      signal: AbortSignal.timeout(60000),
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

    generatedText = clampText(generatedText, 2000);
    if (!generatedText) {
      throw new Error('Yapay zeka metin üretemedi.');
    }

    // Update the local database
    const { error: updateError } = await admin
      .from('firms')
      .update({ description: generatedText })
      .eq('id', firmId);

    if (updateError) {
      throw new Error(`Açıklama kaydedilirken veritabanı hatası: ${updateError.message}`);
    }

    return { success: true, description: generatedText };
  } catch (error) {
    console.error('[enrich-firm-profile] Error:', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return { success: false, error: message, isDetailedError: true };
  }
});
