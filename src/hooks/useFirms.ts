import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
};

export function useApprovedFirms() {
  return useQuery({
    queryKey: ["approved-firms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("id, company_name, city, district, services, description, phone, email, is_premium, google_maps_url, detailed_services")
        .eq("is_approved", true)
        .eq("is_active", true)
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PublicFirm[];
    },
  });
}

export function useFirmsByCity(city: string) {
  return useQuery({
    queryKey: ["firms-by-city", city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("id, company_name, city, district, services, description, phone, email, is_premium, google_maps_url, detailed_services")
        .eq("is_approved", true)
        .eq("is_active", true)
        .eq("city", city)
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PublicFirm[];
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
        .select("id, company_name, city, district, services, description, phone, email, address, is_premium, google_maps_url, detailed_services")
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
