import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, FileText, Building2, MessageCircle, Undo2, Gift, Copy, X } from "lucide-react";
import AdminOutreachTab from "@/components/admin/AdminOutreachTab";
import { buildWaLink } from "@/lib/outreachTemplates";

type ClaimRequest = {
  id: string;
  firm_id: string;
  user_id: string;
  status: string;
  phone: string;
  email?: string | null;
  note: string | null;
  created_at: string;
  // Added by 20261021120000_claim_schema.sql; absent on a database that has not applied it yet.
  kind?: string | null;
  verification_method?: string | null;
  email_verified_at?: string | null;
  whatsapp_code?: string | null;
  credit_granted_at?: string | null;
  approved_at?: string | null;
};

type FirmInfo = {
  id: string;
  company_name: string;
  city: string;
  phone: string;
  website: string | null;
  description: string | null;
  services: string[] | null;
  slug: string | null;
  is_approved: boolean;
};

type ClaimAction = "approve" | "reject" | "revoke" | "grant_credit";

type CreditResult = { granted: boolean; amount: number; reason?: string };

type ApproveResponse = {
  success: boolean;
  status?: string;
  credit?: CreditResult;
  whatsapp_text?: string;
  email_sent?: boolean;
  owner_restored?: boolean;
};

type ApprovalCard = {
  claimId: string;
  firmName: string;
  firmPhone: string | null;
  whatsappText: string;
  emailSent: boolean;
  credit: CreditResult | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Oturumunuz geçersiz. Sayfayı yenileyip tekrar giriş yapın.",
  forbidden: "Bu işlem için yönetici yetkisi gerekiyor.",
  invalid_request: "İstek geçersiz.",
  claim_not_found: "Talep bulunamadı.",
  claim_not_pending: "Talep artık beklemede değil.",
  claim_not_approved: "Yalnızca onaylanmış talepler için geçerli.",
  email_not_verified: "E-posta doğrulanmadan onaylanamaz.",
  already_claimed: "Bu firma zaten sahiplenilmiş.",
  user_has_firm: "Bu kullanıcı zaten başka bir firmaya bağlı.",
  firm_not_found: "Firma bulunamadı.",
  credit_already_granted: "Kredi zaten tanımlanmış.",
  internal: "Sunucu hatası. Lütfen tekrar deneyin.",
};

const CREDIT_REASONS: Record<string, string> = {
  disabled: "Kredi kapalı (CLAIM_FIRST_LEAD_CREDIT=0).",
  already_granted: "Bu firmaya kredi daha önce tanımlanmış.",
  rpc_missing: "Kredi fonksiyonu veritabanında henüz yok.",
  rpc_error: "Kredi tanımlanamadı.",
};

/** supabase-js reports a non-2xx answer as an error whose `context` is the Response; the body carries the error code. */
async function readFnError(err: unknown): Promise<string> {
  const context = (err as { context?: unknown } | null)?.context;
  if (context && typeof (context as { json?: unknown }).json === "function") {
    try {
      const body: unknown = await (context as { json: () => Promise<unknown> }).json();
      const code = (body as { error?: unknown } | null)?.error;
      if (typeof code === "string") return ERROR_MESSAGES[code] ?? code;
    } catch {
      // Not JSON: fall through to the generic message.
    }
  }
  return err instanceof Error && err.message ? err.message : "İşlem tamamlanamadı.";
}

async function callApproveClaim(claimId: string, action: ClaimAction): Promise<ApproveResponse> {
  const { data, error } = await supabase.functions.invoke("approve-claim", { body: { claim_id: claimId, action } });
  if (error) throw new Error(await readFnError(error));
  return data as ApproveResponse;
}

const isApprovable = (claim: ClaimRequest) =>
  Boolean(claim.email_verified_at) || (claim.verification_method ?? "manual") === "manual";

function methodLabel(claim: ClaimRequest): string {
  if (claim.kind === "register") return "Yeni firma başvurusu";
  if (claim.verification_method === "firm_email") return "E-posta ile doğrulandı";
  if (claim.verification_method === "whatsapp") return `WhatsApp kodu: ${claim.whatsapp_code ?? "-"}`;
  return "Eski talep";
}

const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "");

const STATUS_LABELS: Record<string, string> = {
  approved: "Onaylandı",
  rejected: "Reddedildi",
  revoked: "Geri alındı",
};

