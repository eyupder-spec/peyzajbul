import FirmalarClient from "@/views/Firmalar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peyzaj Firmaları | Peyzajbul Türkiye",
  description: "Türkiye genelindeki peyzaj firmalarını keşfedin. Bahçe tasarımı, peyzaj mimarlığı ve daha fazlası için güvenilir firmalar.",
};

export default function Page() {
  return <FirmalarClient />;
}
