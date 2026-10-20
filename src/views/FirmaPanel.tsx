"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Users, ShoppingCart, Coins, Hourglass, LogOut, Eye, HelpCircle, X } from "lucide-react";
import { getScoreBadge, getScoreBreakdown } from "@/lib/leadScoring";
import { AREA_LABELS, BUDGET_LABELS, SERVICE_LABELS, getLeadLabel } from "@/lib/formatLead";
import { LEAD_TIERS, OFFER_FLAGS, approxLeadsForBalance, formatLeadPrice, formatNumber, formatTRY } from "@/lib/pricing";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import FirmaTour from "@/components/firma/FirmaTour";
import { ProfileCompletionCard } from "@/components/firma/ProfileCompletionCard";
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";
import FirmValuePanel from "@/app/firma/panel/FirmValuePanel";
import { fetchFirmEventStats, fetchMyBannerStats, type BannerStatsRow } from "@/app/firma/panel/firmStats";
import { LeadPreviewDialog } from "@/app/firma/leadler/_shared/LeadPreviewDialog";
import { LeadPriceButton } from "@/app/firma/leadler/_shared/LeadPriceButton";
import { useFirmLeads } from "@/app/firma/leadler/_shared/useFirmLeads";
import { useLeadPurchase } from "@/app/firma/leadler/_shared/useLeadPurchase";
import {
  MAX_LEAD_BUYERS,
  OUTCOME_LABELS,
  getFomoMessage,
  getStatusLabel,
  getStatusVariant,
  markAssignmentViewed,
  type Lead,
} from "@/app/firma/leadler/_shared/leadHelpers";

const REALTIME_CHANNEL = "firm-panel-realtime";
const PANEL_LEAD_LIMIT = 5;

interface FirmRow {
  id: string;
  is_approved: boolean;
  coin_balance: number;
  is_premium: boolean;
  premium_until: string | null;
  company_name: string;
  slug: string | null;
  logo_url: string | null;
  description: string | null;
  phone: string;
  address: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_youtube: string | null;
  social_x: string | null;
  social_linkedin: string | null;
}

/**
 * Örnek talepte jeton fiyatı yalnızca kademeli lead fiyatları gerçekten açıkken gösterilir; kapalıyken
 * gerçek lead fiyatlarından farklı (var olmayan) bir ölçek göstermemek için sayı yazılmaz.
 */
const DEMO_TOKEN_PRICE = OFFER_FLAGS.leadTiersLive ? LEAD_TIERS[0].jeton : null;
const DEMO_PRICE_LABEL = DEMO_TOKEN_PRICE === null ? "Fiyat talebe göre gösterilir" : formatLeadPrice(DEMO_TOKEN_PRICE);

/** Rehber turunda gösterilen örnek talep; gerçek veri değildir. */
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
  token_price: DEMO_TOKEN_PRICE,
};

