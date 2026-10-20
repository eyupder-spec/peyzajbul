import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CostEstimator } from "@/components/calculator";
import { CALCULATOR_PATH, LEAD_FORM_PATH, formatTry, formatTryRange, parseCalculatorPreset } from "@/components/calculator/calcOptions";
import { getCityBySlug } from "@/lib/cities";
import {
  CITY_FACTOR_GROUPS,
  PRICE_BENCHMARKS_UPDATED_AT,
  PRICE_BENCHMARKS_UPDATED_LABEL,
  PRICE_METHOD_SOURCES_LABEL,
  REFERENCE_GROUPS,
  TIER_FACTORS,
  UNPRICED_REFERENCE_ITEMS,
  computeEstimate,
} from "@/lib/priceBenchmarks";

const SITE_URL = "https://www.peyzajbul.com";
const PAGE_URL = `${SITE_URL}${CALCULATOR_PATH}`;
const TITLE = "Bahçe Düzenleme Maliyet Hesaplama 2026 | Peyzajbul";
const DESCRIPTION =
  "Metrekare, il ve kalite seviyesine göre bahçe düzenleme, sulama ve sert zemin için Ekim 2026 editoryal tahmin aralığı. Bağlayıcı teklif değildir; kesin fiyat keşifle netleşir.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CALCULATOR_PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CALCULATOR_PATH,
    siteName: "Peyzajbul",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Peyzajbul bahçe düzenleme maliyet hesaplama" }],
  },
};

const LARGE_CITY_SLUGS = ["istanbul", "ankara", "izmir", "bursa", "antalya", "konya"];

const TIER_ROWS = [
  { label: "Ekonomik", factor: TIER_FACTORS.ekonomik },
  { label: "Standart", factor: TIER_FACTORS.standart },
  { label: "Premium", factor: TIER_FACTORS.premium },
];

