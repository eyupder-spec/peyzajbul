import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Image, MapPin, Star, FileText, Check } from "lucide-react";
import { toast } from "sonner";

const PREMIUM_COST = 50; // jetons per month

const PREMIUM_FEATURES = [
  { icon: Image, label: "Fotoğraf Galerisi", desc: "Projelerinizi görsellerle sergileyin" },
  { icon: MapPin, label: "Google Maps Konumu", desc: "Firmanızın konumunu harita üzerinde gösterin" },
  { icon: FileText, label: "Detaylı Hizmet Açıklamaları", desc: "Her hizmetinizi ayrıntılı tanıtın" },
  { icon: Star, label: "Müşteri Değerlendirmeleri", desc: "Müşterilerinizden yorum alın" },
  { icon: Crown, label: "Öne Çıkarma", desc: "Listelerde en üstte görünün" },
];

const FirmaPremium = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [firm, setFirm] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data } = await supabase
        .from("firms")
        .select("id, is_premium, premium_until, coin_balance, company_name")
        .eq("user_id", user.id)
        .single();

      if (!data) { navigate("/firma/panel"); return; }
      setFirm(data);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleActivate = async () => {
    if (!firm) return;
    if (firm.coin_balance < PREMIUM_COST) {
      toast.error(`Yetersiz bakiye. Premium için ${PREMIUM_COST} jeton gerekli. Mevcut: ${firm.coin_balance}`);
      return;
    }

    setActivating(true);
    try {
      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + 1);

      const { error: updateError } = await supabase
        .from("firms")
        .update({
          is_premium: true,
          premium_until: premiumUntil.toISOString(),
          coin_balance: firm.coin_balance - PREMIUM_COST,
        })
        .eq("id", firm.id);

      if (updateError) throw updateError;

      // Log transaction
      await supabase.from("coin_transactions").insert({
        firm_id: firm.id,
        amount: -PREMIUM_COST,
        type: "premium_activation",
        description: "Premium üyelik aktivasyonu (1 ay)",
      });

      toast.success("Premium üyelik aktifleştirildi!");
      setFirm({ ...firm, is_premium: true, premium_until: premiumUntil.toISOString(), coin_balance: firm.coin_balance - PREMIUM_COST });
    } catch (err) {
      toast.error("Bir hata oluştu.");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </>
    );
  }

  const isPremiumActive = firm?.is_premium && firm?.premium_until && new Date(firm.premium_until) > new Date();

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="text-center mb-8">
            <Crown className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Premium Üyelik</h1>
            <p className="text-muted-foreground">Firmanızı öne çıkarın ve daha fazla müşteriye ulaşın.</p>
          </div>

          {isPremiumActive && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-primary font-semibold">✨ Premium üyeliğiniz aktif</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bitiş tarihi: {new Date(firm.premium_until).toLocaleDateString("tr-TR")}
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {PREMIUM_FEATURES.map((f) => (
              <Card key={f.label} className="border-border">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{f.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isPremiumActive && (
            <Card className="border-primary/30">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Aylık {PREMIUM_COST} Jeton
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Mevcut bakiyeniz: <span className="font-semibold text-foreground">{firm.coin_balance} jeton</span>
                </p>
                <Button
                  onClick={handleActivate}
                  disabled={activating || firm.coin_balance < PREMIUM_COST}
                  size="lg"
                  className="w-full"
                >
                  {activating ? "İşleniyor..." : "Premium'u Aktifleştir"}
                </Button>
                {firm.coin_balance < PREMIUM_COST && (
                  <Button variant="outline" onClick={() => navigate("/firma/jeton")} className="w-full">
                    Jeton Yükle
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-6">
            <Button variant="ghost" onClick={() => navigate("/firma/panel")}>
              ← Panele Dön
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FirmaPremium;
