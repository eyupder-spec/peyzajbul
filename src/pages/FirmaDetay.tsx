import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, ArrowLeft, Building2 } from "lucide-react";
import { extractFirmIdFromSlug } from "@/lib/firmUtils";
import { useApprovedFirms } from "@/hooks/useFirms";
import { getCitySlug } from "@/lib/cities";
import { Helmet } from "react-helmet-async";

const FirmaDetay = () => {
  const { slug } = useParams<{ slug: string }>();
  const shortId = slug ? extractFirmIdFromSlug(slug) : "";

  const { data: firms, isLoading } = useApprovedFirms();
  const firm = firms?.find((f) => f.id.startsWith(shortId));

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>
        <Footer />
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 pt-24">
          <p className="text-muted-foreground text-lg">Firma bulunamadı</p>
          <Link to="/firmalar"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Firmalara Dön</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const citySlug = getCitySlug(firm.city);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{firm.company_name} | {firm.city} Peyzaj Firması</title>
        <meta name="description" content={`${firm.company_name} - ${firm.city} ilinde hizmet veren profesyonel peyzaj firması. ${firm.services?.join(", ")}`} />
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4">
              <Link to="/firmalar" className="hover:text-primary-foreground">Firmalar</Link>
              <span>/</span>
              <Link to={`/iller/${citySlug}-peyzaj-firmalari`} className="hover:text-primary-foreground">{firm.city}</Link>
              <span>/</span>
              <span className="text-primary-foreground">{firm.company_name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">{firm.company_name}</h1>
                <div className="flex items-center gap-1 text-primary-foreground/70 mt-1">
                  <MapPin className="h-4 w-4" />
                  {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {firm.description && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="font-heading text-xl font-semibold text-foreground mb-3">Hakkında</h2>
                  <p className="text-muted-foreground leading-relaxed">{firm.description}</p>
                </div>
              )}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-heading text-xl font-semibold text-foreground mb-3">Sunulan Hizmetler</h2>
                <div className="flex flex-wrap gap-2">
                  {firm.services?.map((s) => (
                    <Badge key={s} variant="secondary" className="text-sm py-1 px-3">{s}</Badge>
                  ))}
                  {(!firm.services || firm.services.length === 0) && (
                    <p className="text-muted-foreground">Hizmet bilgisi eklenmemiş.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold text-foreground">İletişim</h3>
                <div className="space-y-3">
                  <a href={`tel:${firm.phone}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-4 w-4 text-primary" />
                    {firm.phone}
                  </a>
                  <a href={`mailto:${firm.email}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-4 w-4 text-primary" />
                    {firm.email}
                  </a>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                  </div>
                </div>
              </div>
              <Link to={`/iller/${citySlug}-peyzaj-firmalari`}>
                <Button variant="outline" className="w-full">
                  {firm.city} İlindeki Diğer Firmalar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FirmaDetay;
