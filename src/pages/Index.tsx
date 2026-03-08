import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import PopularCategories from "@/components/PopularCategories";
import FeaturedCities from "@/components/FeaturedCities";
import FeaturedFirms from "@/components/FeaturedFirms";
import TrustBadges from "@/components/TrustBadges";
import Footer from "@/components/Footer";
import LeadFormModal from "@/components/lead-form/LeadFormModal";

const Index = () => {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero onTeklifAl={() => setFormOpen(true)} />
      <FeaturedFirms />
      <HowItWorks />
      <PopularCategories />
      <FeaturedCities />
      <TrustBadges />
      <Footer />
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
};

export default Index;
