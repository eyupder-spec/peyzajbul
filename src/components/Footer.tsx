import { Fragment } from "react";
import Link from "next/link";
import { Leaf, Mail, MessageCircle, MapPin, Facebook, Twitter, Youtube } from "lucide-react";
import { CookieSettingsButton } from "@/components/ConsentBanner";
import { COOKIE_POLICY_PATH, HAS_COOKIE_POLICY_PAGE, PRIVACY_POLICY_PATH } from "@/lib/consent";
import { supportWhatsAppUrl } from "@/lib/publicStats";

const socialLinks = [
  { href: "https://www.facebook.com/peyzajbul", label: "Facebook", icon: Facebook },
  { href: "https://twitter.com/peyzajbul", label: "X (Twitter)", icon: Twitter },
  { href: "https://www.youtube.com/@peyzajbul", label: "YouTube", icon: Youtube },
];

const discoverLinks = [
  { label: "Firmalar", href: "/firmalar" },
  { label: "Projeler", href: "/projeler" },
  { label: "Rehber", href: "/blog" },
  { label: "Bitki Rehberi", href: "/bitkiler" },
  { label: "Malzeme Ansiklopedisi", href: "/malzemeler" },
  { label: "İller", href: "/iller" },
];

const serviceLinks = [
  { label: "İstanbul Peyzaj Mimarlığı", href: "/hizmet/peyzaj-mimarligi/istanbul" },
  { label: "İstanbul Bahçe Tasarımı", href: "/hizmet/bahce-tasarimi/istanbul" },
  { label: "Ankara Bahçe Bakımı", href: "/hizmet/bahce-bakimi/ankara" },
  { label: "İzmir Çim Serme", href: "/hizmet/cim-serme/izmir" },
  { label: "Tüm hizmetler", href: "/hizmetler" },
];

const firmLinks = [
  { label: "Firmanı ekle", href: "/isletme-ekle" },
  { label: "Fiyatlandırma", href: "/fiyatlandirma" },
  { label: "Firma Girişi", href: "/firma/giris" },
  { label: "Peyzaj Dijital Ajans", href: "/peyzaj-dijital-ajans" },
];

const LEGAL_LINKS = [
  { label: "Gizlilik Politikası", href: PRIVACY_POLICY_PATH },
  { label: "Kullanım Koşulları", href: "/kullanim-kosullari" },
  ...(HAS_COOKIE_POLICY_PAGE ? [{ label: "Çerez Politikası", href: COOKIE_POLICY_PATH }] : []),
  { label: "Hesap Silme", href: "/hesap-silme" },
  { label: "Sürüm Notları", href: "/changelog" },
];

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-primary-foreground/75 transition-colors hover:text-primary-foreground hover:underline underline-offset-4 md:min-h-0 md:py-1";
const legalLinkClass =
  "inline-flex min-h-11 items-center text-xs text-primary-foreground/75 transition-colors hover:text-primary-foreground hover:underline underline-offset-4 md:min-h-0 md:py-1";
const headingClass = "mb-3 text-sm font-semibold text-primary-foreground";

const LinkColumn = ({ title, links }: { title: string; links: { label: string; href: string }[] }) => (
  <div>
    <h3 className={headingClass}>{title}</h3>
    <ul>
      {links.map(({ label, href }) => (
        <li key={href}>
          <Link href={href} className={linkClass}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  return (
    <footer className="bg-forest-deep pt-14 text-primary-foreground md:py-16">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary-foreground" />
              <span className="font-display text-xl text-primary-foreground">Peyzajbul</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/75">
              Peyzaj firmalarını karşılaştırın, ücretsiz teklif alın.
            </p>
            <div className="-ml-3 mt-3 flex flex-wrap items-center">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center text-primary-foreground/75 transition-colors hover:text-primary-foreground"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <LinkColumn title="Keşfet" links={discoverLinks} />
          <LinkColumn title="Hizmetler" links={serviceLinks} />
          <LinkColumn title="Firmalar İçin" links={firmLinks} />

          <div>
            <h3 className={headingClass}>İletişim</h3>
            <ul>
              <li className="flex min-h-11 items-center text-sm text-primary-foreground/75 md:min-h-0 md:py-1">
                OmniPure Marketing LLC
              </li>
              <li>
                <a href="mailto:bilgi@peyzajbul.com" className={`${linkClass} gap-2`}>
                  <Mail className="h-4 w-4 shrink-0" />
                  bilgi@peyzajbul.com
                </a>
              </li>
              <li>
                <a href={supportWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className={`${linkClass} gap-2`}>
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  WhatsApp Destek
                </a>
              </li>
              <li className="flex min-h-11 items-center gap-2 text-sm text-primary-foreground/75 md:min-h-0 md:py-1">
                <MapPin className="h-4 w-4 shrink-0" />
                İstanbul, Türkiye
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-x-6 gap-y-2 border-t border-primary-foreground/15 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6 text-xs text-primary-foreground/75 md:mt-14 md:flex-row md:flex-wrap md:items-center md:justify-between md:pb-0">
          <span>© {new Date().getFullYear()} Peyzajbul</span>
          <ul className="flex flex-wrap items-center gap-x-5">
            {LEGAL_LINKS.map(({ label, href }) => (
              <Fragment key={href}>
                <li>
                  <Link href={href} className={legalLinkClass}>
                    {label}
                  </Link>
                </li>
                {href === COOKIE_POLICY_PATH && (
                  <li>
                    <CookieSettingsButton className={legalLinkClass} />
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
