import { Metadata } from "next";
import FirmaJetonClient from "@/views/FirmaJeton";

export const metadata: Metadata = {
  title: "Firma Jeton Yükleme | Peyzajbul",
};

export default function FirmaJetonPage() {
  return <FirmaJetonClient />;
}
