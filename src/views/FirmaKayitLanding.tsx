"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  MessageSquare,
  Globe,
  CheckCircle2,
  TrendingUp,
  Target,
  Briefcase,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPinned
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TrustBadges from "@/components/TrustBadges";
import { visibleStatItems, type PublicStats } from "@/lib/publicStats";
import { getProHighlights } from "@/lib/pricing";
import { useState, useEffect } from "react";

interface FirmaKayitLandingProps {
  stats: PublicStats | null;
}

// Premium listesi src/lib/pricing.ts'teki çalışan özelliklerden gelir; fiyat sayfasıyla aynı kaynak.
const PRO_HIGHLIGHTS = getProHighlights();

const FirmaKayitLanding = ({ stats }: FirmaKayitLandingProps) => {
  const [mounted, setMounted] = useState(false);
  const statItems = stats ? visibleStatItems(stats) : [];
  const liveTiles = statItems.filter((item) => item.key === "firms" || item.key === "cities");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* HERO SECTION - REIMAGINED */}
        <section className="relative pt-20 pb-32 overflow-hidden bg-white">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-50/50 to-transparent"></div>

          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium text-sm animate-fade-in">
                <Sparkles className="h-4 w-4" />
                <span>Peyzaj Firmaları ve Mimarlar İçin Büyüme Platformu</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                Yeni Müşteriler Aramayı Bırakın, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Müşteriler Sizi Bulsun.</span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 max-w-2xl leading-relaxed">
                Peyzaj hizmeti arayan ev sahipleri firmaları bölgeye ve hizmete göre buluyor. Profilinizi rehberde öne çıkarın, şehrinizden gelen talepleri görün.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-auto min-h-[4rem] py-3 px-4 sm:px-10 text-base sm:text-lg rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 group" asChild>
                  <Link href="/firma/giris?tab=signup" className="flex items-center justify-center gap-2 flex-wrap text-center">
                    Ücretsiz Profilinizi Oluşturun
                    <ArrowRight className="h-5 w-5 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <div className="text-sm text-slate-500 font-medium px-4">
                  <span className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Kredi kartı gerekmez
                  </span>
                  <span className="flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Kayıt 2 dakika sürer, onaydan sonra yayında
                  </span>
                </div>
              </div>

              <Link
                href="/firma-sahiplen"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                Firmanız rehberde zaten listeleniyor mu? Profili sahiplenin →
              </Link>
            </div>

            {/* Platform Mockup UI */}
            <div className="mt-20 relative max-w-5xl mx-auto animate-fade-in pb-10">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-400 blur-3xl opacity-20 rounded-[3rem] -z-10 translate-y-10"></div>
              <div className="relative rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-2xl p-4 md:p-8">
                <span className="absolute -top-3 left-6 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Örnek ekran (temsili veri)
                </span>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Illustrative Lead Card */}
                  <div className="col-span-1 border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Örnek talep</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">Villa Bahçesi Tasarımı</h4>
                      <p className="text-sm text-slate-500 mt-1.5 flex items-start gap-1"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" /> <span className="line-clamp-2">Şehir, İlçe</span></p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 text-sm">Bütçe aralığı:</span>
                      <span className="text-sm font-medium text-slate-600">talepte belirtilir</span>
                    </div>
                  </div>

                  {/* Live directory numbers */}
                  {liveTiles.length > 0 && (
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      {liveTiles.map((tile) => {
                        const TileIcon = tile.key === "firms" ? Building2 : MapPinned;
                        return (
                          <div key={tile.key} className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-center">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                              <TileIcon className="h-5 w-5 text-emerald-600" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">{tile.label}</p>
                            <span className="text-3xl font-black text-slate-800 mt-1">{tile.value.toLocaleString("tr-TR")}</span>
                            <span className="text-xs text-slate-400 mt-1">Güncel rehber verisi</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE DIRECTORY NUMBERS */}
        {statItems.length > 0 && (
          <section className="py-10 border-y border-slate-200 bg-white">
            <div className="container mx-auto px-4">
              <TrustBadges variant="light" stats={stats} />
            </div>
          </section>
        )}

        {/* VALUE PROPOSITION: THE PROBLEM VS SOLUTION */}
        <section className="py-24 bg-slate-50 overflow-hidden">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                  Sosyal medya reklamlarında bütçenizi yakmaya <span className="text-red-500">son verin.</span>
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Instagram'da beğeni toplamak faturaları ödemez. Ajanslara her ay binlerce lira ödemek yerine, sadece <strong>gerçekten iş arayan</strong>, projesi hazır müşterilerle eşleşin.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "Talebi kendisi açan müşteri: Size gelen talepler, hizmet için formu bizzat dolduran ve e-postasını doğrulayan kişilerden gelir.",
                    "Standart kullanım ücretsiz: Aidat yok, komisyon yok. Sadece beğendiğiniz müşterinin iletişim bilgisini almak için jeton harcarsınız.",
                    "Sınırlı rekabet: Bir talebi en fazla 3 firma satın alabilir."
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-700">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 transform rotate-3 rounded-3xl opacity-10"></div>
                <div className="bg-white border border-slate-200 rounded-3xl p-8 relative shadow-xl">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Acı Gerçekler vs. Yeni Nesil Model</h3>

                  <div className="space-y-6">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="text-red-800 font-semibold mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Geleneksel Reklamlar</div>
                      <p className="text-sm text-red-600/80">Yüksek maliyet, "Sadece fiyat soruyorum" diyen alakasız kitle, ölçülemeyen kazanç.</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-emerald-800 font-semibold mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Peyzajbul Modeli</div>
                      <p className="text-sm text-emerald-700/80">Ücretsiz profil; yalnızca ilgilendiğiniz talebin iletişim bilgileri için jeton harcarsınız.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Nasıl Çalışır?</h2>
              <p className="text-lg text-slate-600">Üç basit adımda hayalinizdeki projeleri almaya başlayın.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Vitrininizi Kurun",
                  desc: "Firmanızı kaydedin; hizmetlerinizi, bölgenizi ve fotoğraflarınızı profilinize ekleyin. Rehberde zaten listeleniyorsanız profilinizi sahiplenin.",
                  icon: Briefcase
                },
                {
                  step: "2",
                  title: "Talepten Haberdar Olun",
                  desc: "Bölgenize ve hizmetinize uyan bir talep size iletildiğinde e-posta ile haber alırsınız. İsterseniz profilinizden Telegram bildirimini de bağlayabilirsiniz.",
                  icon: Target
                },
                {
                  step: "3",
                  title: "Teklif Verin & İşin Sahibi Olun",
                  desc: "Müşterinin detaylı isteklerine bakın, uygunsa jetonla iletişim bilgilerini açıp doğrudan görüşün. İşi aldıktan sonra komisyon ödemezsiniz.",
                  icon: TrendingUp
                }
              ].map((feature, i) => (
                <div key={i} className="relative p-8 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-300 group">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <div className="absolute top-8 right-8 text-6xl font-black text-slate-100 group-hover:text-emerald-50/50 transition-colors pointer-events-none">
                    {feature.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed relative z-10">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Sürpriz Ücret Yok. Kayıt Ücreti Yok.</h2>
              <p className="text-xl text-slate-300 font-light">
                Size en uygun planı seçin ve büyümeye başlayın.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start text-left">

              {/* Standart */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-8 flex flex-col">
                <h3 className="text-2xl font-bold mb-1">Standart Profil</h3>
                <p className="text-slate-400 text-sm mb-4">Temel görünürlük için</p>
                <div className="text-4xl font-black text-emerald-400 mb-6 flex items-baseline gap-1">0₺ <span className="text-base text-slate-400 font-normal">/ay</span></div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> Şehir rehberinde listelenme</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> Galeride 5 fotoğrafa kadar</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> Müşteri yorumları alma</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> Bölgenize uyan taleplerde eşleştirilme</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> Profil görüntüleme ve tıklama istatistikleri</li>
                </ul>
                <Button variant="outline" className="w-full h-12 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" asChild>
                  <Link href="/firma/giris?tab=signup">Ücretsiz Katıl</Link>
                </Button>
              </div>

              {/* Premium */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl border border-emerald-400 p-8 shadow-2xl flex flex-col transform md:-translate-y-4 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full whitespace-nowrap">
                  Önerilen Plan
                </div>
                <h3 className="text-2xl font-bold mb-1">Premium</h3>
                <p className="text-emerald-100 text-sm mb-4">Listelerde ve talep eşleştirmede öne geçin</p>
                <div className="text-3xl font-black text-white mb-6">Premium <span className="text-sm text-emerald-100 font-normal">üyelik</span></div>
                <ul className="space-y-3 mb-8 flex-1 text-emerald-50">
                  {PRO_HIGHLIGHTS.map((feature) => (
                    <li key={feature.id} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-white shrink-0" /> {feature.label}</li>
                  ))}
                </ul>
                <Button className="w-full h-12 bg-white text-emerald-700 hover:bg-slate-100 font-bold" asChild>
                  <Link href="/fiyatlandirma">Fiyatları Gör →</Link>
                </Button>
              </div>

            </div>

            {/* Firmanı Sahiplen - Yatay Kutu */}
            <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl border border-amber-400/30 p-6 md:p-8 relative">
              <div className="absolute -top-4 left-6 bg-amber-400 text-amber-950 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full whitespace-nowrap">
                🔍 Rehberde Zaten Var mısınız?
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-6 mt-2">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Firmanı Sahiplen</h3>
                    <p className="text-amber-400 font-black text-lg">Ücretsiz sahiplenme</p>
                  </div>
                </div>
                <div className="flex-1 grid sm:grid-cols-2 gap-2 text-sm">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" /> Profildeki «Bu sizin firmanız mı?» düğmesini veya size gönderilen sahiplenme bağlantısını kullanın</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" /> Profilde kayıtlı e-postanıza 6 haneli kod gelir; kodu girince profil hemen sizin olur</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" /> Profilde e-posta yoksa WhatsApp ile doğrulayın; yalnızca bu yolda yönetici onayı gerekir</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" /> Bilgilerinizi, galerinizi ve iletişim bilgilerinizi güncelleyin</span>
                </div>
                <Button variant="outline" className="shrink-0 h-12 px-8 border-amber-400/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300" asChild>
                  <Link href="/firma-sahiplen">Firmamı Sahipleneyim →</Link>
                </Button>
              </div>
            </div>

            {/* Dijital Ajans - Yatay Kutu */}
            <div className="mt-8 bg-slate-900 text-white rounded-2xl border border-white/10 p-6 md:p-8 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-0 translate-x-32 -translate-y-32 group-hover:bg-emerald-500/20 transition-colors"></div>
              <div className="absolute -top-4 left-6 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full whitespace-nowrap z-10">
                🚀 Yeni: Dijital Büyüme Paketi
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-6 mt-2 relative z-10 text-left">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Peyzaj Dijital Ajans</h3>
                    <p className="text-emerald-400 font-black text-lg">Web Tasarım & SEO</p>
                  </div>
                </div>
                <div className="flex-1 text-sm text-slate-300">
                  <p className="mb-2 font-medium text-white italic">"Bahçeleri siz güzelleştirin, işinizi de biz güzelleştirelim."</p>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Mobil ve tablet uyumlu web sitesi</span>
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Bölgesel SEO çalışması (sıralama garanti edilmez)</span>
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Teklif alma formu entegrasyonu</span>
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Pakete göre 1 ile 3 ay arası Premium üyelik dahil</span>
                  </div>
                </div>
                <Button className="shrink-0 h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20" asChild>
                  <Link href="/peyzaj-dijital-ajans">Hemen İncele →</Link>
                </Button>
              </div>
            </div>

          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-4 bg-slate-50">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Sıkça Sorulan Sorular</h2>
            </div>

            {mounted && (
              <Accordion type="single" collapsible className="space-y-4">
                {[
                  {
                    q: "Kayıt olmak ücretli mi?",
                    a: "Hayır. Profil oluşturmak, portfolyo yüklemek ve bölge/kategori aramalarında listelenmek tamamen ücretsizdir. Hiçbir zaman sürpriz bir fatura ile karşılaşmazsınız."
                  },
                  {
                    q: "Firmam rehberde zaten listeleniyor, nasıl sahiplenirim?",
                    a: "Firma sayfasındaki «Bu sizin firmanız mı?» düğmesini veya size gönderilen sahiplenme bağlantısını açın. Profilde kayıtlı bir e-posta adresi varsa oraya 6 haneli bir kod göndeririz; kodu girdiğinizde profil hemen sizin olur. Profilde e-posta yoksa ya da o adrese erişemiyorsanız, kendi e-posta adresinizi doğrulayıp WhatsApp'tan sahiplenme kodunuzu gönderirsiniz; bu yolda başvuruyu yönetici onaylar ve sonuç e-postayla bildirilir. Sahiplenmek ücretsizdir."
                  },
                  {
                    q: "Peki siz nasıl para kazanıyorsunuz?",
                    a: "Sistem, ön ödemeli 'Jeton' mantığıyla çalışır. Eğer müşteri doğrudan sizi aramaz da detaylı Teklif Al sayfamız üzerinden bir talep oluşturursa (örn: 'İstanbul'da 200m2 rulo çim yaptırmak istiyorum'), bu talep şehir, ilgili hizmet sağlayıcılarına talebi iletir. Talebe erişmek için ufak bir miktar jeton harcarsınız. İlgilenmediğiniz işlere para ödemezsiniz."
                  },
                  {
                    q: "Kazancımdan komisyon kesiliyor mu?",
                    a: "Kesinlikle hayır. Biz aracı değil, sizi müşteriyle buluşturan bir köprüyüz. İşi aldıktan sonra sözleşme, ödeme ve süreç tamamen sizinle müşteri arasındadır."
                  },
                  {
                    q: "Müşterinin numarasını alınca işi kesin almış mı oluyorum?",
                    a: "Hayır, biz müşterinin taleplerini en doğru şekilde almaya çalışıyoruz ve size iletiyoruz. İşi almak sizin iletişim becerinize, yetkinliğinize, sunduğunuz projeye ve fiyatlandırmanıza bağlıdır. Talepler e-posta doğrulamasından ve otomatik ya da yönetici kontrolünden geçtikten sonra firmalara iletilir; bu, her talebin işe dönüşeceği anlamına gelmez."
                  },
                  {
                    q: "Diğer sitelerden farkınız ne?",
                    a: "Peyzajbul, jenerik platformların aksine sadece peyzaj ve dış mekan tasarımına odaklanır. Bizde 'temizlik' veya 'nakliye' talepleri arasında kaybolmazsınız; sadece bahçesiyle ilgilenen mülk sahiplerine ulaşırsınız. Ayrıca komisyon almıyor, sadece ilgilendiğiniz talebin detaylarını görmeniz için şeffaf bir jeton modeli sunuyoruz. Bununla birlikte müşteri taleplerini detaylıca inceliyor ve adil bir fiyat politikası belirliyoruz"
                  },
                  {
                    q: "İade var mı?",
                    a: "Satın aldığınız talepte numara yanlışsa, müşteriye ulaşamadıysanız ya da talep gerçek değilse, panelinizden admin onayıyla, 72 saat içinde (satın almadan itibaren) iade talebi oluşturabilirsiniz. Talep incelenir; onaylanırsa jetonlar hesabınıza iade edilir. Yüklenmiş jetonların talep dışındaki iadesi mümkün değildir."
                  }
                ].map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="bg-white border-none rounded-2xl shadow-sm px-6">
                    <AccordionTrigger className="text-lg font-bold text-slate-800 hover:no-underline py-6">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 text-base leading-relaxed pb-6">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-20 px-4 bg-white border-t border-slate-100">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Bölgenizdeki projeleri rakiplerinize kaptırmayın.</h2>
            <p className="text-xl text-slate-600 mb-10">2 dakikada profilinizi oluşturun, yeni müşterilerle tanışın.</p>
            <Button size="lg" className="w-full sm:w-auto h-auto min-h-[4rem] py-3 px-6 sm:px-12 text-base sm:text-xl rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 transition-transform hover:scale-105" asChild>
              <Link href="/firma/giris?tab=signup" className="flex items-center justify-center text-center flex-wrap">
                Hemen Profilinizi Oluşturun
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FirmaKayitLanding;
