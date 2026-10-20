import { Metadata } from "next";
import FirmaProjeler from "@/views/FirmaProjeler";

export const metadata: Metadata = {
  title: "Firma Projeleri | Peyzajbul",
  robots: { index: false, follow: false },
};

export default function FirmaProjelerPage() {
  return <FirmaProjeler />;
}
