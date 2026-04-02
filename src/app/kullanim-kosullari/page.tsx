import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <h1 className="font-heading text-4xl font-bold text-primary mb-2">Kullanım Koşulları</h1>
        <p className="text-sm text-muted-foreground mb-12">Son Güncelleme: 2 Nisan 2026</p>

        <section className="prose prose-slate max-w-none space-y-8">
          <p className="text-lg leading-relaxed text-foreground/80">
            Peyzajbul ("Platform"), kullanıcıların peyzaj hizmetleri alabileceği bir köprü kurar. Bu platformu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.
          </p>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">1. Hizmet Kapsamı</h2>
            <p className="text-foreground/70 leading-relaxed mb-4">
              Peyzajbul, peyzaj hizmeti arayan kullanıcılar ile bu hizmeti sunan profesyonel firmaları bir araya getiren bir pazaryeri platformudur. 
              Sunulan hizmetlerin kalitesi, zamanlaması ve doğruluğu ilgili firmanın sorumluluğundadır.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">2. Kullanıcı Sorumlulukları</h2>
            <p className="text-foreground/70 leading-relaxed">
              Kullanıcılar, platform üzerinden verdikleri bilgilerin doğruluğundan sorumludur. 
              Verilen teklif talepleri, ilgili firmalarla paylaşıldığı andan itibaren firma ve kullanıcı arasındaki hukuki süreç başlar.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">3. Fikri Mülkiyet</h2>
            <p className="text-foreground/70 leading-relaxed">
              Platform içerisindeki tüm tasarımlar, logolar, yazılımlar ve içerikler OmniPure Marketing LLC'nin mülkiyetindedir ve izinsiz kopyalanamaz.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">4. Değişiklik Hakları</h2>
            <p className="text-foreground/70 leading-relaxed">
              Peyzajbul, dilediği zaman kullanım koşullarını güncelleme hakkını saklı tutar. Güncellemeler bu sayfa üzerinden duyurulur.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
