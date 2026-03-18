import { Metadata } from "next";
import DijitalAjansClient from "@/views/DijitalAjans";

export const metadata: Metadata = {
  title: "Peyzaj Firmalarına Özel Dijital Büyüme Ajansı | Web Tasarım & SEO",
  description: "Peyzaj firmanız için özel web tasarım, Google SEO ve reklam yönetimi hizmetleri. Şimdi katılın, 3 ay ücretsiz premium firma üyeliği kazanın!",
  robots: "noindex, nofollow", // Gizli sayfa olduğu için indexlenmesin (opsiyonel ama istenen gizli/bağımsız sayfa mantığına uygun)
};

export default function DijitalAjansPage() {
  return <DijitalAjansClient />;
}
