"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  Briefcase,
  CheckCircle2,
  Image as ImageIcon,
  LayoutTemplate,
  Link2,
  ShoppingBag,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supportWhatsAppUrl } from "@/lib/publicStats";
import {
  OFFER_FLAGS,
  PRO_PLANS,
  SALES_WHATSAPP_URL,
  TAX_LABEL,
  founderRenewalLine,
  formatTRY,
  getLiveProFeatures,
  getProHighlights,
  getProPlan,
  proPlanLabel,
  yearlySavingsPercent,
  type ProPlan,
  type ProPlanId,
} from "@/lib/pricing";
import { invokeEdgeFunction, queryUntyped } from "@/app/firma/panel/rpc";
import { findPlanMismatches } from "@/app/firma/jeton/planCheck";
import {
  callOrWhatsappClicks,
  fetchFirmEventStats,
  fetchFounderSlots,
  hasAnyEvent,
  type FirmEventStats,
  type FounderSlots,
} from "@/app/firma/panel/firmStats";

interface FirmRow {
  id: string;
  is_premium: boolean | null;
  premium_until: string | null;
  company_name: string | null;
  subscription_plan: string | null;
}

const FIRM_COLUMNS = "id, is_premium, premium_until, company_name, subscription_plan";
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 10;

const FEATURE_ICONS: Record<string, typeof CheckCircle2> = {
  "listing-priority": ArrowUpDown,
  gallery: ImageIcon,
  projects: Briefcase,
  products: ShoppingBag,
  landing: LayoutTemplate,
  links: Link2,
  "lead-priority": Users,
};

const DATE_FORMAT = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function isProActive(firm: FirmRow | null): boolean {
  return Boolean(firm?.is_premium) && (!firm?.premium_until || new Date(firm.premium_until) > new Date());
}

function planPriceUnit(plan: ProPlan): string {
  return plan.interval === "year" ? "yıl" : "ay";
}

