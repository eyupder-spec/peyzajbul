import { Metadata } from "next";
import FirmaGirisClient from "@/views/FirmaGiris";

export const metadata: Metadata = {
  title: "Firma Girişi | Peyzajbul",
  description: "Peyzajbul firma girişi: e-posta ile tek kullanımlık kod.",
  robots: { index: false, follow: false },
};

export default function FirmaGirisPage() {
  return <FirmaGirisClient />;
}
