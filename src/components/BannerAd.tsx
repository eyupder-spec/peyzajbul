"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryUntyped } from "@/app/firma/panel/rpc";
import { trackBannerEvent } from "@/lib/trackFirmEvent";

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
  /**
   * Yerleşim anahtarı. Bölge sponsorları için kural: `sponsor:{kategori-slug}:{il-slug}`
   * (kategori src/lib/categories.ts CATEGORIES[].slug, il src/lib/cities.ts CITIES[].slug),
   * ör. `<BannerAd placement={`sponsor:${hizmet}:${il}`} variant="card" />`.
   */
  placement: string;
  className?: string;
  imageClassName?: string;
  /** `banner`: sabit boyutlu reklam alanı (varsayılan). `card`: bölge sponsoru için tam genişlikte çerçeveli kart. */
  variant?: "banner" | "card";
}

/**
 * Yalnızca https adreslere izin verir ve UTM etiketlerini (eksikse) bir kez ekler.
 * Geçersiz veya https olmayan adreste null döner: banner çizilmez.
 */
function buildOutboundUrl(targetUrl: string, placement: string): string | null {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const campaign = placement.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const defaults: [string, string][] = [
    ["utm_source", "peyzajbul"],
    ["utm_medium", "sponsor"],
    ["utm_campaign", campaign],
  ];
  for (const [key, value] of defaults) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

export default function BannerAd({ placement, className = "", imageClassName = "", variant = "banner" }: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewTracked, setViewTracked] = useState(false);

  // 1. Fetch Banner
  const { data: banner, isLoading } = useQuery({
    queryKey: ["banner", placement],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await queryUntyped<BannerRow[]>("banners", (q) =>
        q.select("*").eq("placement", placement).eq("is_active", true).gte("end_date", now).lte("start_date", now),
      );

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return null;

      // If multiple active banners for same placement, pick a random one
      const randomIndex = Math.floor(Math.random() * data.length);
      return data[randomIndex];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const finalUrl = banner ? buildOutboundUrl(banner.target_url, placement) : null;
  const bannerId = banner?.id;

  // 2. Track View via IntersectionObserver (server-side dedupe in record_banner_event)
  useEffect(() => {
    if (!bannerId || !finalUrl || viewTracked) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          trackBannerEvent(bannerId, "view");
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
  }, [bannerId, finalUrl, viewTracked]);

  // 3. Render Logics
  if (isLoading || !banner || !finalUrl) return null;

  const isCard = variant === "card";
  // Banner: mobil görsel yoksa küçük ekranlarda gizlenir. Kart: her ekranda görünür.
  const hasMobileImg = !!banner.image_url_mobile;
  const containerClass = isCard
    ? `w-full rounded-xl border border-border bg-card shadow-card ${className}`
    : hasMobileImg
      ? className
      : `hidden md:block ${className}`;
  const imageSizing = isCard ? "w-full h-auto max-h-64" : "w-full h-full";

  return (
    <div ref={containerRef} className={`relative overflow-hidden group ${containerClass}`}>
      <a
        href={finalUrl}
        onClick={() => trackBannerEvent(banner.id, "click")}
        className="block w-full h-full"
        title={banner.title}
        aria-label={`${banner.title} (Sponsorlu bağlantı)`}
        target="_blank"
        rel="sponsored noopener noreferrer"
      >
        <span className="absolute top-0 right-0 bg-black/60 text-white/80 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-bl-sm z-10 backdrop-blur-sm">
          Sponsorlu
        </span>

        {/* Desktop Image */}
        <div className={`relative w-full ${isCard ? "" : "h-full"} ${hasMobileImg ? "hidden md:block" : "block"}`}>
          <img
            src={banner.image_url_desktop}
            alt={banner.title}
            loading="lazy"
            className={`${imageSizing} object-cover transition-opacity duration-150 group-hover:opacity-95 ${imageClassName}`}
          />
        </div>

        {/* Mobile Image (Only rendered if exists) */}
        {hasMobileImg && (
          <div className={`relative w-full ${isCard ? "" : "h-full"} md:hidden block`}>
            <img
              src={banner.image_url_mobile!}
              alt={banner.title}
              loading="lazy"
              className={`${imageSizing} object-cover transition-opacity duration-150 group-hover:opacity-95 ${imageClassName}`}
            />
          </div>
        )}
      </a>
    </div>
  );
}
