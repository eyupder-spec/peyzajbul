"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Coins, ArrowLeft, TrendingUp, TrendingDown, Gift } from "lucide-react";

const COIN_PACKAGES = [
  { id: "starter", name: "Başlangıç Paketi", coins: 50, price: 50, bonus: null },
  { id: "advantage", name: "Avantaj Paketi", coins: 220, price: 200, bonus: "+10% Bonus", originalValue: 330 },
  { id: "pro", name: "Pro Paket", coins: 600, price: 500, bonus: "+20% Bonus", originalValue: 900 },
  { id: "ultra", name: "Ultra Paket", coins: 1300, price: 1000, bonus: "+30% Bonus", originalValue: 1950 },
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams && searchParams.get("success") === "true") {
      toast({ title: "Ödeme başarılı!", description: "Jetonlar hesabınıza yüklendi." });
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
        .select("coin_balance, id")
        .eq("user_id", user.id)
        .single();

      setCoinBalance(firm?.coin_balance || 0);

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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "spend": return <TrendingDown className="h-4 w-4 text-destructive" />;
      case "bonus": return <Gift className="h-4 w-4 text-accent" />;
      default: return <Coins className="h-4 w-4" />;
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
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.push("/firma/panel")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Jeton Yönetimi</h1>
          </div>

          {/* Balance Card */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-6">
              <Coins className="h-10 w-10 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Mevcut Bakiye</p>
                <p className="text-4xl font-bold text-foreground">{coinBalance} <span className="text-lg text-muted-foreground">Jeton</span></p>
              </div>
            </CardContent>
          </Card>

          {/* Packages */}
          <h2 className="text-xl font-semibold text-foreground mb-4">Jeton Paketleri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {COIN_PACKAGES.map((pkg) => (
              <Card key={pkg.id} className="border-border hover:border-primary/40 transition-colors relative overflow-hidden">
                {pkg.bonus && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-accent text-accent-foreground text-xs">
                      {pkg.bonus}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{pkg.coins}</span>
                    <span className="text-sm text-muted-foreground">Jeton</span>
                  </div>
                  {pkg.originalValue && (
                    <p className="text-xs text-muted-foreground">${pkg.originalValue} Değerinde</p>
                  )}
                  <p className="text-2xl font-bold text-primary">${pkg.price}</p>
                  <Button
                    className="w-full"
                    onClick={() => handleBuyPackage(pkg.id)}
                    disabled={purchasing === pkg.id}
                  >
                    {purchasing === pkg.id ? "İşleniyor..." : "Satın Al"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transaction History */}
          <h2 className="text-xl font-semibold text-foreground mb-4">İşlem Geçmişi</h2>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Henüz işlem bulunmuyor.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tarih</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tür</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Açıklama</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Miktar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {new Date(tx.created_at).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.type)}
                          <span className="text-foreground capitalize">
                            {tx.type === "purchase" ? "Yükleme" : tx.type === "spend" ? "Harcama" : "Bonus"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{tx.description || "-"}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${tx.amount > 0 ? "text-green-600" : "text-destructive"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default function FirmaJeton() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-20 flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>}>
      <FirmaJetonContent />
    </Suspense>
  );
}


