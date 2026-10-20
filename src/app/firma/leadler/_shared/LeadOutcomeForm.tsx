"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  OUTCOME_LABELS,
  REFUND_REASON_LABELS,
  REFUND_STATUS_LABELS,
  requestLeadRefund,
  saveLeadOutcome,
  type LeadOutcome,
  type LeadOutcomeInfo,
  type RefundReason,
} from "./leadHelpers";

const MAX_VALUE_TRY = 1_000_000_000;
const MAX_NOTE_LENGTH = 500;

interface LeadOutcomeFormProps {
  leadId: string;
  outcome: LeadOutcomeInfo | undefined;
  /** pending | approved | rejected; iade talebi yoksa undefined. */
  refundStatus: string | undefined;
  onChanged: () => void;
}

/** Satın alınan lead için sonuç bildirimi ve iade talebi. */
export function LeadOutcomeForm({ leadId, outcome, refundStatus, onChanged }: LeadOutcomeFormProps) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<LeadOutcome | "">(outcome?.outcome ?? "");
  const [value, setValue] = useState(outcome?.valueTry ? String(outcome.valueTry) : "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState<RefundReason>("wrong_number");
  const [note, setNote] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    setSelected(outcome?.outcome ?? "");
    setValue(outcome?.valueTry ? String(outcome.valueTry) : "");
    setNotice(null);
  }, [leadId, outcome?.outcome, outcome?.valueTry]);

  const parsedValue = value.trim() === "" ? null : Number(value);
  const valueInvalid =
    selected === "won" && parsedValue !== null && (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > MAX_VALUE_TRY);

  const handleSave = async () => {
    if (!selected || valueInvalid) return;
    setSaving(true);
    setNotice(null);
    try {
      const saved = await saveLeadOutcome(leadId, selected, selected === "won" ? parsedValue : null);
      if (!saved.ok) {
        toast({ title: "Hata", description: saved.message, variant: "destructive" });
        return;
      }

      if (selected === "not_reached") {
        const refund = await requestLeadRefund(leadId, "unreachable", null);
        setNotice(
          refund.ok
            ? "İade talebiniz alındı, incelenir."
            : `Sonucunuz kaydedildi. ${refund.message}`,
        );
      } else {
        setNotice("Sonucunuz kaydedildi.");
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    setRefunding(true);
    try {
      const refund = await requestLeadRefund(leadId, reason, note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : null);
      if (!refund.ok) {
        toast({ title: "İade talebi oluşturulamadı", description: refund.message, variant: "destructive" });
        return;
      }
      setNotice("İade talebiniz alındı, incelenir.");
      setRefundOpen(false);
      onChanged();
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="space-y-2">
        <Label htmlFor={`outcome-${leadId}`} className="text-sm text-muted-foreground">
          Sonuç
        </Label>
        <Select value={selected} onValueChange={(next) => setSelected(next as LeadOutcome)}>
          <SelectTrigger id={`outcome-${leadId}`} className="h-11">
            <SelectValue placeholder="Bu lead ile ne oldu?" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(OUTCOME_LABELS) as LeadOutcome[]).map((key) => (
              <SelectItem key={key} value={key}>
                {OUTCOME_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected === "won" && (
          <div className="space-y-1">
            <Label htmlFor={`outcome-value-${leadId}`} className="text-sm text-muted-foreground">
              Tahmini iş değeri (₺), isteğe bağlı
            </Label>
            <Input
              id={`outcome-value-${leadId}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_VALUE_TRY}
              step={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">Bu tutar sizin bildiriminizdir; Peyzajbul doğrulamaz.</p>
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="min-h-11"
          onClick={handleSave}
          disabled={saving || !selected || valueInvalid}
        >
          {saving ? "Kaydediliyor..." : "Sonucu kaydet"}
        </Button>
        {notice && (
          <p className="text-sm text-foreground" role="status">
            {notice}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {refundStatus ? (
          <p className="text-sm text-muted-foreground">{REFUND_STATUS_LABELS[refundStatus] ?? "İade talebi alındı"}</p>
        ) : refundOpen ? (
          <div className="space-y-2 rounded-md border border-border p-3">
            <Label htmlFor={`refund-reason-${leadId}`} className="text-sm text-muted-foreground">
              İade nedeni
            </Label>
            <Select value={reason} onValueChange={(next) => setReason(next as RefundReason)}>
              <SelectTrigger id={`refund-reason-${leadId}`} className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REFUND_REASON_LABELS) as RefundReason[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {REFUND_REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="Not (isteğe bağlı)"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => setRefundOpen(false)} disabled={refunding}>
                Vazgeç
              </Button>
              <Button size="sm" className="min-h-11" onClick={handleRefund} disabled={refunding}>
                {refunding ? "Gönderiliyor..." : "İade talebi gönder"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Talepler incelenir; onaylanırsa jetonlar hesabınıza iade edilir.</p>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="min-h-11 px-0 text-muted-foreground" onClick={() => setRefundOpen(true)}>
            Sorun mu var? İade talep et
          </Button>
        )}
      </div>
    </div>
  );
}
