import { Metadata } from "next";
import FirmaSahiplenLanding from "@/views/FirmaSahiplenLanding";

export const metadata: Metadata = {
  title: "Firmanızı Sahiplenin | Peyzajbul",
  description: "Peyzajbul'da listelenen firmanızı e-postanıza gelen 6 haneli kodla veya WhatsApp ile doğrulayıp sahiplenin, profilinizi yönetin.",
  alternates: {
    canonical: "https://www.peyzajbul.com/firma-sahiplen",
  },
};

export default function PáginaFirmaSahiplen() {
  return <FirmaSahiplenLanding />;
}
