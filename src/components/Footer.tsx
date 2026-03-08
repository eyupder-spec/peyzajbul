import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-heading text-lg font-bold text-primary">Peyzaj Rehberi</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Türkiye'nin en kapsamlı peyzaj firma rehberi. Projeniz için doğru firmayı bulun.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-3">Hızlı Bağlantılar</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Ana Sayfa</Link>
              <Link to="/firmalar" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Firmalar</Link>
              <Link to="/blog" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Blog</Link>
              <a href="#nasil-calisir" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Nasıl Çalışır</a>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-3">İletişim</h4>
            <p className="text-sm text-muted-foreground">info@peyzajrehberi.com</p>
            <p className="text-sm text-muted-foreground">+90 (212) 555 00 00</p>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted-foreground">
          © 2026 Peyzaj Rehberi. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
