"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Users, ShoppingCart, Coins, TrendingUp, Crown, Image, FileText, LogOut, Eye, Bell, FolderKanban } from "lucide-react";
import { getScoreBadge, getScoreBreakdown } from "@/lib/leadScoring";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import {
  SERVICE_LABELS,
  PROJECT_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  CONDITION_LABELS,
  BUDGET_LABELS,
  TIMELINE_LABELS,
  AREA_LABELS,
  IRRIGATION_TYPE_LABELS,
  IRRIGATION_SYSTEM_LABELS,
  WATER_SOURCE_LABELS,
  getLeadLabel
} from "@/lib/formatLead";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import FirmaTour from "@/components/firma/FirmaTour";
import { HelpCircle } from "lucide-react";

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
  project_type?: string | null;
  property_type?: string | null;
  current_condition?: string | null;
  address?: string | null;
  notes?: string | null;
  scope?: string[] | null;
  irrigation_type?: string | null;
  irrigation_system?: string | null;
  water_source?: string | null;
  photo_urls?: string[] | null;
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

const MOCK_TOUR_LEAD: Lead = {
  id: "demo-lead",
  created_at: new Date().toISOString(),
  service_type: "Bahçe Tasarımı & Uygulama",
  project_size: "250m² - 500m²",
  budget: "75.000 TL - 150.000 TL",
  timeline: "1 Ay İçinde",
  city: "İstanbul",
  district: "Beşiktaş",
  full_name: "Örnek Müşteri",
  phone: "0555 *** ** 00",
  email: "demo@example.com",
  lead_score: 85,
  status: "active",
};
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";

