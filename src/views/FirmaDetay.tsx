"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirmDetailContent from "@/components/FirmDetailContent";
import PremiumLandingPage from "@/components/premium-landing/PremiumLandingPage";

const FirmaDetay = ({ slug }: { slug?: string }) => {
  // Quick premium check
  const { data: firmMeta, isLoading } = useQuery({
    queryKey: ["firm-premium-check", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("firms")
        .select("is_premium, premium_until")
        .eq("slug", slug || "")
        .eq("is_approved", true)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const isPremiumActive = firmMeta?.is_premium && firmMeta?.premium_until && new Date(firmMeta.premium_until) > new Date();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {isPremiumActive && slug ? (
        <PremiumLandingPage slug={slug} />
      ) : (
        <FirmDetailContent slug={slug} />
      )}
      <Footer />
    </div>
  );
};

export default FirmaDetay;
