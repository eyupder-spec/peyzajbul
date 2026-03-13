import { Metadata } from "next";
import AdminGirisClient from "@/views/AdminGiris";

export const metadata: Metadata = {
  title: "Admin Girişi | Peyzajbul",
  description: "Peyzajbul yönetim paneli girişi.",
  robots: { index: false, follow: false },
};

export default function AdminGirisPage() {
  return <AdminGirisClient />;
}
