"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Crown, LogOut, Layout, Eye, ExternalLink, X, Plus, MapPin, Clock, ShieldCheck, HelpCircle, ArrowRightLeft, Briefcase, Globe, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";

/* ─── TYPES ─── */
type LandingSections = {
  hero: boolean; about: boolean; services: boolean; detailed_services: boolean;
  gallery: boolean; portfolio: boolean; before_after: boolean; trust_badges: boolean;
  faq: boolean; google_maps: boolean; contact: boolean; social_media: boolean; reviews: boolean;
};

type LandingConfig = {
  hero_image: string | null;
  hero_slogan: string | null;
  sections: LandingSections;
};

type TrustBadge = { icon: string; label: string };
type FAQItem = { question: string; answer: string };
type DetailedService = { title: string; description: string };
type PortfolioItem = { image_url: string; title: string; location?: string };

const DEFAULT_SECTIONS: LandingSections = {
  hero: true, about: true, services: true, detailed_services: true,
  gallery: true, portfolio: true, before_after: true, trust_badges: true,
  faq: true, google_maps: true, contact: true, social_media: true, reviews: true,
};

const SECTION_LABELS: Record<keyof LandingSections, { label: string; desc: string }> = {
  hero: { label: "Hero Alanı", desc: "Kapak görseli, firma adı, slogan ve CTA butonları" },
  about: { label: "Hakkımızda", desc: "Firma açıklama metni" },
  services: { label: "Hizmetler", desc: "Hizmet etiketleri listesi" },
  detailed_services: { label: "Detaylı Hizmetler", desc: "Başlık ve açıklama ile detaylı hizmet kartları" },
  gallery: { label: "Galeri", desc: "Firma galeri fotoğrafları" },
  portfolio: { label: "Portföy", desc: "Tamamlanan proje görselleri" },
  before_after: { label: "Önce / Sonra", desc: "İnteraktif slider ile proje karşılaştırması" },
  trust_badges: { label: "Trust Rozetleri", desc: "Güven rozetleri bandı" },
  faq: { label: "SSS", desc: "Sık sorulan sorular accordion" },
  google_maps: { label: "Google Maps", desc: "Harita konumu" },
  contact: { label: "İletişim", desc: "Telefon, e-posta, adres ve WhatsApp" },
  social_media: { label: "Sosyal Medya", desc: "Sosyal medya linkleri" },
  reviews: { label: "Değerlendirmeler", desc: "Müşteri yorumları ve puanları" },
};

