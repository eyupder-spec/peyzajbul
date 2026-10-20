"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Leaf } from "lucide-react";

const LeadFormModal = dynamic(() => import("@/components/lead-form/LeadFormModal"), { ssr: false });

// Firma tarafı CTA'sının tek hedefi: firma kazanım akışı değişirse yalnızca bu sabit güncellenir.
const FIRM_CTA_HREF = "/isletme-ekle";

const links = [
  { label: "Firmalar", href: "/firmalar" },
  { label: "Hizmetler", href: "/hizmetler" },
  { label: "Projeler", href: "/projeler" },
  { label: "Rehber", href: "/blog" },
  { label: "Maliyet Hesapla", href: "/maliyet-hesapla" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

const Navbar = () => {
  const pathname = usePathname();
  // Menü hangi yolda açıldıysa onu saklar: yol değişince otomatik kapanır.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const mobileOpen = menuPath === pathname;
  const setMobileOpen = (open: boolean) => setMenuPath(open ? pathname : null);
  // Ana sayfada kil rengi tek CTA'yı hero taşır; üst çubuktaki düğme orman rengine düşer.
  const quoteVariant = pathname === "/" ? "default" : "accent";

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-full items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="h-7 w-7 text-primary" />
            <span className="font-display text-xl text-primary">Peyzajbul</span>
          </Link>

          <div className="hidden items-center gap-5 whitespace-nowrap md:flex xl:gap-6">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm font-medium transition-colors hover:text-primary ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href={FIRM_CTA_HREF}
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary lg:inline"
            >
              Firmanı ekle
            </Link>
            <Button variant={quoteVariant} onClick={() => setFormOpen(true)}>
              Teklif Al
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Button variant={quoteVariant} className="px-4" onClick={() => setFormOpen(true)}>
              Teklif Al
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                  aria-label="Menüyü aç"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                aria-describedby={undefined}
                className="flex w-full flex-col gap-0 p-0 data-[state=closed]:duration-150 data-[state=open]:duration-280 sm:max-w-sm [&>button.absolute]:hidden"
              >
                <SheetTitle className="sr-only">Menü</SheetTitle>
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <Leaf className="h-7 w-7 text-primary" />
                    <span className="font-display text-xl text-primary">Peyzajbul</span>
                  </Link>
                  <SheetClose asChild>
                    <button
                      type="button"
                      className="-mr-3 flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                      aria-label="Menüyü kapat"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </SheetClose>
                </div>
                <div className="overflow-y-auto">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive(pathname, link.href) ? "page" : undefined}
                      className="flex h-14 items-center border-b border-border px-6 text-base font-medium aria-[current=page]:text-primary"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-auto space-y-3 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                  <Button
                    variant={quoteVariant}
                    className="w-full"
                    onClick={() => {
                      setMobileOpen(false);
                      setFormOpen(true);
                    }}
                  >
                    Ücretsiz teklif al
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={FIRM_CTA_HREF} onClick={() => setMobileOpen(false)}>
                      Firmanız mı? Ücretsiz ekleyin
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {formOpen && <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} source="navbar" />}
    </>
  );
};

export default Navbar;
