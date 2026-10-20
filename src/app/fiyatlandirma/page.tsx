import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CITIES } from "@/lib/cities";
import { SUPPORT_CONTACT } from "@/lib/publicStats";
import {
  COIN_PACKS,
  LEAD_TIERS,
  OFFER_FLAGS,
  PRICE_TAX_MODE,
  SALES_WHATSAPP_URL,
  SPONSOR_TIERS,
  TAX_LABEL,
  bonusLabel,
  effectiveDiscountPercent,
  formatNumber,
  formatTRY,
  founderRenewalLine,
  getProHighlights,
  getProPlan,
  yearlySavingsPercent,
} from "@/lib/pricing";
import PricingCta from "./_components/PricingCta";
import FounderCard from "./_components/FounderCard";

export const metadata: Metadata = {
  title: "Firma Fiyatlandırma | Peyzajbul",
  description:
    "Peyzajbul'da firma profilinizi ücretsiz sahiplenin. Pro üyelik, jeton paketleri ve bölge sponsorluğu için güncel TL fiyatları.",
  alternates: { canonical: "/fiyatlandirma" },
  robots: { index: true, follow: true },
};

const cityName = (slug: string): string => CITIES.find((city) => city.slug === slug)?.name ?? slug;

interface FaqItem {
  question: string;
  answer: string;
}

function buildFaq(): FaqItem[] {
  const items: FaqItem[] = [
    {
      question: "Jeton nedir?",
      answer:
        "Jeton, talepleri açmak için kullandığınız ön ödemeli kredidir. 1 jeton = 1 ₺ krediye eşittir. Paket satın aldığınızda bonus jeton dahil toplam jeton hesabınıza yüklenir.",
    },
    {
      question: "Talebi kimler görür?",
      answer:
        "Talepler, hizmet ve bölge eşleşmesine göre firmalara yönlendirilir. Müşterinin iletişim bilgileri, talebi açana kadar maskelidir. Bir talep en fazla 3 firmaya açılır.",
    },
    {
      question: "Ulaşamadığım talep için jeton iadesi alabilir miyim?",
      answer:
        "Ulaşılamayan lead için jeton iadesi talep edebilirsiniz; talepler incelenir. Talep süresi sınırlıdır, bu yüzden talebi açtıktan kısa süre sonra panelden iletin.",
    },
  ];

  if (OFFER_FLAGS.moneyBack14d) {
    items.push({
      question: "Pro üyelikte para iadesi var mı?",
      answer: "İlk ödemeden sonraki 14 gün içinde yazılı talep etmeniz halinde Pro üyelik ücretiniz iade edilir.",
    });
  }

  items.push(
    {
      question: "Pro üyeliği nasıl iptal ederim?",
      answer: OFFER_FLAGS.billingPortal
        ? "Panelinizdeki Pro Üyelik sayfasından “Aboneliği Yönet” ile iptal edebilir, kartınızı ve faturalarınızı yönetebilirsiniz."
        : `İptal için WhatsApp (${SUPPORT_CONTACT.whatsappDisplay}) veya ${SUPPORT_CONTACT.email} adresi üzerinden bize yazmanız yeterli.`,
    },
    {
      question: "Ödeme nasıl alınır?",
      answer: "Ödeme Stripe’ın güvenli sayfasında TL olarak alınır; kart bilgileriniz Peyzajbul’a iletilmez.",
    },
    {
      question: "Fiyatlara KDV dahil mi?",
      answer:
        PRICE_TAX_MODE === "inclusive"
          ? "Evet, bu sayfadaki fiyatlar KDV dahildir."
          : "Hayır, bu sayfadaki fiyatlara KDV eklenir; tutar ödeme sayfasında ayrıca gösterilir.",
    },
  );

  return items;
}

