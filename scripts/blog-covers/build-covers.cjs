// Blog kapakları: sitenin mevcut kapak fotoğraflarından konuya uygun olanı arka plan yapar, başlığı ve peyzajbul.com rozetini ekler.
//   node scripts/blog-covers/build-covers.cjs <taslak-klasörü> <çıktı-klasörü> <kaynak-foto-klasörü>
// Çıktı: <çıktı>/<slug>.webp (1200x630). Başlık metadata.json içindeki title alanından gelir.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const [, , DRAFTS, OUT, SRC] = process.argv;
if (!DRAFTS || !OUT || !SRC) { console.error("Kullanım: node build-covers.cjs <taslaklar> <çıktı> <kaynak-foto>"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

// yeni yazı slug'ı -> arka plan olarak kullanılacak mevcut kapak (kaynak klasördeki .webp)
const SOURCE = {
  "istanbul-villa-bahce-peyzaj-maliyeti-2026": "villa-ve-konut-bahcesi-tasarim-rehberi-luks-bahce-projelerinde-7-kritik-madde",
  "ankara-peyzaj-maliyeti-ve-karasal-iklim-bahce-rehberi": "minimum-bakim-maksimum-prestij-kseriskap-kurakcil-peyzaj-ile-kusursuz-bahceler",
  "bursa-bahce-peyzaj-rehberi-ova-ve-uludag-eteklerinde": "izmir-de-villa-peyzaji-yaptirmak-ne-kadar-detayli-fiyat-analizi",
  "sapanca-ve-kocaeli-yazlik-bahce-peyzaji": "bahce-aydinlatma-rehberi-tasarim-teknoloji-ve-uygulama-ipuclari",
  "bahce-duzenleme-fiyatlari-2026-m2-maliyet-rehberi": "gelecegin-bahceleri-2026-peyzaj-tasarim-trendleri-ve-ilham-veren-fikirler",
  "peyzaj-teklifi-nasil-okunur-firma-tekliflerini-karsilastirma": "2026-nin-en-iyi-peyzaj-firmalari-profesyonel-peyzaj-sirketleri-rehberi",
  "villa-bahce-bakimi-aylik-fiyat-ve-sozlesme-rehberi": "bahcede-mahremiyet-sorunu-bitiyor-gurultu-ve-bakislari-kesen-5-bitki-duvari",
  "otomatik-sulama-sistemi-kurulumu-sahada-yapilan-hatalar": "otomatik-sulama-sistemleri-fiyatlari-2026-guncel-maliyet-rehberi-ve-analizi",
  "rulo-cim-mi-tohum-mu-maliyet-zamanlama-ve-bakim": "kusursuz-bir-bahce-icin-rulo-cim-rehberi-secim-uygulama-ve-bakim-ipuclari",
  "bahce-drenaji-ve-toprak-hazirligi-peyzajin-gorunmeyen-isleri": "bahceniz-kisa-hazir-mi-sonbaharda-yapilacak-10-is",
  "peyzaj-agaci-secimi-kok-golge-ve-iklim-bolgesine-gore-rehber": "meyve-agaclari-ile-hem-golge-hem-verim-bahceniz-icin-en-iyi-turler",
  "site-ve-apartman-peyzaj-bakimi-sozlesmesi-yonetici-rehberi": "dikey-bahce-fiyatlari-ve-en-iyi-tasarim-fikirleri-2026",
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Yaklaşık karakter genişliğine göre satırlara böler (Georgia bold ≈ 0.56 em). */
function wrap(text, fontSize, maxWidth, maxLines) {
  const per = fontSize * 0.56;
  const maxChars = Math.floor(maxWidth / per);
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.length <= maxLines ? lines : null;
}

async function cover(slug, meta) {
  const srcName = SOURCE[slug];
  const srcFile = srcName && path.join(SRC, srcName + ".webp");
  if (!srcFile || !fs.existsSync(srcFile)) throw new Error("kaynak foto yok: " + slug);
  const W = 1200, H = 630;
  // Eski kapaklarda üst/alt bantlarda baskılı başlık yazısı var: yalnızca sağ-orta (yazısız) bölgeyi kullan.
  const meta0 = await sharp(srcFile).metadata();
  const cw = Math.round(meta0.width * 0.62), ch = Math.round(cw / (W / H));
  const cropLeft = meta0.width - cw, cropTop = Math.min(meta0.height - ch, Math.round(meta0.height * 0.22));
  const base = await sharp(srcFile).extract({ left: cropLeft, top: cropTop, width: cw, height: ch }).resize(W, H).toBuffer();

  // başlığı sığdırana kadar yazı boyutunu küçült
  let size = 64, lines = null;
  while (!lines && size >= 42) { lines = wrap(meta.title, size, 760, 4); if (!lines) size -= 3; }
  if (!lines) throw new Error("başlık çok uzun: " + meta.title);
  const lh = Math.round(size * 1.18);
  const textH = lines.length * lh;
  const top = Math.round((H - textH) / 2) - 10;
  const tspans = lines.map((l, i) => `<tspan x="70" y="${top + size + i * lh}">${esc(l)}</tspan>`).join("");

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0f241b" stop-opacity="1"/>
      <stop offset="0.58" stop-color="#0f241b" stop-opacity="0.96"/>
      <stop offset="0.80" stop-color="#0f241b" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#0f241b" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="70" y="${top - 46}" width="190" height="34" rx="17" fill="#a64826"/>
  <text x="165" y="${top - 23}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="15" letter-spacing="2" fill="#ffffff">PEYZAJBUL REHBER</text>
  <text font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${size}" fill="#ffffff">${tspans}</text>
  <rect x="70" y="${H - 104}" width="64" height="4" rx="2" fill="#a64826"/>
  <g transform="translate(70 ${H - 84})">
    <path d="M4 30 C4 12 16 2 34 2 C34 20 24 32 6 32 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M6 30 L26 10" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    <text x="50" y="27" font-family="Georgia, serif" font-weight="700" font-size="34" fill="#ffffff">peyzajbul.com</text>
  </g>
</svg>`;
  const out = path.join(OUT, slug + ".webp");
  await sharp(base).composite([{ input: Buffer.from(svg) }]).webp({ quality: 84 }).toFile(out);
  return out;
}

(async () => {
  const slugs = fs.readdirSync(DRAFTS).filter((d) => fs.existsSync(path.join(DRAFTS, d, "metadata.json")));
  for (const slug of slugs) {
    const meta = JSON.parse(fs.readFileSync(path.join(DRAFTS, slug, "metadata.json"), "utf8"));
    try { console.log("ok  ", (await cover(slug, meta)).split(/[\\/]/).pop()); } catch (e) { console.log("HATA", slug, e.message); }
  }
})();
