// Haiku ile firma açıklaması üretir. Kullanım:
//   ANTHROPIC_API_KEY=... node scripts/firm-import/describe-haiku.mjs <firms.json> [--limit 50] [--model claude-haiku-5-5]
// Girdi dosyasındaki her firmaya `aciklama` ekler (yarıda kesilirse kaldığı yerden devam eder).
// Yalnızca verilen gerçekleri (ad, il/ilçe, hizmetler) kullanır; Google puanı, telefon, adres, kuruluş yılı vb. YAZILMAZ.
import fs from "node:fs";

const file = process.argv[2];
if (!file) { console.error("Kullanım: node describe-haiku.mjs <firms.json> [--limit N]"); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const LIMIT = Number(arg("--limit", 0)) || Infinity;
const MODEL = arg("--model", "claude-haiku-5-5");
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("ANTHROPIC_API_KEY ortam değişkeni yok."); process.exit(1); }

const BATCH = 10, CONCURRENCY = 4;
const BANNED = /en iyi|bir numaralı|lider|garanti|uzman kadro|deneyimli|yıllık|tecrübe|kaliteli|müşteri memnuniyeti|%\d|sertifika|ödüllü|güvenilir|profesyonel ekip/i;

const firms = JSON.parse(fs.readFileSync(file, "utf8"));
const todo = firms.map((f, i) => [f, i]).filter(([f]) => !f.aciklama).slice(0, LIMIT);
console.log(`${firms.length} firma, ${todo.length} açıklama yazılacak, model ${MODEL}`);

const SYSTEM = `Sen Türkiye peyzaj firmaları rehberi için kısa, tarafsız firma tanıtım metinleri yazan bir editörsün.
Kurallar:
- Her firma için 2-3 cümle, toplam 200-320 karakter, Türkçe, üçüncü tekil şahıs ("... firmasıdır", "... alanlarında hizmet verir").
- SADECE verilen bilgileri kullan: firma adı, il/ilçe, hizmet alanları. Başka hiçbir bilgi uydurma (kuruluş yılı, ekip büyüklüğü, sertifika, referans, fiyat, kalite iddiası YOK).
- Övgü ve üstünlük ifadeleri yasak: "en iyi", "lider", "uzman kadro", "deneyimli", "kaliteli", "profesyonel", "güvenilir", "garantili".
- Telefon, adres, web sitesi, puan yazma. Firma adını doğru yaz.
- Her firmanın metni birbirinden farklı cümle yapısında olsun; aynı kalıbı tekrar etme.
- Çıktı yalnızca JSON dizisi: [{"i":<id>,"t":"<metin>"}, ...] — girdideki her id için bir öğe.`;

let noThinkingOff = false;
async function call(batch) {
  const payload = batch.map(([f], k) => ({ i: k, ad: f.firma_adi, il: f.il, ilce: f.ilce, hizmetler: f.hizmetler }));
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 16000, ...(noThinkingOff ? {} : { thinking: { type: "disabled" } }), system: SYSTEM, messages: [{ role: "user", content: JSON.stringify(payload) }] }),
    });
    if (res.status === 429 || res.status >= 500) { console.error(`  API ${res.status}, yeniden deneniyor (${attempt + 1}/4)`); await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
    if (res.status === 400 && !noThinkingOff) { const t = await res.text(); if (/thinking/i.test(t)) { noThinkingOff = true; continue; } throw new Error(`API 400: ${t.slice(0, 200)}`); }
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    const text = (j.content ?? []).filter(b => b.type === "text").map(b => b.text).join("\n");
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) { console.error("  Yanıtta JSON yok. stop_reason=" + j.stop_reason + " blok tipleri=" + (j.content ?? []).map(b => b.type).join(",") + " metin:", JSON.stringify(text.slice(0, 300))); continue; }
    try { return JSON.parse(m[0]); } catch { console.error("  JSON çözülemedi:", m[0].slice(0, 200)); continue; }
  }
  return [];
}

let done = 0, rejected = 0, idx = 0;
const batches = [];
for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
const save = () => fs.writeFileSync(file, JSON.stringify(firms, null, 1));

async function worker() {
  while (idx < batches.length) {
    const batch = batches[idx++];
    const out = await call(batch);
    for (const o of out) {
      const target = batch[o.i];
      const t = (o.t ?? "").trim();
      if (!target || t.length < 80 || t.length > 420 || BANNED.test(t) || /\d{4,}/.test(t)) { rejected++; continue; }
      target[0].aciklama = t; done++;
    }
    if ((idx % 5) === 0) { save(); console.log(`  ${done} yazıldı, ${rejected} reddedildi (kural dışı), ${Math.min(idx * BATCH, todo.length)}/${todo.length} işlendi`); }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
save();
console.log(`Bitti: ${done} açıklama yazıldı, ${rejected} reddedildi. Reddedilenler için komutu tekrar çalıştır (kalanlara devam eder).`);
