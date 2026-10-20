"use client";

/* eslint-disable react-refresh/only-export-components -- toWhatsappNumber is exported next to the component so tests can import it */

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { sendGAEvent } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Phone, Mail, ArrowLeft, BadgeCheck, Building2, Crown, Star, Image as ImageIcon, Globe, Eye, MessageCircle, Instagram, Facebook, Youtube, Linkedin, Twitter, Shield, CheckCircle, X, Camera, Send } from "lucide-react";
import { extractFirmIdFromSlug, getSocialUrl, generateFirmSlug } from "@/lib/firmUtils";
import { useFirmGallery, useFirmReviews, useFirmProjects } from "@/hooks/useFirms";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import BannerAd from "@/components/BannerAd";
import { useStickyCtaOverride } from "@/components/StickyCtaBar";
import { getCitySlug } from "@/lib/cities";
import { track } from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/lib/consent";
import { findCity } from "@/lib/leadFormData";
import { trackFirmEvent, useTrackProfileView, type FirmEventType as FirstPartyFirmEvent } from "@/lib/trackFirmEvent";
import { useState, useRef, useCallback, useEffect } from "react";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import { useToast } from "@/hooks/use-toast";

import FirmProductsSection from "@/components/FirmProductsSection";

interface TrustBadge {
  icon: string;
  label: string;
}

interface PortfolioItem {
  image_url: string;
  title: string;
  location?: string;
  date?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface DetailedService {
  title: string;
  description: string;
}

interface FirmDetail {
  id: string;
  company_name: string;
  city: string;
  district: string | null;
  services: string[] | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  is_premium: boolean | null;
  premium_until: string | null;
  is_claimed: boolean | null;
  google_maps_url: string | null;
  detailed_services: DetailedService[] | null;
  slug: string | null;
  website: string | null;
  logo_url: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_x: string | null;
  social_youtube: string | null;
  social_linkedin: string | null;
  response_time: string | null;
  trust_badges: TrustBadge[] | null;
  faq_items: FaqItem[] | null;
  before_after: { before?: string; after?: string } | null;
  portfolio_items: PortfolioItem[] | null;
}

interface FirmReview {
  id?: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
}

interface FirmGalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
}

interface FirmProject {
  id: string;
  title: string;
  slug: string;
  category: string;
  city: string;
  description: string | null;
  cover_image: string | null;
}

interface FirmDetailContentProps {
  isModal?: boolean;
  slug?: string;
  initialFirm?: FirmDetail | null;
  initialReviews?: FirmReview[];
  initialGallery?: FirmGalleryImage[];
}

const FIRM_SELECT = "id, company_name, city, district, services, description, phone, email, is_premium, premium_until, is_claimed, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items";
const RELATED_FIRM_SELECT = "id, company_name, slug, logo_url, city, description, services, is_premium, premium_until";

const WHATSAPP_MESSAGE = "Merhaba, Peyzajbul üzerinden profilinizi gördüm. Bahçem için teklif almak istiyorum.";

type QuotePlacement = "firm_header" | "firm_sidebar" | "firm_inline";
type FirmEventName =
  | "profile_view"
  | "quote_click"
  | "phone_reveal"
  | "email_reveal"
  | "call_click"
  | "whatsapp_click"
  | "website_click";

/**
 * GA event name -> first-party counter type (revealing the number counts as a call intent). The profile view is
 * counted by useTrackProfileView, so it has no entry here.
 */
const FIRST_PARTY_EVENT: Partial<Record<FirmEventName, FirstPartyFirmEvent>> = {
  quote_click: "quote_click",
  phone_reveal: "call_click",
  call_click: "call_click",
  whatsapp_click: "whatsapp_click",
  website_click: "website_click",
};

/** Every firm-page event goes through here: first-party counters (cookie-less) plus GA when the visitor consented. */
function emitFirmEvent(firm: Pick<FirmDetail, "id" | "is_claimed">, name: FirmEventName, extra?: Record<string, string>) {
  const counter = FIRST_PARTY_EVENT[name];
  if (counter) trackFirmEvent(firm.id, counter);
  if (!hasAnalyticsConsent()) return;
  try {
    sendGAEvent("event", name, { firm_id: firm.id, firm_claimed: !!firm.is_claimed, ...extra });
  } catch {
    // Analytics must never break the profile page.
  }
}