const FirmaPanel = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [firm, setFirm] = useState<FirmRow | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [galleryCount, setGalleryCount] = useState(0);
  const [bannerStats, setBannerStats] = useState<BannerStatsRow[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [welcomeViews, setWelcomeViews] = useState<number | null>(null);

  const firmId = firm?.id ?? null;
  const { leads, purchasedIds, purchaseCounts, outcomes, refundStatuses, loading, loadError, reload } = useFirmLeads(
    userId,
    firmId,
    REALTIME_CHANNEL,
    () => toast({ title: "Yeni potansiyel müşteri", description: "Size yeni bir talep yönlendirildi." }),
  );
  const { purchasing, buy: handlePurchase } = useLeadPurchase({
    coinBalance,
    onBalanceChange: setCoinBalance,
    reload,
  });

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

      const { data: firmData } = await supabase
        .from("firms")
        .select(
          "id, is_approved, coin_balance, is_premium, premium_until, company_name, slug, logo_url, description, phone, address, social_instagram, social_facebook, social_youtube, social_x, social_linkedin",
        )
        .eq("user_id", user.id)
        .single();

      if (!firmData?.is_approved) {
        router.push("/firma/giris");
        return;
      }

      const { count } = await supabase
        .from("firm_gallery")
        .select("*", { count: "exact", head: true })
        .eq("firm_id", firmData.id);

      setGalleryCount(count || 0);
      setCoinBalance(firmData.coin_balance || 0);
      setFirm(firmData);
      setUserId(user.id);
    };
    void checkAccess();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchMyBannerStats(30).then((rows) => {
      if (!cancelled) setBannerStats(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Sahiplenme akışı panele ?hosgeldiniz=1 ile gelir: karşılama bir kez gösterilir, parametre adres çubuğundan kalkar.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("hosgeldiniz") !== "1") return;
    url.searchParams.delete("hosgeldiniz");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setWelcome(true);
  }, []);

  // Görüntüleme sayısı yalnızca karşılamada ve firm_events RPC'si varken gelir; yoksa cümle hiç çizilmez.
  useEffect(() => {
    if (!welcome || !firmId) return;
    let cancelled = false;
    void fetchFirmEventStats(firmId, 30).then((stats) => {
      if (!cancelled) setWelcomeViews(stats ? stats.current.profile_view : null);
    });
    return () => {
      cancelled = true;
    };
  }, [welcome, firmId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const openLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    if (lead.assignment_id && !lead.viewed_at) markAssignmentViewed(lead.id);
  };

  if (loading || !firm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const isFirmPremium = Boolean(firm.is_premium) && (!firm.premium_until || new Date(firm.premium_until) > new Date());
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const visibleLeads = leads.slice(0, PANEL_LEAD_LIMIT);

  const waitingCount = leads.filter(
    (lead) => !purchasedIds.has(lead.id) && (purchaseCounts?.[lead.id] ?? 0) < MAX_LEAD_BUYERS,
  ).length;

  const statCards = [
    { title: "Size Yönlendirilen", value: leads.length, icon: Users, link: null as string | null },
    { title: "Açılan Lead", value: purchasedIds.size, icon: ShoppingCart, link: "/firma/leadler" },
    { title: "Açılmayı Bekleyen", value: waitingCount, icon: Hourglass, link: "/firma/leadler" },
    { title: "Jeton Bakiyesi", value: `${formatNumber(coinBalance)} jeton`, icon: Coins, link: "/firma/jeton" },
  ];

  // Sonuç bildirimleri firmanın kendi beyanıdır; Peyzajbul doğrulamaz.
  const openedIds = [...purchasedIds];
  const reportedIds = openedIds.filter((id) => outcomes[id]?.outcome);
  const reachedCount = openedIds.filter((id) => outcomes[id]?.outcome === "reached" || outcomes[id]?.outcome === "won").length;
  const wonIds = openedIds.filter((id) => outcomes[id]?.outcome === "won");
  const wonValue = wonIds.reduce((sum, id) => sum + (outcomes[id]?.valueTry ?? 0), 0);

  const bannerViews = bannerStats.reduce((sum, row) => sum + row.views, 0);
  const bannerClicks = bannerStats.reduce((sum, row) => sum + row.clicks, 0);

  const renderStatus = (lead: Lead, isPurchased: boolean) => {
    const count = purchaseCounts?.[lead.id];
    const fomo = !isPurchased && count !== undefined ? getFomoMessage(count) : null;
    const outcome = outcomes[lead.id]?.outcome;
    return (
      <div className="flex flex-col gap-1">
        <Badge variant={getStatusVariant(isPurchased ? "purchased" : lead.status)}>
          {isPurchased ? "Satın Alındı" : getStatusLabel(lead.status)}
        </Badge>
        {isPurchased && outcome && <Badge variant="outline">{OUTCOME_LABELS[outcome]}</Badge>}
        {lead.phone_verified === true && <Badge variant="outline">Telefon doğrulandı</Badge>}
        {fomo && (
          <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded border ${fomo.className}`}>
            {fomo.text}
          </span>
        )}
      </div>
    );
  };

  const mockScore = getScoreBadge(MOCK_TOUR_LEAD.lead_score);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar isPremium={isFirmPremium} />

        <FirmaTour />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <h1 className="font-heading text-lg text-foreground truncate">{firm.company_name}</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <Button variant="outline" size="sm" onClick={() => router.push("/firma/jeton")} className="gap-2" id="tour-balance">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold">{formatNumber(coinBalance)} Jeton</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (window as unknown as { startFirmaTour?: () => void }).startFirmaTour?.()}
                className="gap-2 text-muted-foreground"
              >
                <HelpCircle className="h-4 w-4" /> <span className="hidden sm:inline">Rehber</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {welcome && (
              <>
                <section
                  className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-6"
                  aria-labelledby="firma-welcome-heading"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 id="firma-welcome-heading" className="font-heading text-xl text-foreground">
                        Hoş geldiniz, {firm.company_name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Profiliniz artık sizin. Eksikleri tamamladıkça ziyaretçilere daha eksiksiz bir sayfa gösterirsiniz.
                      </p>
                      {welcomeViews !== null && welcomeViews > 0 && (
                        <p className="text-sm text-foreground">
                          Sayfanız son 30 günde <strong className="font-semibold">{formatNumber(welcomeViews)}</strong> kez
                          görüntülendi.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 -mt-2 shrink-0"
                      onClick={() => setWelcome(false)}
                      aria-label="Karşılama mesajını kapat"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </section>
                <ProfileCompletionCard firm={firm} galleryCount={galleryCount} />
              </>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="tour-stats">
              {statCards.map((stat) => {
                const body = (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <stat.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                    </div>
                    <p className="font-heading text-2xl text-foreground tracking-tight">{stat.value}</p>
                  </>
                );
                const className =
                  "block rounded-xl border border-border bg-card p-4 transition-shadow duration-150 hover:shadow-card";
                return stat.link ? (
                  <Link key={stat.title} href={stat.link} className={className}>
                    {body}
                  </Link>
                ) : (
                  <div key={stat.title} className={className}>
                    {body}
                  </div>
                );
              })}
            </div>

            {OFFER_FLAGS.leadTiersLive && (
              <p className="-mt-4 mb-8 text-sm text-muted-foreground">
                Bakiyeniz en düşük kademede yaklaşık {approxLeadsForBalance(coinBalance)} lead açar.
              </p>
            )}

            <FirmValuePanel firmId={firm.id} slug={firm.slug} isPro={isFirmPremium} />

            {purchasedIds.size > 0 && (
              <div className="mb-8 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                {reportedIds.length > 0 ? (
                  <p>
                    Açtığınız <strong>{purchasedIds.size}</strong> lead: <strong>{reachedCount}</strong> ulaşıldı,{" "}
                    <strong>{wonIds.length}</strong> iş alındı
                    {wonValue > 0 && (
                      <>
                        , bildirilen toplam iş değeri <strong>{formatTRY(wonValue)}</strong>
                      </>
                    )}
                    . <span className="text-muted-foreground">Bu rakamlar sizin bildirimlerinizdir.</span>
                  </p>
                ) : (
                  <p>
                    Açtığınız <strong>{purchasedIds.size}</strong> lead için henüz sonuç bildirmediniz. Lead detayından sonucu
                    işaretlerseniz özet burada görünür.
                  </p>
                )}
              </div>
            )}

            {bannerStats.length > 0 && (
              <div className="mb-8 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                <p>
                  Sponsor bannerınız: <strong>{formatNumber(bannerViews)}</strong> görüntülenme,{" "}
                  <strong>{formatNumber(bannerClicks)}</strong> tıklama{" "}
                  <span className="text-muted-foreground">(son 30 gün; sayılar gösterge niteliğindedir)</span>
                </p>
              </div>
            )}

            {!welcome && <ProfileCompletionCard firm={firm} galleryCount={galleryCount} />}

            {/* Lead List */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="font-heading text-xl text-foreground">Son Talepler</h2>
              {leads.length > 0 && (
                <Button variant="outline" size="sm" className="min-h-11" asChild>
                  <Link href="/firma/leadler">Tümünü gör</Link>
                </Button>
              )}
            </div>

            {leads.length === 0 && loadError ? (
              <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Talepler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
                <Button variant="outline" className="min-h-11" onClick={() => void reload()}>
                  Yeniden dene
                </Button>
              </div>
            ) : leads.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-secondary border border-border rounded-lg p-4 mb-4">
                  <p className="text-secondary-foreground text-sm font-medium flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 shrink-0" /> Henüz size yönlendirilen gerçek bir talep yok. Sistemin nasıl
                    çalıştığını görmeniz için aşağıda bir <strong>Örnek Talep</strong> gösteriliyor.
                  </p>
                </div>

                {/* Desktop table demo */}
                <div className="hidden lg:block" id="tour-lead-table">
                  <div className="rounded-lg border border-border overflow-hidden opacity-80 bg-card">
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
                        <tr>
                          <td className="px-4 py-3 text-sm text-foreground">Bugün</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.service_type}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.budget}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.city}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.full_name} (Örnek)</td>
                          <td className="px-4 py-3 text-sm text-foreground">{MOCK_TOUR_LEAD.phone}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${mockScore.className}`}>
                              {mockScore.emoji} {MOCK_TOUR_LEAD.lead_score}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="default">Örnek</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="min-h-11" id="tour-lead-preview" onClick={() => setDemoOpen(true)}>
                                <Eye className="h-4 w-4" /> Önizle
                              </Button>
                              <Button size="sm" className="h-auto min-h-11 whitespace-normal text-center leading-tight" id="tour-lead-purchase" disabled>
                                <Coins className="h-4 w-4" /> Örnek: {DEMO_PRICE_LABEL}
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
                        <Button size="sm" variant="outline" className="flex-1 min-h-11" onClick={() => setDemoOpen(true)}>
                          <Eye className="h-4 w-4" /> Önizle
                        </Button>
                        <Button size="sm" className="flex-1 h-auto min-h-11 whitespace-normal text-center leading-tight" disabled>
                          <Coins className="h-4 w-4" /> Örnek: {DEMO_PRICE_LABEL}
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
                  <div className="rounded-lg border border-border overflow-hidden bg-card">
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
                        {visibleLeads.map((lead, index) => {
                          const isPurchased = purchasedIds.has(lead.id);
                          const score = getScoreBadge(lead.lead_score);
                          return (
                            <tr key={lead.id} className="hover:bg-muted/50 transition-colors duration-150">
                              <td className="px-4 py-3 text-sm text-foreground">{new Date(lead.created_at).toLocaleDateString("tr-TR")}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{getLeadLabel(SERVICE_LABELS, lead.service_type)}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{getLeadLabel(BUDGET_LABELS, lead.budget)}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{lead.city}</td>
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
                              <td className="px-4 py-3">{renderStatus(lead, isPurchased)}</td>
                              <td className="px-4 py-3">
                                {isPurchased ? (
                                  <Button size="sm" variant="outline" onClick={() => openLead(lead)} className="w-full min-h-11">
                                    <Eye className="h-4 w-4" /> İncele
                                  </Button>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="min-h-11"
                                      onClick={() => openLead(lead)}
                                      id={index === 0 ? "tour-lead-preview" : undefined}
                                    >
                                      <Eye className="h-4 w-4" /> Önizle
                                    </Button>
                                    <LeadPriceButton
                                      lead={lead}
                                      purchaseCount={purchaseCounts?.[lead.id] ?? null}
                                      busy={purchasing}
                                      onBuy={handlePurchase}
                                      id={index === 0 ? "tour-lead-purchase" : undefined}
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

                {/* Mobile cards */}
                <div className="lg:hidden space-y-4">
                  {visibleLeads.map((lead) => {
                    const isPurchased = purchasedIds.has(lead.id);
                    return (
                      <Card key={lead.id} className="border-border">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm">{getLeadLabel(SERVICE_LABELS, lead.service_type)}</CardTitle>
                            {renderStatus(lead, isPurchased)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">İl:</span> {lead.city}</div>
                            <div><span className="text-muted-foreground">Bütçe:</span> {getLeadLabel(BUDGET_LABELS, lead.budget)}</div>
                            <div><span className="text-muted-foreground">Büyüklük:</span> {getLeadLabel(AREA_LABELS, lead.project_size)}</div>
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

                {leads.length > PANEL_LEAD_LIMIT && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" className="min-h-11" asChild>
                      <Link href="/firma/leadler">Tümünü gör ({leads.length})</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <LeadPreviewDialog
        lead={demoOpen ? MOCK_TOUR_LEAD : selectedLead}
        firmId={firm.id}
        isPurchased={selectedLead && !demoOpen ? purchasedIds.has(selectedLead.id) : false}
        purchaseCount={selectedLead && !demoOpen ? (purchaseCounts?.[selectedLead.id] ?? null) : null}
        purchasing={purchasing}
        outcome={selectedLead && !demoOpen ? outcomes[selectedLead.id] : undefined}
        refundStatus={selectedLead && !demoOpen ? refundStatuses[selectedLead.id] : undefined}
        demo={demoOpen}
        onClose={() => {
          setDemoOpen(false);
          setSelectedLeadId(null);
        }}
        onBuy={handlePurchase}
        onChanged={() => void reload()}
      />
    </SidebarProvider>
  );
};

export default FirmaPanel;
