"use client";

/* eslint-disable react-refresh/only-export-components -- pure helpers are exported next to the component so tests can import them */

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  BrickWall,
  Check,
  ChevronsUpDown,
  Droplets,
  Flower2,
  Images,
  MapPin,
  MapPinned,
  Scale,
  Scissors,
  ShieldCheck,
  Sprout,
  TreeDeciduous,
  Waves,
  type LucideIcon,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { track } from "@/lib/analytics";
import { CITIES, type CityData } from "@/lib/cities";
import { RESIDENTIAL_SERVICES, findCity, normalizeForSearch } from "@/lib/leadFormData";
import { formatAsOf } from "@/lib/publicStats";
import { cn } from "@/lib/utils";

/** What the hero hands to the lead form so the visitor does not retype the choice. */
export type LeadPrefill = { serviceType?: string; city?: string };

/** Counters the trust strip may show. projectCount stays optional until the public stats helper exposes it. */
export interface HeroStats {
  firmCount: number;
  cityCount: number;
  projectCount?: number | null;
  /** ISO timestamp of the moment the numbers were read. */
  updatedAt: string;
}

interface HeroProps {
  stats: HeroStats | null;
  onTeklifAl: (prefill?: LeadPrefill) => void;
}

/** A number below its floor reads as a weakness, so it stays hidden. */
const STAT_FLOORS = { firms: 50, cities: 10, projects: 50 } as const;
const MIN_NUMERIC_STATS = 2;

const ANY_SERVICE = "any";

/** Lead form service value -> SEO category slug, so "browse firms first" lands on the matching page. */
const LEAD_SERVICE_TO_CATEGORY: Record<string, string> = {
  "bahce-tasarimi": "bahce-tasarimi",
  "bahce-bakimi": "bahce-bakimi",
  "sulama-sistemi": "sulama-sistemleri",
  "sert-zemin": "sert-zemin",
  "bitki-agac": "agaclandirma",
  "havuz-cevresi": "havuz-yapimi",
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "bahce-tasarimi": Flower2,
  "bahce-bakimi": Scissors,
  "sulama-sistemi": Droplets,
  "sert-zemin": BrickWall,
  "bitki-agac": TreeDeciduous,
  "havuz-cevresi": Waves,
};

const QUICK_STARTS = [
  { label: "Villa bahçesi", serviceType: "bahce-tasarimi" },
  { label: "Otomatik sulama", serviceType: "sulama-sistemi" },
  { label: "Rulo çim", serviceType: "bitki-agac" },
  { label: "Havuz çevresi", serviceType: "havuz-cevresi" },
  { label: "Teras bahçesi", serviceType: "bahce-tasarimi" },
];

const BIG_CITY_SLUGS = ["istanbul", "ankara", "izmir", "antalya", "bursa"];
const BIG_CITIES = BIG_CITY_SLUGS.flatMap((slug) => CITIES.filter((city) => city.slug === slug));
const OTHER_CITIES = CITIES.filter((city) => !BIG_CITY_SLUGS.includes(city.slug)).sort((a, b) =>
  a.name.localeCompare(b.name, "tr"),
);

const QUALITATIVE_TRUST: { icon: LucideIcon; text: string }[] = [
  { icon: BadgeCheck, text: "Teklif talebi ücretsiz" },
  { icon: ShieldCheck, text: "Bağlayıcı değil" },
  { icon: Scale, text: "Teklifleri karşılaştırın" },
];

const STAT_ICONS = { firms: Building2, cities: MapPinned, projects: Images } satisfies Record<string, LucideIcon>;

const TEXT_SHADOW = "[text-shadow:0_1px_10px_hsl(var(--forest-deep)/0.5)]";

/** Lower-cases the Turkish way and strips diacritics, so `istanbul`, `İstanbul` and `ığdır` all compare equal. */
export const foldTr = normalizeForSearch;

/** The spelling the lead form expects (`Hakkâri`), or undefined when the name is not one of the 81 provinces. */
export function resolveLeadCity(name: string | null | undefined): string | undefined {
  return name ? (findCity(name) ?? undefined) : undefined;
}

/** Where "browse firms first" goes for the current selection. */
export function buildBrowseHref(service?: string, citySlug?: string): string {
  const category = service ? LEAD_SERVICE_TO_CATEGORY[service] : undefined;
  if (category && citySlug) return `/hizmet/${category}/${citySlug}`;
  if (citySlug) return `/iller/${citySlug}-peyzaj-firmalari`;
  if (category) return `/hizmetler/${category}`;
  return "/firmalar";
}