const FirmaLandingEditor = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firmId, setFirmId] = useState("");
  const [firmName, setFirmName] = useState("");
  const [firmSlug, setFirmSlug] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  // Landing config
  const [config, setConfig] = useState<LandingConfig>({ hero_image: null, hero_slogan: null, sections: DEFAULT_SECTIONS });

  // Premium content fields
  const [responseTime, setResponseTime] = useState("");
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([]);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");
  const [detailedServices, setDetailedServices] = useState<DetailedService[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  // Social media
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialX, setSocialX] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "firm");
      if (!roles || roles.length === 0) { router.push("/"); return; }

      const { data: firm } = await supabase
        .from("firms")
        .select("id, company_name, slug, is_premium, premium_until, landing_config, response_time, trust_badges, faq_items, before_after, detailed_services, portfolio_items, google_maps_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin" as any)
        .eq("user_id", user.id)
        .single();

      if (!firm) { router.push("/firma/panel"); return; }
      const f = firm as any;

      setFirmId(f.id);
      setFirmName(f.company_name);
      setFirmSlug(f.slug || "");
      setIsPremium(f.is_premium && f.premium_until && new Date(f.premium_until) > new Date());

      // Landing config
      if (f.landing_config) {
        setConfig({
          hero_image: f.landing_config.hero_image || null,
          hero_slogan: f.landing_config.hero_slogan || null,
          sections: { ...DEFAULT_SECTIONS, ...(f.landing_config.sections || {}) },
        });
      }

      // Content fields
      setResponseTime(f.response_time || "");
      setTrustBadges(f.trust_badges || []);
      setFaqItems(f.faq_items || []);
      setBeforeUrl(f.before_after?.before || "");
      setAfterUrl(f.before_after?.after || "");
      setDetailedServices(f.detailed_services || []);
      setPortfolioItems(f.portfolio_items || []);
      setGoogleMapsUrl(f.google_maps_url || "");
      setSocialInstagram(f.social_instagram || "");
      setSocialFacebook(f.social_facebook || "");
      setSocialX(f.social_x || "");
      setSocialYoutube(f.social_youtube || "");
      setSocialLinkedin(f.social_linkedin || "");

      setLoading(false);
    };
    load();
  }, [router]);

  const toggleSection = (key: keyof LandingSections) => {
    setConfig(prev => ({ ...prev, sections: { ...prev.sections, [key]: !prev.sections[key] } }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, folder: string, onSuccess: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file || !firmId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Hata", description: "Görsel boyutu 2MB'dan küçük olmalıdır.", variant: "destructive" });
      if (e.target) e.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const path = `${firmId}/premium/${folder}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage.from("firm-logos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("firm-logos").getPublicUrl(path);
      onSuccess(publicUrl);
      toast({ title: "Görsel başarıyla yüklendi!" });
    } catch (err: any) {
      toast({ title: "Görsel yüklenemedi", description: err.message, variant: "destructive" });
    } finally {
      if (e.target) e.target.value = "";
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase.from("firms") as any)
        .update({
          landing_config: config,
          response_time: responseTime || null,
          trust_badges: trustBadges.length > 0 ? trustBadges : null,
          faq_items: faqItems.length > 0 ? faqItems : null,
          before_after: (beforeUrl && afterUrl) ? { before: beforeUrl, after: afterUrl } : null,
          detailed_services: detailedServices.length > 0 ? detailedServices : null,
          portfolio_items: portfolioItems.length > 0 ? portfolioItems : null,
          google_maps_url: googleMapsUrl || null,
          social_instagram: socialInstagram || null,
          social_facebook: socialFacebook || null,
          social_x: socialX || null,
          social_youtube: socialYoutube || null,
          social_linkedin: socialLinkedin || null,
        })
        .eq("id", firmId);

      if (error) throw error;
      toast({ title: "Landing page ayarları kaydedildi!" });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  }

  const disabled = !isPremium;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar isPremium={isPremium} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-bold text-foreground">{firmName}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Çıkış
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">

              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Landing Page Yönetimi</h2>
                <p className="text-muted-foreground text-sm">
                  Premium profilinizin tam sayfa görünümünü ve içeriklerini buradan yönetin.
                </p>
              </div>

              {/* Premium Warning */}
              {!isPremium && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                  <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Premium Gerekli</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400/80">Landing page özelliği sadece Premium üyelere açıktır.</p>
                    <Button variant="outline" size="sm" className="mt-3 border-yellow-300" onClick={() => router.push("/firma/premium")}>
                      <Crown className="h-4 w-4 mr-2" /> Premium'a Geç
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview */}
              {isPremium && firmSlug && (
                <a href={`/firma/${firmSlug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full gap-2">
                    <Eye className="h-4 w-4" /> Canlı Önizleme <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                </a>
              )}

              {/* ═══ HERO SETTINGS ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary" /> Hero Alanı
                  </h3>
                  <div className="space-y-1.5 flex flex-col">
                    <Label>Kapak Görseli</Label>
                    {config.hero_image && (
                      <div className="relative w-40 h-24 rounded-lg overflow-hidden border border-border mb-2">
                        <img src={config.hero_image} alt="Hero" className="w-full h-full object-cover" />
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100" onClick={() => setConfig(p => ({ ...p, hero_image: null }))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <Input 
                      type="file" 
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={(e) => handleImageUpload(e, "hero", (url) => setConfig(p => ({ ...p, hero_image: url })))} 
                    />
                    <p className="text-xs text-muted-foreground">Önerilen: 1920x1080px (Yatay). Maksimum 2MB.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slogan</Label>
                    <Input placeholder="Örn: Bahçenizi hayallerinize kavuşturuyoruz" value={config.hero_slogan || ""} onChange={(e) => setConfig(p => ({ ...p, hero_slogan: e.target.value || null }))} />
                  </div>
                </CardContent>
              </Card>

              {/* ═══ RESPONSE TIME ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Yanıt Süresi
                  </h3>
                  <Input placeholder="Örn: Genellikle 2 saat içinde yanıtlar" value={responseTime} onChange={(e) => setResponseTime(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Hero alanında ve firma kartında rozet olarak gösterilir.</p>
                </CardContent>
              </Card>

              {/* ═══ TRUST BADGES ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Trust Rozetleri
                  </h3>
                  <p className="text-xs text-muted-foreground">Emoji + metin formatında (örn: 🏆 5+ Yıl Deneyim)</p>
                  <div className="space-y-2">
                    {trustBadges.map((b, i) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder="🏆" value={b.icon} onChange={(e) => { const u = [...trustBadges]; u[i] = { ...u[i], icon: e.target.value }; setTrustBadges(u); }} className="w-20" />
                        <Input placeholder="Rozet metni" value={b.label} onChange={(e) => { const u = [...trustBadges]; u[i] = { ...u[i], label: e.target.value }; setTrustBadges(u); }} />
                        <Button variant="ghost" size="icon" onClick={() => setTrustBadges(trustBadges.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setTrustBadges([...trustBadges, { icon: "", label: "" }])}><Plus className="h-3 w-3 mr-1" /> Rozet Ekle</Button>
                  </div>
                </CardContent>
              </Card>

              {/* ═══ DETAILED SERVICES ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Detaylı Hizmetler
                  </h3>
                  <div className="space-y-3">
                    {detailedServices.map((ds, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Hizmet {i + 1}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDetailedServices(detailedServices.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                        </div>
                        <Input placeholder="Hizmet başlığı" value={ds.title} onChange={(e) => { const u = [...detailedServices]; u[i] = { ...u[i], title: e.target.value }; setDetailedServices(u); }} />
                        <Textarea placeholder="Açıklama" rows={2} value={ds.description} onChange={(e) => { const u = [...detailedServices]; u[i] = { ...u[i], description: e.target.value }; setDetailedServices(u); }} />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setDetailedServices([...detailedServices, { title: "", description: "" }])}><Plus className="h-3 w-3 mr-1" /> Hizmet Ekle</Button>
                  </div>
                </CardContent>
              </Card>

              {/* ═══ BEFORE / AFTER ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" /> Önce / Sonra Slider
                  </h3>
                  <p className="text-xs text-muted-foreground">Her iki fotoğraf da yüklendiğinde slider sayfada görünür.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">"Önce" Fotoğrafı</Label>
                      {beforeUrl && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border mb-2 bg-muted">
                          <img src={beforeUrl} alt="Before" className="w-full h-full object-cover" />
                          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100" onClick={() => setBeforeUrl("")}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Input 
                        type="file" 
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={(e) => handleImageUpload(e, "slider", (url) => setBeforeUrl(url))} 
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Önerilen: 800x600px. Maks: 2MB.</p>
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">"Sonra" Fotoğrafı</Label>
                      {afterUrl && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border mb-2 bg-muted">
                          <img src={afterUrl} alt="After" className="w-full h-full object-cover" />
                          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100" onClick={() => setAfterUrl("")}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Input 
                        type="file" 
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={(e) => handleImageUpload(e, "slider", (url) => setAfterUrl(url))} 
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Önerilen: 800x600px. Maks: 2MB.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ═══ PORTFOLIO ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Portföy Görselleri
                  </h3>
                  <div className="space-y-3">
                    {portfolioItems.map((p, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Proje {i + 1}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => setPortfolioItems(portfolioItems.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-32 shrink-0 space-y-1">
                            {p.image_url ? (
                              <div className="relative w-full aspect-square rounded overflow-hidden border border-border">
                                <img src={p.image_url} alt="Portfolio" className="w-full h-full object-cover" />
                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100" onClick={() => { const u = [...portfolioItems]; u[i].image_url = ""; setPortfolioItems(u); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="w-full aspect-square bg-muted rounded border border-dashed flex items-center justify-center">
                                <span className="text-xs text-muted-foreground text-center p-2 block">Görsel Seç</span>
                              </div>
                            )}
                            <Input 
                              type="file" 
                              accept="image/*"
                              disabled={uploadingImage}
                              onChange={(e) => handleImageUpload(e, "portfolio", (url) => { const u = [...portfolioItems]; u[i].image_url = url; setPortfolioItems(u); })} 
                              className="text-[10px] p-1 h-7 file:h-full"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Önerilen: 800x600px. Maks: 2MB.</p>
                          </div>
                          <div className="flex-1 space-y-2">
                            <Input placeholder="Proje başlığı *" value={p.title} onChange={(e) => { const u = [...portfolioItems]; u[i] = { ...u[i], title: e.target.value }; setPortfolioItems(u); }} />
                            <Input placeholder="Konum (opsiyonel)" value={p.location || ""} onChange={(e) => { const u = [...portfolioItems]; u[i] = { ...u[i], location: e.target.value }; setPortfolioItems(u); }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setPortfolioItems([...portfolioItems, { image_url: "", title: "" }])}><Plus className="h-3 w-3 mr-1" /> Proje Ekle</Button>
                  </div>
                </CardContent>
              </Card>

              {/* ═══ FAQ ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" /> Sık Sorulan Sorular
                  </h3>
                  <div className="space-y-3">
                    {faqItems.map((faq, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Soru {i + 1}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFaqItems(faqItems.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                        </div>
                        <Input placeholder="Soru" value={faq.question} onChange={(e) => { const u = [...faqItems]; u[i] = { ...u[i], question: e.target.value }; setFaqItems(u); }} />
                        <Textarea placeholder="Cevap" rows={2} value={faq.answer} onChange={(e) => { const u = [...faqItems]; u[i] = { ...u[i], answer: e.target.value }; setFaqItems(u); }} />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setFaqItems([...faqItems, { question: "", answer: "" }])}><Plus className="h-3 w-3 mr-1" /> Soru Ekle</Button>
                  </div>
                </CardContent>
              </Card>

              {/* ═══ GOOGLE MAPS ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Google Maps
                  </h3>
                  <Input placeholder="https://www.google.com/maps/embed?..." value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Google Maps → Paylaş → Haritayı Göm → iframe içindeki src URL'i yapıştırın.</p>
                </CardContent>
              </Card>

              {/* ═══ SOCIAL MEDIA ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Sosyal Medya
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label>
                      <Input placeholder="kullaniciadi veya tam link" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook</Label>
                      <Input placeholder="sayfadi veya tam link" value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">X (Twitter)</Label>
                      <Input placeholder="kullaniciadi veya tam link" value={socialX} onChange={(e) => setSocialX(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Youtube className="h-3 w-3" /> YouTube</Label>
                      <Input placeholder="@kanaladi veya tam link" value={socialYoutube} onChange={(e) => setSocialYoutube(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn</Label>
                      <Input placeholder="sirketadi veya tam link" value={socialLinkedin} onChange={(e) => setSocialLinkedin(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ═══ SECTION TOGGLES ═══ */}
              <Card className={`border-border ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-6 space-y-1">
                  <h3 className="font-heading font-semibold text-foreground mb-4">Bölüm Görünürlüğü</h3>
                  <p className="text-xs text-muted-foreground mb-6">Kapalı bölümler landing page'de gösterilmez. Verisi olmayan bölümler otomatik gizlenir.</p>
                  <div className="divide-y divide-border">
                    {(Object.keys(SECTION_LABELS) as (keyof LandingSections)[]).map((key) => (
                      <div key={key} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{SECTION_LABELS[key].label}</p>
                          <p className="text-xs text-muted-foreground">{SECTION_LABELS[key].desc}</p>
                        </div>
                        <Switch checked={config.sections[key]} onCheckedChange={() => toggleSection(key)} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ═══ SAVE ═══ */}
              {isPremium && (
                <div className="flex justify-end pb-6">
                  <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Tümünü Kaydet
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default FirmaLandingEditor;
