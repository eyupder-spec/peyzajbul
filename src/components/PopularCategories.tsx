import Link from "next/link";
import { getAllCategories } from "@/lib/categories";

const PopularCategories = () => {
  const categories = getAllCategories().slice(0, 8);

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            Hizmet Kategorileri
          </h2>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Aradığınız peyzaj hizmetini seçin, alanında uzman firmaları hemen bulun.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/hizmetler/${cat.slug}`}
              className="group bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <span className="text-4xl mb-3 block transition-transform duration-300 group-hover:scale-110">{cat.icon}</span>
              <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {cat.label}
              </h3>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/hizmetler"
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
