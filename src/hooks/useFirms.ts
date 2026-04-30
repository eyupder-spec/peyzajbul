"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export type PublicFirm = {
  id: string;
  company_name: string;
  city: string;
  district: string | null;
  services: string[];
  description: string | null;
  phone: string;
  email: string;
  is_premium: boolean;
  google_maps_url: string | null;
  detailed_services: any[] | null;
  slug: string | null;
  website: string | null;
  logo_url: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_x: string | null;
  social_youtube: string | null;
  social_linkedin: string | null;
  response_time?: string | null;
  trust_badges?: any | null;
  faq_items?: any | null;
  before_after?: any | null;
  portfolio_items?: any | null;
  gallery_images?: string[];
};

const FIRM_SELECT = "id, company_name, city, district, services, description, phone, email, is_premium, premium_until, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items, firm_gallery(image_url)";

function attachGalleryImages(firms: any[]): PublicFirm[] {
  const now = new Date();
  return firms.map((firm) => {
    const isPremiumActive = firm.is_premium && firm.premium_until && new Date(firm.premium_until) > now;
    return {
      ...firm,
      is_premium: !!isPremiumActive, // Override the boolean so the rest of the UI doesn't show the badge!
      premium_until: undefined, // Don't leak to PublicFirm
      gallery_images: (firm.firm_gallery ?? []).map((g: any) => g.image_url).filter(Boolean),
      firm_gallery: undefined,
    };
  }).sort((a, b) => {
    // Re-sort because the DB sort might have put expired premiums at the top
    if (a.is_premium && !b.is_premium) return -1;
    if (!a.is_premium && b.is_premium) return 1;
    return 0; // Keep original created_at or other sorting for ties
  });
}

export function useApprovedFirms() {
  return useQuery({
    queryKey: ["approved-firms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select(FIRM_SELECT)
        .eq("is_approved", true)
        .eq("is_active", true)
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachGalleryImages(data ?? []);
    },
  });
}

export function useFirmsByCity(city: string) {
  return useQuery({
    queryKey: ["firms-by-city", city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select(FIRM_SELECT)
        .eq("is_approved", true)
        .eq("is_active", true)
        .eq("city", city)
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachGalleryImages(data ?? []);
    },
    enabled: !!city,
  });
}

export function useFirmById(firmId: string) {
  return useQuery({
    queryKey: ["firm-detail", firmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("id, company_name, city, district, services, description, phone, email, address, is_premium, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items")
        .eq("id", firmId)
        .eq("is_approved", true)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });
}

export function useFirmGallery(firmId: string) {
  return useQuery({
    queryKey: ["firm-gallery", firmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firm_gallery")
        .select("*")
        .eq("firm_id", firmId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });
}

export function useFirmReviews(firmId: string) {
  return useQuery({
    queryKey: ["firm-reviews", firmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firm_reviews")
        .select("*")
        .eq("firm_id", firmId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });
}

export function useFirmProjects(firmId: string) {
  return useQuery({
    queryKey: ["firm-projects", firmId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("projects")
        .select("*")
        .eq("firm_id", firmId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });
}
