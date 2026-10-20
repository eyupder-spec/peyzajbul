"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, TrendingDown, Gift, LogOut, RotateCcw, SlidersHorizontal } from "lucide-react";
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supportWhatsAppUrl } from "@/lib/publicStats";
import {
  COIN_PACKS,
  JETON_TL_RATE,
  OFFER_FLAGS,
  SALES_WHATSAPP_URL,
  TAX_LABEL,
  approxLeadsForBalance,
  bonusLabel,
  formatNumber,
  formatTRY,
  getCoinPack,
} from "@/lib/pricing";
import { invokeEdgeFunction } from "@/app/firma/panel/rpc";
import { findPlanMismatches } from "@/app/firma/jeton/planCheck";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 10;
const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]+$/;

type PaymentNotice = "pending" | "done" | "delayed" | null;

const TYPE_LABELS: Record<string, string> = {
  purchase: "Yükleme",
  spend: "Harcama",
  bonus: "Bonus",
  grant: "Hediye",
  promo: "Promosyon",
  refund: "İade",
  admin_adjust: "Düzeltme",
};

function TypeIcon({ type }: { type: string }) {
  const className = "h-3.5 w-3.5";
  if (type === "purchase") return <TrendingUp className={className} />;
  if (type === "spend") return <TrendingDown className={className} />;
  if (type === "refund") return <RotateCcw className={className} />;
  if (type === "admin_adjust") return <SlidersHorizontal className={className} />;
  return <Gift className={className} />;
}

const FirmaJetonContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [firmName, setFirmName] = useState("");
  const [isFirmPremium, setIsFirmPremium] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<PaymentNotice>(null);
  const [unavailablePacks, setUnavailablePacks] = useState<Set<string>>(new Set());

  const highlightedPack = getCoinPack(searchParams?.get("pack"))?.id ?? null;
  const returnedFromStripe = searchParams?.get("success") === "true";
  const returnedSessionId = searchParams?.get("session_id") ?? null;
  const sessionId = returnedSessionId && SESSION_ID_PATTERN.test(returnedSessionId) ? returnedSessionId : null;

  const loadTransactions = useCallback(async () => {
    const { data: txns } = await supabase
      .from("coin_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setTransactions(txns || []);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
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

      const { data: firm } = await supabase
        .from("firms")
        .select("coin_balance, id, company_name, is_premium")
        .eq("user_id", user.id)
        .single();

      setCoinBalance(firm?.coin_balance || 0);
      setFirmId(firm?.id ?? null);
      setFirmName(firm?.company_name || "");
      setIsFirmPremium(firm?.is_premium || false);

      if (firm) await loadTransactions();

      // Gösterilen fiyat, ödemede tahsil edilecek pricing_plans satırıyla uyuşmayan paket satışa açılmaz.
      setUnavailablePacks((await findPlanMismatches()) ?? new Set());

      setLoading(false);
    };
    void fetchData();
  }, [router, loadTransactions]);

  // Stripe dönüşünde webhook gecikebilir. Ödeme, URL'ye bakılarak değil, bu oturuma ait 'purchase' kaydı
  // jeton hareketlerinde görününce doğrulanmış sayılır: 2 sn aralıkla en çok 10 kez bakılır.
  useEffect(() => {
    if (loading || !firmId || !returnedFromStripe || !sessionId) return;
    setPaymentNotice("pending");

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async (attempt: number) => {
      const { data: credit } = await supabase
        .from("coin_transactions")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .eq("type", "purchase")
        .limit(1);
      if (cancelled) return;

      if ((credit?.length ?? 0) > 0) {
        const { data: firm } = await supabase.from("firms").select("coin_balance").eq("id", firmId).maybeSingle();
        if (cancelled) return;
        if (firm) setCoinBalance(firm.coin_balance ?? 0);
        await loadTransactions();
        if (cancelled) return;
        setPaymentNotice("done");
        toast({ title: "Jetonlar hesabınıza yüklendi." });
        return;
      }
      if (attempt >= POLL_MAX_ATTEMPTS) {
        setPaymentNotice("delayed");
        return;
      }
      timer = setTimeout(() => void check(attempt + 1), POLL_INTERVAL_MS);
    };

    void check(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, firmId, returnedFromStripe, sessionId, loadTransactions, toast]);

  useEffect(() => {
    if (loading || !highlightedPack) return;
    document.getElementById(`pack-${highlightedPack}`)?.scrollIntoView({ block: "center" });
  }, [loading, highlightedPack]);

  const handleBuyPackage = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const result = await invokeEdgeFunction<{ url?: string }>("create-coin-checkout", { package_id: packageId });
      if (!result.ok) {
        toast({ title: "Ödeme başlatılamadı", description: result.message, variant: "destructive" });
        return;
      }
      if (result.data.url) {
        window.location.href = result.data.url;
        return;
      }
      toast({ title: "Ödeme başlatılamadı", description: "İşlem tamamlanamadı, lütfen tekrar deneyin.", variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Coins className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar isPremium={isFirmPremium} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <h1 className="font-heading text-lg text-foreground truncate">{firmName}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Çıkış
            </Button>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-10">
              {paymentNotice && (
                <div className="rounded-xl border border-border bg-secondary p-4 text-sm text-secondary-foreground" role="status">
                  {paymentNotice === "pending" && <p>Ödeme durumunuz kontrol ediliyor…</p>}
                  {paymentNotice === "done" && <p>Ödemeniz doğrulandı ve jetonlar hesabınıza yüklendi.</p>}
                  {paymentNotice === "delayed" && (
                    <p>
                      Ödeme kaydını henüz göremedik. Ödemeyi tamamladıysanız bakiyeniz birkaç dakika içinde güncellenir; görünmezse{" "}
                      <a
                        href={supportWhatsAppUrl("Merhaba, jeton yüklemem bakiyeme yansımadı.")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline underline-offset-4"
                      >
                        bize WhatsApp’tan yazın
                      </a>
                      .
                    </p>
                  )}
                </div>
              )}

              {/* Balance */}
              <section className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-primary" aria-hidden="true" /> Jeton Bakiyeniz
                </p>
                <div className="flex items-end gap-3">
                  <span className="font-heading text-5xl text-foreground tracking-tight">{formatNumber(coinBalance)}</span>
                  <span className="text-lg font-semibold text-muted-foreground mb-1.5">Jeton</span>
                </div>
                {OFFER_FLAGS.leadTiersLive && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Bakiyeniz en düşük kademede yaklaşık {approxLeadsForBalance(coinBalance)} lead açar.
                  </p>
                )}
              </section>

              {/* Packages */}
              <section>
                <div className="mb-6">
                  <h2 className="font-heading text-2xl text-foreground">Jeton Paketleri</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    1 jeton = {formatTRY(JETON_TL_RATE)} krediye eşittir. Lead fiyatı, her talepte satın almadan önce gösterilir.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {COIN_PACKS.map((pack) => {
                    const isLoading = purchasing === pack.id;
                    const unavailable = unavailablePacks.has(pack.id);
                    const highlighted = highlightedPack === pack.id;
                    return (
                      <div
                        key={pack.id}
                        id={`pack-${pack.id}`}
                        className={`flex flex-col rounded-xl border bg-card p-5 transition-colors duration-150 hover:border-primary ${
                          highlighted ? "border-primary ring-2 ring-primary" : "border-border"
                        }`}
                      >
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{pack.name}</p>
                        <p className="font-heading text-3xl text-foreground">{formatTRY(pack.priceTRY)}</p>
                        <p className="text-xs text-muted-foreground mb-4">{TAX_LABEL}</p>

                        <p className="text-sm font-semibold text-primary">{bonusLabel(pack)}</p>
                        <p className="text-sm text-foreground mb-5">
                          <span className="font-semibold">{formatNumber(pack.totalJeton)} jeton</span> hesabınıza yüklenir
                        </p>

                        <Button
                          variant="accent"
                          className="mt-auto w-full min-h-11"
                          onClick={() => handleBuyPackage(pack.id)}
                          disabled={!!purchasing || unavailable}
                        >
                          {unavailable ? "Şu an satışta değil" : isLoading ? "İşleniyor..." : "Satın Al"}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-6 text-sm text-muted-foreground">
                  Ödeme Stripe’ın güvenli sayfasında TL olarak alınır; kart bilgileriniz Peyzajbul’a iletilmez.{" "}
                  <Link href="/kullanim-kosullari" className="underline underline-offset-4">
                    Kullanım Koşulları
                  </Link>
                  {" · "}
                  <Link href="/fiyatlandirma" className="underline underline-offset-4">
                    Fiyatlandırma
                  </Link>
                </p>

                {OFFER_FLAGS.bankTransfer && (
                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">Havale/EFT ile ödeme</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">Havale/EFT ile ödemek için bize yazın.</p>
                    </div>
                    <Button variant="outline" className="min-h-11 shrink-0" asChild>
                      <a
                        href={SALES_WHATSAPP_URL("Merhaba, jeton yükleme için havale/EFT ile ödeme hakkında bilgi almak istiyorum.")}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp’tan yaz
                      </a>
                    </Button>
                  </div>
                )}
              </section>

              {/* Transaction History */}
              <section>
                <h2 className="font-heading text-xl text-foreground mb-4">İşlem Geçmişi</h2>
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border border-dashed border-border bg-muted/30">
                    <Coins className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
                    <p className="text-muted-foreground text-sm">Henüz işlem geçmişi bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tarih</th>
                            <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tür</th>
                            <th className="text-left px-5 py-3 font-medium text-muted-foreground">Açıklama</th>
                            <th className="text-right px-5 py-3 font-medium text-muted-foreground">Miktar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-muted/30 transition-colors duration-150">
                              <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                                {new Date(tx.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="flex items-center gap-1.5 font-medium text-foreground">
                                  <TypeIcon type={tx.type} /> {TYPE_LABELS[tx.type] ?? tx.type}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-muted-foreground">{tx.description || "—"}</td>
                              <td
                                className={`px-5 py-3.5 text-right font-bold tabular-nums ${
                                  tx.amount > 0 ? "text-verified" : "text-destructive"
                                }`}
                              >
                                {tx.amount > 0 ? "+" : ""}
                                {formatNumber(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default function FirmaJeton() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <Coins className="h-8 w-8 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground text-sm">Yükleniyor...</p>
          </div>
        </div>
      }
    >
      <FirmaJetonContent />
    </Suspense>
  );
}
