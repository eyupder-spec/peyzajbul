"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CITIES } from "@/lib/cities";
import { useApprovedFirms } from "@/hooks/useFirms";
import { MapPin } from "lucide-react";

const Iller = () => {
  const { data: firms } = useApprovedFirms();

  const cityFirmCounts = CITIES.map((city) => ({
    ...city,
    count: firms?.filter((f) => f.city === city.name).length || 0,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              İllere Göre Peyzaj Firmaları
            </h1>
            <p className="text-primary-foreground/70 font-body">
              Türkiye'nin 81 ilinde peyzaj firmalarını keşfedin.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {cityFirmCounts.map((city) => (
              <Link
                key={city.slug}
                href={`/iller/${city.slug}-peyzaj-firmalari`}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md hover:border-primary/50 transition-all group text-center"
              >
                <div className="flex items-center justify-center gap-1 text-foreground font-medium group-hover:text-primary transition-colors">
                  <MapPin className="h-3.5 w-3.5" />
                  {city.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {city.count > 0 ? `${city.count} firma` : "—"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Iller;
