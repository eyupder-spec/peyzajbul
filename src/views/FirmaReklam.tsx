"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Megaphone, Laptop, Smartphone, Eye, ArrowRight, LayoutDashboard, LayoutTemplate, SquareMousePointer } from "lucide-react";

export default function FirmaReklam() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [firmName, setFirmName] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "firm");

      if (!roles || roles.length === 0) {
        router.push("/");
        return;
      }

      const { data: firmData } = await supabase
        .from("firms")
        .select("company_name, is_premium")
        .eq("user_id", user.id)
        .single();

      if (firmData) {
        setFirmName(firmData.company_name);
        setIsPremium(firmData.is_premium || false);
      }
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground font-medium">Yükleniyor...</p>
      </div>
    );
  }

  const WHATSAPP_NUMBER = "905550000000"; // Dummy / Default Whatsapp 
  const WHATSAPP_MESSAGE = encodeURIComponent(`Merhaba, ${firmName} firması olarak Peyzajbul'da reklam vermek istiyorum. Müsait reklam alanları ve fiyatlar hakkında bilgi alabilir miyim?`);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar isPremium={isPremium} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-bold text-foreground">Reklam Ver</h1>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="hidden sm:flex gap-2 bg-[#25D366] hover:bg-[#1fb855] text-white">
                <MessageCircle className="h-4 w-4" /> Whatsapp İletişim
              </Button>
            </a>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
              
              {/* Hero Banner */}
              <div className="relative rounded-2xl overflow-hidden bg-primary text-primary-foreground p-8 md:p-12 shadow-xl border border-primary/20">
                <div className="relative z-10 max-w-2xl">
                  <Badge variant="outline" className="text-white border-white/30 bg-white/10 mb-4 px-3 py-1">
                    🌟 Özel Hedef Kitle, Yüksek Geri Dönüş
                  </Badge>
                  <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4 leading-tight">
                    İşinizi Büyütmenin En Hızlı Yolu
                  </h2>
                  <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 font-body max-w-xl">
                    Binlerce peyzaj arayan müşteriye nokta atışı ulaşın. Peyzajbul'un en değerli alanlarında markanızı sergileyin.
                  </p>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="bg-accent hover:bg-accent/90 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg border border-accent-foreground/10 hover:scale-105 transition-transform flex gap-2">
                       <MessageCircle className="h-6 w-6" /> Fırsatları Öğren
                    </Button>
                  </a>
                </div>
                
                {/* Dekoratif Görseller (Background) */}
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                  <Megaphone className="w-full h-full rotate-12 scale-150" />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-heading text-foreground">Reklam Alanlarımız</h3>
                  <p className="text-muted-foreground text-sm">Platform genelinde görünürlüğünüzü maksimize edecek stratejik yerleşimler.</p>
                </div>
              </div>

              {/* Reklam Alanları Listesi */}
              <div className="grid md:grid-cols-2 gap-6">
                
                <Card className="border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-1 flex items-center gap-2">
                          <LayoutTemplate className="h-5 w-5 text-primary" /> Ana Sayfa Liderlik Tablosu
                        </CardTitle>
                        <CardDescription>Sitenin en üstünde devasa görünürlük</CardDescription>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none shrink-0 cursor-default">En Popüler</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="w-full h-24 bg-muted border border-dashed border-border flex items-center justify-center rounded-lg text-muted-foreground font-mono text-xs mb-4 flex-col gap-1 group-hover:border-primary/50 transition-colors">
                      <LayoutTemplate className="h-6 w-6 opacity-50" />
                      <span>{`<HomeTopBanner />`}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1"><Laptop className="h-4 w-4" /> Masaüstü Boyut:</p>
                        <p className="text-muted-foreground">970x120 px / 728x90 px</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1"><Smartphone className="h-4 w-4" /> Mobil Boyut:</p>
                        <p className="text-muted-foreground">320x100 px</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/50 text-sm text-foreground space-y-2">
                       <p className="flex items-start gap-2"><Eye className="h-4 w-4 shrink-0 text-primary mt-0.5" /> Göz Hizası: Sayfaya giren her kullanıcı markanızı görür.</p>
                       <p className="flex items-start gap-2"><SquareMousePointer className="h-4 w-4 shrink-0 text-primary mt-0.5" /> Yüksek Tıklanma Oranı (CTR).</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-1 flex items-center gap-2">
                          <SquareMousePointer className="h-5 w-5 text-accent" /> Firma Listesi Dikey Reklam
                        </CardTitle>
                        <CardDescription>Firma arayanların merceğindesiniz</CardDescription>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-600 border-none shrink-0 cursor-default">Hedefe Yönelik</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-32 bg-muted border border-dashed border-border flex items-center justify-center rounded-lg text-muted-foreground font-mono text-xs flex-col gap-1 shrink-0 group-hover:border-accent/50 transition-colors">
                        <span className="-rotate-90 whitespace-nowrap">Left</span>
                      </div>
                      <div className="flex-1 bg-muted/30 border border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground">İçerik (Firmalar Gridi)</div>
                      <div className="w-16 h-32 bg-muted border border-dashed border-border flex items-center justify-center rounded-lg text-muted-foreground font-mono text-xs flex-col gap-1 shrink-0 group-hover:border-accent/50 transition-colors">
                        <span className="rotate-90 whitespace-nowrap">Right</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1"><Laptop className="h-4 w-4" /> Masaüstü Boyut:</p>
                        <p className="text-muted-foreground">160x600 px (Skyscraper)</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1"><Smartphone className="h-4 w-4" /> Mobil:</p>
                        <p className="text-muted-foreground">Dar ekranda gizlenir</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/50 text-sm text-foreground space-y-2">
                       <p className="flex items-start gap-2"><Eye className="h-4 w-4 shrink-0 text-accent mt-0.5" /> Okurken Ekranı Kaplar: Scroll yaparken kaymaz, sabit ve uzun.</p>
                       <p className="flex items-start gap-2"><SquareMousePointer className="h-4 w-4 shrink-0 text-accent mt-0.5" /> Doğrudan Rakiplerinize bakan kitleye ulaşın.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div>
                      <CardTitle className="text-xl mb-1 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-indigo-500" /> Blog İçi Doğal (Native) Reklam
                      </CardTitle>
                      <CardDescription>Bilgi arayan kullanıcılara markanızı sunun</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="w-full space-y-2">
                      <div className="w-full h-3 bg-muted rounded"></div>
                      <div className="w-3/4 h-3 bg-muted rounded"></div>
                      <div className="w-full h-20 bg-muted border border-dashed border-border flex items-center justify-center rounded-lg text-muted-foreground font-mono text-xs my-3 group-hover:border-indigo-500/50 transition-colors">
                        {`<BlogInlineAd />`}
                      </div>
                      <div className="w-full h-3 bg-muted rounded"></div>
                      <div className="w-5/6 h-3 bg-muted rounded"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1"><Laptop className="h-4 w-4" /> Boyut (Masaüstü & Mobil):</p>
                        <p className="text-muted-foreground">728x90 px veya 300x250 px</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div>
                      <CardTitle className="text-xl mb-1 flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-pink-500" /> Profil / Sidebar Kare
                      </CardTitle>
                      <CardDescription>Sağ sütunda her an göz önünde</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-end pr-4">
                      <div className="w-32 h-32 bg-muted border border-dashed border-border flex items-center justify-center rounded-lg text-muted-foreground font-mono text-xs flex-col gap-1 group-hover:border-pink-500/50 transition-colors">
                        <span>300x300</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1"><Laptop className="h-4 w-4" /> Boyut :</p>
                        <p className="text-muted-foreground">300x250 px / 300x300 px / 300x600 px</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom CTA */}
              <div className="bg-card border-border border rounded-2xl p-8 text-center flex flex-col items-center shadow-sm mt-8 relative overflow-hidden">
                <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-emerald-500 left-0"></div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Siz Değerli Müşterilerinize Nasıl Ulaşacaksınız?</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                  Peyzajbul reklam paketleri, firmanızın bütçesine ve stratejisine en uygun modeli seçmenizi sağlar. Profesyonel tasarım ekibimiz talebiniz halinde banner görsellerinizi de ücretsiz hzırlamaktadır.
                </p>
                
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-[#25D366] hover:bg-[#1fb855] text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg hover:scale-105 transition-transform flex gap-3 h-auto">
                    <MessageCircle className="h-7 w-7" />
                    <div className="flex flex-col items-start leading-tight">
                      <span>Satış Ekibimize Ulaşın</span>
                      <span className="text-xs font-normal opacity-90">Hemen Whatsapp'tan Yazın</span>
                    </div>
                  </Button>
                </a>
              </div>
              
              <div className="h-12"></div> {/* Padding-bottom hack */}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
