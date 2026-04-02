import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Talebiniz Başarıyla Alındı - Peyzajbul",
  description: "Peyzaj tasarım ve uygulama talebiniz başarıyla alınmıştır. En kısa sürede firmalarımız size ulaşacaktır.",
};

export default function TalebinizAlindiPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-xl w-full bg-surface border border-border shadow-2xl rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden">
          {/* Decorative background blob */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="mx-auto w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-8 border-4 border-emerald-50 dark:border-emerald-900/50">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-4">
              Talebiniz Başarıyla Alındı!
            </h1>
            
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Peyzaj projeniz için oluşturduğunuz talep, bölgenizdeki en uygun profesyonel firmalara iletildi. Firmalar en kısa sürede sizinle iletişime geçerek tekliflerini sunacaklar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="gold" size="lg" className="w-full sm:w-auto h-14 px-8 rounded-xl font-bold">
                <Link href="/hesabim">
                  Talebimi Görüntüle
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 rounded-xl">
                <Link href="/">
                  <Home className="mr-2 h-5 w-5" />
                  Ana Sayfaya Dön
                </Link>
              </Button>
            </div>
          </div>

          {/* DÖNÜŞÜM İZLEME KODLARI İÇİN ALAN (Google Ads / Meta Pixel vb.) */}
          {/* Buraya vereceğiniz <script> etiketlerini yerleştireceğiz */}
        </div>
      </main>

      <Footer />
    </div>
  );
}
