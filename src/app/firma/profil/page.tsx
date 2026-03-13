import { Metadata } from "next";
import FirmaProfilClient from "@/views/FirmaProfil";

export const metadata: Metadata = {
  title: "Firma Profili | Peyzajbul",
};

export default function FirmaProfilPage() {
  return <FirmaProfilClient />;
}
