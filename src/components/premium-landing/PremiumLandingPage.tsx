"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Crown, Star, Globe, Eye, Instagram, Facebook, Youtube, Linkedin, Twitter, Building2, ArrowLeft, X, Camera, Send, CheckCircle, MessageCircle } from "lucide-react";
import { extractFirmIdFromSlug, getSocialUrl } from "@/lib/firmUtils";
import { useFirmGallery, useFirmReviews, useFirmProjects } from "@/hooks/useFirms";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { getCitySlug } from "@/lib/cities";
import { useState, useRef, useCallback } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import { useToast } from "@/hooks/use-toast";
import FirmProductsSection from "@/components/FirmProductsSection";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type LandingSections = {
  hero: boolean;
  about: boolean;
  services: boolean;
  detailed_services: boolean;
  gallery: boolean;
  portfolio: boolean;
  before_after: boolean;
  trust_badges: boolean;
  faq: boolean;
  google_maps: boolean;
  contact: boolean;
  social_media: boolean;
  reviews: boolean;
  products: boolean;
};

type LandingConfig = {
  hero_image: string | null;
  hero_slogan: string | null;
  sections: LandingSections;
};

const DEFAULT_SECTIONS: LandingSections = {
  hero: true,
  about: true,
  services: true,
  detailed_services: true,
  gallery: true,
  portfolio: true,
  before_after: true,
  trust_badges: true,
  faq: true,
  google_maps: true,
  contact: true,
  social_media: true,
  reviews: true,
  products: true,
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
interface PremiumLandingPageProps {
  slug: string;
}

const PremiumLandingPage = ({ slug }: PremiumLandingPageProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: firm, isLoading } = useQuery({
    queryKey: ["premium-landing", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("id, company_name, city, district, services, description, phone, email, is_premium, is_claimed, google_maps_url, detailed_services, slug, website, logo_url, address, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items, landing_config")
        .eq("slug", slug)
        .eq("is_approved", true)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  const { data: gallery } = useFirmGallery(firm?.id || "");
  const { data: reviews } = useFirmReviews(firm?.id || "");
  const { data: projectsData } = useFirmProjects(firm?.id || "");
  const projects = projectsData as any[] | undefined;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 py-24">
        <p className="text-muted-foreground text-lg">Firma bulunamadı</p>
        <Link href="/firmalar"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Firmalara Dön</Button></Link>
      </div>
    );
  }

  const config: LandingConfig = firm.landing_config || { hero_image: null, hero_slogan: null, sections: DEFAULT_SECTIONS };
  const sections = { ...DEFAULT_SECTIONS, ...(config.sections || {}) };
  const citySlug = getCitySlug(firm.city);

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const hasTrustBadges = firm.trust_badges && firm.trust_badges.length > 0;
  const hasBeforeAfter = firm.before_after?.before && firm.before_after?.after;
  const hasPortfolio = firm.portfolio_items && firm.portfolio_items.length > 0;
  const hasDetailedServices = firm.detailed_services && (firm.detailed_services as any[]).length > 0;
  const hasFaq = firm.faq_items && firm.faq_items.length > 0;
  const hasGoogleMaps = !!firm.google_maps_url;
  const hasGallery = gallery && gallery.length > 0;
  const hasYoutubeVideos = firm.youtube_videos && (firm.youtube_videos as any[]).length > 0;
  const hasReviews = reviews && reviews.length > 0;
  const hasSocial = firm.social_instagram || firm.social_facebook || firm.social_x || firm.social_youtube || firm.social_linkedin;

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
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
    <main className="flex-1 pt-16">

      {/* ═══════════════ HERO ═══════════════ */}
      {sections.hero && (
        <section className="relative overflow-hidden">
          {/* Background */}
          {config.hero_image ? (
            <div className="absolute inset-0">
              <Image src={config.hero_image} alt={firm.company_name} fill className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
          )}

          <div className="relative container mx-auto px-4 py-24 md:py-32 lg:py-40">
            <div className="max-w-3xl">
              {/* Logo + Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden relative shadow-lg">
                  {firm.logo_url ? (
                    <Image src={firm.logo_url} alt={firm.company_name} fill sizes="80px" className="object-cover" />
                  ) : (
                    <Building2 className="h-10 w-10 text-white/80" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-md">
                      {firm.company_name}
                    </h1>
                    <Badge className="bg-yellow-500/90 text-white gap-1 shadow-md">
                      <Crown className="h-3.5 w-3.5" /> Premium
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-white/80">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{firm.city}{firm.district ? ` / ${firm.district}` : ""}</span>
                    </div>
                    {avgRating && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-white/80 text-sm">{avgRating} ({reviews?.length})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Slogan */}
              {config.hero_slogan && (
                <p className="text-xl md:text-2xl text-white/90 font-light leading-relaxed max-w-2xl mb-8">
                  {config.hero_slogan}
                </p>
              )}

              {/* Response time badge */}
              {firm.response_time && (
                <Badge variant="outline" className="border-white/30 text-white/90 bg-white/10 backdrop-blur-sm">
                  ⚡ {firm.response_time}
                </Badge>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 mt-8">
                <Button
                  size="lg"
                  variant="gold"
                  className="h-12 px-6 gap-2 shadow-lg"
                  onClick={() => setShowLeadModal(true)}
                >
                  <Crown className="h-5 w-5" /> Teklif Al
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white bg-black/20 hover:bg-black/50 hover:text-white gap-2 h-12 px-6" onClick={() => {
                  document.getElementById("landing-contact")?.scrollIntoView({ behavior: "smooth" });
                }}>
                  <Phone className="h-5 w-5" /> İletişim Bilgileri
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ TRUST BADGES ═══════════════ */}
      {sections.trust_badges && hasTrustBadges && (
        <section className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap justify-center gap-3">
              {(firm.trust_badges as { icon: string; label: string }[]).map((b, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full px-4 py-2 text-sm font-medium"
                >
                  <span className="text-lg">{b.icon}</span> {b.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-16">

          {/* ═══════════════ ABOUT ═══════════════ */}
          {sections.about && firm.description && (
            <section>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Hakkımızda</h2>
              <p className="text-muted-foreground leading-relaxed text-lg whitespace-pre-wrap">{firm.description}</p>
            </section>
          )}

          {/* ═══════════════ SERVICES ═══════════════ */}
          {sections.services && firm.services && firm.services.length > 0 && (
            <section>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Hizmetlerimiz</h2>
              <div className="flex flex-wrap gap-2 mb-8">
                {firm.services.slice(0, showAllServices ? undefined : 6).map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-sm py-2 px-4 shadow-sm">{s}</Badge>
                ))}
                {!showAllServices && firm.services.length > 6 && (
                  <button onClick={() => setShowAllServices(true)} className="text-sm text-primary font-medium hover:underline flex items-center gap-1 py-1 px-2">
                    + {firm.services.length - 6} Daha Gör
                  </button>
                )}
                {showAllServices && firm.services.length > 6 && (
                  <button onClick={() => setShowAllServices(false)} className="text-sm text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 py-1 px-2">
                    Daha Az
                  </button>
                )}
              </div>

              {/* Detailed Services */}
              {sections.detailed_services && hasDetailedServices && (
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {(firm.detailed_services as any[]).map((ds: any, i: number) => (
                    <div key={i} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                      <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{ds.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{ds.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ═══════════════ PRODUCTS ═══════════════ */}
          {sections.products && (
            <FirmProductsSection firmId={firm.id} />
          )}

          {/* ═══════════════ BEFORE/AFTER ═══════════════ */}
          {sections.before_after && hasBeforeAfter && (
            <section>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Önce / Sonra</h2>
              <div
                ref={sliderRef}
                className="relative h-72 md:h-96 rounded-2xl overflow-hidden cursor-col-resize select-none shadow-lg border border-border"
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onMouseMove={onMouseMove}
                onTouchMove={onTouchMove}
              >
                <img src={firm.before_after.after} alt="Sonra" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                  <img src={firm.before_after.before} alt="Önce" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / sliderPos}%`, maxWidth: "none" }} />
                  <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full font-medium">Önce</span>
                </div>
                <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full font-medium">Sonra</span>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl" style={{ left: `${sliderPos}%` }}>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-foreground">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 9l-3 3 3 3M16 9l3 3-3 3" /></svg>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════ VIDEO GALLERY ═══════════════ */}
          {hasYoutubeVideos && (
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Video Galeri</h2>
                <Badge variant="outline" className="font-normal">{(firm.youtube_videos as any[]).length} Video</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {(firm.youtube_videos as { url: string; title: string }[]).map((vid, i) => {
                  const embedUrl = getYouTubeEmbedUrl(vid.url);
                  if (!embedUrl) return null;
                  return (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="aspect-video rounded-xl overflow-hidden border border-border shadow-sm">
                        <iframe
                          src={embedUrl}
                          title={vid.title || "YouTube video player"}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                      {vid.title && <p className="text-sm font-medium text-foreground px-1">{vid.title}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══════════════ PORTFOLIO ═══════════════ */}
          {sections.portfolio && hasPortfolio && (
            <section>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Tamamlanan Projeler</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(firm.portfolio_items as { image_url: string; title: string; location?: string }[]).map((p, i) => (
                  <button
                    key={i}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden text-left shadow-sm hover:shadow-lg transition-all"
                    onClick={() => setSelectedImage(p.image_url)}
                  >
                    <Image src={p.image_url} alt={p.title} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <p className="text-white font-semibold text-sm">{p.title}</p>
                      {p.location && <p className="text-white/70 text-xs mt-0.5">{p.location}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════ PUBLISHED PROJECTS ═══════════════ */}
          {projects && projects.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Projeler</h2>
                <Badge variant="outline" className="font-normal">{projects.length} Proje</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/${p.category}/${citySlug}/${firm.slug}/${p.slug}`}
                    className="group rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/50 transition-all flex flex-col bg-card"
                  >
                    <div className="aspect-[16/9] relative bg-muted">
                      {p.cover_image ? (
                        <Image src={p.cover_image} alt={p.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-[10px]">{p.category.replace(/-/g, " ")}</Badge>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{p.title}</h3>
                      {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">{p.description}</p>}
                      <div className="flex items-center text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 gap-1.5">
                        <MapPin className="h-3 w-3" /> {p.city}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════ GALLERY ═══════════════ */}
          {sections.gallery && hasGallery && (
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Galeri</h2>
                <Badge variant="outline" className="font-normal">{gallery!.length} Fotoğraf</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {gallery!.map((img) => (
                  <button
                    key={img.id}
                    className="aspect-square rounded-xl overflow-hidden group relative border border-border/50 shadow-sm hover:shadow-md transition-all"
                    onClick={() => setSelectedImage(img.image_url)}
                  >
                    <img src={img.image_url} alt={img.caption || `${firm.company_name} özel peyzaj galerisi`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════ REVIEWS ═══════════════ */}
          <section>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" /> Müşteri Değerlendirmeleri
              {hasReviews && (
                <Badge variant="outline" className="font-normal ml-auto">{reviews!.length} Yorum</Badge>
              )}
            </h2>

            {/* Existing Reviews */}
            {hasReviews && (
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {reviews!.map((review: any) => (
                  <div key={review.id} className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-foreground">{review.reviewer_name}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-current" : "text-muted"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                    {review.photo_url && (
                      <button onClick={() => setSelectedImage(review.photo_url)} className="mt-3 rounded-lg overflow-hidden border border-border/50 hover:opacity-90 transition-opacity">
                        <img src={review.photo_url} alt="Yorum fotoğrafı" className="h-28 w-auto object-cover rounded-lg" />
                      </button>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-2">{new Date(review.created_at).toLocaleDateString("tr-TR")}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Yorum Yap Button + Collapsible Form */}
            {!reviewFormOpen && !reviewSuccess && (
              <div className="pt-2">
                <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setReviewFormOpen(true)}>
                  <MessageCircle className="h-4 w-4" /> Yorum Yap
                </Button>
              </div>
            )}

            {reviewFormOpen && !reviewSuccess && (
              <div className="bg-card rounded-xl border border-border p-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-lg font-semibold text-foreground">Yorum Bırakın</h3>
                  <button onClick={() => setReviewFormOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="premium-review-name" className="text-sm">Adınız *</Label>
                      <Input id="premium-review-name" placeholder="Ad Soyad" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
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
                            <Star className={`h-6 w-6 ${i < (reviewHoverRating || reviewRating) ? "text-yellow-500 fill-current" : "text-muted-foreground/30"}`} />
                          </button>
                        ))}
                        {reviewRating > 0 && <span className="text-sm text-muted-foreground ml-2">{reviewRating}/5</span>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="premium-review-comment" className="text-sm">Yorumunuz</Label>
                    <Textarea id="premium-review-comment" placeholder="Deneyiminizi paylaşın..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
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
              </div>
            )}
            
            {reviewSuccess && (
              <div className="bg-card rounded-xl border border-border p-6 text-center py-10 mt-6">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-semibold text-foreground text-lg">Yorumunuz başarıyla gönderildi!</p>
                <p className="text-sm text-muted-foreground mt-1">Admin onayından sonra burada görünecektir.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => { setReviewSuccess(false); setReviewFormOpen(false); }}>Tamam</Button>
              </div>
            )}

            {/* Schema Markup: AggregateRating + Reviews */}
            {hasReviews && (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "LocalBusiness",
                    "name": firm.company_name,
                    "address": {
                      "@type": "PostalAddress",
                      "addressLocality": firm.city,
                      ...(firm.district ? { "addressRegion": firm.district } : {}),
                    },
                    ...(firm.logo_url ? { "image": firm.logo_url } : {}),
                    "aggregateRating": {
                      "@type": "AggregateRating",
                      "ratingValue": avgRating,
                      "reviewCount": reviews.length,
                      "bestRating": "5",
                      "worstRating": "1",
                    },
                    ...(firm.telephone || firm.phone ? { "telephone": firm.phone } : {}),
                    ...(firm.website ? { "url": firm.website } : {}),
                    ...(firm.description ? { "description": firm.description.substring(0, 150) } : {}),
                    "review": reviews.map((r: any) => ({
                      "@type": "Review",
                      "author": { "@type": "Person", "name": r.reviewer_name },
                      "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": r.rating,
                        "bestRating": "5",
                        "worstRating": "1",
                      },
                      ...(r.comment ? { "reviewBody": r.comment } : {}),
                      ...(r.photo_url ? { "image": r.photo_url } : {}),
                      "datePublished": r.created_at?.split("T")[0],
                    })),
                  }),
                }}
              />
            )}
          </section>

          {/* ═══════════════ FAQ ═══════════════ */}
          {sections.faq && hasFaq && (
            <section>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Sık Sorulan Sorular</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {(firm.faq_items as { question: string; answer: string }[]).map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-5 bg-card">
                    <AccordionTrigger className="text-sm font-medium text-left py-4">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* ═══════════════ GOOGLE MAPS ═══════════════ */}
          {sections.google_maps && hasGoogleMaps && (
            <section>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Konum</h2>
              <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                <iframe
                  src={firm.google_maps_url}
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${firm.company_name} Konum`}
                />
              </div>
            </section>
          )}

          {/* ═══════════════ CONTACT ═══════════════ */}
          {sections.contact && (
            <section id="landing-contact">
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">İletişim</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <div className="space-y-3">
                    {showPhone ? (
                      <a href={`tel:${firm.phone}`} className="flex items-center gap-3 text-foreground hover:text-primary transition-colors font-medium">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Phone className="h-5 w-5 text-primary" /></div>
                        {firm.phone}
                      </a>
                    ) : (
                      <button onClick={() => setShowPhone(true)} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Phone className="h-5 w-5 text-primary" /></div>
                        <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Telefonu Göster</span>
                      </button>
                    )}

                    {showEmail ? (
                      <a href={`mailto:${firm.email?.replace(/^https?:\/\//, "")}`} className="flex items-center gap-3 text-foreground hover:text-primary transition-colors font-medium">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
                        {firm.email?.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <button onClick={() => setShowEmail(true)} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
                        <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> E-postayı Göster</span>
                      </button>
                    )}

                    {firm.website && (() => {
                      let utmUrl = firm.website.startsWith("http") ? firm.website : `https://${firm.website}`;
                      try {
                        const urlObj = new URL(utmUrl);
                        urlObj.searchParams.set("utm_source", "peyzajbul.com");
                        urlObj.searchParams.set("utm_medium", "rehber");
                        urlObj.searchParams.set("utm_campaign", "ozel_sayfa");
                        utmUrl = urlObj.toString();
                      } catch (e) {}

                      return (
                        <a href={utmUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Globe className="h-5 w-5 text-primary" /></div>
                          {firm.website.replace(/^https?:\/\//, "")}
                        </a>
                      );
                    })()}

                    {firm.address && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin className="h-5 w-5 text-primary" /></div>
                        {firm.address}, {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Direkt Teklif Al CTA */}
                  <Button
                    size="lg"
                    variant="gold"
                    className="w-full h-14 text-lg gap-2 shadow-md"
                    onClick={() => setShowLeadModal(true)}
                  >
                    <Crown className="h-5 w-5" /> Bu Firmadan Teklif Al
                  </Button>

                  {/* Social Media */}
                  {sections.social_media && hasSocial && (
                    <div className="bg-card rounded-xl border border-border p-6">
                      <p className="text-sm font-medium text-muted-foreground mb-4">Sosyal Medya</p>
                      <div className="flex items-center gap-4">
                        {firm.social_instagram && (
                          <a href={getSocialUrl("instagram", firm.social_instagram)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm">
                            <Instagram className="h-5 w-5" />
                          </a>
                        )}
                        {firm.social_facebook && (
                          <a href={getSocialUrl("facebook", firm.social_facebook)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm">
                            <Facebook className="h-5 w-5" />
                          </a>
                        )}
                        {firm.social_x && (
                          <a href={getSocialUrl("x", firm.social_x)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center text-background hover:scale-110 transition-transform shadow-sm">
                            <Twitter className="h-5 w-5" />
                          </a>
                        )}
                        {firm.social_youtube && (
                          <a href={getSocialUrl("youtube", firm.social_youtube)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-[#FF0000] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm">
                            <Youtube className="h-5 w-5" />
                          </a>
                        )}
                        {firm.social_linkedin && (
                          <a href={getSocialUrl("linkedin", firm.social_linkedin)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-[#0A66C2] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm">
                            <Linkedin className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ═══════════════ LIGHTBOX ═══════════════ */}
      {selectedImage && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white"><X className="h-8 w-8" /></button>
          <img src={selectedImage} alt="Large" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Direkt Teklif Modalı */}
      <LeadFormModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        targetFirmId={firm.id}
        targetFirmName={firm.company_name}
      />
    </main>
  );
};

export default PremiumLandingPage;
