"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  MapPin,
  Search,
  MessageSquare,
  CheckCircle2,
  UserPlus,
  Image as ImageIcon,
  Briefcase,
  ChevronRight,
  Plus,
  Sparkles,
  ArrowRight,
  Globe,
  PieChart
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState, useEffect } from "react";

// Assets
import heroImg from "@/assets/landing/hero.png";
import growthImg from "@/assets/landing/growth.png";

const FirmaKayitLanding = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-[#fafdfb]">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* HERO SECTION - REVISED */}
        <section className="relative py-24 px-4 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent/15 rounded-full blur-[100px]" />
          </div>

          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="text-left space-y-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-primary/10 text-primary shadow-sm">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold tracking-wide uppercase">İşinizi Dijitale Taşıyın</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
                  Türkiye'nin <span className="text-primary relative inline-block">
                    En Büyük
                    <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent/40 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                    </svg>
                  </span> <br />
                  Peyzaj Rehberinde Yer Alın!
                </h1>

                <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
                  Artık kartvizit devri bitti. Ayda 50.000'den fazla bahçe sahibinin hizmet aradığı dev ekosistemde markanızı konumlandırın.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-5 pt-4">
                  <Button size="lg" className="h-16 px-10 text-lg rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 transition-all bg-primary hover:bg-primary/95 group" asChild>
                    <Link href="/firma/giris?tab=signup" className="flex items-center gap-2">
                      Hemen Ücretsiz Katıl
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-muted flex items-center justify-center overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="User" />
                      </div>
                    ))}
                    <div className="w-12 h-12 rounded-full border-4 border-white bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground">
                      +350
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">350+ Profesyonel Üye</span>
                </div>
              </div>

              <div className="relative group perspective-1000">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[2.5rem] blur-2xl -z-10 opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-700 bg-white aspect-[4/3] min-h-[300px]">
                  <Image
                    src={heroImg}
                    alt="Peyzaj Profesyoneli"
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <PieChart className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">Aylık Raporunuz Hazır</div>
                        <div className="text-xs text-muted-foreground">Geçen aya göre %24 daha fazla trafik.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES - GLASSMORPHISM */}
        <section className="py-32 px-4 relative bg-[#f1f6f3]">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">İşinizi Büyütmenin Akıllı Yolu</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Geleneksel reklamlarla bütçenizi yakmayın. İhtiyacı olan müşteriye, ihtiyacı olduğu anda görünün.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Nokta Atışı Lokasyon",
                  desc: "Müşteriler kapı komşunuz bile olsa, sizi bulamıyorlarsa yoksundur. Biz sizi sokağınızda görünür yapıyoruz.",
                  icon: MapPin,
                  gradient: "from-blue-500 to-indigo-600",
                  bg: "bg-blue-50"
                },
                {
                  title: "Google'da İlk Sırada",
                  desc: "Sizin yerinize biz rekabet ediyoruz. 'İstanbul Peyzaj' aramasında dev bütçeli firmaların yanına adınızı yazıyoruz.",
                  icon: Globe,
                  gradient: "from-emerald-500 to-teal-600",
                  bg: "bg-emerald-50"
                },
                {
                  title: "Karar Verici Yorumlar",
                  desc: "Yeteneklerinizi biz anlatmayalım, mutlu müşterileriniz anlatsın. Güçlü bir profil, en iyi satış temsilcinizdir.",
                  icon: MessageSquare,
                  gradient: "from-amber-500 to-orange-600",
                  bg: "bg-amber-50"
                }
              ].map((item, i) => (
                <div key={i} className="group relative">
                  <div className="absolute inset-0 bg-white rounded-3xl -z-10 shadow-sm border border-black/5" />
                  <div className="p-10 space-y-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS - ILLUSTRATED */}
        <section className="py-32 px-4 bg-white overflow-hidden">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <div className="relative order-2 lg:order-1">
                <Image
                  src={growthImg}
                  alt="Growth Illustration"
                  className="w-full h-auto drop-shadow-[0_35px_35px_rgba(34,197,94,0.15)]"
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 rounded-full -z-10 blur-3xl" />
              </div>

              <div className="space-y-12 order-1 lg:order-2">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-bold leading-tight">Sadece 5 Dakikada <br />Yayına Hazırsınız</h2>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Teknik detaylarla uğraşmanıza gerek yok. Biz her şeyi sizin için kurduk, size sadece yönetmek kaldı.
                  </p>
                </div>

                <div className="space-y-10">
                  {[
                    {
                      step: "01",
                      title: "Profilini Kişiselleştir",
                      desc: "Hizmet alanlarını seç, referans projelerini yükle. Profesyonel imajını dakikalar içinde oluştur.",
                    },
                    {
                      step: "02",
                      title: "Talepleri Takip Et",
                      desc: "Sana özel panelden gelen aramaları ve mesajları izle. Müşteri davranışlarını analiz et.",
                    },
                    {
                      step: "03",
                      title: "İşini Büyüt",
                      desc: "Doğrudan müşteriye ulaş, aracıları ortadan kaldır. Kazancının %100'ü sende kalsın.",
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-8 group">
                      <div className="flex-shrink-0 w-16 h-16 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center font-bold text-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        {item.step}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-bold text-foreground">{item.title}</h4>
                        <p className="text-lg text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS - LIGHT CARD */}
        <section className="py-24 px-4 bg-[#f1f6f3]">
          <div className="container mx-auto max-w-7xl">
            <div className="relative rounded-3xl md:rounded-[3rem] overflow-hidden p-6 sm:p-8 md:p-12 lg:p-20 shadow-xl bg-white border border-primary/5">
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] opacity-[0.03] pointer-events-none" />
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-12 text-center">
                {[
                  { v: "50.000+", l: "Aylık Ziyaretçi" },
                  { v: "81", l: "İl Kapsamı" },
                  { v: "4.500+", l: "Eşleşme" },
                  { v: "350+", l: "Aktif Profesyonel" }
                ].map((stat, i) => (
                  <div key={i} className="space-y-1 md:space-y-2 flex flex-col items-center justify-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-accent tracking-tighter drop-shadow-sm whitespace-nowrap">{stat.v}</div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider md:tracking-[0.2em] text-[10px] sm:text-xs md:text-sm text-balance">{stat.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - CLEAN */}
        <section className="py-32 px-4 bg-[#fafdfb]">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-bold">Aklınıza Takılanlar</h2>
              <p className="text-muted-foreground text-lg">Platform hakkında daha fazla bilgi edinin.</p>
            </div>

            {mounted && (
              <Accordion type="single" collapsible className="space-y-4">
                {[
                  {
                    q: "Kayıt olmak gerçekten ücretsiz mi?",
                    a: "Evet, temel profilinizi oluşturup listelenmek tamamen ücretsizdir. Herhangi bir kart bilgisi gerekmez."
                  },
                  {
                    q: "Müşterilerle nasıl iletişim kuracağım?",
                    a: "Müşteriler profilinizdeki onaylı telefon numaranızdan sizi arayabilir veya sistem üzerinden mesaj bırakabilirler."
                  },
                  {
                    q: "Komisyon ödüyor muyum?",
                    a: "Hayır. Aldığınız işlerden platforma herhangi bir komisyon ödemezsiniz. Tüm kazanç iş ortaklarımızın olur."
                  },
                  {
                    q: "Hizmet alanımı sonradan değiştirebilir miyim?",
                    a: "Elbette. Admin paneliniz üzerinden hizmet verdiğiniz bölgeleri, kategorileri ve portfolyonuzu saniyeler içinde güncelleyebilirsiniz."
                  }
                ].map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="bg-white border border-black/5 rounded-2xl px-6 py-2 shadow-sm">
                    <AccordionTrigger className="text-lg font-bold hover:no-underline hover:text-primary transition-colors">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-lg leading-relaxed pt-2">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>

        {/* FINAL CTA - VIBRANT */}
        <section className="py-20 px-4 mb-20">
          <div className="container mx-auto max-w-7xl">
            <div className="relative rounded-[3rem] bg-accent p-12 md:p-24 text-center overflow-hidden shadow-2xl">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-[80px]" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/15 rounded-full blur-[80px]" />

              <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-6xl font-bold text-accent-foreground leading-tight">Peyzaj Sektörünün Dijital <br />Geleceğinde Yerinizi Alın</h2>
                <p className="text-xl text-accent-foreground/80 leading-relaxed font-medium">
                  Rakipleriniz burada, müşterileriniz ise sizi arıyor. Bugün kaydolun, bölgenizin en çok tercih edilen firması olun.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                  <Button size="lg" className="h-16 px-12 text-xl rounded-2xl shadow-xl hover:scale-105 transition-all bg-primary hover:bg-primary/90 text-white border-none group" asChild>
                    <Link href="/firma/giris?tab=signup" className="flex items-center gap-3">
                      Hemen Ücretsiz Başla
                      <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <span className="text-accent-foreground/60 font-semibold italic">Kayıt Süresi: ~2 Dakika</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

// Missing icon fix
const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

export default FirmaKayitLanding;
