import IllerClient from "@/views/Iller";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Türkiye Peyzaj Firmaları | 81 İl Peyzajbul",
  description: "Türkiye'nin 81 ilinde peyzaj firmalarını bulun. İl bazında peyzaj şirketlerini karşılaştırın ve ücretsiz teklif alın.",
  alternates: {
    canonical: "https://www.peyzajbul.com/iller",
  },
};

export default function IllerPage() {
  return <IllerClient />;
}
