import { Metadata } from "next";
import HesabimClient from "@/views/Hesabim";

export const metadata: Metadata = {
  title: "Hesabım | Peyzajbul",
  description: "Peyzajbul kullanıcı ve firma hesabı detayları.",
  robots: { index: false, follow: false },
};

export default function HesabimPage() {
  return <HesabimClient />;
}
