import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import PopularCategories from "@/components/PopularCategories";
import FeaturedCities from "@/components/FeaturedCities";
import FeaturedFirms from "@/components/FeaturedFirms";

import Footer from "@/components/Footer";
import LeadFormModal from "@/components/lead-form/LeadFormModal";

const Index = () => {
  const [formOpen, setFormOpen] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Türkiye Peyzaj Firmaları",
    "description": "Türkiye genelinde en iyi peyzaj firmalarını keşfedin.",
    "url": "https://peyzaj-rehberi-turkiye.lovable.app/",
    "numberOfItems": 20,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Peyzaj Mimarlığı", "url": "https://peyzaj-rehberi-turkiye.lovable.app/kategoriler/peyzaj-mimarligi" },
      { "@type": "ListItem", "position": 2, "name": "Bahçe Tasarımı", "url": "https://peyzaj-rehberi-turkiye.lovable.app/kategoriler/bahce-tasarimi" },
      { "@type": "ListItem", "position": 3, "name": "Bahçe Bakımı", "url": "https://peyzaj-rehberi-turkiye.lovable.app/kategoriler/bahce-bakimi" },
      { "@type": "ListItem", "position": 4, "name": "Sulama Sistemleri", "url": "https://peyzaj-rehberi-turkiye.lovable.app/kategoriler/sulama-sistemleri" },
      { "@type": "ListItem", "position": 5, "name": "Havuz Yapımı", "url": "https://peyzaj-rehberi-turkiye.lovable.app/kategoriler/havuz-yapimi" },
    ],
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Peyzaj Rehberi – Türkiye'nin En İyi Peyzaj Firmaları</title>
        <meta name="description" content="Türkiye genelinde en iyi peyzaj firmalarını karşılaştırın. 81 ilde bahçe tasarımı, peyzaj mimarlığı, sulama sistemleri ve daha fazlası. Ücretsiz teklif alın." />
        <link rel="canonical" href="https://peyzaj-rehberi-turkiye.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Navbar />
      <Hero onTeklifAl={() => setFormOpen(true)} />
      <FeaturedFirms />
      <HowItWorks />
      <PopularCategories />
      <FeaturedCities />
      
      <Footer />
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
};

export default Index;
