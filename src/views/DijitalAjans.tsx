"use client";

import Link from "next/link";
import { Check, ArrowRight, Sparkles, MonitorSmartphone, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const DijitalAjansClient = () => {
  return (
    <div className="min-h-screen bg-background font-body flex flex-col selection:bg-primary/20">
      {/* HEADER (Simplified for Landing Page) */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex bg-primary text-primary-foreground p-1.5 rounded-md items-center justify-center">
              <span className="font-heading font-black text-xl tracking-tighter leading-none">
                P
              </span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">
              Peyzajbul<span className="text-primary">.com</span>
            </span>
          </Link>
          <a href="#iletisim">
            <Button variant="default" className="font-bold">
              Hemen Başvurun
            </Button>
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-primary pt-20 pb-32 lg:pt-32 lg:pb-40">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
          {/* Decorative Elements */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white font-medium text-sm mb-8 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-accent" />
              Peyzaj Firmalarına Özel Dijital Çözümler
            </div>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight max-w-5xl mx-auto">
              Bahçeleri Siz Güzelleştirin, <br className="hidden md:block" />
              <span className="text-accent underline decoration-accent/30 underline-offset-[12px]">İşinizi de Biz Güzelleştirelim</span>
            </h1>
            <p className="text-white/80 font-body text-xl md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed">
              Özel web tasarımı, Google SEO ve reklam yönetimi ile rakiplerinizin önüne geçin.
              Müşterileriniz sizi dijitalde de bulsun.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#paketler">
                <Button size="lg" variant="gold" className="w-full sm:w-auto text-lg h-14 px-8 font-bold gap-2 shadow-xl shadow-accent/20">
                  Paketleri İnceleyin <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">Neden Bizi Seçmelisiniz?</h2>
              <p className="text-lg text-muted-foreground">Sadece peyzaj sektörünü anlayan ve bu dikeyde çalışan tek dijital ajansız.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <MonitorSmartphone className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-3">Özel Web Tasarım</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Referanslarınızı, projelerinizi ve vizyonunuzu en iyi yansıtan, mobil uyumlu ve modern web siteleri tasarlıyoruz. Müşterileriniz firmanızın kalitesini sitenizden anlasın.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-accent/30 transition-all duration-300">
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-3">Google SEO Yönetimi</h3>
                <p className="text-muted-foreground leading-relaxed">
                  "Peyzaj firması [Şehriniz]", "Otomatik sulama [İlçeniz]" gibi aramalarda sitenizi üst sıralara taşıyoruz. Doğrudan sizin hizmetinize ihtiyacı olan müşterileri sitenize çekiyoruz.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-secondary/30 transition-all duration-300">
                <div className="w-16 h-16 rounded-xl bg-secondary/10 flex items-center justify-center mb-6">
                  <Target className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-3">Google & Sosyal Medya Reklamları</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Nokta atışı hedefleme ile reklam bütçenizi boşa harcamadan, doğrudan projesi olan villa sahiplerine, sitelere ve kurumlara ulaşıyoruz.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PORTFOLIO / MOCKUPS SECTION */}
        <section className="py-24 bg-background border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">Örnek Tasarımlar & Çözümler</h2>
              <p className="text-lg text-muted-foreground">Peyzaj sektörüne özel, dönüşüm (müşteri) odaklı, modern ve hızlı web arayüzleri geliştiriyoruz.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Portfolio Item 1 */}
              <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {/* Decorative Mockup Background */}
                  <img
                    src="https://images.unsplash.com/photo-1558904541-efa843a96f0f?q=80&w=800&auto=format&fit=crop"
                    alt="Kurumsal Peyzaj Sitesi"
                    className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Overlay UI element to make it look like a website mockup */}
                  <div className="absolute inset-x-4 bottom-0 h-4/5 bg-background/95 backdrop-blur-sm rounded-t-xl border border-border flex flex-col shadow-2xl transform translate-y-4 group-hover:translate-y-2 transition-transform duration-300">
                    <div className="h-8 border-b border-border/50 flex items-center px-3 gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/60"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-accent/60"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-primary/60"></div>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      <div className="h-6 w-3/4 bg-muted-foreground/10 rounded"></div>
                      <div className="h-4 w-full bg-muted-foreground/10 rounded"></div>
                      <div className="h-4 w-5/6 bg-muted-foreground/10 rounded"></div>
                      <div className="h-10 w-1/3 bg-primary/20 rounded mt-2"></div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-2 font-heading">Kurumsal Web Siteleri</h3>
                  <p className="text-muted-foreground text-sm">Hizmetlerinizi, projelerinizi ve güvenilirliğinizi yansıtan, tamamen size özel kurumsal yapılar.</p>
                </div>
              </div>

              {/* Portfolio Item 2 */}
              <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop"
                    alt="Fidanlık & E-Ticaret"
                    className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-x-4 bottom-0 h-4/5 bg-background/95 backdrop-blur-sm rounded-t-xl border border-border flex flex-col shadow-2xl transform translate-y-4 group-hover:translate-y-2 transition-transform duration-300">
                    <div className="h-8 border-b border-border/50 flex items-center px-3 gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/60"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-accent/60"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-primary/60"></div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div className="aspect-square bg-muted-foreground/10 rounded"></div>
                      <div className="aspect-square bg-muted-foreground/10 rounded"></div>
                      <div className="aspect-square bg-muted-foreground/10 rounded"></div>
                      <div className="aspect-square bg-muted-foreground/10 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-2 font-heading">Katalog & Ürün Sergileme</h3>
                  <p className="text-muted-foreground text-sm">Bitki ve rulo çim gibi ürünlerinizi müşterilerinize sunabileceğiniz veya satabileceğiniz yapı.</p>
                </div>
              </div>

              {/* Portfolio Item 3 */}
              <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300 lg:col-span-1 md:col-span-2 lg:mx-0 md:mx-auto md:w-1/2 lg:w-full">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1558661091-5cc1b64d0dc5?q=80&w=800&auto=format&fit=crop"
                    alt="Teklif Odaklı Açılış Sayfası"
                    className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-500 absolute inset-0"
                  />
                  {/* Mobile mockup shape */}
                  <div className="relative z-10 w-[140px] h-[280px] bg-background border-4 border-foreground/80 rounded-[2rem] shadow-2xl overflow-hidden transform translate-y-8 group-hover:translate-y-4 transition-transform duration-300">
                    <div className="absolute top-0 inset-x-0 h-4 bg-foreground/80 rounded-b-xl w-1/2 mx-auto"></div>
                    <div className="p-3 mt-4 flex flex-col gap-2">
                      <div className="h-8 w-full bg-primary/20 rounded"></div>
                      <div className="h-2 w-full bg-muted-foreground/10 rounded mt-2"></div>
                      <div className="h-2 w-5/6 bg-muted-foreground/10 rounded"></div>
                      <div className="h-16 w-full bg-muted-foreground/5 rounded mt-2"></div>
                      <div className="h-6 w-3/4 bg-accent/30 rounded mt-2 mx-auto"></div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-2 font-heading">Teklif Toplama (Landing Page)</h3>
                  <p className="text-muted-foreground text-sm">Doğrudan reklam kampanyalarından müşteri ve teklif toplamak için optimize edilmiş mobil odalı sayfalar.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* PRICING WITH OFFER */}
        <section id="paketler" className="py-24 relative">
          {/* Background blob for highlight */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">Size Uygun Paketi Seçin</h2>
              <p className="text-lg text-muted-foreground mb-6">İşletmenizin ihtiyacına göre şekillendirilmiş şeffaf fiyatlandırma.</p>

              <div className="inline-flex flex-col items-center justify-center gap-4">
                {/* Blinking urgency CTA */}
                <div className="animate-pulse bg-destructive/10 text-destructive border border-destructive/20 px-6 py-2 rounded-full font-bold text-lg flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                  </span>
                  Lansmana Özel %50 İndirim - İlk 5 Firma ile Sınırlıdır!
                </div>

                <div className="inline-flex items-center gap-3 bg-accent text-accent-foreground px-6 py-4 rounded-2xl shadow-xl shadow-accent/20">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-50"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-foreground"></span>
                  </span>
                  <span className="font-bold text-lg tracking-wide">Tüm Paketlerde PEYZAJBUL PREMIUM ÜYELİĞİ HEDİYE! 🎁</span>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              {/* Starter Package */}
              <div className="flex flex-col bg-card border border-border rounded-3xl p-8 shadow-sm relative pt-12">
                <div className="mb-6">
                  <h3 className="font-heading text-2xl font-bold text-foreground">Başlangıç</h3>
                  <p className="text-muted-foreground text-sm mt-2">Dijitale ilk adımı atan firmalar için.</p>
                </div>
                <div className="mb-6 relative">
                  <div className="absolute -top-4 -right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md transform rotate-6">
                    %50 İNDİRİM
                  </div>
                  <span className="text-xl text-muted-foreground line-through decoration-destructive decoration-2">15.800 TL</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-extrabold text-foreground">7.900 TL</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {[
                    "Kurumsal SEO Uyumlu Web Sitesi",
                    "Mobil ve Tablet Uyumlu Tasarım",
                    "Hizmet ve Proje Sayfaları (Sınırsız)",
                    "Teklif Alma Formu Entegrasyonu",
                    "Temel Google Ayarları"
                  ].map((feature, i) => (
                    <li key={i} className="flex flex-start gap-3 text-foreground/80">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mb-8 bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center gap-3 shadow-sm transform transition-transform hover:scale-105">
                  <span className="text-2xl animate-bounce">🎁</span>
                  <p className="text-sm font-bold text-foreground leading-tight">1 Aylık 15$ (650₺) değerinde Premium Üyelik Hediye</p>
                </div>
                <a href="#iletisim">
                  <Button variant="outline" className="w-full h-12 text-md font-bold hover:bg-primary hover:text-white transition-colors">
                    Paketi Seç
                  </Button>
                </a>
              </div>

              {/* Growth Package (Highlighted) */}
              <div className="flex flex-col bg-primary border-2 border-accent rounded-3xl p-8 shadow-2xl relative transform lg:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground font-bold px-4 py-1.5 rounded-full text-sm uppercase tracking-wide">
                  En Çok Tercih Edilen
                </div>
                <div className="mb-6 mt-4">
                  <h3 className="font-heading text-2xl font-bold text-primary-foreground">Büyüme + SEO</h3>
                  <p className="text-primary-foreground/70 text-sm mt-2">Google'da bulunabilirliğini artırmak isteyenler için.</p>
                </div>
                <div className="mb-6 relative">
                  <div className="absolute -top-4 -right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md transform rotate-6">
                    %50 İNDİRİM
                  </div>
                  <span className="text-xl text-primary-foreground/60 line-through decoration-destructive decoration-2">25.800 TL</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-extrabold text-white">12.900 TL</span>
                  </div>
                  <span className="text-sm text-primary-foreground/80 block mt-2">+ Aylık 3.500₺ <span className="text-xs opacity-75">(Hizmet Bedeli)</span></span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {[
                    "Başlangıç Paketindeki Her Şey",
                    "Kapsamlı Bölgesel SEO Çalışması",
                    "Anahtar Kelime Araştırması",
                    "Whatsapp Danışmanlığı",
                    "Performans Raporlaması",
                    "Hızlı Index Alma Garantisi"
                  ].map((feature, i) => (
                    <li key={i} className="flex flex-start gap-3 text-white">
                      <Check className="h-5 w-5 text-accent shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mb-8 bg-black/20 border border-white/20 rounded-xl p-4 flex items-center gap-3 shadow-md transform transition-transform hover:scale-105">
                  <span className="text-2xl animate-bounce">🎁</span>
                  <p className="text-sm font-bold text-white leading-tight">3 Aylık 45$ (2.000₺) değerinde Premium Üyelik Hediye</p>
                </div>
                <a href="#iletisim">
                  <Button variant="gold" className="w-full h-14 text-lg font-bold shadow-lg shadow-black/20">
                    Hemen Başla
                  </Button>
                </a>
              </div>

              {/* Leader Package */}
              <div className="flex flex-col bg-card border border-border rounded-3xl p-8 shadow-sm relative pt-12">
                <div className="mb-6">
                  <h3 className="font-heading text-2xl font-bold text-foreground">Lider + Reklam</h3>
                  <p className="text-muted-foreground text-sm mt-2">Bölgesinde 1 numara olmak isteyen firmalar için.</p>
                </div>
                <div className="mb-6 relative">
                  <div className="absolute -top-4 -right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md transform rotate-6">
                    %50 İNDİRİM
                  </div>
                  <span className="text-xl text-muted-foreground line-through decoration-destructive decoration-2">39.800 TL</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-extrabold text-foreground">19.900 TL</span>
                  </div>
                  <span className="text-sm text-muted-foreground block mt-2">+ Aylık 8.000₺ <span className="text-xs opacity-75">(Hizmet Bedeli)</span></span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {[
                    "Büyüme (SEO) Paketindeki Her Şey",
                    "Google Ads Kurulumu ve Yönetimi",
                    "Meta (Instagram/FB) Reklam Yönetimi",
                    "Sosyal Medya Görsel Tasarımı (Aylık 4)",
                    "Dönüşüm Optimizasyonu"
                  ].map((feature, i) => (
                    <li key={i} className="flex flex-start gap-3 text-foreground/80">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mb-8 bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center gap-3 shadow-sm transform transition-transform hover:scale-105">
                  <span className="text-2xl animate-bounce">🎁</span>
                  <p className="text-sm font-bold text-foreground leading-tight">6 Aylık 90$ (4.000₺) değerinde Premium Üyelik Hediye</p>
                </div>                <a href="#iletisim">
                  <Button variant="outline" className="w-full h-12 text-md font-bold hover:bg-primary hover:text-white transition-colors">
                    Paketi Seç
                  </Button>
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section id="iletisim" className="py-24 bg-primary text-white text-center relative overflow-hidden">
          {/* Pulsing background effect */}
          <div className="absolute inset-0 bg-destructive/10 animate-pulse mix-blend-overlay"></div>

          <div className="container mx-auto px-4 max-w-4xl relative z-10">
            <div className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-2 rounded-full font-bold text-lg mb-8 shadow-xl shadow-destructive/20 animate-bounce">
              <span>⏰ Acele Edin! %50 İndirim Sadece İlk 5 Firma İle Sınırlıdır</span>
            </div>

            <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">Siz Müşterilerinize Odaklanın, Biz Dijitalinize</h2>
            <p className="text-xl text-white/80 mb-10">
              Hemen iletişime geçin, peyzaj firmanız için ne yapabileceğimizi tamamen ücretsiz değerlendirelim. Değerlendirme sonrası lansmana özel indirimden faydalanmak için yerinizi ayırtın.
            </p>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 max-w-lg mx-auto transform transition-transform hover:scale-105">
              <a
                href="https://wa.me/905345957147?text=Merhaba%2C%20dijital%20ajans%20hizmetleri%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xl font-bold px-8 py-4 rounded-2xl transition-colors shadow-lg"
              >
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                WhatsApp ile Ulaşın
              </a>
              <p className="text-white/60 text-sm mt-4">+90 534 595 71 47</p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card py-10">
        <div className="container mx-auto px-4 text-center">
          <Link href="/" className="inline-block mb-4">
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">
              Peyzajbul<span className="text-primary">.com</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Peyzajbul.com - Türkiye'nin En İyi Peyzaj Firmaları Platformu. Tüm Hakları Saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DijitalAjansClient;
