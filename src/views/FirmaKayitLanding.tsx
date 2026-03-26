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
  Users,
  Briefcase,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  Zap
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

const FirmaKayitLanding = () => {
  const [mounted, setMounted] = useState(false);

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
                Her ay 1000'den fazla villa sahibi ve kurum, peyzaj projeleri için bizi ziyaret ediyor. Onların karşısına çıkan ilk firma siz olun.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-lg rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 group" asChild>
                  <Link href="/firma/giris?tab=signup" className="flex items-center gap-2">
                    Ücretsiz Profilinizi Oluşturun
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <div className="text-sm text-slate-500 font-medium px-4">
                  <span className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Kredi kartı gerekmez
                  </span>
                  <span className="flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 2 dakikada yayında
                  </span>
                </div>
              </div>
            </div>

            {/* Platform Mockup UI */}
            <div className="mt-20 relative max-w-5xl mx-auto animate-fade-in pb-10">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-400 blur-3xl opacity-20 rounded-[3rem] -z-10 translate-y-10"></div>
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-2xl p-4 md:p-8">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Mock Lead Card */}
                  <div className="col-span-1 border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Yeni Talep</span>
                      <span className="text-slate-400 text-xs">2 dk önce</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Villa Bahçesi Tasarımı</h4>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> İstanbul, Beykoz (450m²)</p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-800">Tahmini Bütçe:</span>
                      <span className="font-bold text-emerald-600">250.000₺</span>
                    </div>
                  </div>

                  {/* Mock Stats */}
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-center">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">Bu Ayki Profil Ziyareti</p>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-black text-slate-800">1,248</span>
                        <span className="text-xs text-emerald-600 font-bold mb-1 flex items-center"><TrendingUp className="h-3 w-3 mr-0.5" /> +24%</span>
                      </div>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-center">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                        <Star className="h-5 w-5 text-amber-600" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">Bölge Sıralamanız</p>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-black text-slate-800">1.</span>
                        <span className="text-xs text-slate-500 font-bold mb-1 flex items-center"> / 42 Firma</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGO CLOUD */}
        <section className="py-10 border-y border-slate-200 bg-white">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Türkiye'nin En İyi Peyzaj Firmaları Bizi Tercih Ediyor</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
              {/* Güven simgeleri / Sembolik logolar */}
              <div className="flex items-center gap-2 text-xl font-bold font-serif"><LeafIcon /> Doğa Mimarlık</div>
              <div className="flex items-center gap-2 text-xl font-bold"><ShieldCheck /> Güven Peyzaj</div>
              <div className="flex items-center gap-2 text-xl font-bold font-sans tracking-tight"><Target /> Vizyon Tasarım</div>
              <div className="flex items-center gap-2 text-xl font-bold"><Zap /> Elite Bahçe</div>
            </div>
          </div>
        </section>

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
                    "Sıcak müşteri: Size gelen talepler, tam şu an hizmet arayan kişilerden gelir.",
                    "Standart kullanım ücretsiz: Aidat yok, komisyon yok. Sadece beğendiğiniz müşterinin iletişim bilgisini almak için jeton harcarsınız.",
                    "Haksız rekabet yok: Ev sahibi, projesiyle eşleşen en fazla 3 profesyonelden teklif alabilir."
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
                      <p className="text-sm text-emerald-700/80">Tamamen ücretsiz profil, sadece detayları verilmiş yüksek niyetli iş taleplerine ödeme, %100 ölçülebilir kazanç.</p>
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
                  desc: "Dakikalar içinde firmanızı kaydedin. Hizmet bölgelerinizi, uzmanlık alanlarınızı ve en iyi projelerinizi portfolyonuza ekleyin.",
                  icon: Briefcase
                },
                {
                  step: "2",
                  title: "Bildirimleri Alın",
                  desc: "Bölgenizde ve uzmanlık alanınızda yeni bir proje talebi (havuz, çim serme, tasarım vb.) olduğunda anında cebinize bildirim gelsin.",
                  icon: Target
                },
                {
                  step: "3",
                  title: "Teklif Verin & İşin Sahibi Olun",
                  desc: "Müşterinin detaylı isteklerine bakın, uygunsa iletişim bilgilerini açıp doğrudan görüşün. Komisyon ödemeden işi bağlayın.",
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

        {/* PRICING (PAY PER LEAD CONCEPT) */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="container mx-auto px-4 max-w-4xl relative z-10 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Sürpriz Ücret Yok. Kayıt Ücreti Yok.</h2>
            <p className="text-xl text-slate-300 md:text-2xl mb-12 font-light">
              Müşteri getirmezsek, para kazanmıyoruz. <br className="hidden md:block" /> Sadece ilgilendiğiniz projeler için ödeme yaparsınız.
            </p>

            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-8 flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Standart Profil</h3>
                <div className="text-4xl font-black text-emerald-400 mb-6 flex items-baseline gap-1">0₺ <span className="text-base text-slate-400 font-normal">/ay</span></div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Şehir rehberinde listelenme</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Sınırsız proje (portfolyo) yükleme</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Müşteri yorumları alma</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Talep havuzuna erişim</li>
                </ul>
                <Button variant="outline" className="w-full h-12 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" asChild>
                  <Link href="/firma/giris?tab=signup">Ücretsiz Katıl</Link>
                </Button>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl border border-emerald-400 p-8 shadow-2xl flex flex-col transform md:-translate-y-4 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Yeni Firmalara Özel</div>
                <h3 className="text-2xl font-bold mb-2">Başlangıç Hediyesi</h3>
                <div className="text-4xl font-black text-white mb-6">Bedava <span className="text-base text-emerald-100 font-normal">jetonlar</span></div>
                <ul className="space-y-3 mb-8 flex-1 text-emerald-50">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-white" /> Sisteme kayıt olan tüm firmalara</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-white" /> İlk müşterilerini bulmaları için</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-white" /> Hoş geldin jeton bakiyesi tanımlanır</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-white" /> Risksiz deneme fırsatı</li>
                </ul>
                <Button className="w-full h-12 bg-white text-emerald-700 hover:bg-slate-100 font-bold" asChild>
                  <Link href="/firma/giris?tab=signup">Hediyeni Al ve Başla</Link>
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
                    q: "Peki siz nasıl para kazanıyorsunuz?",
                    a: "Sistem, ön ödemeli 'Jeton' mantığıyla çalışır. Eğer müşteri doğrudan sizi aramaz da detaylı Teklif Al sayfamız üzerinden bir talep oluşturursa (örn: 'İstanbul'da 200m2 rulo çim yaptırmak istiyorum'), bu talep şehir, ilgili hizmet sağlayıcılarına talebi iletir. Talebe erişmek için ufak bir miktar jeton harcarsınız. İlgilenmediğiniz işlere para ödemezsiniz."
                  },
                  {
                    q: "Kazancımdan komisyon kesiliyor mu?",
                    a: "Kesinlikle hayır. Biz aracı değil, sizi müşteriyle buluşturan bir köprüyüz. İşi aldıktan sonra sözleşme, ödeme ve süreç tamamen sizinle müşteri arasındadır."
                  },
                  {
                    q: "Müşterinin numarasını alınca işi kesin almış mı oluyorum?",
                    a: "Hayır, biz müşterinin taleplerini en doğru şekilde almaya çalışıyoruz ve size iletiyoruz. İşi almak sizin iletişim becerinize, yetkinliğinize, sunduğunuz projeye ve fiyatlandırmanıza bağlıdır. Ancak biz sadece doğrulanmış ve yüksek niyetli talepleri sisteme düşürüyoruz."
                  },
                  {
                    q: "Diğer sitelerden farkınız ne?",
                    a: "Peyzajbul, jenerik platformların aksine sadece peyzaj ve dış mekan tasarımına odaklanır. Bizde 'temizlik' veya 'nakliye' talepleri arasında kaybolmazsınız; sadece bahçesiyle ilgilenen, yüksek bütçeli ve mülk sahibi kitleye ulaşırsınız. Ayrıca komisyon almıyor, sadece ilgilendiğiniz talebin detaylarını görmeniz için şeffaf bir jeton modeli sunuyoruz. Bununla birlikte müşteri taleplerini detaylıca inceliyor ve adil bir fiyat politikası belirliyoruz"
                  },
                  {
                    q: "İade var mı?",
                    a: "Biz attığımız tüm adımlarda Peyzaj Firmalarının hakkını göz etmeye çalıştığımız için eğer bir talebe jeton harcadıysanız ve o müşteriye ulaşamadıysanız bunun ispatı karşılığında jeton iadesi yapıyoruz. Ancak bunun dışında yüklenen jetonların iadesi ürünün doğası gereği mümkün değildir."
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
            <Button size="lg" className="h-16 px-12 text-xl rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 transition-transform hover:scale-105" asChild>
              <Link href="/firma/giris?tab=signup">
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

// Generic Leaf Icon for logo cloud
const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
);

export default FirmaKayitLanding;
