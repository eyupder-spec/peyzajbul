import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

import istanbulImg from "@/assets/cities/istanbul.jpg";
import ankaraImg from "@/assets/cities/ankara.jpg";
import izmirImg from "@/assets/cities/izmir.jpg";
import bursaImg from "@/assets/cities/bursa.jpg";
import antalyaImg from "@/assets/cities/antalya.jpg";
import konyaImg from "@/assets/cities/konya.jpg";
import trabzonImg from "@/assets/cities/trabzon.jpg";
import gaziantepImg from "@/assets/cities/gaziantep.jpg";
import muglaImg from "@/assets/cities/mugla.jpg";
import eskisehirImg from "@/assets/cities/eskisehir.jpg";

const FEATURED_CITIES = [
  { name: "İstanbul", slug: "istanbul", image: istanbulImg },
  { name: "Ankara", slug: "ankara", image: ankaraImg },
  { name: "İzmir", slug: "izmir", image: izmirImg },
  { name: "Bursa", slug: "bursa", image: bursaImg },
  { name: "Antalya", slug: "antalya", image: antalyaImg },
  { name: "Konya", slug: "konya", image: konyaImg },
  { name: "Trabzon", slug: "trabzon", image: trabzonImg },
  { name: "Gaziantep", slug: "gaziantep", image: gaziantepImg },
  { name: "Muğla", slug: "mugla", image: muglaImg },
  { name: "Eskişehir", slug: "eskisehir", image: eskisehirImg },
];

const FeaturedCities = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            İllere Göre Peyzaj Firmaları
          </h2>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Türkiye'nin önde gelen şehirlerinde peyzaj hizmeti veren firmaları keşfedin.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {FEATURED_CITIES.map((city) => (
            <Link
              key={city.slug}
              to={`/iller/${city.slug}-peyzaj-firmalari`}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] block"
            >
              <img
                src={city.image}
                alt={`${city.name} peyzaj firmaları`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-white/80" />
                  <span className="font-heading text-sm font-semibold text-white">
                    {city.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/iller">
            <Button variant="outline" size="lg">
              Tüm İlleri Görüntüle
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCities;
