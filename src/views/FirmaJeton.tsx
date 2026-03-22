"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, TrendingDown, Gift, Zap, Star, Crown, Rocket, CheckCircle2, ArrowUpRight, Shield, Lock, CreditCard, ShieldCheck, Users } from "lucide-react";
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
    glowColor: "hover:shadow-slate-500/10",
    badgeText: null as string | null,
    badgeBg: "",
    savingsBadge: null as string | null,
    perks: ["Temel erişim"],
  },
  {
    id: "advantage",
    name: "Avantaj",
    coins: 220,
    price: 200,
    bonusCoins: 20,
    icon: Star,
    gradient: "from-emerald-500 to-teal-600",
    glowColor: "hover:shadow-emerald-500/10",
    badgeText: "Popüler",
    badgeBg: "bg-emerald-500",
    savingsBadge: "%10 Tasarruf",
    perks: ["+20 bonus jeton"],
  },
  {
    id: "pro",
    name: "Pro",
    coins: 600,
    price: 500,
    bonusCoins: 100,
    icon: Crown,
    gradient: "from-violet-500 to-purple-700",
    glowColor: "hover:shadow-violet-500/10",
    badgeText: "En İyi Değer",
    badgeBg: "bg-violet-500",
    savingsBadge: "%20 Tasarruf",
    perks: ["+100 bonus jeton"],
  },
  {
    id: "ultra",
    name: "Ultra",
    coins: 1300,
    price: 1000,
    bonusCoins: 300,
    icon: Rocket,
    gradient: "from-amber-500 to-orange-600",
    glowColor: "hover:shadow-amber-500/10",
    badgeText: "Maks. Tasarruf",
    badgeBg: "bg-amber-500",
    savingsBadge: "%30 Tasarruf",
    perks: ["+300 bonus jeton"],
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


                          <ul className="space-y-1.5 mb-5 flex-1">
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

                {/* 🔒 Stripe Güvenlik Bilgilendirmesi */}
                <div className="mt-8 rounded-2xl border border-border bg-gradient-to-r from-card via-card to-blue-500/5 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Lock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-foreground mb-1">Güvenli Ödeme</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Tüm ödemeler yüksek güvenlikli <strong className="text-foreground">Stripe</strong> sayfası üzerinden yapılmaktadır.
                        İşlemin başarıyla tamamlanması için kartınızın <strong className="text-foreground">yurtdışı ödemelere açık</strong> olması gerekir.
                        Ayrıca ekstra güvenlik için <strong className="text-foreground">sanal kart</strong> kullanmanızı tavsiye ederiz.
                      </p>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      <span>256-bit SSL</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                      <span>Stripe Korumalı</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5 text-violet-500" />
                      <span>KVKK Uyumlu</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                      <span>3D Secure</span>
                    </div>
                  </div>
                </div>

                {/* 💬 Alternatif Ödeme */}
                <div className="mt-4 rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-foreground mb-1">Alternatif Ödeme Yöntemleri</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Kripto para</strong> ve <strong className="text-foreground">banka havale/EFT</strong> ile ödeme yapmak isterseniz bize ulaşabilirsiniz.
                      </p>
                    </div>
                    <a
                      href="https://wa.me/905345957147?text=Merhaba%2C%20jeton%20y%C3%BCkleme%20i%C3%A7in%20alternatif%20%C3%B6deme%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0 shadow-sm"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      WhatsApp Destek
                    </a>
                  </div>
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
