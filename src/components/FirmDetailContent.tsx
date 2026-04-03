"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Phone, Mail, ArrowLeft, Building2, Crown, Star, Image as ImageIcon, Globe, Eye, MessageCircle, Instagram, Facebook, Youtube, Linkedin, Twitter, Shield, Award, CheckCircle, Zap, Clock, X, Camera, Send } from "lucide-react";
import { extractFirmIdFromSlug, getSocialUrl, generateFirmSlug } from "@/lib/firmUtils";
import { useFirmGallery, useFirmReviews, useFirmProjects } from "@/hooks/useFirms";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import FirmCard from "@/components/FirmCard";
import BannerAd from "@/components/BannerAd";
import { getCitySlug } from "@/lib/cities";
import { useState, useRef, useCallback, use } from "react";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import { useToast } from "@/hooks/use-toast";

interface FirmDetailContentProps {
  isModal?: boolean;
  slug?: string;
}

const FirmDetailContent = ({ isModal = false, slug: propSlug }: FirmDetailContentProps) => {
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React 19 / Next.js 15 async params unwrapping logic
  // If slug is passed as prop (from page.tsx), use it. Try to unwrap from params safely if not.
  const unwrappedParams = params ? (params as any) : {};
  const slug = propSlug || (unwrappedParams?.slug as string);

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

  const { data: firm, isLoading } = useQuery({
    queryKey: ["firm-detail-slug", slug],
    queryFn: async () => {
      const firmId = slug ? extractFirmIdFromSlug(slug) : "";

      // First try by slug
      let query = supabase
        .from("firms")
        .select("id, company_name, city, district, services, description, phone, email, is_premium, is_claimed, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items")
        .eq("slug", slug)
        .eq("is_approved", true)
        .eq("is_active", true)
        .maybeSingle();

      let { data, error } = await query;

      // If not found by slug, try by id (only if firmId looks like a valid UUID prefix)
      if (!data && !error && firmId && /^[0-9a-f]{8}$/i.test(firmId)) {
        const idQuery = await supabase
          .from("firms")
          .select("id, company_name, city, district, services, description, phone, email, is_premium, is_claimed, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items")
          .like("id", `${firmId}%`)
          .eq("is_approved", true)
          .eq("is_active", true)
          .maybeSingle();
        data = idQuery.data;
        error = idQuery.error;
      }

      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  const { data: galleryData } = useFirmGallery(firm?.id || "");
  const { data: reviews } = useFirmReviews(firm?.id || "");
  const { data: projectsData } = useFirmProjects(firm?.id);

  const { data: relatedFirms } = useQuery({
    queryKey: ["related-firms-detail", firm?.city, firm?.id],
    enabled: !!firm?.city,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("firms")
        .select("*")
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

  const gallery = galleryData || [];
  const projects = projectsData as any[] | undefined;

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

  const filteredLogoUrl = firm.logo_url;
  const filteredBeforeUrl = (firm as any).before_after?.before;
  const filteredAfterUrl = (firm as any).before_after?.after;
  const filteredPortfolio = (firm as any).portfolio_items as any[] ?? [];

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

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
        const path = `${firm.id}/${Date.now()}.${ext}`;
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
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4">
            <Link href="/firmalar" className="hover:text-primary-foreground">Firmalar</Link>
            <span>/</span>
            <Link href={`/iller/${citySlug}-peyzaj-firmalari`} className="hover:text-primary-foreground">{firm.city}</Link>
            <span>/</span>
            <span className="text-primary-foreground">{firm.company_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary-foreground/10 flex items-center justify-center overflow-hidden relative">
              {firm.logo_url ? (
                <Image src={firm.logo_url} alt={firm.company_name} fill sizes="64px" className="object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">{firm.company_name}</h1>
                {firm.is_premium && (
                  <Badge className="bg-yellow-500/90 text-white gap-1">
                    <Crown className="h-3.5 w-3.5" /> Premium
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-primary-foreground/70">
                  <MapPin className="h-4 w-4" />
                  {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-primary-foreground/80 text-sm">{avgRating} ({reviews?.length} değerlendirme)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* ===== TRUST ROZETLER ===== */}
            {firm.is_premium && (firm as any).trust_badges && (firm as any).trust_badges.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {((firm as any).trust_badges as { icon: string; label: string }[]).map((b, i) => (
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
            {firm.is_premium && (firm as any).before_after?.before && (firm as any).before_after?.after && (
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
                  <img src={(firm as any).before_after.after} alt="Sonra" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                    <img src={(firm as any).before_after.before} alt="Önce" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / sliderPos}%`, maxWidth: 'none' }} />
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
            {firm.is_premium && (firm as any).portfolio_items && (firm as any).portfolio_items.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Tamamlanan Projeler</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {((firm as any).portfolio_items as { image_url: string; title: string; location?: string; date?: string }[]).slice(0, 6).map((p, i) => (
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

            {/* Detailed Services */}
            {firm.is_premium && firm.detailed_services && (firm.detailed_services as any[]).length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Detaylı Hizmetler</h2>
                <div className="space-y-4">
                  {(firm.detailed_services as any[]).map((ds: any, i: number) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-4">
                      <h3 className="font-heading font-semibold text-foreground">{ds.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" /> Müşteri Değerlendirmeleri
                {reviews && reviews.length > 0 && (
                  <Badge variant="outline" className="font-normal text-[10px] ml-auto">{reviews.length} Yorum</Badge>
                )}
              </h2>

              {/* Existing Reviews */}
              {reviews && reviews.length > 0 && (
                <div className="space-y-4 mb-6">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground">{review.reviewer_name}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-current" : "text-muted"}`} />
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
                            <Star className={`h-6 w-6 ${i < (reviewHoverRating || reviewRating) ? "text-yellow-500 fill-current" : "text-muted-foreground/30"}`} />
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

            {/* Schema Markup: AggregateRating + Reviews */}
            {reviews && reviews.length > 0 && (
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

            {/* F.A.Q. */}
            {firm.is_premium && (firm as any).faq_items && (firm as any).faq_items.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Sık Sorulan Sorular</h2>
                <Accordion type="single" collapsible className="space-y-1">
                  {((firm as any).faq_items as { question: string; answer: string }[]).map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-medium text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Premium Olmayanlar için İlgili Firmalar */}
            {!firm.is_premium && relatedFirms && relatedFirms.length > 0 && (
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
                          {rf.is_premium && (
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
                {showPhone ? (
                  <a href={`tel:${firm.phone}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-4 w-4 text-primary" /> {firm.phone}
                  </a>
                ) : (
                  <button onClick={() => setShowPhone(true)} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                    <Phone className="h-4 w-4 text-primary" /> <Eye className="h-3.5 w-3.5" /> Telefonu Göster
                  </button>
                )}
                {showEmail ? (
                  <a href={`mailto:${firm.email?.replace(/^https?:\/\//, "")}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-4 w-4 text-primary" /> {firm.email?.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <button onClick={() => setShowEmail(true)} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                    <Mail className="h-4 w-4 text-primary" /> <Eye className="h-3.5 w-3.5" /> E-postayı Göster
                  </button>
                )}
                {firm.is_premium && firm.website && (() => {
                  let utmUrl = firm.website.startsWith("http") ? firm.website : `https://${firm.website}`;
                  try {
                    const urlObj = new URL(utmUrl);
                    urlObj.searchParams.set("utm_source", "peyzajbul.com");
                    urlObj.searchParams.set("utm_medium", "rehber");
                    urlObj.searchParams.set("utm_campaign", "profil_sayfasi");
                    utmUrl = urlObj.toString();
                  } catch (e) { }

                  return (
                    <a href={utmUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                      <Globe className="h-4 w-4 text-primary" /> {firm.website.replace(/^https?:\/\//, "")}
                    </a>
                  );
                })()}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                </div>
              </div>

              {firm.is_premium && (
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

              <a href={`https://wa.me/${firm.phone.replace(/\D/g, "").replace(/^0/, "90")}`} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#1fb855] text-white">
                  <MessageCircle className="h-5 w-5" /> WhatsApp ile İletişim
                </Button>
              </a>

              {/* Premium Firmalara Özel: Direkt Teklif Al Butonu */}
              {firm.is_premium && (
                <Button
                  variant="gold"
                  className="w-full gap-2"
                  onClick={() => setShowLeadModal(true)}
                >
                  <Crown className="h-4 w-4" /> Bu Firmadan Teklif Al
                </Button>
              )}
            </div>

            {!firm.is_claimed && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Bu işletme size mi ait?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  İşletme profilinizi yönetmek, projelerinizi eklemek ve müşterilerle doğrudan iletişim kurmak için bu kaydı sahiplenin.
                </p>
                <Link href={`/firma-sahiplen/${firm.id}`} className="block">
                  <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10 transition-colors">
                    Firma Kaydını Sahiplen
                  </Button>
                </Link>
              </div>
            )}

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

export default FirmDetailContent;

