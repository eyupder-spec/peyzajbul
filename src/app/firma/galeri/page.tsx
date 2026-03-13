import { Metadata } from "next";
import FirmaGaleriClient from "@/views/FirmaGaleri";

export const metadata: Metadata = {
  title: "Firma Galerisi | Peyzajbul",
};

export default function FirmaGaleriPage() {
  return <FirmaGaleriClient />;
}
