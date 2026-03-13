import { Metadata } from "next";
import FirmaGirisClient from "@/views/FirmaGiris";

export const metadata: Metadata = {
  title: "Firma Girişi | Peyzajbul",
  description: "Peyzajbul firma hesabınıza giriş yapın veya yeni firma başvurusu oluşturun.",
};

export default function FirmaGirisPage() {
  return <FirmaGirisClient />;
}
