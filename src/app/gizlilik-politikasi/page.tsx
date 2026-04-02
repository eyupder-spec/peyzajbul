import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <h1 className="font-heading text-4xl font-bold text-primary mb-2">Gizlilik Politikası</h1>
        <p className="text-sm text-muted-foreground mb-12">Son Güncelleme: 2 Nisan 2026</p>

        <section className="prose prose-slate max-w-none space-y-8">
          <p className="text-lg leading-relaxed text-foreground/80">
            Peyzajbul uygulaması ve web sitesi ("Platform"), OmniPure Marketing LLC ("Şirket") tarafından işletilmektedir. 
            Gizliliğiniz bizim için önemlidir. Bu politika, platformumuzu kullandığınızda toplanan veriler ve bu verilerin nasıl kullanıldığı hakkında sizi bilgilendirmektedir.
          </p>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">1. Toplanan Veriler</h2>
            <div className="bg-card p-6 rounded-2xl border border-border">
              <p className="mb-4">Hizmetlerimizi kullandığınızda aşağıdaki verileri toplayabiliriz:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground/70">
                <li>Ad Soyad</li>
                <li>E-posta adresi</li>
                <li>Telefon numarası</li>
                <li>Cihaz bilgileri (Push bildirimleri ve kullanıcı deneyimi için)</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">2. Verilerin Kullanımı</h2>
            <p className="text-foreground/70 leading-relaxed mb-4">
              Topladığımız veriler şu amaçlarla kullanılır:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/70">
              <li>Teklif taleplerini ilgili peyzaj firmalarına iletmek.</li>
              <li>Kullanıcı hesabı oluşturmak ve yönetmek.</li>
              <li>Platform içi bildirimler ve güncellemeler göndermek.</li>
              <li>Hizmet kalitesini artırmak ve kullanım analizi yapmak.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">3. Veri Paylaşımı</h2>
            <p className="text-foreground/70 leading-relaxed">
              Kullanıcı verileri, yalnızca kullanıcının açık rızası ile (teklif iste butonuna basıldığında) ilgili peyzaj firmalarıyla paylaşılır. 
              Bunun dışında verileriniz üçüncü taraflarla reklam veya pazarlama amacıyla paylaşılmaz.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">4. Hesap ve Veri Silme</h2>
            <p className="text-foreground/70 leading-relaxed">
              Kullanıcılar, mobil uygulama içindeki Profil sekmesinden veya web sitemiz üzerinden destek hattımıza başvurarak hesaplarını ve tüm ilişkili verilerini istedikleri zaman kalıcı olarak silebilirler.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">5. İletişim</h2>
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
              <p className="text-foreground/80 mb-4">
                Gizlilik politikamız ile ilgili sorularınız için bizimle iletişime geçebilirsiniz:
              </p>
              <address className="not-italic text-foreground/70 space-y-1">
                <p className="font-bold text-primary">OmniPure Marketing LLC</p>
                <p>1209 MOUNTAIN RD PL NE STE N</p>
                <p>ALBUQUERQUE NM 87110</p>
                <p className="mt-4">E-posta: <a href="mailto:bilgi@peyzajbul.com" className="text-primary hover:underline">bilgi@peyzajbul.com</a></p>
              </address>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
