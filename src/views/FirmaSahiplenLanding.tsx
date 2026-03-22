"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle,
  Search,
  UserPlus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  MousePointer2
} from "lucide-react";

const FirmaSahiplenLanding = () => {
  const steps = [
    {
      icon: <Search className="h-6 w-6 text-primary" />,
      title: "Firmanızı Arayın",
      description: "Dizinimizde kayıtlı yüzlerce firma arasından kendi işletmenizi bulun."
    },
    {
      icon: <MousePointer2 className="h-6 w-6 text-primary" />,
      title: "Sahiplenme Talebi gönderin",
      description: "Firma sayfasındaki 'Bu İşletme Size mi Ait? bölümündeki 'Firma Kaydını Sahiplen' butonuna tıklayarak formu doldurun."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
      title: "Hızlıca Doğrulayın",
      description: "Ekibimiz bilgilerinizi kontrol edip onayladıktan sonra kontrol panelinize erişin."
    }
  ];

  const benefits = [
    {
      icon: <TrendingUp className="h-10 w-10 text-primary" />,
      title: "Yeni Müşteriler",
      description: "Hizmet verdiğiniz bölgelerden gelen gerçek müşteri adaylarına (lead) anında ulaşın."
    },
    {
      icon: <Building2 className="h-10 w-10 text-primary" />,
      title: "Profesyonel Profil",
      description: "Projelerinizi, hizmetlerinizi ve referanslarınızı şık bir profilde sergileyin."
    },
    {
      icon: <CheckCircle className="h-10 w-10 text-primary" />,
      title: "Güven Rozeti",
      description: "Onaylı firma rozeti ile müşterilerin gözünde güvenilirliğinizi artırın."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 text-center mb-20">
          <Badge className="mb-4 py-1 px-3 text-sm" variant="outline">Firmalar İçin</Badge>
          <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground mb-6 max-w-3xl mx-auto leading-tight">
            Firmanızı Sahiplenin, <br />
            <span className="text-primary italic">Dijital Gücünüzü</span> Artırın
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Peyzajbul'da yer alan profilinizi kontrol altına alın, müşterilerinizle doğrudan iletişime geçin ve işinizi büyütün.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/firmalar">
              <Button size="lg" className="px-8 h-12 text-md gap-2">
                <Search className="h-5 w-5" /> Firmanı Bul ve Sahiplen
              </Button>
            </Link>
            <Link href="/isletme-ekle">
              <Button size="lg" variant="outline" className="px-8 h-12 text-md gap-2">
                <UserPlus className="h-5 w-5" /> Firman Yok mu? Kaydol
              </Button>
            </Link>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold font-heading mb-4">Neden Peyzajbul?</h2>
              <p className="text-muted-foreground">İşletmenizi dijital dünyada bir adım öne taşıyoruz.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, i) => (
                <Card key={i} className="border-none shadow-md hover:shadow-lg transition-shadow bg-card">
                  <CardContent className="pt-10 pb-10 text-center">
                    <div className="mx-auto mb-6 flex justify-center">{benefit.icon}</div>
                    <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto border border-primary/20 rounded-3xl p-8 md:p-12 bg-primary/5">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">3 Basit Adımda Başlayın</h2>
                <p className="text-muted-foreground">Süreç hızlı ve ücretsizdir.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 relative">
                {steps.map((step, i) => (
                  <div key={i} className="relative z-10 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto text-xl font-bold border-4 border-background shadow-lg">
                      {i + 1}
                    </div>
                    <h4 className="font-bold text-lg">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 pt-10">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black/10 rounded-full blur-3xl" />

            <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10">Hazır mısınız?</h2>
            <p className="text-lg text-primary-foreground/80 mb-10 max-w-xl mx-auto relative z-10">
              Hemen firmanızı bulun veya yeni bir kayıt oluşturarak peyzaj dünyasında yerinizi alın.
            </p>
            <div className="flex flex-wrap justify-center gap-4 relative z-10">
              <Link href="/firmalar">
                <Button size="lg" variant="secondary" className="px-10 h-14 text-lg">
                  Firmanızı Arayın <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FirmaSahiplenLanding;
