import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, ArrowLeft, Building2, Crown, Star, Image as ImageIcon, Globe, Eye, MessageCircle, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
import { extractFirmIdFromSlug } from "@/lib/firmUtils";
import { useApprovedFirms, useFirmGallery, useFirmReviews } from "@/hooks/useFirms";
import { getCitySlug } from "@/lib/cities";
import { Helmet } from "react-helmet-async";
import { useState } from "react";

const FirmaDetay = () => {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const { data: firms, isLoading } = useApprovedFirms();
  // Try matching by slug first, then fall back to short ID
  const firm = firms?.find((f) => f.slug === slug) || firms?.find((f) => f.id.startsWith(slug ? extractFirmIdFromSlug(slug) : ""));

  const { data: gallery } = useFirmGallery(firm?.id || "");
  const { data: reviews } = useFirmReviews(firm?.id || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>
        <Footer />
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 pt-24">
          <p className="text-muted-foreground text-lg">Firma bulunamadı</p>
          <Link to="/firmalar"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Firmalara Dön</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const citySlug = getCitySlug(firm.city);
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{firm.company_name} | {firm.city} Peyzaj Firması</title>
        <meta name="description" content={`${firm.company_name} - ${firm.city} ilinde hizmet veren profesyonel peyzaj firması. ${firm.services?.join(", ")}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": firm.company_name,
          "description": firm.description || `${firm.city} ilinde peyzaj hizmeti veren firma`,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": firm.city,
            ...(firm.district && { "addressRegion": firm.district }),
            "addressCountry": "TR"
          },
          "telephone": firm.phone,
          "email": firm.email,
          ...(avgRating && { "aggregateRating": { "@type": "AggregateRating", "ratingValue": avgRating, "reviewCount": reviews?.length } }),
          "url": `https://peyzaj-rehberi-turkiye.lovable.app/firma/${slug}`
        })}</script>
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4">
              <Link to="/firmalar" className="hover:text-primary-foreground">Firmalar</Link>
              <span>/</span>
              <Link to={`/iller/${citySlug}-peyzaj-firmalari`} className="hover:text-primary-foreground">{firm.city}</Link>
              <span>/</span>
              <span className="text-primary-foreground">{firm.company_name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary-foreground/10 flex items-center justify-center overflow-hidden">
                {firm.logo_url ? (
                  <img src={firm.logo_url} alt={firm.company_name} className="w-full h-full object-cover" />
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
              {/* Gallery - Premium Only */}
              {firm.is_premium && gallery && gallery.length > 0 && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Galeri
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gallery.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(img.image_url)}
                        className="aspect-[4/3] rounded-lg overflow-hidden group relative"
                      >
                        <img
                          src={img.image_url}
                          alt={img.caption || "Proje fotoğrafı"}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {img.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {img.caption}
                          </div>
                        )}
                      </button>
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

              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-3">Sunulan Hizmetler</h2>
                <div className="flex flex-wrap gap-2">
                  {firm.services?.map((s) => (
                    <Badge key={s} variant="secondary" className="text-sm py-1 px-3">{s}</Badge>
                  ))}
                  {(!firm.services || firm.services.length === 0) && (
                    <p className="text-muted-foreground">Hizmet bilgisi eklenmemiş.</p>
                  )}
                </div>
              </div>

              {/* Detailed Services - Premium Only */}
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
            </div>

            <div className="space-y-4">
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold text-foreground">İletişim</h3>
                <div className="space-y-3">
                  {/* Phone */}
                  {showPhone ? (
                    <a href={`tel:${firm.phone}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="h-4 w-4 text-primary" />
                      {firm.phone}
                    </a>
                  ) : (
                    <button onClick={() => setShowPhone(true)} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Telefonu Göster
                      </span>
                    </button>
                  )}

                  {/* Email */}
                  {showEmail ? (
                    <a href={`mailto:${firm.email}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-4 w-4 text-primary" />
                      {firm.email}
                    </a>
                  ) : (
                    <button onClick={() => setShowEmail(true)} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> E-postayı Göster
                      </span>
                    </button>
                  )}

                  {/* Website - Premium Only */}
                  {firm.is_premium && firm.website && (
                    <a href={firm.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                      <Globe className="h-4 w-4 text-primary" />
                      {firm.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}

                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                  </div>
                </div>

                {/* Social Media Links - Premium Only */}
                {firm.is_premium && (
                  (() => {
                    const XIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
                    const socials: { url: string; icon: React.ReactNode; label: string; color: string }[] = [
                      { url: (firm as any).social_instagram, icon: <Instagram className="h-5 w-5" />, label: "Instagram", color: "text-[#E4405F]" },
                      { url: (firm as any).social_facebook, icon: <Facebook className="h-5 w-5" />, label: "Facebook", color: "text-[#1877F2]" },
                      { url: (firm as any).social_x, icon: <XIcon />, label: "X", color: "text-foreground" },
                      { url: (firm as any).social_youtube, icon: <Youtube className="h-5 w-5" />, label: "YouTube", color: "text-[#FF0000]" },
                      { url: (firm as any).social_linkedin, icon: <Linkedin className="h-5 w-5" />, label: "LinkedIn", color: "text-[#0A66C2]" },
                    ].filter(s => s.url);
                    if (socials.length === 0) return null;
                    return (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Sosyal Medya</p>
                        <div className="flex items-center gap-3">
                          {socials.map((s) => (
                            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className={`${s.color} hover:opacity-70 transition-opacity`} title={s.label}>
                              {s.icon}
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* WhatsApp Button */}
                <a
                  href={`https://wa.me/${firm.phone.replace(/\D/g, "").replace(/^0/, "90")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#1fb855] text-white">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp ile İletişim
                  </Button>
                </a>
              </div>

              {/* Google Maps - Premium Only */}
              {firm.is_premium && firm.google_maps_url && (
                <div className="space-y-2">
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <iframe
                      src={firm.google_maps_url}
                      width="100%"
                      height="250"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Firma konumu"
                    />
                  </div>
                  {(() => {
                    // Extract coordinates from embed URL (e.g. !2d28.979!3d41.015 or q=41.015,28.979)
                    const url = firm.google_maps_url || "";
                    const coordMatch = url.match(/!2d([\d.]+)!3d([\d.]+)/) || url.match(/q=([\d.-]+),([\d.-]+)/);
                    const destination = coordMatch
                      ? `${coordMatch[2]},${coordMatch[1]}`
                      : encodeURIComponent(`${firm.company_name}, ${firm.city}`);
                    return (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <MapPin className="h-4 w-4" /> Yol Tarifi Al
                        </Button>
                      </a>
                    );
                  })()}
                </div>
              )}

              {!(firm as any).is_claimed && (
                <Link to={`/firma/sahiplen/${firm.id}`}>
                  <Button variant="gold" className="w-full gap-2">
                    <Building2 className="h-4 w-4" /> Bu İşletme Senin Mi?
                  </Button>
                </Link>
              )}

              <Link to={`/iller/${citySlug}-peyzaj-firmalari`}>
                <Button variant="outline" className="w-full">
                  {firm.city} İlindeki Diğer Firmalar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Büyük görünüm" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default FirmaDetay;
