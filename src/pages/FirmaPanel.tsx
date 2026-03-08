import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShoppingCart, Coins, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";

const FirmaPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, purchased: 0, coinBalance: 0 });

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "firm");

      if (!roles || roles.length === 0) { navigate("/"); return; }

      // Check firm approval & get balance
      const { data: firm } = await supabase
        .from("firms")
        .select("is_approved, coin_balance")
        .eq("user_id", user.id)
        .single();

      if (!firm?.is_approved) { navigate("/firma/giris"); return; }

      // Fetch stats
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      const { data: purchases } = await supabase
        .from("lead_purchases")
        .select("*")
        .eq("firm_id", user.id);

      setStats({
        totalLeads: totalLeads || 0,
        purchased: purchases?.length || 0,
        coinBalance: firm.coin_balance || 0,
      });
      setLoading(false);
    };
    checkAccess();
  }, [navigate]);

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

  const statCards = [
    { title: "Gelen Leadler", value: stats.totalLeads, icon: Users, color: "text-primary" },
    { title: "Satın Alınan", value: stats.purchased, icon: ShoppingCart, color: "text-accent" },
    { title: "Bu Ay Harcama", value: `$${stats.spent}`, icon: CreditCard, color: "text-destructive" },
    { title: "Dönüşüm Oranı", value: stats.totalLeads > 0 ? `${Math.round((stats.purchased / stats.totalLeads) * 100)}%` : "0%", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">Firma Paneli</h1>
            <Button onClick={() => navigate("/firma/leadler")} variant="default">
              Leadleri Gör
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.title} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default FirmaPanel;
