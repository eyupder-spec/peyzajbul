import FirmaKayitLandingClient from "@/views/FirmaKayitLanding";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peyzaj Firması Kayıt | İşinizi ve Müşteri Kitlenizi Büyütün",
  description: "Peyzaj firmanızı Peyzajbul'a kaydederek daha fazla müşteriye ulaşın. 81 ilde binlerce bahçe sahibinin sizi bulmasını sağlayın. Ücretsiz kayıt olun.",
  alternates: {
    canonical: "https://peyzajbul.com/isletme-ekle",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Kayıt olmak ücretli mi?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Temel profil oluşturma ve listelenme tamamen ücretsizdir. Müşteriler sizi rehber üzerinden bulabilir ve doğrudan iletişime geçebilir."
      }
    },
    {
      "@type": "Question",
      "name": "Müşteriler bana nasıl ulaşacak?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Profilinizdeki telefon numarası üzerinden doğrudan arayabilir veya sistem üzerinden size teklif talebi gönderebilirler."
      }
    }
  ]
};

export default function IsletmeEklePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FirmaKayitLandingClient />
    </>
  );
}
