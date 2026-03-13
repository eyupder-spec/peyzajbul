"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Leaf } from "lucide-react";
import LeadFormModal from "@/components/lead-form/LeadFormModal";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { label: "Ana Sayfa", href: "/" },
    { label: "Firmalar", href: "/firmalar" },
    { label: "Projeler", href: "/projeler" },
    { label: "Hizmetler", href: "/hizmetler" },
    { label: "Blog", href: "/blog" },
    { label: "Nasıl Çalışır", href: "/#nasil-calisir" },
    { label: "Firma Kaydı", href: "/isletme-ekle" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Leaf className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-accent rounded-full animate-pulse" />
            </div>
            <span className="font-heading text-xl font-bold text-primary">Peyzajbul</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === link.href ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <Button variant="gold" size="default" onClick={() => setFormOpen(true)} className="hover:scale-105 transition-transform">
              Teklif Al
            </Button>
          </div>

          <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border px-4 pb-4 space-y-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm font-medium text-muted-foreground hover:text-primary py-1"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Button variant="gold" className="w-full" onClick={() => { setMobileOpen(false); setFormOpen(true); }}>
              Teklif Al
            </Button>
          </div>
        )}
      </nav>

      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
};

export default Navbar;
