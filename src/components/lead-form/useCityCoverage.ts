"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Number of listed firms in a province, counted with the same filters as the province listing
 * (approved and active). `count` is null while loading, without a city or when the query fails.
 */
export function useCityCoverage(city: string): { count: number | null } {
  const { data } = useQuery({
    queryKey: ["lead-city-coverage", city],
    enabled: city.length > 0,
    staleTime: TEN_MINUTES,
    retry: 1,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("firms")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", true)
        .eq("is_active", true)
        .eq("city", city);
      if (error) throw error;
      return count ?? 0;
    },
  });
  return { count: city && typeof data === "number" ? data : null };
}
