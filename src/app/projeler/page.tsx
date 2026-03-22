import { Metadata } from "next";
import ProjelerClient from "@/views/Projeler";

export const metadata: Metadata = {
  title: "Tüm Projeler | Peyzajbul",
  description: "Türkiye'nin en iyi peyzaj firmalarının yayınlamış olduğu güncel peyzaj ve bahçe tasarımı projeleri. İlham almak için inceleyin.",
  alternates: {
    canonical: "https://www.peyzajbul.com/projeler",
  },
};

export default function ProjelerPage() {
  return <ProjelerClient />;
}
