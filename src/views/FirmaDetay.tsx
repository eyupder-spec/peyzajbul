"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirmDetailContent from "@/components/FirmDetailContent";

const FirmaDetay = ({ slug }: { slug?: string }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <FirmDetailContent slug={slug} />
      <Footer />
    </div>
  );
};

export default FirmaDetay;
