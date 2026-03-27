"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

interface BannerRow {
  id: string;
  firm_id: string | null;
  title: string;
  image_url_desktop: string;
  image_url_mobile: string | null;
  target_url: string;
  placement: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface BannerAdProps {
  placement: string;
  className?: string;
  imageClassName?: string;
}

export default function BannerAd({ placement, className = "", imageClassName = "" }: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewTracked, setViewTracked] = useState(false);

  // 1. Fetch Banner
  const { data: banner, isLoading } = useQuery({
    queryKey: ["banner", placement],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from("banners")
        .select("*")
        .eq("placement", placement)
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString())
        .lte("start_date", new Date().toISOString());

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const banners = data as BannerRow[];
      // If multiple active banners for same placement, pick a random one
      const randomIndex = Math.floor(Math.random() * banners.length);
      return banners[randomIndex];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // 2. Track View via IntersectionObserver
  useEffect(() => {
    if (!banner || viewTracked) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Trigger RPC
          const client = supabase as any;
          client.rpc('track_banner_event', {
            p_banner_id: banner.id,
            p_event_type: 'view'
          }).catch((err: any) => console.error("Banner view tracking err:", err));
          
          setViewTracked(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the banner is visible
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [banner, viewTracked]);

  // 3. Track Click
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Asynchronously log the click, then open the URL.
    if (banner?.id) {
      const client = supabase as any;
      client.rpc('track_banner_event', {
        p_banner_id: banner.id,
        p_event_type: 'click'
      }).catch((err: any) => console.error("Banner click tracking err:", err));
    }
    
    // Open in new tab
    if (banner?.target_url) {
      window.open(banner.target_url, "_blank", "noopener,noreferrer");
    }
  };

  // 4. Render Logics
  if (isLoading || !banner) return null;

  // Responsive display logic:
  // If no mobile image, hide on mobile screens
  const hasMobileImg = !!banner.image_url_mobile;
  const containerClass = hasMobileImg ? className : `hidden md:block ${className}`;

  return (
    <div ref={containerRef} className={`relative overflow-hidden group ${containerClass}`}>
      <a 
        href={banner.target_url} 
        onClick={handleClick}
        className="block w-full h-full"
        title={banner.title}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="absolute top-0 right-0 bg-black/60 text-white/80 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-bl-sm z-10 backdrop-blur-sm">
          Sponsorlu
        </span>
        
        {/* Desktop Image */}
        <div className={`relative w-full h-full ${hasMobileImg ? 'hidden md:block' : 'block'}`}>
          <img 
            src={banner.image_url_desktop} 
            alt={banner.title} 
            className={`w-full h-full object-cover group-hover:opacity-95 transition-opacity ${imageClassName}`} 
          />
        </div>

        {/* Mobile Image (Only rendered if exists) */}
        {hasMobileImg && (
          <div className="relative w-full h-full md:hidden block">
            <img 
              src={banner.image_url_mobile!} 
              alt={banner.title} 
              className={`w-full h-full object-cover group-hover:opacity-95 transition-opacity ${imageClassName}`} 
            />
          </div>
        )}
      </a>
    </div>
  );
}
