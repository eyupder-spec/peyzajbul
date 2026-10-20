"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Coins, Eye, ArrowLeft, Inbox } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getScoreBadge, getScoreBreakdown } from "@/lib/leadScoring";
import { AREA_LABELS, BUDGET_LABELS, SERVICE_LABELS, getLeadLabel } from "@/lib/formatLead";
import { formatNumber } from "@/lib/pricing";
import { LeadPreviewDialog } from "@/app/firma/leadler/_shared/LeadPreviewDialog";
import { LeadPriceButton } from "@/app/firma/leadler/_shared/LeadPriceButton";
import { useFirmLeads } from "@/app/firma/leadler/_shared/useFirmLeads";
import { useLeadPurchase } from "@/app/firma/leadler/_shared/useLeadPurchase";
import {
  OUTCOME_LABELS,
  getFomoMessage,
  getStatusLabel,
  getStatusVariant,
  markAssignmentViewed,
  type Lead,
} from "@/app/firma/leadler/_shared/leadHelpers";

const REALTIME_CHANNEL = "firm-leadler-realtime";

const FirmaLeadler = () => {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { leads, purchasedIds, purchaseCounts, outcomes, refundStatuses, loading, loadError, reload } = useFirmLeads(
    userId,
    firmId,
    REALTIME_CHANNEL,
  );

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "firm");
      if (!roles || roles.length === 0) {
        router.push("/");
        return;
      }

      const { data: firm } = await supabase.from("firms").select("id, coin_balance").eq("user_id", user.id).single();
      setCoinBalance(firm?.coin_balance || 0);
      setFirmId(firm?.id || "");
      setUserId(user.id);
    };
    void checkAccess();
  }, [router]);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;

  const openLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    if (lead.assignment_id && !lead.viewed_at) markAssignmentViewed(lead.id);
  };

  const { purchasing, buy: handlePurchase } = useLeadPurchase({
    coinBalance,
    onBalanceChange: setCoinBalance,
    reload,
  });

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

  const renderStatus = (lead: Lead, isPurchased: boolean, compact: boolean) => {
    const count = purchaseCounts?.[lead.id];
    const fomo = !isPurchased && count !== undefined ? getFomoMessage(count) : null;
    const outcome = outcomes[lead.id]?.outcome;
    return (
      <div className={`flex flex-col gap-1 ${compact ? "items-end" : ""}`}>
        <Badge variant={getStatusVariant(isPurchased ? "purchased" : lead.status)}>
          {isPurchased ? "Satın Alındı" : getStatusLabel(lead.status)}
        </Badge>
        {isPurchased && outcome && <Badge variant="outline">{OUTCOME_LABELS[outcome]}</Badge>}
        {lead.target_firm_id && lead.target_firm_id === firmId && <Badge variant="outline">Size özel</Badge>}
        {lead.phone_verified === true && <Badge variant="outline">Telefon doğrulandı</Badge>}
        {fomo && (
          <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded border ${fomo.className}`}>
            {fomo.text}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8 gap-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/firma/panel")} aria-label="Panele dön">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-heading text-3xl font-semibold text-foreground">Lead Listesi</h1>
            </div>
            <Button variant="outline" onClick={() => router.push("/firma/jeton")} className="gap-2">
              <Coins className="h-4 w-4" />
              <span className="font-semibold">{formatNumber(coinBalance)} Jeton</span>
            </Button>
          </div>

          {/* Desktop table */}
          {leads.length > 0 && (
            <div className="hidden lg:block">
              <div className="rounded-lg border border-border overflow-hidden bg-card">
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
                      const isPurchased = purchasedIds.has(lead.id);
                      const score = getScoreBadge(lead.lead_score);
                      return (
                        <tr key={lead.id} className="hover:bg-muted/50 transition-colors duration-150">
                          <td className="px-4 py-3 text-sm text-foreground">{new Date(lead.created_at).toLocaleDateString("tr-TR")}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{getLeadLabel(SERVICE_LABELS, lead.service_type)}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{getLeadLabel(AREA_LABELS, lead.project_size)}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{getLeadLabel(BUDGET_LABELS, lead.budget)}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{lead.city}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{lead.district || "-"}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{lead.full_name}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{lead.phone}</td>
                          <td className="px-4 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-help ${score.className}`}>
                                  {score.emoji} {lead.lead_score || 0}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-semibold mb-1">{score.label}</p>
                                {getScoreBreakdown(lead).map((item) => (
                                  <div key={item.label} className="flex justify-between text-xs gap-4">
                                    <span>{item.label}</span>
                                    <span className="font-mono">+{item.points}</span>
                                  </div>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{renderStatus(lead, isPurchased, false)}</td>
                          <td className="px-4 py-3">
                            {isPurchased ? (
                              <Button size="sm" variant="outline" onClick={() => openLead(lead)} className="w-full min-h-11">
                                <Eye className="h-4 w-4" /> İncele
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="min-h-11" onClick={() => openLead(lead)}>
                                  <Eye className="h-4 w-4" /> Önizle
                                </Button>
                                <LeadPriceButton
                                  lead={lead}
                                  purchaseCount={purchaseCounts?.[lead.id] ?? null}
                                  busy={purchasing}
                                  onBuy={handlePurchase}
                                />
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
          )}

          {/* Mobile cards */}
          <div className="lg:hidden space-y-4">
            {leads.map((lead) => {
              const isPurchased = purchasedIds.has(lead.id);
              return (
                <Card key={lead.id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{getLeadLabel(SERVICE_LABELS, lead.service_type)}</CardTitle>
                      {renderStatus(lead, isPurchased, true)}
                    </div>
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
                        <Button size="sm" variant="outline" className="w-full min-h-11" onClick={() => openLead(lead)}>
                          <Eye className="h-4 w-4" /> Detayları İncele
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 min-h-11" onClick={() => openLead(lead)}>
                          <Eye className="h-4 w-4" /> Önizle
                        </Button>
                        <LeadPriceButton
                          lead={lead}
                          purchaseCount={purchaseCounts?.[lead.id] ?? null}
                          busy={purchasing}
                          onBuy={handlePurchase}
                          className="flex-1"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {leads.length === 0 && loadError && (
            <div className="text-center py-16 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Talepler yüklenemedi</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">Bağlantınızı kontrol edip tekrar deneyin.</p>
              <Button variant="outline" className="min-h-11" onClick={() => void reload()}>
                Yeniden dene
              </Button>
            </div>
          )}

          {leads.length === 0 && !loadError && (
            <div className="text-center py-16 space-y-4">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-foreground">Henüz size yönlendirilen talep yok</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Profilinizdeki il ve hizmetlerle eşleşen yeni talepler size yönlendirildiğinde burada görünür. Hizmetlerinizi veya
                ilinizi güncellemek için profil sayfanızı ziyaret edin.
              </p>
              <Button variant="outline" onClick={() => router.push("/firma/profil")} className="min-h-11">
                Profili Düzenle
              </Button>
            </div>
          )}
        </div>
      </div>

      <LeadPreviewDialog
        lead={selectedLead}
        firmId={firmId ?? ""}
        isPurchased={selectedLead ? purchasedIds.has(selectedLead.id) : false}
        purchaseCount={selectedLead ? (purchaseCounts?.[selectedLead.id] ?? null) : null}
        purchasing={purchasing}
        outcome={selectedLead ? outcomes[selectedLead.id] : undefined}
        refundStatus={selectedLead ? refundStatuses[selectedLead.id] : undefined}
        onClose={() => setSelectedLeadId(null)}
        onBuy={handlePurchase}
        onChanged={() => void reload()}
      />
    </>
  );
};

export default FirmaLeadler;
