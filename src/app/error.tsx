"use client";

import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

// Tek çağrı noktası: hata izleme (ör. Sentry) eklenecekse yalnızca bu fonksiyon değişir.
function reportError(error: Error & { digest?: string }) {
  console.error(error);
}

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="container mx-auto flex min-h-[60vh] items-center justify-center py-16">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-card">
            <h1 className="text-3xl">Bir şeyler ters gitti</h1>
            <p className="mt-4 text-muted-foreground">
              Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin; sorun sürerse bilgi@peyzajbul.com
              adresine yazın.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={reset}>Tekrar dene</Button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ana sayfaya dön
              </Link>
            </div>
            {error.digest && <p className="mt-6 text-xs text-muted-foreground">Hata kodu: {error.digest}</p>}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
