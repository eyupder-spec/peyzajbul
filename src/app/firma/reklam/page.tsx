import { Metadata } from "next";
import BolgeSponsoruClient from "./BolgeSponsoruClient";

export const metadata: Metadata = {
  title: "Bölge Sponsoru | Peyzajbul",
  description: "Seçtiğiniz il ve hizmet sayfasında tek sponsor olarak yer almak için ön rezervasyon yapın.",
  robots: { index: false, follow: false },
};

export default function FirmaReklamPage() {
  return <BolgeSponsoruClient />;
}