/** Premium only counts while it is paid up: the flag alone stays set after expiry. */
function isPremiumActive(firm: { is_premium?: boolean | null; premium_until?: string | null }): boolean {
  return !!firm.is_premium && !!firm.premium_until && new Date(firm.premium_until) > new Date();
}

/** `wa.me` number (905XXXXXXXXX) for a Turkish mobile phone, or null for landlines and anything unrecognised. */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  const international = digits.startsWith("90") ? digits : `90${digits}`;
  return /^905\d{9}$/.test(international) ? international : null;
}

const toTelHref = (phone: string | null | undefined): string | undefined => {
  const dialable = phone?.replace(/[^\d+]/g, "");
  return dialable ? `tel:${dialable}` : undefined;
};

function withUtm(website: string): string {
  const url = website.startsWith("http") ? website : `https://${website}`;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("utm_source", "peyzajbul.com");
    parsed.searchParams.set("utm_medium", "rehber");
    parsed.searchParams.set("utm_campaign", "profil_sayfasi");
    return parsed.toString();
  } catch {
    return url;
  }
}

const FirmDetailContent = ({ isModal = false, slug: propSlug, initialFirm, initialReviews, initialGallery }: FirmDetailContentProps) => {
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // If slug is passed as prop (from page.tsx), use it. Fall back to the route params otherwise.
  const slug = propSlug || (params?.slug as string | undefined);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Review form state
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhoto, setReviewPhoto] = useState<File | null>(null);
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const reviewFileRef = useRef<HTMLInputElement>(null);

  // Before/After slider
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const onMouseDown = () => { isDragging.current = true; };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging.current) handleSliderMove(e.clientX); };
  const onTouchMove = (e: React.TouchEvent) => { handleSliderMove(e.touches[0].clientX); };

  const { data: firm, isLoading } = useQuery<FirmDetail | null>({
    queryKey: ["firm-detail-slug", slug],
    queryFn: async () => {
      const firmId = slug ? extractFirmIdFromSlug(slug) : "";

      // First try by slug
      const query = supabase
        .from("firms")
        .select(FIRM_SELECT)
        .eq("slug", slug ?? "")
        .eq("is_approved", true)
        .eq("is_active", true)
        .maybeSingle();

      let { data, error } = await query;

      // If not found by slug, try by id (only if firmId looks like a valid UUID prefix)
      if (!data && !error && firmId && /^[0-9a-f]{8}$/i.test(firmId)) {
        const idQuery = await supabase
          .from("firms")
          .select(FIRM_SELECT)
          .like("id", `${firmId}%`)
          .eq("is_approved", true)
          .eq("is_active", true)
          .maybeSingle();
        data = idQuery.data;
        error = idQuery.error;
      }

      if (error) throw error;
      return data as unknown as FirmDetail | null;
    },
    enabled: !!slug && !initialFirm,
    initialData: initialFirm || undefined,
  });

  const { data: galleryData } = useFirmGallery(firm?.id || "");
  const { data: reviewData } = useFirmReviews(firm?.id || "");

  const gallery: FirmGalleryImage[] = initialGallery || galleryData || [];
  const reviews: FirmReview[] | undefined = initialReviews || reviewData;
  const { data: projectsData } = useFirmProjects(firm?.id || "");

  const { data: relatedFirms } = useQuery({
    queryKey: ["related-firms-detail", firm?.city, firm?.id],
    enabled: !!firm?.city,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!firm) return [];
      const { data } = await supabase
        .from("firms")
        .select(RELATED_FIRM_SELECT)
        .eq("is_approved", true)
        .eq("is_active", true)
        .eq("city", firm.city)
        .neq("id", firm.id)
        .order("is_premium", { ascending: false })
        .limit(20);

      if (!data) return [];
      return data.sort(() => 0.5 - Math.random()).slice(0, 4); // Pick 4 random
    }
  });

  const citySlug = getCitySlug(firm?.city || "");
  const projects = projectsData as FirmProject[] | undefined;

  const telHref = toTelHref(firm?.phone);
  const whatsappNumber = toWhatsappNumber(firm?.phone);
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : undefined;

  // First-party profile view (cookie-less, once per session); the GA event below only fires with analytics consent.
  useTrackProfileView(firm?.id);

  const viewedFirmId = useRef<string | null>(null);
  useEffect(() => {
    if (!firm || viewedFirmId.current === firm.id) return;
    viewedFirmId.current = firm.id;
    emitFirmEvent(firm, "profile_view");
  }, [firm]);

  // The shared mobile bar always shows this firm's Ara/WhatsApp. Only a claimed firm can receive the request;
  // for an unclaimed one the bar keeps the generic label and sends the request to the regional pool.
  useStickyCtaOverride(
    firm
      ? {
          firmId: firm.id,
          firmName: firm.company_name,
          targetsFirm: !!firm.is_claimed,
          initial: firm.is_claimed ? undefined : { city: findCity(firm.city) ?? undefined },
          phoneHref: telHref,
          whatsappHref,
          onCallClick: () => emitFirmEvent(firm, "call_click", { placement: "firm_sticky" }),
          onWhatsappClick: () => emitFirmEvent(firm, "whatsapp_click", { placement: "firm_sticky" }),
        }
      : null,
  );

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  }

  if (!firm) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 py-24">
        <p className="text-muted-foreground text-lg">Firma bulunamadı</p>
        <Link href="/firmalar"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Firmalara Dön</Button></Link>
      </div>
    );
  }

  const premiumActive = isPremiumActive(firm);
  const claimed = !!firm.is_claimed;
  const quoteLabel = claimed ? "Bu Firmadan Teklif Al" : "Ücretsiz Teklif Al";
  // An unclaimed firm cannot receive the request (it goes to the regional pool), so the page must not imply otherwise.
  const quoteScopeNote = claimed ? null : "Talebiniz bu firmaya değil, bölgenizdeki uygun firmalara iletilir.";

  const beforeUrl = firm.before_after?.before;
  const afterUrl = firm.before_after?.after;
  const trustBadges = firm.trust_badges ?? [];
  const portfolio = firm.portfolio_items ?? [];
  const detailedServices = firm.detailed_services ?? [];
  const faqItems = firm.faq_items ?? [];

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const openQuote = (placement: QuotePlacement) => {
    track("cta_click", { placement });
    emitFirmEvent(firm, "quote_click", { placement });
    setShowLeadModal(true);
  };

  const handleReviewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReviewPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setReviewPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReview = async () => {
    if (!firm || !reviewName.trim() || reviewRating === 0) return;
    setReviewSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (reviewPhoto) {
        const ext = reviewPhoto.name.split(".").pop();
        const originalName = reviewPhoto.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/g, "-").toLowerCase();
        const path = `${firm.id}/${originalName}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("firm-reviews")
          .upload(path, reviewPhoto);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("firm-reviews").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }
      const { error } = await supabase.from("firm_reviews").insert({
        firm_id: firm.id,
        reviewer_name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        photo_url: photoUrl,
      });
      if (error) throw error;
      setReviewSuccess(true);
      setReviewName(""); setReviewRating(0); setReviewComment("");
      setReviewPhoto(null); setReviewPhotoPreview(null);
      toast({ title: "Yorumunuz gönderildi!", description: "Admin onayından sonra yayınlanacaktır." });
      queryClient.invalidateQueries({ queryKey: ["firm-reviews", firm.id] });
    } catch {
      toast({ title: "Hata", description: "Yorum gönderilemedi, tekrar deneyin.", variant: "destructive" });
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <main className={isModal ? "" : "flex-1 pt-16"}>
      <div className="bg-primary py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4">
            <Link href="/firmalar" className="hover:text-primary-foreground">Firmalar</Link>
            <span>/</span>
            <Link href={`/iller/${citySlug}-peyzaj-firmalari`} className="hover:text-primary-foreground">{firm.city}</Link>
            <span>/</span>
            <span className="text-primary-foreground">{firm.company_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary-foreground/10 flex items-center justify-center overflow-hidden relative shrink-0">
              {firm.logo_url ? (
                <Image src={firm.logo_url} alt={firm.company_name} fill sizes="64px" className="object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-primary-foreground">{firm.company_name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <div className="flex items-center gap-1 text-primary-foreground/70">
                  <MapPin className="h-4 w-4" />
                  {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1 text-primary-foreground">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-primary-foreground/80 text-sm">{avgRating} ({reviews?.length} değerlendirme)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(claimed || premiumActive) && (
            <ul className="flex flex-wrap gap-2 mt-4">
              {claimed && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-sm font-medium text-verified">
                  <BadgeCheck aria-hidden className="h-4 w-4" /> Profil sahiplenildi
                </li>
              )}
              {premiumActive && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-sm font-medium text-verified">
                  <Crown aria-hidden className="h-4 w-4" /> Premium üye
                </li>
              )}
              {/* TODO(WP05 phone_verified_at): add a phone-verified chip once the column exists. */}
            </ul>
          )}

          <div className="flex flex-col gap-3 mt-5 sm:flex-row sm:items-center">
            <Button variant="accent" size="lg" className="w-full sm:w-auto" onClick={() => openQuote("firm_header")}>
              {quoteLabel}
            </Button>
            {whatsappHref ? (
              <Button asChild variant="ghost" size="lg" className="w-full gap-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => emitFirmEvent(firm, "whatsapp_click", { placement: "firm_header" })}>
                  <MessageCircle aria-hidden /> WhatsApp ile yaz
                </a>
              </Button>
            ) : telHref ? (
              <Button asChild variant="ghost" size="lg" className="w-full gap-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto">
                <a href={telHref} onClick={() => emitFirmEvent(firm, "call_click", { placement: "firm_header" })}>
                  <Phone aria-hidden /> Ara
                </a>
              </Button>
            ) : null}
          </div>
          {quoteScopeNote && <p className="mt-2 text-sm text-primary-foreground/80">{quoteScopeNote}</p>}

          {/* Sahiplenilmemiş profil: verinin kaynağı ve sahiplenme çağrısı sayfanın en üstünde, tek yerde. */}
          {!claimed && (
            <div className="mt-5 flex flex-col gap-1 border-t border-primary-foreground/15 pt-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
              <p className="text-primary-foreground/80">
                Kamuya açık kaynaklardan derlenmiştir – bu profil firma tarafından yönetilmiyor
              </p>
              <Link
                href={`/firma-sahiplen/${firm.id}`}
                className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary-foreground underline underline-offset-4 hover:no-underline"
              >
                <Shield aria-hidden className="h-4 w-4" /> Bu sizin firmanız mı? 2 dakikada sahiplenin
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* ===== TRUST ROZETLER ===== */}
            {premiumActive && trustBadges.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {trustBadges.map((b, i) => (
                    <span
                      key={i}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                    >
                      <span>{b.icon}</span> {b.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {firm.description && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-3">Hakkında</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{firm.description}</p>
              </div>
            )}

            {/* ===== ÖNCE/SONRA SLIDER ===== */}
            {premiumActive && beforeUrl && afterUrl && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Önce / Sonra</h2>
                <div
                  ref={sliderRef}
                  className="relative h-64 md:h-80 rounded-xl overflow-hidden cursor-col-resize select-none"
                  onMouseDown={onMouseDown}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onMouseMove={onMouseMove}
                  onTouchMove={onTouchMove}
                >
                  <img src={afterUrl} alt="Sonra" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                    <img src={beforeUrl} alt="Önce" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / sliderPos}%`, maxWidth: 'none' }} />
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Önce</span>
                  </div>
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Sonra</span>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl" style={{ left: `${sliderPos}%` }}>
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-foreground">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 9l-3 3 3 3M16 9l3 3-3 3" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== PORTFÖY GRİD ===== */}
            {premiumActive && portfolio.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Tamamlanan Projeler</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {portfolio.slice(0, 6).map((p, i) => (
                    <button
                      key={i}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden text-left shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => setSelectedImage(p.image_url)}
                    >
                      <Image
                        src={p.image_url}
                        alt={p.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                        <p className="text-white font-semibold text-sm leading-tight">{p.title}</p>
                        {p.location && <p className="text-white/80 text-[10px] mt-0.5">{p.location}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Projeler GRİD */}
            {projects && projects.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-heading text-xl font-semibold text-foreground">Projeler</h2>
                  <Badge variant="outline" className="font-normal text-[10px]">{projects.length} Proje</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/${p.category}/${citySlug}/${firm.slug}/${p.slug}`}
                      className="group relative rounded-xl border border-border overflow-hidden text-left shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col"
                    >
                      <div className="aspect-[16/9] relative bg-muted">
                        {p.cover_image ? (
                          <Image
                            src={p.cover_image}
                            alt={p.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[10px]">{p.category.replace(/-/g, " ")}</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{p.title}</h3>
                        {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">{p.description}</p>}
                        <div className="flex items-center text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 gap-1.5">
                          <MapPin className="h-3 w-3" /> {p.city}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery Section */}
            {gallery && gallery.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center justify-between">
                  Galeri
                  <Badge variant="outline" className="font-normal text-[10px]">{gallery.length} Fotoğraf</Badge>
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {gallery.slice(0, 10).map((img) => (
                    <button
                      key={img.id}
                      className="aspect-square rounded-lg overflow-hidden group relative border border-border/50"
                      onClick={() => setSelectedImage(img.image_url)}
                    >
                      <img src={img.image_url} alt={img.caption || `${firm.company_name} peyzaj projesi görseli`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                  {gallery.length > 10 && (
                    <Dialog open={showAllPhotos} onOpenChange={setShowAllPhotos}>
                      <DialogTrigger asChild>
                        <button className="aspect-square rounded-lg bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/80 transition-colors border border-dashed border-border shadow-sm">
                          <span className="text-sm font-bold">+{gallery.length - 10}</span>
                          <span className="text-[10px]">Daha Fazla</span>
                        </button>
                      </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{firm.company_name} Galeri</DialogTitle>
                            <DialogDescription className="sr-only">
                              Firmanın tüm fotoğraflarını içeren galeri görünümü.
                            </DialogDescription>
                          </DialogHeader>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                          {gallery.map((img) => (
                            <button
                              key={img.id}
                              className="aspect-square rounded-xl overflow-hidden group relative"
                              onClick={() => {
                                setSelectedImage(img.image_url);
                                setShowAllPhotos(false);
                              }}
                            >
                                <Image
                                  src={img.image_url}
                                  alt={img.caption || `${firm.company_name} peyzaj projesi detay görseli`}
                                  fill
                                  sizes="(max-width: 768px) 50vw, 33vw"
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            )}

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-3">Sunulan Hizmetler</h2>
              <div className="flex flex-wrap gap-2">
                {firm.services?.map((s) => (
                  <Badge key={s} variant="secondary" className="text-sm py-1 px-3">{s}</Badge>
                ))}
              </div>
            </div>

            {/* Teklif çağrısı: sahiplenilmiş firmaya yönelik, aksi halde bölge geneli */}
            <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {claimed ? "Bu hizmetler için fiyat teklifi alın" : "Bölgenizdeki firmalardan ücretsiz teklif alın"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quoteScopeNote ? `${quoteScopeNote} Bağlayıcı değil.` : "Ücretsiz • Bağlayıcı değil"}
                </p>
              </div>
              <Button variant="accent" size="lg" className="w-full sm:w-auto" onClick={() => openQuote("firm_inline")}>
                {quoteLabel}
              </Button>
            </div>

            {/* Detailed Services */}
            {premiumActive && detailedServices.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Detaylı Hizmetler</h2>
                <div className="space-y-4">
                  {detailedServices.map((ds, i) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-4">
                      <h3 className="font-heading font-semibold text-foreground">{ds.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== ÜRÜNLER (Bitkiler + Serbest Ürünler) ===== */}
            {premiumActive && <FirmProductsSection firmId={firm.id} firmName={firm.company_name} firmLogoUrl={firm.logo_url || undefined} />}


            {/* Reviews */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" /> Müşteri Değerlendirmeleri
                {reviews && reviews.length > 0 && (
                  <Badge variant="outline" className="font-normal text-[10px] ml-auto">{reviews.length} Yorum</Badge>
                )}
              </h2>

              {/* Existing Reviews */}
              {reviews && reviews.length > 0 && (
                <div className="space-y-4 mb-6">
                  {reviews.map((review, reviewIndex) => (
                    <div key={review.id ?? reviewIndex} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground">{review.reviewer_name}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? "text-primary fill-current" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                      {review.photo_url && (
                        <button onClick={() => setSelectedImage(review.photo_url)} className="mt-2 rounded-lg overflow-hidden border border-border/50 hover:opacity-90 transition-opacity">
                          <img src={review.photo_url} alt="Yorum fotoğrafı" className="h-24 w-auto object-cover rounded-lg" />
                        </button>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(review.created_at).toLocaleDateString("tr-TR")}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Yorum Yap Button + Collapsible Form */}
              {!reviewFormOpen && !reviewSuccess && (
                <div className="border-t border-border pt-4">
                  <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setReviewFormOpen(true)}>
                    <MessageCircle className="h-4 w-4" /> Yorum Yap
                  </Button>
                </div>
              )}

              {reviewFormOpen && !reviewSuccess && (
                <div className="border-t border-border pt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-base font-semibold text-foreground">Yorum Bırakın</h3>
                    <button onClick={() => setReviewFormOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="review-name" className="text-sm">Adınız *</Label>
                      <Input id="review-name" placeholder="Ad Soyad" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Puanınız *</Label>
                      <div className="flex items-center gap-1 h-9">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseEnter={() => setReviewHoverRating(i + 1)}
                            onMouseLeave={() => setReviewHoverRating(0)}
                            onClick={() => setReviewRating(i + 1)}
                            className="transition-transform hover:scale-125"
                          >
                            <Star className={`h-6 w-6 ${i < (reviewHoverRating || reviewRating) ? "text-primary fill-current" : "text-muted-foreground/30"}`} />
                          </button>
                        ))}
                        {reviewRating > 0 && <span className="text-sm text-muted-foreground ml-2">{reviewRating}/5</span>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="review-comment" className="text-sm">Yorumunuz</Label>
                    <Textarea id="review-comment" placeholder="Deneyiminizi paylaşın..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Fotoğraf (Opsiyonel)</Label>
                    <div className="flex items-center gap-3">
                      <input ref={reviewFileRef} type="file" accept="image/*" onChange={handleReviewPhotoChange} className="hidden" />
                      <Button type="button" variant="outline" size="sm" onClick={() => reviewFileRef.current?.click()} className="gap-1.5">
                        <Camera className="h-4 w-4" /> Fotoğraf Ekle
                      </Button>
                      {reviewPhotoPreview && (
                        <div className="relative">
                          <img src={reviewPhotoPreview} alt="Önizleme" className="h-14 w-14 object-cover rounded-lg border border-border" />
                          <button onClick={() => { setReviewPhoto(null); setReviewPhotoPreview(null); }} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleSubmitReview} disabled={reviewSubmitting || !reviewName.trim() || reviewRating === 0} className="gap-2">
                    {reviewSubmitting ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gönderiliyor...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Yorum Gönder</>
                    )}
                  </Button>
                </div>
              )}

              {reviewSuccess && (
                <div className="border-t border-border pt-6 text-center py-8">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="font-semibold text-foreground">Yorumunuz başarıyla gönderildi!</p>
                  <p className="text-sm text-muted-foreground mt-1">Admin onayından sonra burada görünecektir.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { setReviewSuccess(false); setReviewFormOpen(false); }}>Tamam</Button>
                </div>
              )}
            </div>

            {/* F.A.Q. */}
            {premiumActive && faqItems.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Sık Sorulan Sorular</h2>
                <Accordion type="single" collapsible className="space-y-1">
                  {faqItems.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-medium text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Premium Olmayanlar için İlgili Firmalar */}
            {!premiumActive && relatedFirms && relatedFirms.length > 0 && (
              <div className="mt-8">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                  {firm.city} İlindeki Diğer Firmalar
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {relatedFirms.map((rf) => {
                    const rfSlug = rf.slug || generateFirmSlug(rf.company_name, rf.id);
                    return (
                      <Link key={rf.id} href={`/firma/${rfSlug}`} className="block group">
                        <div className="border border-border/60 rounded-xl p-4 flex flex-col h-full bg-card hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border/50 overflow-hidden relative">
                              {rf.logo_url ? (
                                <Image src={rf.logo_url} alt={rf.company_name} fill sizes="40px" className="object-cover" />
                              ) : (
                                <span className="font-heading font-bold text-primary text-sm">{rf.company_name[0]}</span>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <h3 className="font-heading font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{rf.company_name}</h3>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{rf.city}</span>
                              </div>
                            </div>
                          </div>
                          {isPremiumActive(rf) && (
                            <Badge className="bg-accent/10 text-accent gap-1 text-[10px] shadow-sm w-fit mb-2 border-accent/20">
                              <Crown className="h-3 w-3" /> Premium
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-auto">
                            {rf.description || (rf.services && rf.services.length > 0 && rf.services.join(", ")) || "Peyzaj Hizmetleri"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border p-6 space-y-4">
              <h3 className="font-heading text-lg font-semibold text-foreground">İletişim</h3>
              <div className="space-y-3">
                {firm.phone && (showPhone ? (
                  <a href={telHref} onClick={() => emitFirmEvent(firm, "call_click", { placement: "firm_contact" })} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-4 w-4 text-primary" /> {firm.phone}
                  </a>
                ) : (
                  <button
                    onClick={() => { setShowPhone(true); emitFirmEvent(firm, "phone_reveal"); }}
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <Phone className="h-4 w-4 text-primary" /> <Eye className="h-3.5 w-3.5" /> Telefonu Göster
                  </button>
                ))}
                {firm.email && (showEmail ? (
                  <a href={`mailto:${firm.email.replace(/^https?:\/\//, "")}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-4 w-4 text-primary" /> {firm.email.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <button
                    onClick={() => { setShowEmail(true); emitFirmEvent(firm, "email_reveal"); }}
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <Mail className="h-4 w-4 text-primary" /> <Eye className="h-3.5 w-3.5" /> E-postayı Göster
                  </button>
                ))}
                {premiumActive && firm.website && (
                  <a href={withUtm(firm.website)} target="_blank" rel="noopener noreferrer" onClick={() => emitFirmEvent(firm, "website_click")} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Globe className="h-4 w-4 text-primary" /> {firm.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                </div>
              </div>

              {premiumActive && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Sosyal Medya</p>
                  <div className="flex items-center gap-3">
                    {firm.social_instagram && (
                      <a href={getSocialUrl('instagram', firm.social_instagram)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#E4405F] transition-colors">
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {firm.social_facebook && (
                      <a href={getSocialUrl('facebook', firm.social_facebook)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#1877F2] transition-colors">
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {firm.social_x && (
                      <a href={getSocialUrl('x', firm.social_x)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {firm.social_youtube && (
                      <a href={getSocialUrl('youtube', firm.social_youtube)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#FF0000] transition-colors">
                        <Youtube className="h-5 w-5" />
                      </a>
                    )}
                    {firm.social_linkedin && (
                      <a href={getSocialUrl('linkedin', firm.social_linkedin)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0A66C2] transition-colors">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <Button variant="accent" size="lg" className="w-full" onClick={() => openQuote("firm_sidebar")}>
                {quoteLabel}
              </Button>
              {quoteScopeNote && <p className="text-center text-xs text-muted-foreground">{quoteScopeNote}</p>}

              {whatsappHref ? (
                <Button asChild variant="outline" className="w-full gap-2 text-primary">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => emitFirmEvent(firm, "whatsapp_click", { placement: "firm_sidebar" })}>
                    <MessageCircle aria-hidden /> WhatsApp ile İletişim
                  </a>
                </Button>
              ) : telHref ? (
                <Button asChild variant="outline" className="w-full gap-2 text-primary">
                  <a href={telHref} onClick={() => emitFirmEvent(firm, "call_click", { placement: "firm_sidebar" })}>
                    <Phone aria-hidden /> Ara
                  </a>
                </Button>
              ) : null}
            </div>

            {/* Reklam Alanı: Profil Sağ Kolon Kare (300x250 vb.) */}
            <div className="mt-6">
              <BannerAd placement="sidebar_right" className="w-[300px] min-h-[250px] mx-auto xl:w-[336px] xl:min-h-[280px] rounded-2xl shadow-sm border border-border" />
            </div>

          </div>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white"><X className="h-8 w-8" /></button>
          <img src={selectedImage} alt="Large" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Teklif Modalı: sahiplenilmiş firmaya doğrudan, aksi halde genel talep */}
      <LeadFormModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        source="firm_profile"
        targetFirmId={claimed ? firm.id : undefined}
        targetFirmName={claimed ? firm.company_name : undefined}
        initial={claimed ? undefined : { city: findCity(firm.city) ?? undefined }}
      />
    </main>
  );
};

export default FirmDetailContent;
