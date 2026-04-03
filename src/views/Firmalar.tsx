"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirmCard from "@/components/FirmCard";
import { useApprovedFirms } from "@/hooks/useFirms";
import { CITIES } from "@/lib/cities";
import { SERVICE_LABELS } from "@/lib/categories";
import LeadFormBanner from "@/components/lead-form/LeadFormBanner";

const Firmalar = () => {
  const { data: firms, isLoading } = useApprovedFirms();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  const allServices = SERVICE_LABELS;

  const filtered = useMemo(() => {
    if (!firms) return [];
    return firms.filter((f) => {
      const matchSearch = f.company_name.toLowerCase().includes(search.toLowerCase());
      const matchCity = !cityFilter || f.city === cityFilter;
      const matchService = !serviceFilter || f.services?.includes(serviceFilter);
      return matchSearch && matchCity && matchService;
    });
  }, [firms, search, cityFilter, serviceFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              Peyzaj Firmaları
            </h1>
            <p className="text-primary-foreground/70 font-body">
              Türkiye genelindeki peyzaj firmalarını keşfedin.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <LeadFormBanner />

          <div className="bg-card rounded-lg border border-border p-4 mb-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Firma ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tüm İller</option>
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tüm Hizmetler</option>
                {allServices.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground">Yükleniyor...</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4 font-body">{filtered.length} firma bulundu</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((firm) => (
                  <FirmCard
                    key={firm.id}
                    id={firm.id}
                    company_name={firm.company_name}
                    city={firm.city}
                    district={firm.district}
                    services={firm.services || []}
                    description={firm.description}
                    is_premium={firm.is_premium}
                    slug={firm.slug}
                    logo_url={firm.logo_url}
                    gallery_images={firm.gallery_images}
                  />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="font-heading text-xl mb-2">Sonuç bulunamadı</p>
                  <p className="text-sm font-body">Filtrelerinizi değiştirerek tekrar deneyin.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Firmalar;
