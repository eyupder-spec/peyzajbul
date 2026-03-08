import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Coins, Eye, ArrowLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getScoreBadge, getScoreBreakdown } from "@/lib/leadScoring";

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

const getFomoMessage = (count: number): { text: string; className: string } | null => {
  if (count === 0) return null;
  if (count === 1) return { text: "1 firma teklif verdi", className: "text-amber-600 bg-amber-50 border-amber-200" };
  if (count === 2) return { text: "2 firma teklif verdi — acele edin!", className: "text-orange-600 bg-orange-50 border-orange-200" };
  return { text: `${count} firma teklif verdi — son şans!`, className: "text-red-600 bg-red-50 border-red-200" };
};

const maskName = (name: string) => {
  const parts = name.split(" ");
  return parts.map((p) => p[0] + "**").join(" ");
};

const maskPhone = (phone: string) => {
  if (phone.length < 4) return "****";
  return phone.slice(0, 2) + "** *** **" + phone.slice(-2);
};

// Score rendering now uses imported getScoreBadge + getScoreBreakdown

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

const FirmaLeadler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [purchasedLeadIds, setPurchasedLeadIds] = useState<Set<string>>(new Set());
  const [leadPurchaseCounts, setLeadPurchaseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const purchasedId = searchParams.get("purchased");
    if (purchasedId) {
      toast({ title: "Ödeme başarılı!", description: "Lead bilgileri açıldı." });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "firm");

      if (!roles || roles.length === 0) { navigate("/"); return; }

      const { data: firm } = await supabase
        .from("firms")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single();
      setCoinBalance(firm?.coin_balance || 0);

      const { data: leadsData } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      setLeads(leadsData || []);

      const { data: purchases } = await supabase
        .from("lead_purchases")
        .select("lead_id")
        .eq("firm_id", user.id);

      setPurchasedLeadIds(new Set(purchases?.map((p) => p.lead_id) || []));
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handlePurchase = async (leadId: string) => {
    if (coinBalance < 20) {
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
      setCoinBalance(data.new_balance);
      setPurchasedLeadIds((prev) => new Set([...prev, leadId]));
      toast({ title: "Lead açıldı!", description: `Kalan bakiye: ${data.new_balance} jeton` });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/firma/panel")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Lead Listesi</h1>
            </div>
            <Button variant="outline" onClick={() => navigate("/firma/jeton")} className="gap-2">
              <Coins className="h-4 w-4" />
              <span className="font-semibold">{coinBalance} Jeton</span>
            </Button>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tarih</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Hizmet</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Büyüklük</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bütçe</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">İl</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">İlçe</th>
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
                    return (
                      <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground">
                          {new Date(lead.created_at).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{lead.service_type}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{lead.project_size}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{lead.budget}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{lead.city}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{lead.district || "-"}</td>
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
                          <Badge variant={getStatusVariant(isPurchased ? "purchased" : lead.status)}>
                            {isPurchased ? "Satın Alındı" : getStatusLabel(lead.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isPurchased ? (
                            <Button size="sm" variant="outline" disabled>
                              Açıldı
                            </Button>
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
              return (
                <Card key={lead.id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{lead.service_type}</CardTitle>
                      <Badge variant={getStatusVariant(isPurchased ? "purchased" : lead.status)}>
                        {isPurchased ? "Satın Alındı" : getStatusLabel(lead.status)}
                      </Badge>
                    </div>
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

          {leads.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Henüz lead bulunmuyor.</p>
            </div>
          )}
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
                    <p className="font-medium text-foreground blur-sm select-none">{selectedLead.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium text-foreground blur-sm select-none">{selectedLead.phone}</p>
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
    </>
  );
};

export default FirmaLeadler;
