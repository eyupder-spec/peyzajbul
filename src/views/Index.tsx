"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Hero, { type HeroStats, type LeadPrefill } from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import PopularCategories from "@/components/PopularCategories";
import HomeBlogSection from "@/components/HomeBlogSection";
import FeaturedCities from "@/components/FeaturedCities";
import FeaturedFirms from "@/components/FeaturedFirms";
import Footer from "@/components/Footer";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import SeoLocationLinks from "@/components/SeoLocationLinks";
import BannerAd from "@/components/BannerAd";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

const Index = ({ stats }: { stats: HeroStats | null }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<LeadPrefill | undefined>(undefined);

  const openForm = (nextPrefill?: LeadPrefill) => {
    setPrefill(nextPrefill);
    setFormOpen(true);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero stats={stats} onTeklifAl={openForm} />

      <PopularCategories />
      <HowItWorks
        onTeklifAl={() => {
          track("cta_click", { placement: "how_it_works" });
          openForm();
        }}
      />

      {/* Reklam Alanı: Nasıl Çalışır ile Öne Çıkan Firmalar arası (Leaderboard) */}
      <div className="container mx-auto px-4">
        <BannerAd placement="home_top" className="my-8 h-[90px] md:h-[120px] w-full max-w-5xl mx-auto rounded-xl shadow-sm" />
      </div>

      <FeaturedFirms />
      <FeaturedCities />

      {/* Reklam Alanı: Şehirler ve Blog Arası (Leaderboard) */}
      <div className="container mx-auto px-4">
        <BannerAd placement="home_middle" className="my-8 h-[90px] md:h-[120px] w-full max-w-5xl mx-auto rounded-xl shadow-sm" />
      </div>

      <HomeBlogSection />

      <section className="bg-muted py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">Peyzaj firması mısınız?</h2>
              <p className="mt-2 text-muted-foreground">
                Rehberde listelenen firmanızı sahiplenin, bilgilerinizi güncelleyin ve bölgenizdeki teklif taleplerini
                görün.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="shrink-0 px-8 text-base">
              <Link href="/isletme-ekle">Firmamı Sahiplen</Link>
            </Button>
          </div>
        </div>
      </section>

      <SeoLocationLinks />

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-semibold text-primary-foreground md:text-4xl">
            Projenizi anlatın, teklifleri karşılaştırın
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Teklif talebi ücretsizdir ve bağlayıcı değildir.
          </p>
          <Button
            variant="accent"
            size="lg"
            className="mt-8 px-8 text-base"
            onClick={() => {
              track("cta_click", { placement: "home_final" });
              openForm();
            }}
          >
            Ücretsiz Teklif Al
          </Button>
        </div>
      </section>

      <Footer />
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={prefill} />
    </main>
  );
};

export default Index;
