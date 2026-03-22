import { Metadata } from "next";
import FirmaSahiplenLanding from "@/views/FirmaSahiplenLanding";

export const metadata: Metadata = {
  title: "Firmanızı Sahiplenin | Peyzajbul",
  description: "Peyzajbul'da firmanızı sahiplenerek yeni müşteri adaylarına ulaşın, profilinizi yönetin ve güven kazanın.",
  alternates: {
    canonical: "https://www.peyzajbul.com/firma-sahiplen",
  },
};

export default function PáginaFirmaSahiplen() {
  return <FirmaSahiplenLanding />;
}
