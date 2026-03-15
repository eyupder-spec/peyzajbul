import AIBahceOlusturucu from "@/views/AIBahceOlusturucu";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Bahçe Tasarımı | Peyzajbul",
  description: "Yapay zeka desteğiyle saniyeler içinde hayalinizdeki bahçe konseptini oluşturun.",
};

export default function AIBahceTasarimiPage() {
  return <AIBahceOlusturucu />;
}
