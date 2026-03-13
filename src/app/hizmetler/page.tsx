import { Metadata } from "next";
import KategorilerClient from "@/views/Kategoriler";

export const metadata: Metadata = {
  title: "Peyzaj Hizmetleri | Peyzajbul",
  description: "Peyzaj mimarlığından bahçe bakımına, sulama sistemlerinden sert zemin uygulamalarına kadar tüm peyzaj hizmetlerini keşfedin.",
};

export default function KategorilerPage() {
  return <KategorilerClient />;
}
