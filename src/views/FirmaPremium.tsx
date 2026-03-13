"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Image, MapPin, Star, FileText, CheckCircle2, ShieldCheck, ArrowRightLeft, MessageSquare, Briefcase, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const PREMIUM_COST = 20; // jetons per month

const PREMIUM_FEATURES = [
  { icon: ShieldCheck, label: "Güven (Trust) Rozetleri", desc: "Özel rozetlerle müşterilerinize güven verin." },
  { icon: ArrowRightLeft, label: "Öncesi / Sonrası Slider", desc: "Projelerinizdeki mucizevi değişimi interaktif gösterin." },
  { icon: Briefcase, label: "Özel Portföy Vitrini", desc: "Tamamlanan projelerinizi şık bir grid ile sergileyin." },
  { icon: MessageSquare, label: "Sık Sorulan Sorular (SSS)", desc: "Müşterilerinizin potansiyel sorularını peşinen yanıtlayın." },
  { icon: Zap, label: "Yanıt Süresi Gösterimi", desc: "Hızlı yanıt verdiğinizi göstererek dönüşüm oranınızı artırın." },
  { icon: Image, label: "Geniş Hero Galeri", desc: "Profilinizin en üstünde yer alan dev fotoğraf galerisi." },
  { icon: Star, label: "Müşteri Değerlendirmeleri", desc: "Yıldız puanlarınızla güvenilirliğinizi kanıtlayın." },
  { icon: FileText, label: "Detaylı Hizmetler", desc: "Sunduğunuz hizmetleri tüm detaylarıyla anlatın." },
  { icon: Crown, label: "Öne Çıkarma & Shimmer Efekt", desc: "Listelerde altın parıltılı çerçevenizle tüm dikkatleri çekin." },
];

const FirmaPremium = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [firm, setFirm] = useState<any>(null);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data } = await supabase
        .from("firms")
        .select("id, is_premium, premium_until, coin_balance, company_name, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (!data) { router.push("/firma/panel"); return; }
      setFirm(data);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSubscribe = async () => {
    if (!firm) return;
    
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-premium-checkout", {
        body: { plan: isYearly ? "yearly" : "monthly" },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      if (data?.error) throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || "Ödeme başlatılamadı.");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Yükleniyor...</p>
      </div>
    );
  }

  const isPremiumActive = firm?.is_premium && firm?.premium_until && new Date(firm.premium_until) > new Date();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pb-16">
        
        {/* HERO SECTION */}
        <div className="relative overflow-hidden bg-card border-b border-border pt-20">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-background to-accent/5" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="container relative mx-auto px-4 py-16 md:py-24 max-w-5xl text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10">
              <Crown className="w-4 h-4 mr-2" /> Profesyoneller İçin
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight mb-6">
              Firmanızı <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-400">Zirveye</span> Taşıyın
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Premium profil ile rakiplerinizden sıyrılın. Güven rozetleri, interaktif proje sunumları ve altın listeleme çerçevesi ile potansiyel müşterilerin ilk tercihi olun.
            </p>

            {isPremiumActive ? (
              <div className="inline-flex flex-col items-center bg-gradient-to-b from-[#fffbf0] to-white dark:from-[hsl(43_30%_15%)] dark:to-card border border-yellow-500/30 rounded-2xl p-6 shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/20">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">Premium Üyeliğiniz Aktif</h2>
                <p className="text-muted-foreground mb-1">
                  Plan: <span className="font-semibold text-foreground uppercase">{firm.subscription_plan || "Aylık"}</span>
                </p>
                <p className="text-muted-foreground mb-4 text-sm">
                  Yenileme: <span className="font-semibold text-foreground">{new Date(firm.premium_until).toLocaleDateString("tr-TR")}</span>
                </p>
                <Button onClick={() => router.push("/firma/profil")} className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white shadow-md">
                  Profilini Düzenle
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* Plan Toggle */}
                <div className="flex items-center gap-4 mb-8 bg-card border border-border p-2 rounded-full px-6 shadow-sm">
                  <Label htmlFor="plan-toggle" className={`text-sm cursor-pointer transition-colors ${!isYearly ? "text-foreground font-bold" : "text-muted-foreground"}`}>Aylık</Label>
                  <Switch id="plan-toggle" checked={isYearly} onCheckedChange={setIsYearly} className="data-[state=checked]:bg-yellow-500" />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="plan-toggle" className={`text-sm cursor-pointer transition-colors ${isYearly ? "text-foreground font-bold" : "text-muted-foreground"}`}>Yıllık</Label>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] py-0 px-1.5 animate-bounce">
                      %20 TASARRUF
                    </Badge>
                  </div>
                </div>

                <div className="inline-flex flex-col items-center p-1 rounded-2xl bg-gradient-to-br from-yellow-400 via-yellow-200 to-yellow-500 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-2xl">
                  <div className="bg-card px-8 py-8 rounded-xl flex flex-col items-center w-[340px]">
                    <p className="text-xs font-bold text-yellow-600 uppercase tracking-[0.2em] mb-4">Seçilen Plan: {isYearly ? "YILLIK" : "AYLIK"}</p>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-sm font-semibold text-muted-foreground">$</span>
                      <span className="text-6xl font-black text-foreground tracking-tight">{isYearly ? "150" : "15"}</span>
                      <span className="text-lg font-medium text-muted-foreground">/{isYearly ? "yıl" : "ay"}</span>
                    </div>
                    
                    <ul className="w-full space-y-3 mb-8 text-left">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Altın Çerçeve & Öne Çıkarılma</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Güven (Trust) Rozetleri</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Öncesi / Sonrası Proje Sliderı</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Sınırsız Portföy Görseli</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Öncelikli Müşteri Desteği</span>
                      </li>
                    </ul>

                    <Button
                      onClick={handleSubscribe}
                      disabled={activating}
                      size="lg"
                      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white shadow-lg transition-all active:scale-95"
                    >
                      {activating ? "Hazırlanıyor..." : "Aboneliği Başlat"}
                    </Button>
                    
                    <p className="mt-4 text-[10px] text-muted-foreground text-center">
                      Güvenli ödeme altyapısı Stripe ile korunmaktadır. İstediğiniz zaman iptal edebilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FEATURES GRID */}
        <div className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Neden Premium?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Profilinizi sıradanlıktan çıkarıp bir vitrine dönüştüren ekstra özellikler ile daha fazla Lead'i müşteriye çevirin.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PREMIUM_FEATURES.map((f, i) => (
              <Card key={i} className="group border-border/50 bg-card hover:bg-accent/5 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none" />
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-900/10 flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform shadow-sm">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{f.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-20 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-6">Daha fazla bilgi veya sorularınız için panele dönebilirsiniz.</p>
            <Button variant="outline" onClick={() => router.push("/firma/panel")} className="w-full max-w-sm">
              Firma Paneline Dön
            </Button>
          </div>
        </div>

      </div>
    </>
  );
};

export default FirmaPremium;