const FirmaPanel = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, purchased: 0, coinBalance: 0 });
  const [firmName, setFirmName] = useState("");
  const [isFirmPremium, setIsFirmPremium] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [purchasedLeadIds, setPurchasedLeadIds] = useState<Set<string>>(new Set());
  const [leadPurchaseCounts, setLeadPurchaseCounts] = useState<Record<string, number>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [userId, setUserId] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Realtime browser + sound notifications
  useLeadNotifications(userId || null, () => {
    // Refresh leads on new lead
    const refreshLeads = async () => {
      const { data: leadsData } = await supabase
        .from("leads_for_firms" as any)
        .select("*")
        .order("created_at", { ascending: false }) as { data: Lead[] | null };
      setLeads(leadsData || []);
      setStats(prev => ({ ...prev, totalLeads: leadsData?.length || 0 }));
    };
    refreshLeads();
  });

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "firm");

      if (!roles || roles.length === 0) { router.push("/"); return; }

      const { data: firmData } = await supabase
        .from("firms")
        .select("is_approved, coin_balance, is_premium, premium_until, company_name")
        .eq("user_id", user.id)
        .single();

      if (!firmData?.is_approved) { router.push("/firma/giris"); return; }
      setFirmName(firmData.company_name);
      setIsFirmPremium(firmData.is_premium || false);

      // Fetch leads
      const { data: leadsData } = await supabase
        .from("leads_for_firms" as any)
        .select("*")
        .order("created_at", { ascending: false }) as { data: Lead[] | null };

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
  }, [router]);

  const handlePurchase = async (leadId: string) => {
    if (stats.coinBalance < 20) {
      toast({ title: "Yetersiz Jeton", description: "Lütfen jeton yükleyin.", variant: "destructive" });
      router.push("/firma/jeton");
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
    router.push("/");
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
        <FirmaSidebar isPremium={isFirmPremium} />

        <FirmaTour />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-bold text-foreground">{firmName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => router.push("/firma/jeton")} className="gap-2" id="tour-balance">
                <Coins className="h-4 w-4" />
                <span className="font-semibold">{stats.coinBalance} Jeton</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => (window as any).startFirmaTour?.()} className="gap-2 text-muted-foreground">
                <HelpCircle className="h-4 w-4" /> Rehber
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Çıkış
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="tour-stats">
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
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" /> Henüz gerçek bir talep almadınız. Aşağıda sistemin nasıl çalıştığını görmeniz için bir <strong>Örnek Talep</strong> oluşturulmuştur.
                  </p>
                </div>
                
                {/* Desktop table demo */}
                <div className="hidden lg:block" id="tour-lead-table">
                  <div className="rounded-lg border border-border overflow-hidden opacity-80">
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
                        <tr className="bg-white">
                          <td className="px-4 py-3 text-sm text-foreground">Bugün</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.service_type}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.budget}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.city}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.full_name} (Örnek)</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.phone}</td>
                          <td className="px-4 py-3">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">🌟 85</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="default">Örnek</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" id="tour-lead-preview" onClick={() => setSelectedLead(MOCK_TOUR_LEAD)}>
                                <Eye className="h-4 w-4 mr-1" /> Önizle
                              </Button>
                              <Button size="sm" id="tour-lead-purchase" disabled>
                                <Coins className="h-4 w-4 mr-1" /> 20 Jeton
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile card demo */}
                <div className="lg:hidden">
                  <Card className="border-border opacity-80">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{MOCK_TOUR_LEAD.service_type}</CardTitle>
                        <Badge variant="default">Örnek</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">İl:</span> {MOCK_TOUR_LEAD.city}</div>
                        <div><span className="text-muted-foreground">Bütçe:</span> {MOCK_TOUR_LEAD.budget}</div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedLead(MOCK_TOUR_LEAD)}>
                          <Eye className="h-4 w-4 mr-1" /> Önizle
                        </Button>
                        <Button size="sm" className="flex-1" disabled>
                          <Coins className="h-4 w-4 mr-1" /> 20 Jeton
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block" id="tour-lead-table">
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
                              <td className="px-4 py-3 text-sm text-foreground">{getLeadLabel(SERVICE_LABELS, lead.service_type)}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{getLeadLabel(BUDGET_LABELS, lead.budget)}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{lead.city}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{lead.full_name}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{lead.phone}</td>
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
                                  <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)} className="w-full">
                                    <Eye className="h-4 w-4 mr-1" /> İncele
                                  </Button>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)} id={lead === leads[0] ? "tour-lead-preview" : undefined}>
                                      <Eye className="h-4 w-4 mr-1" /> Önizle
                                    </Button>
                                    <Button size="sm" onClick={() => handlePurchase(lead.id)} disabled={purchasing} id={lead === leads[0] ? "tour-lead-purchase" : undefined}>
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
                            <CardTitle className="text-sm">{getLeadLabel(SERVICE_LABELS, lead.service_type)}</CardTitle>
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
                            <div><span className="text-muted-foreground">Bütçe:</span> {getLeadLabel(BUDGET_LABELS, lead.budget)}</div>
                            <div><span className="text-muted-foreground">Ad:</span> {lead.full_name}</div>
                            <div><span className="text-muted-foreground">Tel:</span> {lead.phone}</div>
                          </div>
                          {isPurchased ? (
                            <div className="pt-2">
                              <Button size="sm" variant="outline" className="w-full" onClick={() => setSelectedLead(lead)}>
                                <Eye className="h-4 w-4 mr-1" /> Detayları İncele
                              </Button>
                            </div>
                          ) : (
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Lead Önizleme</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Proje Türü</p>
                  <p className="font-medium text-foreground">{getLeadLabel(PROJECT_TYPE_LABELS, selectedLead.project_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hizmet Türü</p>
                  <p className="font-medium text-foreground">{getLeadLabel(SERVICE_LABELS, selectedLead.service_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mülk Tipi</p>
                  <p className="font-medium text-foreground">{getLeadLabel(PROPERTY_TYPE_LABELS, selectedLead.property_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alan Büyüklüğü</p>
                  <p className="font-medium text-foreground">{getLeadLabel(AREA_LABELS, selectedLead.project_size)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mevcut Durum</p>
                  <p className="font-medium text-foreground">{getLeadLabel(CONDITION_LABELS, selectedLead.current_condition)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bütçe</p>
                  <p className="font-medium text-foreground">{getLeadLabel(BUDGET_LABELS, selectedLead.budget)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zaman Çizelgesi</p>
                  <p className="font-medium text-foreground">{getLeadLabel(TIMELINE_LABELS, selectedLead.timeline)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Konum</p>
                  <p className="font-medium text-foreground">{selectedLead.district ? `${selectedLead.city}, ${selectedLead.district}` : selectedLead.city}</p>
                </div>

                {selectedLead.service_type === "sulama-sistemi" && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Sulama Türü</p>
                      <p className="font-medium text-foreground">{getLeadLabel(IRRIGATION_TYPE_LABELS, selectedLead.irrigation_type)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sulama Sistemi</p>
                      <p className="font-medium text-foreground">{getLeadLabel(IRRIGATION_SYSTEM_LABELS, selectedLead.irrigation_system)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Su Kaynağı</p>
                      <p className="font-medium text-foreground">{getLeadLabel(WATER_SOURCE_LABELS, selectedLead.water_source)}</p>
                    </div>
                  </>
                )}

                {selectedLead.scope && selectedLead.scope.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Kapsam</p>
                    <p className="font-medium text-foreground">{selectedLead.scope.map(s => s.replace(/-/g, " ")).join(", ")}</p>
                  </div>
                )}

                {selectedLead.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Notlar</p>
                    <p className="font-medium text-foreground">{selectedLead.notes}</p>
                  </div>
                )}

                {selectedLead.photo_urls && selectedLead.photo_urls.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2">Görseller</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedLead.photo_urls.map((url, i) => (
                        <div key={i} onClick={() => setSelectedPhoto(url)} className="block overflow-hidden rounded-md border border-border hover:opacity-80 transition-opacity cursor-pointer">
                          <img src={url} alt={`Görsel ${i + 1}`} className="w-24 h-24 object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Kişisel Bilgiler (Gizli)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ad Soyad</p>
                    <p className="font-medium text-foreground">{selectedLead.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium text-foreground">{selectedLead.phone}</p>
                  </div>
                  {selectedLead.address && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="font-medium text-foreground">{selectedLead.address}</p>
                    </div>
                  )}
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
            {selectedLead && !purchasedLeadIds.has(selectedLead.id) && (
              <Button onClick={() => handlePurchase(selectedLead.id)} disabled={purchasing}>
                <Coins className="h-4 w-4 mr-2" />
                Lead Aç (20 Jeton)
              </Button>
            )}
            {selectedLead && purchasedLeadIds.has(selectedLead.id) && (
              <Button variant="default" onClick={() => window.location.href = `tel:${selectedLead.phone}`}>
                Hemen Ara
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Screen Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none flex justify-center items-center [&>button]:text-white [&>button]:bg-black/50 hover:[&>button]:bg-black/70 [&>button]:rounded-full [&>button]:p-2 max-h-[95vh] w-[95vw]">
          <DialogTitle className="sr-only">Görsel İnceleme</DialogTitle>
          {selectedPhoto && (
            <img src={selectedPhoto} alt="Detaylı Görsel" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default FirmaPanel;

