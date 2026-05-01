import { Metadata } from "next";
import FirmaUrunler from "@/views/FirmaUrunler";

export const metadata: Metadata = {
  title: "Ürünlerim | Firma Paneli | Peyzajbul",
  description: "Firma ürünleri ve bitki kataloğu yönetimi.",
};

export default function FirmaUrunlerPage() {
  return <FirmaUrunler />;
}
