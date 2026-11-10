// node scripts/blog/make-sql.cjs <taslak-klasörü> <çıktı-klasörü> [günlük-adet=3]
// blog_posts için: tek ekleme SQL'i (hepsi taslak) + gün gün yayın SQL'leri. ORDER=slug1,slug2 ile yayın sırası verilebilir.
const fs = require("fs"), path = require("path");
const [, , DRAFTS, OUT, PER] = process.argv;
const perDay = Number(PER) || 3;
fs.mkdirSync(OUT, { recursive: true });
const BASE = "https://www.peyzajbul.com/images/blog/";
const q = (s) => "'" + String(s ?? "").replace(/'/g, "''") + "'";
const order = (process.env.ORDER || "").split(",").filter(Boolean);
let slugs = fs.readdirSync(DRAFTS).filter((d) => fs.existsSync(path.join(DRAFTS, d, "metadata.json")) && fs.existsSync(path.join(DRAFTS, d, "content.html")));
if (order.length) slugs = order.filter((s) => slugs.includes(s)).concat(slugs.filter((s) => !order.includes(s)));
const rowFor = (slug, published) => {
  const m = JSON.parse(fs.readFileSync(path.join(DRAFTS, slug, "metadata.json"), "utf8"));
  const html = fs.readFileSync(path.join(DRAFTS, slug, "content.html"), "utf8").trim();
  if (html.includes("$body$")) throw new Error("içerikte $body$ var: " + slug);
  return `  (${q(m.title)}, ${q(slug)}, ${q(m.excerpt)}, $body$${html}$body$, ${q(BASE + slug + ".webp")}, ${q(m.cover_image_alt)}, ${q(m.category_slug)}, ${m.city_slug ? q(m.city_slug) : "null"}, ${q(m.author_name || "Peyzajbul")}, ${published ? "true" : "false"}, ${published ? "now()" : "null"})`;
};
const rows = slugs.map((slug) => rowFor(slug, false));
const header = `-- Peyzajbul: ${slugs.length} yeni blog yazısı (hepsi TASLAK olarak eklenir; yayın gün gün yapılır).
-- Önce kapak görselleri sitede yayında olmalı (public/images/blog/*.webp, main'e deploy).
-- slug çakışırsa satır atlanır (on conflict do nothing).
`;
fs.writeFileSync(path.join(OUT, "00-yazilari-ekle-taslak.sql"), header + `insert into public.blog_posts
  (title, slug, excerpt, content, cover_image_url, cover_image_alt, category_slug, city_slug, author_name, is_published, published_at)
values
${rows.join(",\n")}
on conflict (slug) do nothing;
`);
for (let d = 0; d * perDay < slugs.length; d++) {
  const list = slugs.slice(d * perDay, d * perDay + perDay);
  // Tek adım: o günün yazılarını doğrudan YAYINDA ekler (taslak dosyasına gerek kalmaz).
  fs.writeFileSync(path.join(OUT, `gun-${String(d + 1).padStart(2, "0")}-ekle-ve-yayinla.sql`),
    `-- Gün ${d + 1}: ${list.length} yazıyı ekler ve hemen yayınlar (slug varsa atlanır).\ninsert into public.blog_posts\n  (title, slug, excerpt, content, cover_image_url, cover_image_alt, category_slug, city_slug, author_name, is_published, published_at)\nvalues\n${list.map((sl) => rowFor(sl, true)).join(",\n")}\non conflict (slug) do nothing;\n`);
  fs.writeFileSync(path.join(OUT, `gun-${String(d + 1).padStart(2, "0")}-yayinla.sql`),
    `-- Gün ${d + 1}: ${list.length} yazıyı yayınla\nupdate public.blog_posts set is_published = true, published_at = now() where slug in (${list.map(q).join(", ")});\n` +
    list.map((s) => `-- ${s}`).join("\n") + "\n");
}
console.log(slugs.length + " yazı, " + Math.ceil(slugs.length / perDay) + " günlük yayın dosyası");