const FirmaPremium = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [firm, setFirm] = useState<FirmRow | null>(null);
  const [slots, setSlots] = useState<FounderSlots | null>(null);
  const [unavailablePlans, setUnavailablePlans] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<FirmEventStats | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ProPlanId>("yearly");
  const [activationState, setActivationState] = useState<"pending" | "delayed" | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const requestedPlan = searchParams?.get("plan");
  const returnedFromStripe = searchParams?.get("success") === "true";

  const loadFirm = useCallback(async (userId: string): Promise<FirmRow | null> => {
    const { data } = await queryUntyped<FirmRow[]>("firms", (q) => q.select(FIRM_COLUMNS).eq("user_id", userId).limit(1));
    return data?.[0] ?? null;
  }, []);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const loaded = await loadFirm(user.id);
      if (!loaded) {
        router.push("/firma/panel");
        return;
      }
      setFirm(loaded);

      const [founderSlots, eventStats, mismatched] = await Promise.all([
        OFFER_FLAGS.founderEnabled ? fetchFounderSlots(getProPlan("founder")?.cap) : Promise.resolve(null),
        isProActive(loaded) ? Promise.resolve(null) : fetchFirmEventStats(loaded.id, 30),
        findPlanMismatches(),
      ]);
      setSlots(founderSlots);
      setStats(eventStats);
      // Gösterilen fiyat, ödemede tahsil edilecek pricing_plans satırıyla uyuşmayan plan satışa açılmaz.
      setUnavailablePlans(mismatched ?? new Set());
      setLoading(false);
    };
    void load();
  }, [router, loadFirm]);

  const founderAvailable = OFFER_FLAGS.founderEnabled && slots !== null && slots.remaining > 0;
  const visiblePlans = PRO_PLANS.filter(
    (candidate) => !unavailablePlans.has(candidate.id) && (candidate.id !== "founder" || founderAvailable),
  );

  // ?plan= yalnızca satışta olan bir plana ön seçim yapar.
  useEffect(() => {
    const preselect = getProPlan(requestedPlan);
    if (preselect && (preselect.id !== "founder" || founderAvailable)) setSelectedPlan(preselect.id);
  }, [requestedPlan, founderAvailable]);

  // Seçili plan satışta değilse (kontenjan bitti, fiyat uyuşmuyor) satıştaki bir plana dönülür.
  const visiblePlanIds = visiblePlans.map((candidate) => candidate.id).join(",");
  useEffect(() => {
    if (loading || !visiblePlanIds) return;
    const ids = visiblePlanIds.split(",") as ProPlanId[];
    if (!ids.includes(selectedPlan)) setSelectedPlan(ids.includes("yearly") ? "yearly" : ids[0]);
  }, [loading, visiblePlanIds, selectedPlan]);

  // Stripe dönüşünde premium, invoice.paid webhook'uyla verilir: 2 sn aralıkla en çok 10 kez bakılır.
  const firmId = firm?.id ?? null;
  const proActive = isProActive(firm);
  useEffect(() => {
    if (loading || !firmId || !returnedFromStripe) return;
    if (proActive) {
      setActivationState(null);
      return;
    }
    setActivationState("pending");

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async (attempt: number) => {
      const { data } = await queryUntyped<FirmRow[]>("firms", (q) => q.select(FIRM_COLUMNS).eq("id", firmId).limit(1));
      if (cancelled) return;
      const fresh = data?.[0];
      if (fresh && isProActive(fresh)) {
        setFirm(fresh);
        setActivationState(null);
        toast.success("Pro üyeliğiniz aktif.");
        return;
      }
      if (attempt >= POLL_MAX_ATTEMPTS) {
        setActivationState("delayed");
        return;
      }
      timer = setTimeout(() => void check(attempt + 1), POLL_INTERVAL_MS);
    };

    void check(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, firmId, proActive, returnedFromStripe]);

  const handleSubscribe = async (planId: ProPlanId) => {
    if (!firm) return;
    setActivating(true);
    try {
      const result = await invokeEdgeFunction<{ url?: string }>("create-premium-checkout", { plan: planId });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.data.url) {
        window.location.href = result.data.url;
        return;
      }
      toast.error("Ödeme başlatılamadı, lütfen tekrar deneyin.");
    } finally {
      setActivating(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalBusy(true);
    try {
      const result = await invokeEdgeFunction<{ url?: string }>("create-billing-portal", {});
      if (!result.ok || !result.data.url) {
        toast.error(result.ok ? "Abonelik yönetim sayfası açılamadı." : result.message);
        return;
      }
      window.location.href = result.data.url;
    } finally {
      setPortalBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const isPremiumActive = isProActive(firm);
  const plan = visiblePlans.find((candidate) => candidate.id === selectedPlan) ?? visiblePlans[0] ?? null;
  const yearly = getProPlan("yearly");
  const features = getLiveProFeatures();
  const showValueBlock = !isPremiumActive && stats !== null;
  const trackingSince = stats?.tracking_since ? DATE_FORMAT.format(new Date(stats.tracking_since)) : null;
  const supportLink = supportWhatsAppUrl("Merhaba, Pro üyeliğimle ilgili destek almak istiyorum.");
  const billingLink = SALES_WHATSAPP_URL("Merhaba, Pro üyeliğimin faturası veya iptali hakkında bilgi almak istiyorum.");

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pb-16">
        {/* HERO */}
        <div className="bg-card border-b border-border pt-20">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 px-3 py-1">
              Firmalar için
            </Badge>
            <h1 className="font-heading mb-4">Pro Üyelik</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Profilinizi listelerde öne çıkarın; fotoğraf, proje ve ürünlerinizi sınırsız sergileyin.
            </p>

            {showValueBlock && stats && (
              <div className="mx-auto mb-8 max-w-xl rounded-xl border border-border bg-secondary p-4 text-left text-secondary-foreground">
                {hasAnyEvent(stats.current) ? (
                  <p className="text-sm leading-relaxed">
                    Profiliniz son 30 günde <strong>{stats.current.profile_view}</strong> kez görüntülendi,{" "}
                    <strong>{callOrWhatsappClicks(stats.current)}</strong> kez Ara veya WhatsApp düğmesine tıklandı.
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed">
                    {trackingSince ? `Takip ${trackingSince} tarihinde başladı; ` : ""}
                    ilk veriler birkaç gün içinde burada olacak.
                  </p>
                )}
              </div>
            )}

            {activationState === "pending" && (
              <p className="mb-6 text-sm text-muted-foreground" role="status">
                Ödeme durumunuz kontrol ediliyor…
              </p>
            )}
            {activationState === "delayed" && (
              <p className="mb-6 text-sm text-muted-foreground" role="status">
                Ödemeyi tamamladıysanız ve Pro üyeliğiniz hâlâ aktif görünmüyorsa{" "}
                <a href={supportLink} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                  WhatsApp’tan yazın
                </a>
                .
              </p>
            )}

            {isPremiumActive && firm ? (
              <div className="mx-auto max-w-md rounded-xl border border-border bg-background p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-verified" aria-hidden="true" />
                <h2 className="font-heading text-xl text-foreground mb-1">Pro üyeliğiniz aktif</h2>
                <p className="text-muted-foreground mb-1">
                  Plan: <span className="font-semibold text-foreground">{proPlanLabel(firm.subscription_plan)}</span>
                </p>
                {firm.premium_until && (
                  <p className="text-muted-foreground mb-4 text-sm">
                    Yenileme tarihi:{" "}
                    <span className="font-semibold text-foreground">{DATE_FORMAT.format(new Date(firm.premium_until))}</span>
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Button variant="accent" className="min-h-11" onClick={() => router.push("/firma/profil")}>
                    Profilini Düzenle
                  </Button>
                  {OFFER_FLAGS.billingPortal ? (
                    <Button variant="outline" className="min-h-11" onClick={handleManageSubscription} disabled={portalBusy}>
                      {portalBusy ? "Açılıyor..." : "Aboneliği Yönet"}
                    </Button>
                  ) : (
                    <Button variant="outline" className="min-h-11" asChild>
                      <a href={billingLink} target="_blank" rel="noopener noreferrer">
                        Fatura ve iptal için bize yazın
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ) : !plan ? (
              <p className="mx-auto max-w-md text-muted-foreground">
                Pro üyelik şu anda satışta değil. Bilgi için{" "}
                <a href={supportLink} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                  WhatsApp’tan yazın
                </a>
                .
              </p>
            ) : (
              <div className="mx-auto flex max-w-md flex-col items-center">
                <div className="mb-6 flex w-full flex-wrap justify-center gap-2 rounded-xl border border-border bg-background p-1" role="group" aria-label="Plan seçimi">
                  {visiblePlans.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedPlan(option.id)}
                      aria-pressed={plan.id === option.id}
                      className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
                        plan.id === option.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {option.id === "monthly" ? "Aylık" : option.id === "yearly" ? "Yıllık" : "Kurucu Üye"}
                    </button>
                  ))}
                </div>

                <div className="w-full rounded-xl border border-border bg-background p-6 text-left shadow-card">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.name}</p>
                    {plan.id === "yearly" && <Badge variant="secondary">%{yearlySavingsPercent()} daha uygun</Badge>}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-5xl text-foreground tracking-tight">{formatTRY(plan.priceTRY)}</span>
                    <span className="text-lg text-muted-foreground">/{planPriceUnit(plan)}</span>
                  </div>
                  <p className="mb-4 text-xs text-muted-foreground">{TAX_LABEL}</p>

                  {plan.id === "yearly" && (
                    <p className="mb-4 text-sm text-muted-foreground">12 aylık ödemeye göre ({formatTRY(getProPlan("monthly")?.priceTRY ?? 0)} x 12).</p>
                  )}
                  {plan.id === "founder" && (
                    <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                      {yearly && <p>Normal yıllık fiyat {formatTRY(yearly.priceTRY)}.</p>}
                      <p>{founderRenewalLine(plan)}</p>
                      {slots && plan.cap !== undefined && (
                        <p className="font-medium text-foreground">
                          Kalan kontenjan {slots.remaining}/{plan.cap}
                        </p>
                      )}
                    </div>
                  )}

                  <ul className="mb-6 space-y-2">
                    {getProHighlights().map((feature) => (
                      <li key={feature.id} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
                        <span>{feature.label}</span>
                      </li>
                    ))}
                  </ul>

                  <Button variant="accent" size="lg" className="w-full" onClick={() => handleSubscribe(plan.id)} disabled={activating}>
                    {activating ? "Hazırlanıyor..." : "Aboneliği Başlat"}
                  </Button>

                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Ödeme Stripe’ın güvenli sayfasında TL olarak alınır; kart bilgileriniz Peyzajbul’a iletilmez. Abonelik her
                    dönem otomatik yenilenir.{" "}
                    {OFFER_FLAGS.billingPortal ? (
                      "Aboneliğinizi panelden yönetebilirsiniz."
                    ) : (
                      <>
                        İptal ve fatura için{" "}
                        <a href={billingLink} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                          WhatsApp’tan bize yazın
                        </a>
                        .
                      </>
                    )}{" "}
                    {OFFER_FLAGS.moneyBack14d && "14 gün içinde iade edilir."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FEATURES */}
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="font-heading text-foreground mb-3">Pro ile neler var?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Aşağıdaki özelliklerin tümü bugün çalışmaktadır.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = FEATURE_ICONS[feature.id] ?? CheckCircle2;
              return (
                <div key={feature.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-base font-semibold text-foreground">{feature.label}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Fiyatların tamamı için{" "}
              <Link href="/fiyatlandirma" className="underline underline-offset-4">
                fiyatlandırma sayfasına
              </Link>{" "}
              bakabilirsiniz.
            </p>
            <Button variant="outline" onClick={() => router.push("/firma/panel")} className="w-full max-w-sm min-h-11">
              Firma Paneline Dön
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FirmaPremium;
