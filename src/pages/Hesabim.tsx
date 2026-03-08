import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LogOut, FileText, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

const Hesabim = () => {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/");
        return;
      }
      fetchLeads(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchLeads = async (userId: string) => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const serviceLabels: Record<string, string> = {
    "bahce-duzenleme": "Bahçe Düzenleme",
    "agac-budama": "Ağaç Budama & Bakım",
    "sulama-sistemi": "Sulama Sistemi",
    "peyzaj-tasarimi": "Peyzaj Tasarımı",
    "cim-serimi": "Çim Serimi",
    "diger": "Diğer",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktif",
    purchased: "Satın Alındı",
    expired: "Süresi Doldu",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">
                  Hesabım
                </h1>
                <p className="text-primary-foreground/70 font-body text-sm mt-1">
                  {user?.email}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-accent text-accent-foreground bg-accent hover:bg-accent/90">
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <h2 className="font-heading text-xl font-semibold text-foreground mb-6">Taleplerim</h2>
          {loading ? (
            <p className="text-muted-foreground font-body">Yükleniyor...</p>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border border-border">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-heading text-lg text-foreground mb-2">Henüz talebiniz yok</p>
              <p className="text-sm text-muted-foreground font-body">
                "Teklif Al" butonunu kullanarak ilk talebinizi oluşturun.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-card rounded-lg border border-border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">
                        {serviceLabels[lead.service_type] || lead.service_type}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground font-body">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {lead.city}{lead.district ? `, ${lead.district}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(lead.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full font-body ${
                      lead.status === "active"
                        ? "bg-secondary text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {statusLabels[lead.status] || lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Hesabim;
