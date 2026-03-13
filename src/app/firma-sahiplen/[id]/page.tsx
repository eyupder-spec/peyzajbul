import { Metadata } from "next";
import FirmaSahiplenClient from "@/views/FirmaSahiplen";

export const metadata: Metadata = {
  title: "Firma Sahiplen | Peyzajbul",
};

export default function FirmaSahiplenPage() {
  return <FirmaSahiplenClient />;
}