const ClaimRequestsPanel = () => {
  const { toast } = useToast();
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [firms, setFirms] = useState<Record<string, FirmInfo>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<ApprovalCard[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<ClaimRequest | null>(null);

  const loadClaims = useCallback(async () => {
    const { data, error } = await supabase
      .from("claim_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Talepler yüklenemedi", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const list = (data ?? []) as unknown as ClaimRequest[];
    setClaims(list);

    const firmIds = [...new Set(list.map((c) => c.firm_id))];
    if (firmIds.length > 0) {
      const { data: firmsData, error: firmsError } = await supabase
        .from("firms")
        .select("id, company_name, city, phone, website, description, services, slug, is_approved")
        .in("id", firmIds);
      if (firmsError) {
        toast({ title: "Firma bilgileri yüklenemedi", description: firmsError.message, variant: "destructive" });
      } else {
        const map: Record<string, FirmInfo> = {};
        (firmsData ?? []).forEach((f) => (map[f.id] = f as FirmInfo));
        setFirms(map);
      }
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const pendingClaims = useMemo(() => claims.filter((c) => c.status === "pending"), [claims]);
  const processedClaims = useMemo(() => claims.filter((c) => c.status !== "pending"), [claims]);
  const rivalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingClaims.forEach((c) => (counts[c.firm_id] = (counts[c.firm_id] ?? 0) + 1));
    return counts;
  }, [pendingClaims]);

  const fail = (err: unknown) =>
    toast({
      title: "Hata",
      description: err instanceof Error ? err.message : "İşlem tamamlanamadı.",
      variant: "destructive",
    });

  const handleAction = async (claim: ClaimRequest, action: "approve" | "reject") => {
    setProcessing(claim.id);
    try {
      const result = await callApproveClaim(claim.id, action);
      if (action === "approve") {
        const firm = firms[claim.firm_id];
        setApprovals((current) => [
          {
            claimId: claim.id,
            firmName: firm?.company_name ?? "Firma",
            firmPhone: firm?.phone ?? null,
            whatsappText: result.whatsapp_text ?? "",
            emailSent: result.email_sent === true,
            credit: result.credit ?? null,
          },
          ...current,
        ]);
        toast({ title: "Talep onaylandı!", description: "Firma sahipliği devredildi ve firma rolü atandı." });
      } else {
        toast({ title: "Talep reddedildi", description: "Sahiplenme talebi reddedildi." });
      }
      await loadClaims();
    } catch (err) {
      fail(err);
    } finally {
      setProcessing(null);
    }
  };

  const retryCredit = async (claimId: string) => {
    setProcessing(claimId);
    try {
      const result = await callApproveClaim(claimId, "grant_credit");
      const credit = result.credit ?? null;
      setApprovals((current) => current.map((card) => (card.claimId === claimId ? { ...card, credit } : card)));
      toast({
        title: credit?.granted ? "Jeton tanımlandı" : "Jeton tanımlanamadı",
        description: credit && !credit.granted ? (CREDIT_REASONS[credit.reason ?? ""] ?? undefined) : undefined,
        variant: credit?.granted ? undefined : "destructive",
      });
      await loadClaims();
    } catch (err) {
      fail(err);
    } finally {
      setProcessing(null);
    }
  };

  const confirmRevoke = async () => {
    const claim = revokeTarget;
    setRevokeTarget(null);
    if (!claim) return;
    setProcessing(claim.id);
    try {
      const result = await callApproveClaim(claim.id, "revoke");
      toast({
        title: "Sahiplik geri alındı",
        description: result.owner_restored
          ? "Firma önceki sahibine döndü ve firma rolü kaldırıldı."
          : "Firma sahiplenmemiş duruma döndü; önceki sahip kayıtlı olmadığı için sahibi elle kontrol edin.",
      });
      await loadClaims();
    } catch (err) {
      fail(err);
    } finally {
      setProcessing(null);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Metin kopyalandı" });
    } catch {
      toast({ title: "Kopyalanamadı", variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Yükleniyor...</p>;
  }

  const creditBadge = (claim: ClaimRequest) =>
    claim.credit_granted_at ? (
      <Badge variant="secondary">Jeton tanımlandı</Badge>
    ) : (
      <Badge variant="outline">Kredi bekliyor</Badge>
    );

  return (
    <div className="space-y-6">
      {approvals.length > 0 && (
        <div className="space-y-3">
          {approvals.map((card) => {
            const waLink = card.whatsappText ? buildWaLink(card.firmPhone, card.whatsappText) : null;
            return (
              <Card key={card.claimId} className="border-verified/40 bg-verified/5">
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foreground">
                      <CheckCircle className="mr-1 inline h-4 w-4 text-verified" aria-hidden="true" />
                      {card.firmName} onaylandı
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Kartı kapat"
                      onClick={() => setApprovals((current) => current.filter((c) => c.claimId !== card.claimId))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">{card.emailSent ? "Onay e-postası gönderildi" : "E-posta gönderilemedi"}</Badge>
                    {card.credit?.granted ? (
                      <Badge variant="secondary">Jeton tanımlandı</Badge>
                    ) : (
                      <>
                        <Badge variant="outline">Kredi bekliyor</Badge>
                        {card.credit?.reason && (
                          <span className="text-muted-foreground">{CREDIT_REASONS[card.credit.reason] ?? card.credit.reason}</span>
                        )}
                        <Button size="sm" variant="outline" onClick={() => retryCredit(card.claimId)} disabled={processing === card.claimId}>
                          <Gift className="mr-1 h-4 w-4" aria-hidden="true" /> Krediyi tanımla
                        </Button>
                      </>
                    )}
                  </div>
                  {card.whatsappText && (
                    <div className="flex flex-wrap gap-2">
                      {waLink ? (
                        <Button size="sm" asChild>
                          <a href={waLink} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="mr-1 h-4 w-4" aria-hidden="true" /> WhatsApp ile haber ver
                          </a>
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">Firma telefonu cep numarası değil; mesajı elle iletin.</p>
                      )}
                      <Button size="sm" variant="outline" onClick={() => copyText(card.whatsappText)}>
                        <Copy className="mr-1 h-4 w-4" aria-hidden="true" /> Mesajı kopyala
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
              const rivals = rivalCounts[claim.firm_id] ?? 0;
              const approvable = isApprovable(claim);
              const chat = firm ? buildWaLink(firm.phone, "") : null;
              const typedPhoneDiffers =
                firm && claim.phone.replace(/\D/g, "").slice(-10) !== firm.phone.replace(/\D/g, "").slice(-10);

              return (
                <Card key={claim.id} className="border-accent/30 bg-accent/5">
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground text-lg">
                          {firm?.company_name || "Bilinmeyen Firma"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {firm?.city || "?"} · Tarih: {formatDate(claim.created_at)}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={approvable ? "secondary" : "outline"}>{methodLabel(claim)}</Badge>
                          {rivals > 1 && <Badge variant="destructive">Rakip talep ({rivals})</Badge>}
                        </div>

                        <p className="text-sm text-muted-foreground">Firma tel: {firm?.phone || "?"}</p>
                        {typedPhoneDiffers && (
                          <p className="text-sm text-muted-foreground">
                            Başvuruda yazılan telefon: <span className="text-foreground">{claim.phone}</span>
                          </p>
                        )}

                        {claim.email && (
                          <p className="text-sm text-muted-foreground">
                            E-posta: <span className="text-foreground">{claim.email}</span>
                            {claim.email_verified_at ? " (doğrulandı)" : ""}
                          </p>
                        )}

                        {claim.verification_method === "whatsapp" && (
                          <p className="text-sm text-muted-foreground">
                            Kodu WhatsApp Business&apos;ta arayın ve gönderen numarayı firma telefonuyla karşılaştırın.
                          </p>
                        )}

                        {claim.kind === "register" && firm && (
                          <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground space-y-1">
                            {firm.website && <p>Web: <span className="text-foreground">{firm.website}</span></p>}
                            {(firm.services?.length ?? 0) > 0 && (
                              <p>Hizmetler: <span className="text-foreground">{firm.services?.join(", ")}</span></p>
                            )}
                            {firm.description && <p className="text-foreground">{firm.description.slice(0, 240)}</p>}
                          </div>
                        )}

                        {claim.note && (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-muted-foreground">{claim.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        {chat && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={chat} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-4 w-4 mr-1" aria-hidden="true" /> WhatsApp&apos;ta aç
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleAction(claim, "approve")}
                          disabled={processing === claim.id || !approvable}
                          title={approvable ? undefined : "E-posta doğrulanmadan onaylanamaz"}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(claim, "reject")}
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
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Yöntem</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tarih</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Onay tarihi</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Durum</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Kredi</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {processedClaims.map((claim) => {
                  const firm = firms[claim.firm_id];
                  const approved = claim.status === "approved";
                  return (
                    <tr key={claim.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2 text-foreground font-medium">
                        {firm?.company_name || "?"}
                      </td>
                      <td className="px-3 py-2 text-foreground">{methodLabel(claim)}</td>
                      <td className="px-3 py-2 text-foreground">{formatDate(claim.created_at)}</td>
                      <td className="px-3 py-2 text-foreground">{formatDate(claim.approved_at) || "-"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={approved ? "default" : claim.status === "revoked" ? "secondary" : "destructive"}>
                          {STATUS_LABELS[claim.status] ?? claim.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {approved ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {creditBadge(claim)}
                            {!claim.credit_granted_at && (
                              <Button size="sm" variant="outline" onClick={() => retryCredit(claim.id)} disabled={processing === claim.id}>
                                Krediyi tanımla
                              </Button>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {approved && (
                          <Button size="sm" variant="outline" onClick={() => setRevokeTarget(claim)} disabled={processing === claim.id}>
                            <Undo2 className="h-4 w-4 mr-1" aria-hidden="true" /> Sahipliği geri al
                          </Button>
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

      <AlertDialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {revokeTarget ? firms[revokeTarget.firm_id]?.company_name ?? "Firma" : "Firma"} sahipliği geri alınsın mı?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Firma önceki sahibine döner ve talep sahibinin firma rolü, başka firması yoksa kaldırılır. Verilmiş jetonlar geri alınmaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke}>Sahipliği geri al</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AdminClaimTab = () => (
  <Tabs defaultValue="claims" className="space-y-4">
    <TabsList>
      <TabsTrigger value="claims">Talepler</TabsTrigger>
      <TabsTrigger value="outreach">Outreach kuyruğu</TabsTrigger>
    </TabsList>
    <TabsContent value="claims">
      <ClaimRequestsPanel />
    </TabsContent>
    <TabsContent value="outreach">
      <AdminOutreachTab />
    </TabsContent>
  </Tabs>
);

export default AdminClaimTab;
