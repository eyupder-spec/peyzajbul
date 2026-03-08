import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShoppingCart, Coins, TrendingUp, Crown, Image, FileText, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

const FIRMA_MENU = [
  { title: "Özet", key: "panel", icon: FileText, path: "/firma/panel" },
  { title: "Profil", key: "profil", icon: FileText, path: "/firma/profil" },
  { title: "Leadler", key: "leadler", icon: Users, path: "/firma/leadler" },
  { title: "Jeton Yükle", key: "jeton", icon: Coins, path: "/firma/jeton" },
  { title: "Premium", key: "premium", icon: Crown, path: "/firma/premium" },
  { title: "Galeri", key: "galeri", icon: Image, path: "/firma/galeri" },
];

function FirmaSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              {!collapsed && <span className="font-heading font-bold">Firma Paneli</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FIRMA_MENU.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const FirmaPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, purchased: 0, coinBalance: 0 });
  const [firmName, setFirmName] = useState("");

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

      const { data: firmData } = await supabase
        .from("firms")
        .select("is_approved, coin_balance, is_premium, premium_until, company_name")
        .eq("user_id", user.id)
        .single();

      if (!firmData?.is_approved) { navigate("/firma/giris"); return; }
      setFirmName(firmData.company_name);

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
        coinBalance: firmData.coin_balance || 0,
      });
      setLoading(false);
    };
    checkAccess();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  }

  const statCards = [
    { title: "Gelen Leadler", value: stats.totalLeads, icon: Users, color: "text-primary" },
    { title: "Satın Alınan", value: stats.purchased, icon: ShoppingCart, color: "text-accent" },
    { title: "Jeton Bakiyesi", value: stats.coinBalance, icon: Coins, color: "text-primary" },
    { title: "Dönüşüm Oranı", value: stats.totalLeads > 0 ? `${Math.round((stats.purchased / stats.totalLeads) * 100)}%` : "0%", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-bold text-foreground">{firmName}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Çıkış
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">Genel Bakış</h2>
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

            {/* Quick Actions */}
            <h3 className="text-lg font-semibold text-foreground mb-4">Hızlı İşlemler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate("/firma/leadler")}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Leadleri Gör</p>
                    <p className="text-xs text-muted-foreground">Potansiyel müşterileri inceleyin</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate("/firma/jeton")}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Coins className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Jeton Yükle</p>
                    <p className="text-xs text-muted-foreground">Bakiye: {stats.coinBalance} jeton</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate("/firma/premium")}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Crown className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Premium</p>
                    <p className="text-xs text-muted-foreground">Firmanızı öne çıkarın</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default FirmaPanel;
