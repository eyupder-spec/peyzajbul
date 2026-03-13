import IndexPage from "@/views/Index";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peyzajbul – Türkiye'nin En İyi Peyzaj Firmaları",
  description: "Türkiye genelinde en iyi peyzaj firmalarını karşılaştırın. 81 ilde bahçe tasarımı, peyzaj mimarlığı, sulama sistemleri ve daha fazlası. Ücretsiz teklif alın.",
  alternates: {
    canonical: "https://peyzajbul.com/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Peyzajbul – Türkiye Peyzaj Firmaları",
  "description": "Türkiye genelinde en iyi peyzaj firmalarını keşfedin.",
  "url": "https://peyzajbul.com/",
  "numberOfItems": 20,
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Peyzaj Mimarlığı", "url": "https://peyzajbul.com/hizmetler/peyzaj-mimarligi" },
    { "@type": "ListItem", "position": 2, "name": "Bahçe Tasarımı", "url": "https://peyzajbul.com/hizmetler/bahce-tasarimi" },
    { "@type": "ListItem", "position": 3, "name": "Bahçe Bakımı", "url": "https://peyzajbul.com/hizmetler/bahce-bakimi" },
    { "@type": "ListItem", "position": 4, "name": "Sulama Sistemleri", "url": "https://peyzajbul.com/hizmetler/sulama-sistemleri" },
    { "@type": "ListItem", "position": 5, "name": "Havuz Yapımı", "url": "https://peyzajbul.com/hizmetler/havuz-yapimi" },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <IndexPage />
    </>
  );
}
