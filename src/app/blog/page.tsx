import BlogClient from "@/views/Blog";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peyzaj Blog | Bahçe Bakımı ve Peyzajbul",
  description: "Peyzaj tasarım, bahçe bakımı, bitki seçimi ve dış mekan düzenleme hakkında uzman tavsiyeleri ve güncel trendler.",
  alternates: {
    canonical: "https://www.peyzajbul.com/blog",
  },
};

export default function Page() {
  return <BlogClient />;
}
