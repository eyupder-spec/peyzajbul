import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LeadStatusClient from "./LeadStatusClient";

// The status token travels in the query string: keep the page out of search results and out of Referer headers.
export const metadata: Metadata = {
  title: "Talep Durumu - Peyzajbul",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TalepDurumuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-10 md:py-16">
        <LeadStatusClient id={id} />
      </main>
      <Footer />
    </div>
  );
}
