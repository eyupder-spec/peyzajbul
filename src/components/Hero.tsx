import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroProps {
  onTeklifAl: () => void;
}

const Hero = ({ onTeklifAl }: HeroProps) => {
  return (
    <section className="relative pt-16">
      <div className="relative bg-primary overflow-hidden">
        <img
          src={heroBg}
          alt="Peyzaj bahçe tasarımı"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          loading="eager"
        />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="container mx-auto px-4 py-20 md:py-32 text-center relative z-10">
          <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight animate-fade-in">
            Türkiye'nin En İyi Peyzaj
            <br />
            Firmalarını Karşılaştırın
          </h1>
          <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-body">
            Projeniz için en uygun peyzaj firmasını bulun, tekliflerinizi karşılaştırın ve en iyi seçimi yapın.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="gold" size="lg" className="text-base px-8" onClick={onTeklifAl}>
              <Search className="mr-2 h-5 w-5" />
              Ücretsiz Teklif Al
            </Button>
            <Link to="/firmalar">
              <Button variant="outline" size="lg" className="text-base px-8 border-primary-foreground text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 hover:text-primary-foreground">
                Firmaları İncele
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="bg-primary">
        <svg viewBox="0 0 1440 60" className="w-full block text-background" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,30 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
