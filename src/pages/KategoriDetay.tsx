import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirmCard from "@/components/FirmCard";
import { getCategoryBySlug } from "@/lib/categories";
import { useApprovedFirms } from "@/hooks/useFirms";
import NotFound from "./NotFound";

const KategoriDetay = () => {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? getCategoryBySlug(slug) : undefined;
  const { data: firms, isLoading } = useApprovedFirms();

  const filteredFirms = useMemo(() => {
    if (!firms || !category) return [];
    return firms.filter((f) => f.services?.includes(category.label));
  }, [firms, category]);

  if (!category) return <NotFound />;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{category.seoTitle}</title>
        <meta name="description" content={category.seoDescription} />
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <span className="text-5xl mb-4 block">{category.icon}</span>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              {category.label}
            </h1>
            <p className="text-primary-foreground/70 font-body max-w-2xl mx-auto">
              {category.shortDescription}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <article className="prose prose-lg max-w-3xl mx-auto mb-12 font-body text-muted-foreground">
            <p>{category.seoArticle}</p>
          </article>

          <h2 className="font-heading text-2xl font-bold text-foreground mb-6 text-center">
            {category.label} Hizmeti Veren Firmalar
          </h2>

          {isLoading ? (
            <p className="text-center text-muted-foreground">Yükleniyor...</p>
          ) : filteredFirms.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFirms.map((firm) => (
                <FirmCard
                  key={firm.id}
                  id={firm.id}
                  company_name={firm.company_name}
                  city={firm.city}
                  district={firm.district}
                  services={firm.services || []}
                  description={firm.description}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-heading text-xl mb-2">Henüz firma bulunamadı</p>
              <p className="text-sm font-body">Bu kategoride yakında firmalar eklenecek.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default KategoriDetay;
