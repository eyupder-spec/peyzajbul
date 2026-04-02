import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, XCircle, UserX, Building2, Mail, Calendar } from "lucide-react";

type DeletionRequest = {
  id: string;
  user_id: string;
  email: string;
  company_name: string | null;
  status: string;
  created_at: string;
};

const AdminDeletionTab = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadRequests = async () => {
    const { data } = await (supabase
      .from("account_deletion_requests" as any)
      .select("*") as any)
      .order("created_at", { ascending: false });

    if (data) {
      setRequests(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (requestId: string, userId: string, action: "approve" | "reject") => {
    setProcessing(requestId);
    try {
      if (action === "approve") {
        // 1. Firmayı sil
        const { error: firmErr } = await supabase.from("firms").delete().eq("user_id", userId);
        if (firmErr) throw firmErr;

        // 2. Rolleri sil
        const { error: roleErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
        if (roleErr) throw roleErr;

        // 3. Talebi tamamlandı yap
        await (supabase.from("account_deletion_requests" as any).update({ 
          status: "completed",
          confirmed_at: new Date().toISOString()
        } as any) as any).eq("id", requestId);

        toast({ title: "Hesap Silindi", description: "Firma ve roller başarıyla temizlendi." });
      } else {
        // Talebi reddet ve firmayı tekrar aktif yap (opsiyonel)
        await supabase.from("firms").update({ is_active: true } as any).eq("user_id", userId);
        await (supabase.from("account_deletion_requests" as any).update({ status: "rejected" } as any) as any).eq("id", requestId);
        
        toast({ title: "Talep Reddedildi", description: "Kullanıcı talebi reddedildi ve firma aktif edildi." });
      }

      loadRequests();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <p className="text-muted-foreground p-8">Yükleniyor...</p>;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <UserX className="h-6 w-6 text-destructive" />
          Hesap Silme Talepleri
        </h2>
        <Badge variant="outline" className="text-xs">
          Toplam {requests.length} Talep
        </Badge>
      </div>

      {pendingRequests.length > 0 ? (
        <div className="grid gap-4">
          {pendingRequests.map((req) => (
            <Card key={req.id} className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-destructive" />
                      <span className="font-bold text-lg">{req.company_name || "İsimsiz Firma"}</span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {req.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> {new Date(req.created_at).toLocaleString("tr-TR")}
                      </div>
                    </div>
                    <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/10 text-xs text-destructive font-medium uppercase tracking-wider">
                      SİLME TALEBİ BEKLEMEDE
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 shrink-0">
                    <Button 
                      variant="destructive"
                      onClick={() => handleAction(req.id, req.user_id, "approve")}
                      disabled={!!processing}
                    >
                      {processing === req.id ? "Siliniyor..." : "Hesabı Kalıcı Sil"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleAction(req.id, req.user_id, "reject")}
                      disabled={!!processing}
                    >
                      Reddet / Geri Al
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border">
          <UserX className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Şu an bekleyen hesap silme talebi bulunmuyor.</p>
        </div>
      )}

      {processedRequests.length > 0 && (
        <div className="pt-8 space-y-4">
          <h3 className="font-heading font-bold text-lg">Geçmiş Talepler</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Firma / Email</th>
                  <th className="text-left p-3">Tarih</th>
                  <th className="text-left p-3">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {processedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-medium">{req.company_name}</div>
                      <div className="text-xs text-muted-foreground">{req.email}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="p-3">
                      <Badge variant={req.status === "completed" ? "destructive" : "outline"}>
                        {req.status === "completed" ? "Silindi" : "Reddedildi"}
                      </Badge>
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
};

export default AdminDeletionTab;