export default function FiyatlandirmaPage() {
  const monthly = getProPlan("monthly");
  const yearly = getProPlan("yearly");
  const founder = getProPlan("founder");
  const highlights = getProHighlights();
  const showFounder = OFFER_FLAGS.founderEnabled;
  const discounts = COIN_PACKS.map(effectiveDiscountPercent);
  const minDiscount = Math.min(...discounts);
  const maxDiscount = Math.max(...discounts);
  const faq = buildFaq();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pb-20 pt-28">
        {/* 1. Başlık */}
        <header className="mx-auto mb-12 max-w-3xl text-center">
          <h1 className="font-heading mb-4 text-foreground">Müşteri talebi için değil, gördüğünüz sonuç için ödeyin</h1>
          <p className="text-lg text-muted-foreground">
            Profilinizi ücretsiz sahiplenin; talepleri önizleyin ve yalnızca açmak istediğiniz talep için jeton kullanın.
          </p>
        </header>

        {/* 2. Planlar */}
        <section aria-labelledby="planlar" className="mb-16">
          <h2 id="planlar" className="sr-only">
            Planlar
          </h2>
          <div className={`grid gap-6 ${showFounder ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <article className="flex flex-col rounded-xl border border-border bg-card p-6">
              <h3 className="font-heading text-xl font-semibold text-foreground">Ücretsiz</h3>
              <p className="mt-4 font-heading text-4xl text-foreground">₺0</p>
              <p className="mt-3 text-sm text-foreground">Profilini sahiplen, bilgilerini yönet, istatistiklerini gör.</p>
              {OFFER_FLAGS.firstLeadFree && <p className="mt-2 text-sm text-foreground">İlk lead ücretsiz.</p>}
              <PricingCta className="mt-auto pt-6" signedInHref="/firma/panel" label="Profilini sahiplen" variant="outline" showLogin />
            </article>

            {monthly && yearly && (
              <article className="flex flex-col rounded-xl border border-border bg-card p-6">
                <h3 className="font-heading text-xl font-semibold text-foreground">Pro</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-heading text-4xl text-foreground">{formatTRY(monthly.priceTRY)}</span>
                  <span className="text-muted-foreground">/ay</span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <span>
                    veya {formatTRY(yearly.priceTRY)}/yıl
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                    %{yearlySavingsPercent()} daha uygun
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{TAX_LABEL}</p>
                <ul className="my-5 space-y-2 text-sm text-foreground">
                  {highlights.map((feature) => (
                    <li key={feature.id} className="flex gap-2">
                      <span aria-hidden="true" className="text-verified">
                        ✓
                      </span>
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
                <PricingCta className="mt-auto" signedInHref="/firma/premium?plan=yearly" label="Pro’yu incele" variant="default" showLogin />
              </article>
            )}

            {showFounder && founder && yearly && founder.cap !== undefined && (
              <FounderCard
                name="Kurucu Üye"
                priceLabel={formatTRY(founder.priceTRY)}
                unit="yıl"
                taxLabel={TAX_LABEL}
                normalPriceLine={`Normal yıllık fiyat ${formatTRY(yearly.priceTRY)}`}
                renewalLine={founderRenewalLine(founder)}
                cap={founder.cap}
                features={["Pro’nun tüm özellikleri", ...highlights.slice(0, 3).map((feature) => feature.label)]}
                cta="Kurucu Üye ol"
              />
            )}
          </div>
        </section>

        {/* 3. Lead kredisi */}
        <section aria-labelledby="lead-kredisi" className="mb-16">
          <h2 id="lead-kredisi" className="font-heading mb-2 text-foreground">
            Lead Kredisi
          </h2>
          <p className="mb-6 max-w-3xl text-muted-foreground">
            Müşteri taleplerini açmak için jeton kullanırsınız. 1 jeton = 1 ₺ krediye eşittir. Lead fiyatı her talepte satın
            almadan önce gösterilir. Bir lead en fazla 3 firmaya açılır.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Jeton paketleri</caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-3 py-3 font-medium text-muted-foreground sm:px-5">
                    Paket
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium text-muted-foreground sm:px-5">
                    Ödenen
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium text-muted-foreground sm:px-5">
                    Bonus
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium text-muted-foreground sm:px-5">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COIN_PACKS.map((pack) => (
                  <tr key={pack.id}>
                    <th scope="row" className="px-3 py-4 font-medium text-foreground sm:px-5">
                      {pack.name}
                    </th>
                    <td className="px-3 py-4 font-heading text-lg text-foreground sm:px-5">{formatTRY(pack.priceTRY)}</td>
                    <td className="px-3 py-4 text-foreground sm:px-5">{bonusLabel(pack)}</td>
                    <td className="px-3 py-4 text-right font-semibold text-foreground sm:px-5">
                      {formatNumber(pack.totalJeton)} jeton
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {TAX_LABEL}. Bonus jetonlar sayesinde jeton başına maliyet pakete göre %{minDiscount}–%{maxDiscount} düşer.
          </p>

          {OFFER_FLAGS.leadTiersLive && (
            <ul className="mt-4 grid gap-2 text-sm text-foreground sm:grid-cols-3">
              {LEAD_TIERS.map((tier) => (
                <li key={tier.id} className="rounded-lg border border-border bg-card p-3">
                  <span className="font-medium">{tier.label}</span>: {formatNumber(tier.jeton)} jeton
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 max-w-xs">
            <PricingCta signedInHref="/firma/jeton" label="Jeton yükle" variant="outline" />
          </div>
        </section>

        {/* 4. Bölge sponsoru */}
        <section aria-labelledby="bolge-sponsoru" className="mb-16">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h2 id="bolge-sponsoru" className="font-heading text-foreground">
              Bölge Sponsoru
            </h2>
            {!OFFER_FLAGS.sponsorLive && (
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                Ön rezervasyon – ödeme şimdi alınmaz
              </span>
            )}
          </div>
          <p className="mb-6 max-w-3xl text-muted-foreground">
            {OFFER_FLAGS.sponsorLive
              ? "Seçtiğiniz il ve hizmet sayfasında tek sponsor olarak, “Sponsorlu” etiketiyle en üstte yer alırsınız. Görüntülenme ve tıklama sayılarınızı panelinizden takip edersiniz."
              : "Seçtiğiniz il ve hizmet sayfasında tek sponsor olarak, “Sponsorlu” etiketiyle en üstte yer almak için ön rezervasyon yapabilirsiniz. Yayın henüz başlamadı; yayına alındığında görüntülenme ve tıklama sayılarınızı panelinizden takip edersiniz."}
          </p>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Bölge sponsoru aylık fiyatları</caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-3 py-3 font-medium text-muted-foreground sm:px-5">
                    Kademe
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium text-muted-foreground sm:px-5">
                    İller
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium text-muted-foreground sm:px-5">
                    Aylık
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SPONSOR_TIERS.map((tier) => (
                  <tr key={tier.tier} className="align-top">
                    <th scope="row" className="px-3 py-4 font-medium text-foreground sm:px-5">
                      {tier.tier}
                      <span className="block text-xs font-normal text-muted-foreground">{tier.label}</span>
                    </th>
                    <td className="px-3 py-4 text-foreground sm:px-5">
                      {tier.citySlugs ? tier.citySlugs.map(cityName).join(", ") : "Diğer tüm iller"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right sm:px-5">
                      <span className="font-heading text-lg text-foreground">{formatTRY(tier.monthlyTRY)}</span>
                      <span className="text-muted-foreground">/ay</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{TAX_LABEL}.</p>

          <div className="mt-6">
            <Button variant="outline" size="lg" asChild>
              <Link href="/firma/reklam">{OFFER_FLAGS.sponsorLive ? "Slot seç ve başvur" : "Slot seç, ön rezervasyon yap"}</Link>
            </Button>
          </div>
        </section>

        {/* 5. SSS */}
        <section aria-labelledby="sss" className="mb-12 max-w-3xl">
          <h2 id="sss" className="font-heading mb-6 text-foreground">
            Sık sorulan sorular
          </h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {faq.map((item) => (
              <details key={item.question} className="group px-5">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-3 font-medium text-foreground">
                  {item.question}
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 text-sm text-muted-foreground">
            <a
              href={SALES_WHATSAPP_URL("Merhaba, Peyzajbul firma fiyatlandırması hakkında bilgi almak istiyorum.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Başka sorunuz mu var? WhatsApp’tan yazın
            </a>
            <Link href="/kullanim-kosullari" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Kullanım Koşulları
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
