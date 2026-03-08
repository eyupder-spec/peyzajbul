import { Leaf, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-14">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-6 w-6 text-accent" />
              <span className="font-heading text-xl font-bold">Peyzaj Rehberi</span>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              Türkiye'nin en kapsamlı peyzaj firma rehberi. Projeniz için doğru firmayı bulun.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">Hızlı Bağlantılar</h4>
            <div className="space-y-2.5">
              <Link to="/" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Ana Sayfa</Link>
              <Link to="/firmalar" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Firmalar</Link>
              <Link to="/kategoriler" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Kategoriler</Link>
              <Link to="/blog" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Blog</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">Firmalar İçin</h4>
            <div className="space-y-2.5">
              <Link to="/firma/giris" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Firma Girişi</Link>
              <a href="#nasil-calisir" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Nasıl Çalışır</a>
              <Link to="/iller" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İller</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">İletişim</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Mail className="h-4 w-4 text-accent/70" />
                info@peyzajrehberi.com
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Phone className="h-4 w-4 text-accent/70" />
                +90 (212) 555 00 00
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-accent/70" />
                İstanbul, Türkiye
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-10 pt-6 text-center text-xs text-primary-foreground/50">
          © 2026 Peyzaj Rehberi. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
