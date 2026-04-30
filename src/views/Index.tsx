"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import PopularCategories from "@/components/PopularCategories";
import HomeBlogSection from "@/components/HomeBlogSection";
import FeaturedCities from "@/components/FeaturedCities";
import FeaturedFirms from "@/components/FeaturedFirms";
import Footer from "@/components/Footer";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import SeoLocationLinks from "@/components/SeoLocationLinks";
import BannerAd from "@/components/BannerAd";

const Index = () => {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero onTeklifAl={() => setFormOpen(true)} />
      
      {/* 1. Reklam Alanı: Hero Altı (Leaderboard) */}
      <div className="container mx-auto px-4">
        <BannerAd placement="home_top" className="mt-8 h-[90px] md:h-[120px] w-full max-w-5xl mx-auto rounded-xl shadow-sm" />
      </div>

      <FeaturedFirms />
      <HowItWorks />
      <PopularCategories />

      {/* 2. Reklam Alanı: Kategoriler ve Blog Arası (Leaderboard) */}
      <div className="container mx-auto px-4">
        <BannerAd placement="home_middle" className="my-8 h-[90px] md:h-[120px] w-full max-w-5xl mx-auto rounded-xl shadow-sm" />
      </div>

      <HomeBlogSection />
      <FeaturedCities />
      <SeoLocationLinks />
      <Footer />
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </main>
  );
};

export default Index;
