import { Metadata } from "next";
import FirmaGaleriClient from "@/views/FirmaGaleri";

export const metadata: Metadata = {
  title: "Firma Galerisi | Peyzajbul",
  robots: { index: false, follow: false },
};

export default function FirmaGaleriPage() {
  return <FirmaGaleriClient />;
}
