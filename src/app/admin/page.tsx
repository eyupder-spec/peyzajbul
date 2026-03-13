import { Metadata } from "next";
import AdminPanelClient from "@/views/AdminPanel";

export const metadata: Metadata = {
  title: "Admin Paneli | Peyzajbul",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanelClient />;
}
