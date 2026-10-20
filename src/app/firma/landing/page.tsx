import { Metadata } from "next";
import FirmaLandingEditor from "@/views/FirmaLandingEditor";

export const metadata: Metadata = {
  title: "Firma Landing Sayfası | Peyzajbul",
  robots: { index: false, follow: false },
};

export default function FirmaLandingPage() {
  return <FirmaLandingEditor />;
}
