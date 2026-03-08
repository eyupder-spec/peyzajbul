import { useApprovedFirms } from "@/hooks/useFirms";
import FirmCard from "@/components/FirmCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FeaturedFirms = () => {
  const { data: firms, isLoading } = useApprovedFirms();
  // Premium firms first, then latest - already sorted by query
  const featured = firms?.slice(0, 6) || [];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Öne Çıkan Firmalar
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-14">
          Türkiye genelinde en çok tercih edilen peyzaj firmaları.
        </p>

        {isLoading ? (
          <p className="text-center text-muted-foreground">Yükleniyor...</p>
        ) : featured.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {featured.map((firm) => (
              <FirmCard
                key={firm.id}
                id={firm.id}
                company_name={firm.company_name}
                city={firm.city}
                district={firm.district}
                services={firm.services || []}
                description={firm.description}
                is_premium={firm.is_premium}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Henüz kayıtlı firma bulunmuyor.</p>
        )}

        <div className="text-center mt-10">
          <Link to="/firmalar">
            <Button variant="default" size="lg">
              Tüm Firmaları Gör
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFirms;
