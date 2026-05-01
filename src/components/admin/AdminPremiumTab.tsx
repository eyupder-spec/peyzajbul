import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Mail, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type PremiumFirm = {
  id: string;
  company_name: string;
  email: string;
  city: string;
  district: string | null;
  is_premium: boolean;
  premium_until: string | null;
  phone: string;
};

type ReminderStatus = "idle" | "sending" | "sent" | "error";

function getDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function PremiumBadge({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) return <Badge variant="outline">Tarih Yok</Badge>;
  if (daysLeft < 0) return <Badge variant="destructive">Süresi Dolmuş ({Math.abs(daysLeft)} gün önce)</Badge>;
  if (daysLeft === 0) return <Badge className="bg-red-500 text-white">Bugün Bitiyor!</Badge>;
  if (daysLeft <= 7) return <Badge className="bg-orange-500 text-white">⚠️ {daysLeft} gün kaldı</Badge>;
  if (daysLeft <= 30) return <Badge className="bg-yellow-500 text-white">⏳ {daysLeft} gün kaldı</Badge>;
  return <Badge className="bg-emerald-600 text-white">✅ {daysLeft} gün kaldı</Badge>;
}

export default function AdminPremiumTab() {
  const [firms, setFirms] = useState<PremiumFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingAll, setSendingAll] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<Record<string, ReminderStatus>>({});

  const loadFirms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("firms")
      .select("id, company_name, email, city, district, is_premium, premium_until, phone")
      .eq("is_premium", true)
      .order("premium_until", { ascending: true });

    if (!error) setFirms((data as PremiumFirm[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFirms();
  }, []);

  const sendReminder = async (firm: PremiumFirm) => {
    setReminderStatus((p) => ({ ...p, [firm.id]: "sending" }));
    try {
      const { data, error } = await supabase.functions.invoke("send-premium-reminder", {
        body: { firmId: firm.id },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Hata");
      setReminderStatus((p) => ({ ...p, [firm.id]: "sent" }));
      toast.success(`${firm.company_name} firmasına hatırlatma maili gönderildi.`);
    } catch (err: any) {
      setReminderStatus((p) => ({ ...p, [firm.id]: "error" }));
      toast.error(`Mail gönderilemedi: ${err.message}`);
    }
  };

  const sendAllReminders = async () => {
    // Sadece 7 gün veya daha az kalan firmalara toplu gönder
    const urgent = firms.filter((f) => {
      const d = getDaysLeft(f.premium_until);
      return d !== null && d >= 0 && d <= 7;
    });

    if (urgent.length === 0) {
      toast.info("7 gün içinde süresi dolacak firma yok.");
      return;
    }

    setSendingAll(true);
    let successCount = 0;
    for (const firm of urgent) {
      try {
        const { data, error } = await supabase.functions.invoke("send-premium-reminder", {
          body: { firmId: firm.id },
        });
        if (!error && data?.success) {
          setReminderStatus((p) => ({ ...p, [firm.id]: "sent" }));
          successCount++;
        } else {
          setReminderStatus((p) => ({ ...p, [firm.id]: "error" }));
        }
      } catch {
        setReminderStatus((p) => ({ ...p, [firm.id]: "error" }));
      }
    }
    setSendingAll(false);
    toast.success(`${successCount}/${urgent.length} firmaya hatırlatma maili gönderildi.`);
  };

  const now = new Date();
  const activeFirms = firms.filter((f) => f.premium_until && new Date(f.premium_until) > now);
  const expiredFirms = firms.filter((f) => !f.premium_until || new Date(f.premium_until) <= now);
  const urgentCount = activeFirms.filter((f) => {
    const d = getDaysLeft(f.premium_until);
    return d !== null && d <= 7;
  }).length;

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{activeFirms.length}</p>
                <p className="text-xs text-muted-foreground">Aktif Premium</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{urgentCount}</p>
                <p className="text-xs text-muted-foreground">7 Günde Bitiyor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{expiredFirms.length}</p>
                <p className="text-xs text-muted-foreground">Süresi Dolmuş (DB Güncel)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{firms.length}</p>
                <p className="text-xs text-muted-foreground">Toplam Premium Kayıt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toplu Gönder */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Premium Firmalar</h2>
          <p className="text-sm text-muted-foreground">Bitiş tarihine göre sıralanmış</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFirms}>
            <RefreshCw className="h-4 w-4 mr-1" /> Yenile
          </Button>
          {urgentCount > 0 && (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={sendAllReminders}
              disabled={sendingAll}
            >
              <Mail className="h-4 w-4 mr-1" />
              {sendingAll ? "Gönderiliyor..." : `${urgentCount} Firmaya Hatırlatma Gönder`}
            </Button>
          )}
        </div>
      </div>

      {/* Aktif Premiumlar */}
      {activeFirms.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Firma</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">İl</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">E-posta</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Bitiş Tarihi</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Kalan Süre</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Hatırlatma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeFirms.map((firm) => {
                const daysLeft = getDaysLeft(firm.premium_until);
                const status = reminderStatus[firm.id];
                return (
                  <tr key={firm.id} className={`hover:bg-muted/50 ${daysLeft !== null && daysLeft <= 7 ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}`}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        {firm.company_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{firm.city}{firm.district ? ` / ${firm.district}` : ""}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{firm.email}</td>
                    <td className="px-4 py-3 text-foreground">
                      {firm.premium_until
                        ? new Date(firm.premium_until).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <PremiumBadge daysLeft={daysLeft} />
                    </td>
                    <td className="px-4 py-3">
                      {status === "sent" ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Gönderildi
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={status === "sending"}
                          onClick={() => sendReminder(firm)}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          {status === "sending" ? "..." : "Mail Gönder"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeFirms.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Crown className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aktif premium firma bulunamadı.</p>
          </CardContent>
        </Card>
      )}

      {/* Süresi Dolmuşlar (DB'de is_premium=true ama tarihi geçmiş - cron henüz çalışmamış) */}
      {expiredFirms.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Süresi Dolmuş (Cron Güncelleme Bekliyor)
          </h3>
          <div className="rounded-lg border border-destructive/30 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {expiredFirms.map((firm) => (
                  <tr key={firm.id} className="bg-red-50/30 dark:bg-red-950/10">
                    <td className="px-4 py-3 font-medium text-foreground">{firm.company_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{firm.city}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{firm.email}</td>
                    <td className="px-4 py-3">
                      <PremiumBadge daysLeft={getDaysLeft(firm.premium_until)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
