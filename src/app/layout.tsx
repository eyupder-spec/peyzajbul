import type { Metadata } from "next";
import { Inter, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import { SocialProof } from "@/components/SocialProof";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.peyzajbul.com"),
  title: "Peyzajbul – Türkiye'nin En İyi Peyzaj Firmaları",
  description: "Türkiye'nin en kapsamlı peyzaj firmaları rehberi. Peyzajbul ile bahçe tasarımı ve peyzaj hizmeti veren en iyi firmaları keşfedin.",
  verification: {
    google: "Z9mTtfx6Lhx4bXEr959QKYsNbdaPXcIbnUFv_vNdy8w",
    other: {
      "p:domain_verify": ["c67dc4a6480a0f1ffdd29dcf041111db"],
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Peyzajbul – Türkiye'nin En İyi Peyzaj Firmaları",
    description: "Türkiye'nin en kapsamlı peyzaj firmaları rehberi. Peyzajbul ile bahçe tasarımı ve peyzaj hizmeti veren en iyi firmaları keşfedin.",
    url: "https://www.peyzajbul.com",
    siteName: "Peyzajbul",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Peyzajbul – Türkiye'nin En İyi Peyzaj Firmaları",
    description: "Türkiye'nin en kapsamlı peyzaj firmaları rehberi. Peyzajbul ile bahçe tasarımı ve peyzaj hizmeti veren en iyi firmaları keşfedin.",
  },
  other: {
    "geo.region": "TR",
    "geo.placename": "Türkiye",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${nunito.variable} ${playfair.variable} font-body overflow-x-hidden`} suppressHydrationWarning>
        <Providers>
          {children}
          <SocialProof />
          <Toaster />
          <Sonner />
        </Providers>
        <GoogleAnalytics gaId="G-4R16SQXM7B" />
      </body>
    </html>
  );
}
