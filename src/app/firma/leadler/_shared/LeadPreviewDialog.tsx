"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getScoreBadge, getScoreBreakdown } from "@/lib/leadScoring";
import {
  AREA_LABELS,
  BUDGET_LABELS,
  CONDITION_LABELS,
  IRRIGATION_SYSTEM_LABELS,
  IRRIGATION_TYPE_LABELS,
  PROJECT_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  SERVICE_LABELS,
  TIMELINE_LABELS,
  WATER_SOURCE_LABELS,
  getLeadLabel,
} from "@/lib/formatLead";
import { LeadOutcomeForm } from "./LeadOutcomeForm";
import { LeadPriceButton } from "./LeadPriceButton";
import { getFomoMessage, resolveLeadPhotoUrls, type Lead, type LeadOutcomeInfo } from "./leadHelpers";

interface LeadPreviewDialogProps {
  lead: Lead | null;
  /** Oturumdaki firmanın firms.id değeri ('Size özel' rozeti için). */
  firmId: string;
  isPurchased: boolean;
  /** null = sayı bilinmiyor; FOMO satırı gösterilmez. */
  purchaseCount: number | null;
  purchasing: boolean;
  outcome?: LeadOutcomeInfo;
  refundStatus?: string;
  /** Gerçek olmayan örnek talep (rehber turu): satın alma yok, sonuç formu yok. */
  demo?: boolean;
  onClose: () => void;
  onBuy: (lead: Lead) => void;
  onChanged: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{children}</p>
    </div>
  );
}

/** Panel ve lead listesinin ortak lead önizleme/inceleme penceresi. */
export function LeadPreviewDialog({
  lead,
  firmId,
  isPurchased,
  purchaseCount,
  purchasing,
  outcome,
  refundStatus,
  demo = false,
  onClose,
  onBuy,
  onChanged,
}: LeadPreviewDialogProps) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Yollar yeniden yüklemede yeni dizi olarak gelir; imzalı adresler yalnızca içerik değişince yenilenir.
  const photoKey = (lead?.photo_urls ?? []).join("|");
  useEffect(() => {
    let cancelled = false;
    if (!photoKey) {
      setPhotoUrls([]);
      return;
    }
    void resolveLeadPhotoUrls(photoKey.split("|")).then((urls) => {
      if (!cancelled) setPhotoUrls(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [photoKey]);

  const score = getScoreBadge(lead?.lead_score ?? null);
  const fomo = purchaseCount !== null && !isPurchased && !demo ? getFomoMessage(purchaseCount) : null;

  return (
    <>
      <Dialog open={!!lead} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Lead Önizleme
              {demo && <Badge variant="outline">Örnek</Badge>}
            </DialogTitle>
            <DialogDescription className="sr-only">Müşteri talebinin detaylarını ve skorunu inceleyin.</DialogDescription>
          </DialogHeader>

          {lead && (
            <div className="space-y-4">
              {((lead.target_firm_id && lead.target_firm_id === firmId) || lead.phone_verified === true) && (
                <div className="flex flex-wrap gap-2">
                  {lead.target_firm_id && lead.target_firm_id === firmId && <Badge variant="outline">Size özel</Badge>}
                  {lead.phone_verified === true && <Badge variant="outline">Telefon doğrulandı</Badge>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Proje Türü">{getLeadLabel(PROJECT_TYPE_LABELS, lead.project_type)}</Field>
                <Field label="Hizmet Türü">{getLeadLabel(SERVICE_LABELS, lead.service_type)}</Field>
                <Field label="Mülk Tipi">{getLeadLabel(PROPERTY_TYPE_LABELS, lead.property_type)}</Field>
                <Field label="Alan Büyüklüğü">{getLeadLabel(AREA_LABELS, lead.project_size)}</Field>
                <Field label="Mevcut Durum">{getLeadLabel(CONDITION_LABELS, lead.current_condition)}</Field>
                <Field label="Bütçe">{getLeadLabel(BUDGET_LABELS, lead.budget)}</Field>
                <Field label="Zaman Çizelgesi">{getLeadLabel(TIMELINE_LABELS, lead.timeline)}</Field>
                <Field label="Konum">{lead.district ? `${lead.city}, ${lead.district}` : lead.city}</Field>

                {lead.service_type === "sulama-sistemi" && (
                  <>
                    <Field label="Sulama Türü">{getLeadLabel(IRRIGATION_TYPE_LABELS, lead.irrigation_type)}</Field>
                    <Field label="Sulama Sistemi">{getLeadLabel(IRRIGATION_SYSTEM_LABELS, lead.irrigation_system)}</Field>
                    <Field label="Su Kaynağı">{getLeadLabel(WATER_SOURCE_LABELS, lead.water_source)}</Field>
                  </>
                )}

                {lead.scope && lead.scope.length > 0 && (
                  <div className="col-span-2">
                    <Field label="Kapsam">{lead.scope.map((s) => s.replace(/-/g, " ")).join(", ")}</Field>
                  </div>
                )}

                {lead.notes && (
                  <div className="col-span-2">
                    <Field label="Notlar">{lead.notes}</Field>
                  </div>
                )}

                {photoUrls.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2">Görseller</p>
                    <div className="flex gap-2 flex-wrap">
                      {photoUrls.map((url, i) => (
                        <button
                          type="button"
                          key={url}
                          onClick={() => setSelectedPhoto(url)}
                          className="block overflow-hidden rounded-md border border-border transition-opacity duration-150 hover:opacity-80"
                          aria-label={`Görsel ${i + 1}`}
                        >
                          <img src={url} alt={`Görsel ${i + 1}`} className="w-24 h-24 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {isPurchased ? "İletişim Bilgileri" : "İletişim Bilgileri (lead açılınca görünür)"}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ad Soyad">{lead.full_name}</Field>
                  <Field label="Telefon">{lead.phone}</Field>
                  {lead.address && (
                    <div className="col-span-2">
                      <Field label="Adres">{lead.address}</Field>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Lead Skoru:</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-help ${score.className}`}>
                      {score.emoji} {lead.lead_score || 0} — {score.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {getScoreBreakdown(lead).map((item) => (
                      <div key={item.label} className="flex justify-between text-xs gap-4">
                        <span>{item.label}</span>
                        <span className="font-mono">+{item.points}</span>
                      </div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </div>

              {fomo && <div className={`rounded border px-3 py-2 text-sm font-medium ${fomo.className}`}>{fomo.text}</div>}

              {isPurchased && !demo && (
                <LeadOutcomeForm leadId={lead.id} outcome={outcome} refundStatus={refundStatus} onChanged={onChanged} />
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="min-h-11" onClick={onClose}>
              Kapat
            </Button>
            {lead && !isPurchased && !demo && (
              <LeadPriceButton
                lead={lead}
                purchaseCount={purchaseCount}
                busy={purchasing}
                onBuy={onBuy}
                variant="accent"
                prefix="Lead Aç: "
              />
            )}
            {lead && isPurchased && (
              <Button asChild className="min-h-11">
                <a href={`tel:${lead.phone}`}>
                  <Phone className="h-4 w-4" /> Hemen Ara
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none flex justify-center items-center [&>button]:text-white [&>button]:bg-black/50 hover:[&>button]:bg-black/70 [&>button]:rounded-full [&>button]:p-2 max-h-[95vh] w-[95vw]">
          <DialogTitle className="sr-only">Görsel İnceleme</DialogTitle>
          <DialogDescription className="sr-only">Büyütülmüş fotoğraf görünümü.</DialogDescription>
          {selectedPhoto && <img src={selectedPhoto} alt="Detaylı Görsel" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-lift" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
