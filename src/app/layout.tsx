import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import StickyCtaBar from "@/components/StickyCtaBar";
import ConsentBanner from "@/components/ConsentBanner";
import { CONSENT_BOOTSTRAP_SCRIPT } from "@/lib/consent";

const display = Fraunces({ subsets: ["latin", "latin-ext"], weight: "600", display: "swap", variable: "--font-display" });
const body = Manrope({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-body" });

const TITLE = "Peyzajbul – Peyzaj Firmaları ve Ücretsiz Teklif";
const DESCRIPTION = "Bahçe tasarımı, peyzaj mimarlığı ve bakım için firmaları karşılaştırın, ücretsiz teklif isteyin.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.peyzajbul.com"),
  title: TITLE,
  description: DESCRIPTION,
  verification: {
    google: "Z9mTtfx6Lhx4bXEr959QKYsNbdaPXcIbnUFv_vNdy8w",
    yandex: "63abccb06aa10210",
    other: {
      "p:domain_verify": ["c67dc4a6480a0f1ffdd29dcf041111db"],
    },
  },
  // "./" Next tarafından her isteğin yoluna göre çözülür: kendi canonical'ını vermeyen sayfalar ana sayfaya değil kendine işaret eder.
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "./",
    siteName: "Peyzajbul",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Peyzajbul – Türkiye'nin Peyzaj Firmaları Rehberi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  other: {
    "geo.region": "TR",
    "geo.placename": "Türkiye",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF8F5",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-background text-foreground overflow-x-hidden" suppressHydrationWarning>
        <Script id="consent-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: CONSENT_BOOTSTRAP_SCRIPT }} />
        <Providers>
          {children}
          <StickyCtaBar />
          <Toaster />
          <Sonner />
        </Providers>
        <ConsentBanner />
      </body>
    </html>
  );
}
