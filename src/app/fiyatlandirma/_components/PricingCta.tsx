"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface PricingCtaProps {
  /** Oturum açıkken gidilecek adres (ör. /firma/premium?plan=yearly). */
  signedInHref: string;
  label: string;
  variant?: "default" | "outline" | "accent";
  /** Oturum yokken birincil düğmenin altında 'Giriş yap' bağlantısı gösterilir. */
  showLogin?: boolean;
  className?: string;
}

const GUEST_HREF = "/firma-sahiplen";

/**
 * Fiyat sayfası düğmesi. Sayfa sunucuda oluşturulduğu için ilk çizim ziyaretçi bağlantısıdır;
 * oturum varsa (supabase.auth.getSession) doğrudan ilgili firma sayfasına gider.
 */
export default function PricingCta({ signedInHref, label, variant = "default", showLogin = false, className = "" }: PricingCtaProps) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(Boolean(data.session));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Button variant={variant} size="lg" className="w-full" asChild>
        <Link href={signedIn ? signedInHref : GUEST_HREF}>{label}</Link>
      </Button>
      {showLogin && !signedIn && (
        <Link
          href="/firma/giris"
          className="inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline underline-offset-4 transition-colors duration-150 hover:text-foreground"
        >
          Hesabım var, giriş yap
        </Link>
      )}
    </div>
  );
}
