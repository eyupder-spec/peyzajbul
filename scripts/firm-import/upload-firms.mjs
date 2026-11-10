// Firmaları Supabase REST API ile yükler. Varsayılan DRY-RUN; yazmak için --apply.
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... UPLOAD_USER_ID=<admin user uuid> \
//   node scripts/firm-import/upload-firms.mjs <firms.json> [--apply] [--limit 100] [--require-description]
// Güvenlik: servis anahtarı yalnızca ortam değişkeninden okunur (komut satırına/sohbete yazma). Önce STAGING'de dene.
// Çalıştırmadan hemen önce canlıdaki firmaları yeniden okur; telefon (son 10 hane), web alan adı ve ad+il ile mükerrer eler.
// Tekrar çalıştırmak güvenlidir (zaten yüklenenler mükerrer sayılıp atlanır).
import fs from "node:fs";
import crypto from "node:crypto";

const file = process.argv[2];
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes("--apply");
const LIMIT = Number(arg("--limit", 0)) || Infinity;
const NEED_DESC = process.argv.includes("--require-description");
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY, UPLOAD_USER_ID } = process.env;
if (!file || !SUPABASE_URL || !KEY || !UPLOAD_USER_ID) { console.error("Eksik: dosya, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ya da UPLOAD_USER_ID"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" };
const fold = s => (s ?? "").replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase().replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const phoneKey = p => { const d = (p ?? "").replace(/\D/g, ""); return d.length >= 10 ? d.slice(-10) : null; };
const domain = u => { const d = (u ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?]/)[0]; return d && d.includes(".") && !d.includes("xxxx") ? d : null; };
const slugify = (name, id) => `${fold(name).replace(/ /g, "-")}-${id.slice(0, 8)}`.replace(/^-+/, "");

async function existing() {
  const all = [];
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/firms?select=company_name,phone,website,city&order=created_at&offset=${off}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(`firms okunamadı: ${r.status}`);
    const j = await r.json(); all.push(...j); if (j.length < 1000) break;
  }
  return all;
}

const rows = JSON.parse(fs.readFileSync(file, "utf8"));
const ex = await existing();
const phones = new Set(ex.map(e => phoneKey(e.phone)).filter(Boolean));
const doms = new Set(ex.map(e => domain(e.website)).filter(Boolean));
const names = new Set(ex.map(e => `${fold(e.company_name)}|${fold(e.city)}`));
console.log(`Canlıda ${ex.length} firma var. Dosyada ${rows.length} aday.`);

const fresh = [];
let dup = 0, noDesc = 0;
for (const r of rows) {
  const pk = phoneKey(r.telefon_norm || r.telefon), dm = domain(r.website), nk = `${fold(r.firma_adi)}|${fold(r.il)}`;
  if ((pk && phones.has(pk)) || (dm && doms.has(dm)) || names.has(nk)) { dup++; continue; }
  if (NEED_DESC && !r.aciklama) { noDesc++; continue; }
  if (pk) phones.add(pk);
  if (dm) doms.add(dm);
  names.add(nk);
  fresh.push(r);
}
const batch = fresh.slice(0, LIMIT);
console.log(`Mükerrer elendi: ${dup}${NEED_DESC ? `, açıklamasız atlandı: ${noDesc}` : ""}. Yüklenecek: ${batch.length}.`);
if (!APPLY) { console.log("DRY-RUN: hiçbir şey yazılmadı. Yazmak için --apply ekle."); console.log(batch.slice(0, 3)); process.exit(0); }

let ok = 0, fail = 0, provFail = 0;
for (let i = 0; i < batch.length; i += 100) {
  const chunk = batch.slice(i, i + 100).map(r => {
    const id = crypto.randomUUID();
    return {
      row: { id, slug: slugify(r.firma_adi, id), user_id: UPLOAD_USER_ID, company_name: r.firma_adi, phone: r.telefon_norm || r.telefon, email: null,
        city: r.il, district: r.ilce || null, address: r.adres || null, website: r.website || null, description: r.aciklama || null,
        services: (r.hizmetler || "").split(",").map(s => s.trim()).filter(Boolean), is_approved: true, is_active: true },
      prov: { firm_id: id, source_type: "csv", source_url: r.maps || null, scraped_at: new Date().toISOString(), imported_by: UPLOAD_USER_ID, note: "kurtarilan_peyzaj_10kasim.xlsx (Google Maps)" },
    };
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/firms`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(chunk.map(c => c.row)) });
  if (!res.ok) { fail += chunk.length; console.error(`Parti ${i / 100 + 1} hata ${res.status}: ${(await res.text()).slice(0, 200)}`); continue; }
  ok += chunk.length;
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/firm_provenance`, { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(chunk.map(c => c.prov)) });
  if (!pr.ok) provFail += chunk.length;
  console.log(`  ${ok}/${batch.length} yüklendi`);
}
console.log(`Bitti: ${ok} firma yüklendi, ${fail} hata${provFail ? `, ${provFail} kaynak kaydı yazılamadı (firm_provenance tablosu yoksa normal)` : ""}.`);
