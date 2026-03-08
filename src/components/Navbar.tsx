import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Leaf } from "lucide-react";
import LeadFormModal from "@/components/lead-form/LeadFormModal";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: "Ana Sayfa", to: "/" },
    { label: "Firmalar", to: "/firmalar" },
    { label: "Kategoriler", to: "/kategoriler" },
    { label: "Blog", to: "/blog" },
    { label: "Nasıl Çalışır", to: "/#nasil-calisir" },
    { label: "Firma Girişi", to: "/firma/giris" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="h-7 w-7 text-primary" />
            <span className="font-heading text-xl font-bold text-primary">Peyzaj Rehberi</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Button variant="gold" size="default" onClick={() => setFormOpen(true)}>
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
                key={link.to}
                to={link.to}
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
