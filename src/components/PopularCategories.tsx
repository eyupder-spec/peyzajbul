import { Link } from "react-router-dom";
import { getAllCategories } from "@/lib/categories";

const PopularCategories = () => {
  const categories = getAllCategories().slice(0, 8);

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            Hizmet Kategorileri
          </h2>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Aradığınız peyzaj hizmetini seçin, alanında uzman firmaları hemen bulun.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/kategoriler/${cat.slug}`}
              className="group bg-card border border-border rounded-xl p-5 text-center hover:border-primary/40 hover:shadow-md transition-all"
            >
              <span className="text-3xl mb-3 block">{cat.icon}</span>
              <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {cat.label}
              </h3>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            to="/kategoriler"
            className="text-sm font-medium text-primary hover:underline font-body"
          >
            Tüm kategorileri görüntüle →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularCategories;
