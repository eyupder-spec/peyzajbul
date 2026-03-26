import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Phone, FileText, Building2 } from "lucide-react";

type ClaimRequest = {
  id: string;
  firm_id: string;
  user_id: string;
  status: string;
  phone: string;
  email?: string | null;
  note: string | null;
  created_at: string;
};

type FirmInfo = {
  id: string;
  company_name: string;
  city: string;
  phone: string;
  tax_number: string | null;
};

const AdminClaimTab = () => {
  const { toast } = useToast();
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [firms, setFirms] = useState<Record<string, FirmInfo>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadClaims = async () => {
    const { data } = await supabase
      .from("claim_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setClaims(data);
      // Load related firms
      const firmIds = [...new Set(data.map((c) => c.firm_id))];
      if (firmIds.length > 0) {
        const { data: firmsData } = await supabase
          .from("firms")
          .select("id, company_name, city, phone, tax_number")
          .in("id", firmIds);
        if (firmsData) {
          const map: Record<string, FirmInfo> = {};
          firmsData.forEach((f) => (map[f.id] = f));
          setFirms(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleAction = async (claimId: string, action: "approve" | "reject") => {
    setProcessing(claimId);
    try {
      const { data, error } = await supabase.functions.invoke("approve-claim", {
        body: { claim_id: claimId, action },
      });

      if (error) throw error;

      toast({
        title: action === "approve" ? "Talep onaylandı!" : "Talep reddedildi",
        description:
          action === "approve"
            ? "Firma sahipliği devredildi ve firma rolü atandı."
            : "Sahiplenme talebi reddedildi.",
      });

      loadClaims();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Yükleniyor...</p>;
  }

  const pendingClaims = claims.filter((c) => c.status === "pending");
  const processedClaims = claims.filter((c) => c.status !== "pending");

  return (
    <div className="space-y-6">
      {pendingClaims.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Bekleyen Talepler
            <Badge variant="destructive">{pendingClaims.length}</Badge>
          </h3>
          <div className="grid gap-4">
            {pendingClaims.map((claim) => {
              const firm = firms[claim.firm_id];
              const phoneMatch =
                firm && claim.phone.replace(/\D/g, "") === firm.phone.replace(/\D/g, "");

              return (
                <Card key={claim.id} className="border-accent/30 bg-accent/5">
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground text-lg">
                          {firm?.company_name || "Bilinmeyen Firma"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          📍 {firm?.city || "?"} · Tarih:{" "}
                          {new Date(claim.created_at).toLocaleDateString("tr-TR")}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">Talep: {claim.phone}</span>
                            {phoneMatch ? (
                              <Badge className="bg-green-500/10 text-green-600 text-xs">Eşleşiyor ✓</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Eşleşmiyor ✗</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            Firma Tel: {firm?.phone || "?"}
                          </div>
                        </div>

                        {claim.email && (
                          <p className="text-sm text-muted-foreground">
                            E-posta: <span className="text-foreground">{claim.email}</span>
                          </p>
                        )}

                        {claim.note && (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-muted-foreground">{claim.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleAction(claim.id, "approve")}
                          disabled={processing === claim.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(claim.id, "reject")}
                          disabled={processing === claim.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reddet
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pendingClaims.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Bekleyen sahiplenme talebi bulunmuyor.
        </div>
      )}

      {processedClaims.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">İşlenen Talepler</h3>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Firma</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Telefon</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tarih</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {processedClaims.map((claim) => {
                  const firm = firms[claim.firm_id];
                  return (
                    <tr key={claim.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2 text-foreground font-medium">
                        {firm?.company_name || "?"}
                      </td>
                      <td className="px-3 py-2 text-foreground">{claim.phone}</td>
                      <td className="px-3 py-2 text-foreground">
                        {new Date(claim.created_at).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={claim.status === "approved" ? "default" : "destructive"}>
                          {claim.status === "approved" ? "Onaylandı" : "Reddedildi"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClaimTab;

