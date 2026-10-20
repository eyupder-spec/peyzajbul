import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getAllCategories } from "@/lib/categories";

export default function NotFound() {
  const popularServices = getAllCategories().slice(0, 6);

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <p aria-hidden="true" className="font-display text-8xl text-primary/20 md:text-9xl">
            404
          </p>
          <h1 className="mt-2">Aradığınız sayfa bulunamadı</h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Adres değişmiş ya da kaldırılmış olabilir. Aşağıdan devam edebilirsiniz.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild variant="accent" size="lg">
              <Link href="/teklif-al">Ücretsiz teklif al</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/firmalar">Firmalara göz at</Link>
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Ana sayfa
            </Link>
          </div>

          <div className="mt-14 w-full max-w-2xl">
            <h2 className="text-xl">Popüler hizmetler</h2>
            <ul className="mt-5 flex flex-wrap justify-center gap-3">
              {popularServices.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/hizmetler/${category.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
