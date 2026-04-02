import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Trash2, ShieldCheck, Mail } from "lucide-react";

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <div className="text-center mb-12">
          <Trash2 className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-heading text-4xl font-bold text-foreground mb-4">Hesap Silme Talebi</h1>
          <p className="text-lg text-muted-foreground">
            Verileriniz üzerindeki kontrolünüze saygı duyuyoruz. Hesabınızı ve ilişkili tüm verilerinizi nasıl sileceğinizi aşağıda bulabilirsiniz.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Method 1: App */}
          <div className="bg-card p-8 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-4">Uygulama Üzerinden Sil</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                En hızlı ve güvenli yol uygulama içinden talep oluşturmaktır:
              </p>
              <ul className="space-y-3 text-sm text-foreground/70 mb-8">
                <li>• Peyzajbul uygulamasını açın.</li>
                <li>• <strong>Profil / Menü</strong> sekmesine gidin.</li>
                <li>• Firma bilgilerinizin altında yer alan <strong>"Hesabımı ve Verilerimi Sil"</strong> butonuna tıklayın.</li>
                <li>• Onay penceresinde işlemi onaylayın.</li>
              </ul>
            </div>
          </div>

          {/* Method 2: Web/Mail */}
          <div className="bg-card p-8 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 bg-accent/10 rounded-lg flex items-center justify-center mb-6">
                <Mail className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-4">Web Üzerinden Talep Et</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                Uygulama erişiminiz yoksa, kayıtlı e-posta adresinizden bize talep gönderebilirsiniz:
              </p>
              <div className="bg-muted p-4 rounded-xl text-xs font-mono text-foreground mb-8">
                <strong>Alıcı:</strong> bilgi@peyzajbul.com<br/>
                <strong>Konu:</strong> Hesap Silme Talebi<br/>
                <strong>İçerik:</strong> [Mail Adresiniz] ile kayıtlı Peyzajbul hesabımın tüm verileriyle birlikte silinmesini istiyorum.
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:bilgi@peyzajbul.com">Talep Maili Gönder</a>
            </Button>
          </div>
        </div>

        <div className="mt-16 bg-muted/30 p-8 rounded-2xl border border-border">
          <h3 className="text-lg font-bold mb-4">Silme İşlemi Hakkında Önemli Bilgiler</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Hesap silme işlemi tamamlandığında aşağıdaki veriler kalıcı olarak silinir ve geri getirilemez:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-foreground/80">
            <div className="bg-card p-3 rounded-lg border border-border text-center">Firma Bilgileri</div>
            <div className="bg-card p-3 rounded-lg border border-border text-center">Galeri Fotoğrafları</div>
            <div className="bg-card p-3 rounded-lg border border-border text-center">Jeton Bakiyesi</div>
            <div className="bg-card p-3 rounded-lg border border-border text-center">Yorum/Değerlendirmeler</div>
          </div>
          <p className="text-xs text-muted-foreground mt-6 italic">
            * Yasal gereklilikler nedeniyle saklanması zorunlu olan fatura ve işlem kayıtları ilgili mevzuat sürelerince muhafaza edilebilir.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
