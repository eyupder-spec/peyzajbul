import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAllCategories } from "@/lib/categories";

const Kategoriler = () => {
  const categories = getAllCategories();

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Peyzaj Hizmet Kategorileri | Peyzaj Rehberi</title>
        <meta name="description" content="Peyzaj mimarlığından bahçe bakımına, sulama sistemlerinden sert zemin uygulamalarına kadar tüm peyzaj hizmet kategorilerini keşfedin." />
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              Peyzaj Hizmet Kategorileri
            </h1>
            <p className="text-primary-foreground/70 font-body">
              İhtiyacınıza uygun peyzaj hizmetini seçin, en iyi firmaları bulun.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/kategoriler/${cat.slug}`}
                className="group bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <span className="text-4xl mb-4 block">{cat.icon}</span>
                <h2 className="font-heading text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {cat.label}
                </h2>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {cat.shortDescription}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Kategoriler;
