import { Metadata } from "next";
import ChangelogClient from "@/views/Changelog";

export const metadata: Metadata = {
  title: "Changelog – Peyzajbul",
  description: "Peyzajbul'daki yenilikler ve güncellemeler.",
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}
