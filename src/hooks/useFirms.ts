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
};

export function useApprovedFirms() {
  return useQuery({
    queryKey: ["approved-firms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("id, company_name, city, district, services, description, phone, email")
        .eq("is_approved", true)
        .eq("is_active", true)
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
        .select("id, company_name, city, district, services, description, phone, email")
        .eq("is_approved", true)
        .eq("is_active", true)
        .eq("city", city)
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
        .select("id, company_name, city, district, services, description, phone, email, address")
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
