"use client";

import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, sans-serif" }} className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
          <h1>Bir şeyler ters gitti</h1>
          <p className="mt-4 text-muted-foreground">
            Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin; sorun sürerse bilgi@peyzajbul.com
            adresine yazın.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Tekrar dene
            </button>
            <a href="/" className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-primary underline">
              Ana sayfaya dön
            </a>
          </div>
          {error.digest && <p className="mt-6 text-xs text-muted-foreground">Hata kodu: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
