import { Metadata } from "next";
import FirmaLeadlerClient from "@/views/FirmaLeadler";

export const metadata: Metadata = {
  title: "Firma Leadleri | Peyzajbul",
};

export default function FirmaLeadlerPage() {
  return <FirmaLeadlerClient />;
}