export interface TrustStat {
  key: keyof typeof STAT_ICONS;
  text: string;
}

const formatCount = (value: number) => value.toLocaleString("tr-TR");

/** Numeric trust items that clear their floor. Counts are listings, never "registered" firms. */
export function getVisibleStats(stats: HeroStats | null): TrustStat[] {
  if (!stats) return [];
  const items: TrustStat[] = [];
  if (stats.firmCount >= STAT_FLOORS.firms) {
    items.push({ key: "firms", text: `${formatCount(stats.firmCount)} peyzaj firması listeleniyor` });
  }
  if (stats.cityCount >= STAT_FLOORS.cities) {
    items.push({ key: "cities", text: `${formatCount(stats.cityCount)} ilde firma` });
  }
  if (stats.projectCount != null && stats.projectCount >= STAT_FLOORS.projects) {
    items.push({ key: "projects", text: `${formatCount(stats.projectCount)} yayınlanmış proje` });
  }
  return items;
}

const cityFilter = (value: string, search: string): number => {
  const query = foldTr(search.trim());
  if (!query) return 1;
  const slug = foldTr(value);
  if (slug.startsWith(query)) return 1;
  return slug.includes(query) ? 0.5 : 0;
};

const buildPrefill = (serviceType: string, city?: string): LeadPrefill | undefined => {
  if (!serviceType && !city) return undefined;
  return { ...(serviceType ? { serviceType } : {}), ...(city ? { city } : {}) };
};

const fieldClass =
  "flex h-14 w-full items-center rounded-xl border border-input bg-background text-base transition-colors duration-150 hover:border-primary/40";

const TrustStrip = ({ stats }: { stats: HeroStats | null }) => {
  const items = getVisibleStats(stats);
  const listClass = "flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/85";

  if (stats && items.length >= MIN_NUMERIC_STATS) {
    const asOf = formatAsOf(stats.updatedAt);
    return (
      <div className={TEXT_SHADOW}>
        <ul className={listClass}>
          {items.map((item) => {
            const Icon = STAT_ICONS[item.key];
            return (
              <li key={item.key} className="flex items-center gap-2">
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                {item.text}
              </li>
            );
          })}
        </ul>
        {asOf && <p className="mt-2 text-xs text-primary-foreground/80">Rehber verileri {asOf} itibarıyla</p>}
      </div>
    );
  }

  return (
    <ul className={cn(listClass, TEXT_SHADOW)}>
      {QUALITATIVE_TRUST.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          <Icon aria-hidden className="h-4 w-4 shrink-0" />
          {text}
        </li>
      ))}
    </ul>
  );
};

