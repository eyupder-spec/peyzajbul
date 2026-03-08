import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Users, ShoppingCart, Coins, TrendingUp, Crown, Image, FileText, LogOut, Eye } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { getScoreBadge, getScoreBreakdown } from "@/lib/leadScoring";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

type Lead = {
  id: string;
  created_at: string;
  service_type: string;
  project_size: string;
  budget: string;
  timeline: string;
  city: string;
  district: string | null;
  full_name: string;
  phone: string;
  email: string;
  lead_score: number | null;
  status: string;
};

const getFomoMessage = (count: number): { text: string; className: string; icon: string } => {
  if (count === 0) return { text: "Henüz teklif yok — tam zamanı!", icon: "✅", className: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (count === 1) return { text: "1 firma teklif verdi — acele edin!", icon: "⚡", className: "text-amber-600 bg-amber-50 border-amber-200" };
  if (count === 2) return { text: "2 firma teklif verdi — son şans!", icon: "🔥", className: "text-red-600 bg-red-50 border-red-200" };
  return { text: "3 firma teklif verdi — kapasite doldu!", icon: "🚫", className: "text-muted-foreground bg-muted border-border opacity-70" };
};

const maskName = (name: string) => {
  const parts = name.split(" ");
  return parts.map((p) => p[0] + "**").join(" ");
};

const maskPhone = (phone: string) => {
  if (phone.length < 4) return "****";
  return phone.slice(0, 2) + "** *** **" + phone.slice(-2);
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "active": return "Yeni";
    case "purchased": return "Satın Alındı";
    case "expired": return "Süresi Doldu";
    default: return status;
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "active": return "default";
    case "purchased": return "secondary";
    case "expired": return "destructive";
    default: return "outline";
  }
};

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, purchased: 0, coinBalance: 0 });
  const [firmName, setFirmName] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [purchasedLeadIds, setPurchasedLeadIds] = useState<Set<string>>(new Set());
  const [leadPurchaseCounts, setLeadPurchaseCounts] = useState<Record<string, number>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);

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

      // Fetch leads
      const { data: leadsData } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      setLeads(leadsData || []);

      // Fetch own purchases
      const { data: purchases } = await supabase
        .from("lead_purchases")
        .select("lead_id")
        .eq("firm_id", user.id);

      const ownPurchaseIds = new Set(purchases?.map((p) => p.lead_id) || []);
      setPurchasedLeadIds(ownPurchaseIds);

      // Fetch all purchase counts for FOMO
      const { data: allPurchases } = await supabase
        .from("lead_purchases")
        .select("lead_id");

      const counts: Record<string, number> = {};
      allPurchases?.forEach((p) => {
        counts[p.lead_id] = (counts[p.lead_id] || 0) + 1;
      });
      setLeadPurchaseCounts(counts);

      setStats({
        totalLeads: leadsData?.length || 0,
        purchased: ownPurchaseIds.size,
        coinBalance: firmData.coin_balance || 0,
      });
      setLoading(false);
    };
    checkAccess();
  }, [navigate]);

  const handlePurchase = async (leadId: string) => {
    if (stats.coinBalance < 20) {
      toast({ title: "Yetersiz Jeton", description: "Lütfen jeton yükleyin.", variant: "destructive" });
      navigate("/firma/jeton");
      return;
    }
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("spend-coins", {
        body: { lead_id: leadId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStats(prev => ({ ...prev, coinBalance: data.new_balance, purchased: prev.purchased + 1 }));
      setPurchasedLeadIds((prev) => new Set([...prev, leadId]));
      setLeadPurchaseCounts(prev => ({ ...prev, [leadId]: (prev[leadId] || 0) + 1 }));
      toast({ title: "Lead açıldı!", description: `Kalan bakiye: ${data.new_balance} jeton` });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

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
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/firma/jeton")} className="gap-2">
                <Coins className="h-4 w-4" />
                <span className="font-semibold">{stats.coinBalance} Jeton</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Çıkış
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat) => (
                <Card key={stat.title} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Lead List */}
            <h2 className="text-xl font-bold text-foreground mb-4">Lead Listesi</h2>

            {leads.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Henüz lead bulunmuyor.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tarih</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Hizmet</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bütçe</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">İl</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Ad Soyad</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Telefon</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Skor</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Durum</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Aksiyon</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {leads.map((lead) => {
                          const isPurchased = purchasedLeadIds.has(lead.id);
                          const fomo = getFomoMessage(leadPurchaseCounts[lead.id] || 0);
                          return (
                            <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-foreground">
                                {new Date(lead.created_at).toLocaleDateString("tr-TR")}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">{lead.service_type}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{lead.budget}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{lead.city}</td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {isPurchased ? lead.full_name : maskName(lead.full_name)}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {isPurchased ? lead.phone : maskPhone(lead.phone)}
                              </td>
                              <td className="px-4 py-3">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-help ${getScoreBadge(lead.lead_score).className}`}>
                                      {getScoreBadge(lead.lead_score).emoji} {lead.lead_score || 0}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-semibold mb-1">{getScoreBadge(lead.lead_score).label}</p>
                                    {getScoreBreakdown(lead).map((item, i) => (
                                      <div key={i} className="flex justify-between text-xs gap-4">
                                        <span>{item.label}</span>
                                        <span className="font-mono">+{item.points}</span>
                                      </div>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <Badge variant={getStatusVariant(isPurchased ? "purchased" : lead.status)}>
                                    {isPurchased ? "Satın Alındı" : getStatusLabel(lead.status)}
                                  </Badge>
                                  {!isPurchased && (
                                    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] ${fomo.className}`}>
                                      {fomo.icon} {fomo.text}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {isPurchased ? (
                                  <Button size="sm" variant="outline" disabled>Açıldı</Button>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)}>
                                      <Eye className="h-4 w-4 mr-1" /> Önizle
                                    </Button>
                                    <Button size="sm" onClick={() => handlePurchase(lead.id)} disabled={purchasing}>
                                      <Coins className="h-4 w-4 mr-1" /> 20 Jeton
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-4">
                  {leads.map((lead) => {
                    const isPurchased = purchasedLeadIds.has(lead.id);
                    const fomo = getFomoMessage(leadPurchaseCounts[lead.id] || 0);
                    return (
                      <Card key={lead.id} className="border-border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{lead.service_type}</CardTitle>
                            <Badge variant={getStatusVariant(isPurchased ? "purchased" : lead.status)}>
                              {isPurchased ? "Satın Alındı" : getStatusLabel(lead.status)}
                            </Badge>
                          </div>
                          {!isPurchased && (
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded border mt-1 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] ${fomo.className}`}>
                              {fomo.icon} {fomo.text}
                            </span>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">İl:</span> {lead.city}</div>
                            <div><span className="text-muted-foreground">Bütçe:</span> {lead.budget}</div>
                            <div><span className="text-muted-foreground">Ad:</span> {isPurchased ? lead.full_name : maskName(lead.full_name)}</div>
                            <div><span className="text-muted-foreground">Tel:</span> {isPurchased ? lead.phone : maskPhone(lead.phone)}</div>
                          </div>
                          {!isPurchased && (
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedLead(lead)}>
                                <Eye className="h-4 w-4 mr-1" /> Önizle
                              </Button>
                              <Button size="sm" className="flex-1" onClick={() => handlePurchase(lead.id)} disabled={purchasing}>
                                <Coins className="h-4 w-4 mr-1" /> 20 Jeton
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Lead Preview Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Önizleme</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Hizmet Türü</p>
                  <p className="font-medium text-foreground">{selectedLead.service_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proje Büyüklüğü</p>
                  <p className="font-medium text-foreground">{selectedLead.project_size}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bütçe</p>
                  <p className="font-medium text-foreground">{selectedLead.budget}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zaman Çizelgesi</p>
                  <p className="font-medium text-foreground">{selectedLead.timeline}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">İl</p>
                  <p className="font-medium text-foreground">{selectedLead.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">İlçe</p>
                  <p className="font-medium text-foreground">{selectedLead.district || "-"}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Kişisel Bilgiler (Gizli)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ad Soyad</p>
                    <p className="font-medium text-foreground">{maskName(selectedLead.full_name)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium text-foreground">{maskPhone(selectedLead.phone)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Lead Skoru:</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-help ${getScoreBadge(selectedLead.lead_score).className}`}>
                      {getScoreBadge(selectedLead.lead_score).emoji} {selectedLead.lead_score || 0} — {getScoreBadge(selectedLead.lead_score).label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {getScoreBreakdown(selectedLead).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs gap-4">
                        <span>{item.label}</span>
                        <span className="font-mono">+{item.points}</span>
                      </div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </div>
              {!purchasedLeadIds.has(selectedLead.id) && (() => {
                const fomo = getFomoMessage(leadPurchaseCounts[selectedLead.id] || 0);
                return (
                  <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded border animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] ${fomo.className}`}>
                    {fomo.icon} {fomo.text}
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Kapat</Button>
            <Button onClick={() => { if (selectedLead) handlePurchase(selectedLead.id); }} disabled={purchasing}>
              <Coins className="h-4 w-4 mr-2" />
              Lead Aç (20 Jeton)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default FirmaPanel;
