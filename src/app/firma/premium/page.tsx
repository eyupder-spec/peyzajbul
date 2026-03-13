import { Metadata } from "next";
import FirmaPremiumClient from "@/views/FirmaPremium";

export const metadata: Metadata = {
  title: "Firma Premium | Peyzajbul",
};

export default function FirmaPremiumPage() {
  return <FirmaPremiumClient />;
}
