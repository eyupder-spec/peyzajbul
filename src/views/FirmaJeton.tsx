"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, TrendingDown, Gift, Zap, Star, Crown, Rocket, CheckCircle2, ArrowUpRight } from "lucide-react";
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { LogOut } from "lucide-react";

const COIN_PACKAGES = [
  {
    id: "starter",
    name: "Başlangıç",
    coins: 50,
    price: 50,
    bonusCoins: 0,
    icon: Zap,
    gradient: "from-slate-500 to-slate-700",
    badgeText: null as string | null,
    badgeBg: "",
    savingsBadge: null as string | null,
    perks: ["3 müşteri adayı", "Temel erişim"],
  },
  {
    id: "advantage",
    name: "Avantaj",
    coins: 220,
    price: 200,
    bonusCoins: 20,
    icon: Star,
    gradient: "from-emerald-500 to-teal-600",
    badgeText: "Popüler",
    badgeBg: "bg-emerald-500",
    savingsBadge: "%10 Tasarruf",
    perks: ["11 müşteri adayı", "+20 bonus jeton"],
  },
  {
    id: "pro",
    name: "Pro",
    coins: 600,
    price: 500,
    bonusCoins: 100,
    icon: Crown,
    gradient: "from-violet-500 to-purple-700",
    badgeText: "En İyi Değer",
    badgeBg: "bg-violet-500",
    savingsBadge: "%20 Tasarruf",
    perks: ["30 müşteri adayı", "+100 bonus jeton"],
  },
  {
    id: "ultra",
    name: "Ultra",
    coins: 1300,
    price: 1000,
    bonusCoins: 300,
    icon: Rocket,
    gradient: "from-amber-500 to-orange-600",
    badgeText: "Maks. Tasarruf",
    badgeBg: "bg-amber-500",
    savingsBadge: "%30 Tasarruf",
    perks: ["65 müşteri adayı", "+300 bonus jeton"],
  },
];

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

const FirmaJetonContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [firmName, setFirmName] = useState("");
  const [isFirmPremium, setIsFirmPremium] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams && searchParams.get("success") === "true") {
      toast({ title: "🎉 Ödeme başarılı!", description: "Jetonlar hesabınıza yüklendi." });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "firm");
      if (!roles || roles.length === 0) { router.push("/"); return; }

      const { data: firm } = await supabase
        .from("firms")
        .select("coin_balance, id, company_name, is_premium")
        .eq("user_id", user.id)
        .single();

      setCoinBalance(firm?.coin_balance || 0);
      setFirmName((firm as any)?.company_name || "");
      setIsFirmPremium((firm as any)?.is_premium || false);

      if (firm) {
        const { data: txns } = await supabase
          .from("coin_transactions")
          .select("*")
          .order("created_at", { ascending: false });
        setTransactions(txns || []);
      }

      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleBuyPackage = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const { data, error } = await supabase.functions.invoke("create-coin-checkout", {
        body: { package_id: packageId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
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
          <Coins className="h-8 w-8 text-accent animate-bounce" />
          <p className="text-muted-foreground text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const leadsCanBuy = Math.floor(coinBalance / 20);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar isPremium={isFirmPremium} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-bold text-foreground">{firmName}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Çıkış
            </Button>
          </header>

          <main className="flex-1 overflow-auto">
            {/* Hero Balance Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--primary)/0.12)] via-background to-[hsl(var(--accent)/0.08)] border-b border-border">
              {/* Decorative circles */}
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

              <div className="relative px-6 py-10 max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-accent" /> Jeton Bakiyeniz
                    </p>
                    <div className="flex items-end gap-3">
                      <span className="text-6xl font-extrabold text-foreground tracking-tight">{coinBalance.toLocaleString("tr-TR")}</span>
                      <span className="text-xl font-semibold text-muted-foreground mb-2">Jeton</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ≈ <span className="font-semibold text-foreground">{leadsCanBuy}</span> müşteri adayına erişebilirsiniz
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="bg-card border border-border rounded-2xl px-5 py-4 text-center min-w-[120px]">
                      <p className="text-xs text-muted-foreground mb-1">Lead Başına</p>
                      <p className="text-2xl font-bold text-foreground">20</p>
                      <p className="text-xs text-muted-foreground">Jeton</p>
                    </div>
                    <div className="bg-card border border-border rounded-2xl px-5 py-4 text-center min-w-[120px]">
                      <p className="text-xs text-muted-foreground mb-1">Kullanılabilir</p>
                      <p className="text-2xl font-bold text-accent">{leadsCanBuy}</p>
                      <p className="text-xs text-muted-foreground">Lead</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 max-w-5xl mx-auto space-y-10">
              {/* Packages */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Jeton Paketleri</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">İhtiyacınıza uygun paketi seçin, anında hesabınıza yükleyin</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {COIN_PACKAGES.map((pkg) => {
                    const Icon = pkg.icon;
                    const isLoading = purchasing === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        className={`relative group rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${pkg.glowColor} flex flex-col`}
                      >
                        {/* Gradient top bar */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${pkg.gradient}`} />

                        {pkg.badgeText && (
                          <div className="absolute top-4 right-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${pkg.gradient} text-white shadow-sm`}>
                              {pkg.badgeText}
                            </span>
                          </div>
                        )}

                        <div className="p-5 flex-1 flex flex-col">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>

                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{pkg.name}</p>
                          <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-3xl font-extrabold text-foreground">{pkg.coins.toLocaleString("tr-TR")}</span>
                            <span className="text-sm text-muted-foreground">Jeton</span>
                          </div>
                          {pkg.bonusCoins > 0 && (
                            <p className="text-xs text-emerald-600 font-medium mb-1">+ {pkg.bonusCoins} bonus jeton dahil</p>
                          )}
                          {pkg.savingsBadge && (
                            <div className="mb-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white ${pkg.badgeBg} animate-[pulse_3s_ease-in-out_infinite]`}>
                                🏷️ {pkg.savingsBadge}
                              </span>
                            </div>
                          )}
                          {!pkg.savingsBadge && <div className="mb-3" />}

                          <ul className="space-y-1.5 mb-5 mt-1 flex-1">
                            {pkg.perks.map((perk) => (
                              <li key={perk} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                {perk}
                              </li>
                            ))}
                          </ul>

                          <div className="border-t border-border pt-4">
                            <p className="text-2xl font-bold text-foreground mb-3">${pkg.price}</p>
                            <Button
                              className={`w-full bg-gradient-to-r ${pkg.gradient} text-white border-0 hover:opacity-90 transition-opacity gap-2`}
                              onClick={() => handleBuyPackage(pkg.id)}
                              disabled={!!purchasing}
                            >
                              {isLoading ? (
                                <span className="flex items-center gap-2">
                                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  İşleniyor...
                                </span>
                              ) : (
                                <>
                                  <ArrowUpRight className="h-4 w-4" />
                                  Satın Al
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Transaction History */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">İşlem Geçmişi</h2>
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border bg-muted/30">
                    <Coins className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground text-sm">Henüz işlem geçmişi bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border overflow-hidden">
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
                            <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                                {new Date(tx.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  {tx.type === "purchase" && (
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                      <TrendingUp className="h-3.5 w-3.5" /> Yükleme
                                    </span>
                                  )}
                                  {tx.type === "spend" && (
                                    <span className="flex items-center gap-1.5 text-red-500 font-medium">
                                      <TrendingDown className="h-3.5 w-3.5" /> Harcama
                                    </span>
                                  )}
                                  {tx.type === "bonus" && (
                                    <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                                      <Gift className="h-3.5 w-3.5" /> Bonus
                                    </span>
                                  )}
                                  {!["purchase", "spend", "bonus"].includes(tx.type) && (
                                    <span className="text-foreground capitalize">{tx.type}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-muted-foreground">{tx.description || "—"}</td>
                              <td className={`px-5 py-3.5 text-right font-bold tabular-nums ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("tr-TR")}
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Coins className="h-8 w-8 text-accent animate-bounce" />
          <p className="text-muted-foreground text-sm">Yükleniyor...</p>
        </div>
      </div>
    }>
      <FirmaJetonContent />
    </Suspense>
  );
}