function formatFactor(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MaliyetHesaplaPage({ searchParams }: { searchParams: PageSearchParams }) {
  const preset = parseCalculatorPreset(await searchParams);

  const sample = computeEstimate({
    service: "bahce-tasarimi",
    areaM2: 200,
    citySlug: "izmir",
    tier: "standart",
    addOns: ["cim-ekimi", "bitki-agac-dikimi", "sulama-sistemi"],
  });
  const sampleRange = sample ? formatTryRange(sample.minTry, sample.maxTry) : "";

  const faqs = [
    {
      question: "Bahçe düzenleme m² fiyatı ne kadar?",
      answer: `Tek bir m² fiyatı yoktur; kapsam, il, malzeme kalitesi ve alan büyüklüğüne göre değişir. Örnek: standart kalitede, çim ekimi, bitkilendirme ve sulama içeren 200 m² bir bahçe için hesaplayıcı İzmir'de yaklaşık ${sampleRange} aralığı verir. Kendi bahçeniz için yukarıdaki hesaplayıcıyı kullanın.`,
    },
    {
      question: "Neden tek rakam değil de aralık veriyorsunuz?",
      answer:
        "Kullandığımız kaynaklar birbirinden farklı fiyatlar içeriyor ve gerçek maliyet zemin durumu, bitki boyu, malzeme markası ve firmaya göre değişiyor. Tek bir rakam vermek yanıltıcı olurdu; bu yüzden kaynaklardaki en düşük ve en yüksek değerleri kapsayan bir aralık gösteriyoruz.",
    },
    {
      question: "Bu rakamlar gerçek firma tekliflerinden mi geliyor?",
      answer: `Hayır. Rakamlar Peyzajbul rehber yazılarındaki fiyat bilgilerinden ve 2026 piyasa gözlemlerinden türetilmiş editoryal tahminlerdir; teklif verisi değildir. Yeterli sayıda gerçek teklif biriktiğinde oranlar yeniden kalibre edilecek ve bu sayfada belirtilecektir. Son güncelleme: ${PRICE_BENCHMARKS_UPDATED_LABEL}.`,
    },
    {
      question: "Hesaplamaya hangi işler dahil değil?",
      answer: `Pergola/kameriye, çit ve sınır düzenleme ve su öğesi için kaynaklı bir fiyat aralığı olmadığından toplama eklenmez; keşifle netleşir. Ahşap deck, beton baskı, çakıl/granit, periyodik bahçe bakımı ve havuz çevresi de fiyatlandırılmaz. Proje/çizim bedeli ve keşifte ortaya çıkabilecek ek işler de hesaba katılmaz.`,
    },
    {
      question: "İl ve kalite seviyesi fiyatı nasıl etkiler?",
      answer: `İl grubuna göre katsayı uygulanır: ${CITY_FACTOR_GROUPS.map((group) => `${group.label} ×${formatFactor(group.factor)}`).join(", ")}. Kalite seviyesi için Ekonomik ×${formatFactor(TIER_FACTORS.ekonomik)}, Standart ×${formatFactor(TIER_FACTORS.standart)}, Premium ×${formatFactor(TIER_FACTORS.premium)} kullanılır. Büyük alanlarda metrekare başı maliyet düştüğü için ayrıca bir alan büyüklüğü katsayısı uygulanır.`,
    },
    {
      question: "Kesin fiyatı nasıl öğrenirim?",
      answer:
        "Kesin fiyat ancak keşif sonrasında firmadan alınabilir. Peyzajbul aracıdır; fiyat ve sözleşme doğrudan sizinle firma arasındadır. Ücretsiz teklif formunu doldurduğunuzda talebiniz, doğrulama ve kontrolden sonra bölgenizdeki uygun firmalara iletilir.",
    },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Bahçe Düzenleme Maliyet Hesaplama", item: PAGE_URL },
    ],
  };
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": PAGE_URL,
    url: PAGE_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "tr",
    dateModified: PRICE_BENCHMARKS_UPDATED_AT,
    isPartOf: { "@type": "WebSite", name: "Peyzajbul", url: SITE_URL },
  };
  const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(webPageJsonLd) }} />
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-24">
          <header className="border-b border-border bg-secondary/50">
            <div className="container py-10 md:py-14">
              <p className="mb-3 text-sm font-semibold text-primary">{PRICE_BENCHMARKS_UPDATED_LABEL} editoryal tahmin</p>
              <h1 className="max-w-3xl font-display text-primary">Bahçe Düzenleme Maliyet Hesaplama</h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Alanı, ili ve kalite seviyesini seçin; bahçe düzenleme, sulama sistemi veya sert zemin için tahmini maliyet aralığını anında görün.
                Ad, telefon ya da e-posta girmeniz gerekmez.
              </p>
            </div>
          </header>

          <section className="container py-10 md:py-12" aria-label="Maliyet hesaplayıcı">
            <CostEstimator preset={preset} source="maliyet-hesapla-page" />
          </section>

          <div className="container max-w-4xl space-y-14 pb-20 pt-4">
            <section id="referans" aria-labelledby="referans-baslik" className="scroll-mt-24 space-y-5">
              <div>
                <h2 id="referans-baslik" className="font-display text-primary">
                  Birim fiyat referans tablosu
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Standart kalite, 1. grup il ({CITY_FACTOR_GROUPS[0].label}) ve 100-300 m² için kalem bazında birim fiyat aralıkları. Son güncelleme: {PRICE_BENCHMARKS_UPDATED_LABEL}.
                </p>
              </div>

              {REFERENCE_GROUPS.map((group) => (
                <div key={group.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <h3 className="border-b border-border bg-muted/50 px-4 py-3">{group.title}</h3>
                  <table className="w-full text-sm">
                    <caption className="sr-only">{group.title} birim fiyat aralıkları</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th scope="col" className="px-4 py-2 font-medium">
                          Kalem
                        </th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">
                          Birim fiyat aralığı
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.key} className="border-b border-border/60 align-top last:border-0">
                          <th scope="row" className="px-4 py-3 text-left font-normal">
                            {row.label}
                            <span className="block text-xs text-muted-foreground">{row.basis}</span>
                          </th>
                          <td className="px-4 py-3 text-right">
                            {row.minTry !== undefined && row.maxTry !== undefined ? (
                              <span className="whitespace-nowrap">
                                {formatTry(row.minTry)} – {formatTry(row.maxTry)} {row.unit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">keşifle netleşir</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2">Fiyat gösterilmeyen kalemler</h3>
                <p className="mb-2 text-sm text-muted-foreground">Bu kalemler için kaynaklı bir fiyat aralığı bulunmadığından sayı gösterilmez; keşifle netleşir.</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {UNPRICED_REFERENCE_ITEMS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-2">Kalite katsayıları</h3>
                  <ul className="space-y-1 text-sm">
                    {TIER_ROWS.map((row) => (
                      <li key={row.label} className="flex justify-between gap-3">
                        <span>{row.label}</span>
                        <span className="text-muted-foreground">×{formatFactor(row.factor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-2">Bölge katsayıları</h3>
                  <ul className="space-y-1 text-sm">
                    {CITY_FACTOR_GROUPS.map((group) => (
                      <li key={group.id} className="flex justify-between gap-3">
                        <span>{group.label}</span>
                        <span className="shrink-0 text-muted-foreground">×{formatFactor(group.factor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section id="yontem" aria-labelledby="yontem-baslik" className="scroll-mt-24 space-y-4">
              <h2 id="yontem-baslik" className="font-display text-primary">
                Nasıl hesapladık? Yöntem
              </h2>
              <p>
                Bu sayfadaki rakamlar bir <strong>editoryal tahmindir</strong>: Peyzajbul rehber yazılarındaki fiyat bilgilerinden ve 2026 piyasa gözlemlerinden türetilen aralıklardır.
                Gerçek firma teklifi veya sözleşme verisi değildir ve bağlayıcı bir teklif sayılmaz.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <span className="text-foreground">Kaynaklar:</span> {PRICE_METHOD_SOURCES_LABEL}. Bu yazılar dış kaynak göstermez ve birbirleriyle tutarsız rakamlar içerir; bu yüzden her kalem için kaynaklardaki en düşük ve en yüksek
                  değerleri kapsayan geniş bir aralık kullanıyoruz.
                </li>
                <li>
                  <span className="text-foreground">Bölge katsayıları:</span> İller üç gruba ayrılır ({CITY_FACTOR_GROUPS.map((group) => `${group.label} ×${formatFactor(group.factor)}`).join("; ")}).
                </li>
                <li>
                  <span className="text-foreground">Kalite katsayıları:</span> Ekonomik ×{formatFactor(TIER_FACTORS.ekonomik)}, Standart ×{formatFactor(TIER_FACTORS.standart)}, Premium ×{formatFactor(TIER_FACTORS.premium)}.
                </li>
                <li>
                  <span className="text-foreground">Alan büyüklüğü:</span> Büyük alanlarda metrekare başı maliyet düştüğü için alan büyüdükçe birim fiyatlara uygulanan katsayı azalır; toplam tutar yine de alanla birlikte artar.
                </li>
                <li>
                  <span className="text-foreground">Yuvarlama:</span> Alt sınır aşağı, üst sınır yukarı yuvarlanır (100.000 TL altında 1.000, 500.000 TL altında 5.000, üstünde 10.000 TL).
                </li>
                <li>
                  <span className="text-foreground">Dahil olmayanlar:</span> Fiyat gösterilmeyen kalemler, proje/çizim bedeli ve keşifte ortaya çıkabilecek ek işler hesaba katılmaz.
                </li>
              </ul>
              <p className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
                Rakamlar uygulama maliyetinin yaklaşık aralığıdır; kesin fiyat keşif sonrası firmadan alınır. Birim fiyatlar üç ayda bir gözden geçirilir; son güncelleme {PRICE_BENCHMARKS_UPDATED_LABEL}.
              </p>
            </section>

            <section id="sss" aria-labelledby="sss-baslik" className="scroll-mt-24 space-y-5">
              <h2 id="sss-baslik" className="font-display text-primary">
                Sıkça sorulan sorular
              </h2>
              <div className="space-y-6">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="mb-1">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="baglantilar-baslik" className="space-y-4">
              <h2 id="baglantilar-baslik" className="font-display text-primary">
                Firmaları ve rehberleri inceleyin
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2">Bahçe tasarımı firmaları</h3>
                  <ul className="space-y-1">
                    {LARGE_CITY_SLUGS.map((slug) => (
                      <li key={slug}>
                        <Link href={`/hizmet/bahce-tasarimi/${slug}`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                          {getCityBySlug(slug)?.name} bahçe tasarımı firmaları
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2">Sulama sistemi firmaları</h3>
                  <ul className="space-y-1">
                    {LARGE_CITY_SLUGS.map((slug) => (
                      <li key={slug}>
                        <Link href={`/hizmet/sulama-sistemleri/${slug}`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                          {getCityBySlug(slug)?.name} sulama sistemi firmaları
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <ul className="flex flex-wrap gap-x-6">
                <li>
                  <Link href="/hizmetler" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                    Tüm peyzaj hizmetleri
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                    Peyzaj rehberi ve fiyat yazıları
                  </Link>
                </li>
                <li>
                  <Link href={LEAD_FORM_PATH} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                    Ücretsiz teklif formu
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
