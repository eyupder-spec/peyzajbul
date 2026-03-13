import { Metadata } from "next";
import FirmaPanelClient from "@/views/FirmaPanel";

export const metadata: Metadata = {
  title: "Firma Paneli | Peyzajbul",
  description: "Peyzajbul firma yönetim paneli, leadler ve teklifler.",
};

export default function FirmaPanelPage() {
  return <FirmaPanelClient />;
}
