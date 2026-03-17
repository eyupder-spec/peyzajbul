"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Phone, Mail, ArrowLeft, Building2, Crown, Star, Image as ImageIcon, Globe, Eye, MessageCircle, Instagram, Facebook, Youtube, Linkedin, Twitter, Shield, Award, CheckCircle, Zap, Clock, X } from "lucide-react";
import { extractFirmIdFromSlug, getSocialUrl } from "@/lib/firmUtils";
import { useFirmGallery, useFirmReviews, useFirmProjects } from "@/hooks/useFirms";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { getCitySlug } from "@/lib/cities";
import { useState, useRef, useCallback, use } from "react";

interface FirmDetailContentProps {
  isModal?: boolean;
  slug?: string;
}

const FirmDetailContent = ({ isModal = false, slug: propSlug }: FirmDetailContentProps) => {
  const params = useParams();
  
  // React 19 / Next.js 15 async params unwrapping logic
  // If slug is passed as prop (from page.tsx), use it. Try to unwrap from params safely if not.
  const unwrappedParams = params ? (params as any) : {};
  const slug = propSlug || (unwrappedParams?.slug as string);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

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

  const { data: gallery } = useFirmGallery(firm?.id || "");
  const { data: reviews } = useFirmReviews(firm?.id || "");
  const { data: projectsData } = useFirmProjects(firm?.id || "");
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

  const citySlug = getCitySlug(firm.city);
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

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
                  {((firm as any).trust_badges as {icon: string; label: string}[]).map((b, i) => (
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
                <p className="text-muted-foreground leading-relaxed">{firm.description}</p>
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
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 9l-3 3 3 3M16 9l3 3-3 3"/></svg>
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
                  {((firm as any).portfolio_items as {image_url: string; title: string; location?: string; date?: string}[]).slice(0, 6).map((p, i) => (
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
                      <img src={img.image_url} alt={img.caption || ""} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
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
                                alt={img.caption || ""}
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
            {reviews && reviews.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" /> Müşteri Değerlendirmeleri
                </h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* F.A.Q. */}
            {firm.is_premium && (firm as any).faq_items && (firm as any).faq_items.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Sık Sorulan Sorular</h2>
                <Accordion type="single" collapsible className="space-y-1">
                  {((firm as any).faq_items as {question: string; answer: string}[]).map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-medium text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
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
                {firm.is_premium && firm.website && (
                  <a href={firm.website.startsWith("http") ? firm.website : `https://${firm.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Globe className="h-4 w-4 text-primary" /> {firm.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
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

            <div className="flex flex-col gap-3">
              <Link href={`/iller/${citySlug}-peyzaj-firmalari`}>
                <Button variant="outline" className="w-full">
                  {firm.city} İlindeki Diğer Firmalar
                </Button>
              </Link>
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
    </main>
  );
};

export default FirmDetailContent;