const Hero = ({ stats, onTeklifAl }: HeroProps) => {
  const [service, setService] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

  const selectedService = RESIDENTIAL_SERVICES.find((item) => item.value === service);
  const selectedCity = CITIES.find((city) => city.slug === citySlug);
  const leadCity = resolveLeadCity(selectedCity?.name);
  const browseHref = buildBrowseHref(service || undefined, citySlug || undefined);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    track("cta_click", { placement: "hero_search" });
    onTeklifAl(buildPrefill(service, leadCity));
  };

  const handleQuickStart = (serviceType: string) => {
    track("cta_click", { placement: "hero_chip" });
    onTeklifAl(buildPrefill(serviceType, leadCity));
  };

  const renderCity = (city: CityData) => (
    <CommandItem
      key={city.slug}
      value={city.slug}
      className="min-h-11"
      onSelect={() => {
        setCitySlug(city.slug === citySlug ? "" : city.slug);
        setCityOpen(false);
      }}
    >
      {city.name}
      <Check aria-hidden className={cn("ml-auto h-4 w-4", city.slug === citySlug ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );

  return (
    <section className="relative isolate flex min-h-[min(88svh,720px)] items-end pt-16 md:items-center">
      <Image
        src={heroBg}
        alt=""
        aria-hidden
        fill
        preload
        sizes="100vw"
        quality={75}
        placeholder="blur"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/45 to-primary/85 md:bg-gradient-to-r md:from-primary/75 md:via-primary/35 md:to-transparent"
      />

      <div className="container relative z-10 mx-auto px-4 pb-8 pt-10 md:py-16">
        <div className="max-w-3xl text-primary-foreground">
          <p className="inline-flex min-h-8 items-center rounded-full bg-primary/70 px-3.5 text-sm font-medium ring-1 ring-primary-foreground/25 backdrop-blur-sm">
            Ücretsiz teklif, bağlayıcı değil
          </p>
          <h1
            className={cn(
              "mt-4 font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.1] text-primary-foreground",
              TEXT_SHADOW,
            )}
          >
            Bahçeniz için doğru peyzaj firmasını bulun
          </h1>
          <p className={cn("mt-4 max-w-xl text-base text-primary-foreground md:text-lg", TEXT_SHADOW)}>
            Hizmeti ve ilinizi seçin, ücretsiz teklif isteyin. Teklifleri karşılaştırın, karar sizin.
          </p>

          <form
            role="search"
            aria-label="Peyzaj hizmeti ara"
            onSubmit={handleSubmit}
            className="mt-6 grid gap-2 rounded-2xl bg-card/95 p-2 text-foreground shadow-lift backdrop-blur-md md:grid-cols-[1.2fr_1fr_auto]"
          >
            <div className="relative">
              <Label htmlFor="hero-service" className="sr-only">
                Hizmet seçin
              </Label>
              <Sprout
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-primary"
              />
              <Select value={service} onValueChange={(next) => setService(next === ANY_SERVICE ? "" : next)}>
                <SelectTrigger
                  id="hero-service"
                  className={cn(
                    fieldClass,
                    "justify-between gap-2 py-0 pl-12 pr-4 data-[placeholder]:text-muted-foreground [&>span]:text-left",
                  )}
                >
                  <SelectValue placeholder="Hizmet seçin">{selectedService?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_SERVICE} className="min-h-11">
                    Fark etmez
                  </SelectItem>
                  {RESIDENTIAL_SERVICES.map((item) => {
                    const Icon = SERVICE_ICONS[item.value] ?? Sprout;
                    return (
                      <SelectItem key={item.value} value={item.value} className="min-h-11">
                        <span className="flex items-center gap-2">
                          <Icon aria-hidden className="h-4 w-4 text-primary" />
                          {item.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Label htmlFor="hero-city" className="sr-only">
                İl seçin
              </Label>
              <MapPin
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-primary"
              />
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="hero-city"
                    type="button"
                    role="combobox"
                    aria-expanded={cityOpen}
                    className={cn(fieldClass, "justify-between gap-2 pl-12 pr-4 text-left")}
                  >
                    <span className={cn("truncate", !selectedCity && "text-muted-foreground")}>
                      {selectedCity ? selectedCity.name : "İl seçin"}
                    </span>
                    <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
                  <Command filter={cityFilter}>
                    <CommandInput placeholder="İl ara" aria-label="İl ara" />
                    <CommandList>
                      <CommandEmpty>İl bulunamadı.</CommandEmpty>
                      <CommandGroup heading="Büyük şehirler">{BIG_CITIES.map(renderCity)}</CommandGroup>
                      <CommandGroup heading="Diğer iller">{OTHER_CITIES.map(renderCity)}</CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit" variant="accent" size="lg" className="h-14 w-full rounded-xl px-8 text-base md:w-auto">
              Ücretsiz Teklif Al
            </Button>
          </form>

          <Link
            href={browseHref}
            className={cn(
              "mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline underline-offset-4 transition-colors duration-150 hover:text-primary-foreground/80",
              TEXT_SHADOW,
            )}
          >
            Önce firmalara göz at
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>

          <div className="mt-2">
            <p id="hero-quick-starts" className={cn("text-sm text-primary-foreground/85", TEXT_SHADOW)}>
              Hızlı başlangıç:
            </p>
            <ul aria-labelledby="hero-quick-starts" className="mt-2 flex flex-wrap gap-2">
              {QUICK_STARTS.map((chip) => (
                <li key={chip.label}>
                  <button
                    type="button"
                    onClick={() => handleQuickStart(chip.serviceType)}
                    className="inline-flex min-h-11 items-center rounded-full bg-primary/60 px-4 text-sm font-medium text-primary-foreground ring-1 ring-primary-foreground/30 backdrop-blur-sm transition-colors duration-150 hover:bg-primary/80"
                  >
                    {chip.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <TrustStrip stats={stats} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
