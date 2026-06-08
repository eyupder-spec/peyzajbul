import BlogClient from "@/views/Blog";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peyzaj Blog | Bahçe Bakımı ve Peyzajbul",
  description: "Peyzaj tasarım, bahçe bakımı, bitki seçimi ve dış mekan düzenlemesi hakkında uzman tavsiyeleri ve güncel trendler.",
  alternates: {
    canonical: "https://www.peyzajbul.com/blog",
  },
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://www.peyzajbul.com/blog",
  "name": "Peyzajbul Blog",
  "description": "Peyzaj tasarım, bahçe bakımı ve dış mekan düzenlemesi hakkında uzman içerikler.",
  "url": "https://www.peyzajbul.com/blog",
  "inLanguage": "tr-TR",
  "publisher": {
    "@type": "Organization",
    "name": "Peyzajbul",
    "url": "https://www.peyzajbul.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.peyzajbul.com/icon.png",
      "width": 512,
      "height": 512
    }
  }
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <BlogClient />
    </>
  );
}
