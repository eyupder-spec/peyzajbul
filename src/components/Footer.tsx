import { Leaf, Mail, MessageSquare, MapPin, Instagram, Facebook, Twitter, Youtube, Linkedin } from "lucide-react";

const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
);
import Link from "next/link";

const socialLinks = [
  { href: "https://www.instagram.com/peyzajbul", label: "Instagram", icon: Instagram, hoverColor: "hover:text-[#E4405F]" },
  { href: "https://www.facebook.com/peyzajbul", label: "Facebook", icon: Facebook, hoverColor: "hover:text-[#1877F2]" },
  { href: "https://twitter.com/peyzajbul", label: "X (Twitter)", icon: Twitter, hoverColor: "hover:text-white" },
  { href: "https://www.youtube.com/@peyzajbul", label: "YouTube", icon: Youtube, hoverColor: "hover:text-[#FF0000]" },
  { href: "https://www.linkedin.com/company/peyzajbul", label: "LinkedIn", icon: Linkedin, hoverColor: "hover:text-[#0A66C2]" },
  { href: "https://www.pinterest.com/peyzajbul", label: "Pinterest", icon: PinterestIcon, hoverColor: "hover:text-[#E60023]" },
];

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
            <div className="flex items-center gap-3 mt-4">
              {socialLinks.map(({ href, label, icon: Icon, hoverColor }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`text-primary-foreground/50 transition-colors ${hoverColor}`}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">Hızlı Bağlantılar</h4>
            <div className="space-y-2.5">
              <Link href="/" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Ana Sayfa</Link>
              <Link href="/firmalar" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Firmalar</Link>
              <Link href="/projeler" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Projeler</Link>
              <Link href="/hizmetler" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Hizmetler</Link>
              <Link href="/blog" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Blog</Link>
              <Link href="/gizlilik-politikasi" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Gizlilik Politikası</Link>
              <Link href="/kullanim-kosullari" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Kullanım Koşulları</Link>
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
              <Link href="/isletme-ekle" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İşletme Ekle</Link>
              <Link href="/firma/giris" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Firma Giriş</Link>
              <Link href="/isletme-ekle" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İşletme Ekle</Link>
              <Link href="/firma/giris" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Firma Giriş</Link>
              <Link href="/iller" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">İller</Link>
              <Link href="/changelog" className="block text-sm text-primary-foreground/70 hover:text-accent transition-colors">Yenilikler (Changelog)</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4 text-accent">İletişim</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Mail className="h-4 w-4 text-accent/70" />
                bilgi@peyzajbul.com
              </div>
              <a 
                href="https://wa.me/905345957147" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-accent transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-accent" />
                WhatsApp Destek
              </a>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-accent/70" />
                İstanbul, Türkiye
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-primary-foreground/50">
          <span>© 2026 Peyzajbul. Tüm hakları saklıdır.</span>
          <div className="flex items-center gap-4">
            {socialLinks.map(({ href, label, icon: Icon, hoverColor }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`transition-colors ${hoverColor}`}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
