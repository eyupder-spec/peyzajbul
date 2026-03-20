import { Leaf, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-14">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-6 w-6 text-accent" />
              <span className="font-heading text-xl font-bold text-accent">Peyzajbul</span>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed italic">
              Hayallerinizi yeşerten profesyonellerle tanışın. Türkiye'nin en büyük peyzaj platformunda, projeniz için en doğru uzmanı saniyeler içinde bulun.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">Hızlı Bağlantılar</h4>
            <div className="space-y-2.5">
              <Link href="/" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Ana Sayfa</Link>
              <Link href="/firmalar" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Firmalar</Link>
              <Link href="/projeler" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Projeler</Link>
              <Link href="/hizmetler" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Hizmetler</Link>
              <Link href="/blog" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Blog</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">Popüler Hizmetler</h4>
            <div className="space-y-2.5">
              <Link href="/hizmet/peyzaj-mimarligi/istanbul" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İstanbul Peyzaj Mimarlığı</Link>
              <Link href="/hizmet/bahce-tasarimi/istanbul" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İstanbul Bahçe Tasarımı</Link>
              <Link href="/hizmet/bahce-bakimi/ankara" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Ankara Bahçe Bakımı</Link>
              <Link href="/hizmet/cim-serme/izmir" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İzmir Çim Serme</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">Firmalar İçin</h4>
            <div className="space-y-2.5">
              <Link href="/firma/giris" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Firma Giriş</Link>
              <a href="#nasil-calisir" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Nasıl Çalışır</a>
              <Link href="/iller" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İller</Link>
              <Link href="/changelog" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Yenilikler (Changelog)</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">İletişim</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Mail className="h-4 w-4 text-accent/70" />
                info@peyzajbul.com
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
          © 2026 Peyzajbul. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
