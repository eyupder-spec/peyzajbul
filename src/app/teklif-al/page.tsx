import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LeadFormWidget from "@/components/lead-form/LeadFormWidget";
import { Sparkles, ClipboardCheck, Clock, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Teklif Al - Peyzajbul",
  description: "Bahçeniz için profesyonel peyzaj firmalarından hızlıca fiyat teklifi alın. Proje detaylarını paylaşın, uzmanlar size ulaşsın.",
};

export default function TeklifAlPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section / Header */}
        <div className="relative overflow-hidden bg-primary py-16 md:py-24 mb-12">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              Hızlı ve Ücretsiz
            </div>
            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Hayalinizdeki Bahçe İçin <br /> <span className="text-accent underline decoration-accent/30 underline-offset-8">Hemen Teklif Alın</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-balance max-w-2xl mx-auto text-lg leading-relaxed">
              İhtiyaçlarınızı belirtin, bölgenizdeki en iyi peyzaj firmaları sizi arasın. 
              Vakit kaybetmeden projenizi hayata geçirin.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Info & Trust Elements */}
            <div className="lg:col-span-5 space-y-10 order-2 lg:order-1">
              <div className="space-y-6">
                <h2 className="font-heading text-2xl font-bold text-foreground">Süreç Nasıl İşler?</h2>
                
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                      <ClipboardCheck className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">1. Formu Doldurun</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Projenizin detaylarını, konumunu ve bütçenizi içeren kısa formu doldurun.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                      <Users className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">2. Uzmanlarla Eşleşin</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Talebiniz bölgenizdeki profesyonel peyzaj ekiplerine ve mimarlara iletilir.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                      <Clock className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">3. Teklifleri Değerlendirin</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Firmalar sizinle iletişime geçer, en uygun teklifi ve çözümü seçersiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Badge / Info Card */}
              <div className="bg-muted/30 border border-border rounded-[2rem] p-8 relative overflow-hidden">
                <blockquote className="relative z-10 italic text-muted-foreground leading-relaxed">
                  "Peyzajbul üzerinden verdiğim teklif talebi sayesinde 24 saat içinde 3 farklı firmadan dönüş aldım. Bahçem tam istediğim gibi oldu."
                </blockquote>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-bold">Mutlu Kullanıcı</span>
                </div>
              </div>
            </div>

            {/* Right Column: The Form */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <div className="relative">
                {/* Decorative blob behind the form */}
                <div className="absolute inset-0 bg-accent/5 blur-3xl -z-10 rounded-full transform scale-90" />
                <LeadFormWidget className="shadow-2xl border-primary/10" />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-6 px-4">
                Talebiniz gönderildiğinde <span className="font-bold">KVKK Metni</span>'ni ve <span className="font-bold">Kullanım Koşulları</span>'nı kabul etmiş sayılırsınız.
              </p>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
