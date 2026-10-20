"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2, MailCheck, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { track, trackOnce } from "@/lib/analytics";
import { LEAD_COPY, type LeadSource, type VerifyChannel } from "@/lib/leadFormData";
import { LeadApiError, resendOtp, verifyOtp, type VerifyResult } from "./leadApi";

const MAX_COUNTDOWN_SECONDS = 600;
const DEFAULT_RESEND_SECONDS = 60;

export interface VerifyPanelProps {
  leadId: string;
  statusToken?: string | null;
  channel: VerifyChannel;
  /** Masked destination for the instruction text; unknown on the status page. */
  destinationMasked?: string;
  /** Seconds until a new code may be requested (default 60). */
  resendAfterSec?: number;
  /** False when the lead was stored but the first code could not be delivered. */
  codeSent?: boolean;
  source: LeadSource;
  /** For the conversion event. */
  service: string;
  city: string;
  /** When the lead was submitted (ms since epoch), for seconds_since_submit. */
  submittedAt?: number;
  /** Runs before the code is checked (the wizard waits for pending photo uploads here). */
  beforeVerify?: () => Promise<void>;
  onVerified: (result: VerifyResult) => void;
  onChangeContact?: () => void;
  /** The wizard renders the submit button in its own footer and points it at this form. */
  showSubmit?: boolean;
  /** Focus the code input on mount (default). The status page turns this off so the page does not jump. */
  autoFocus?: boolean;
  formId?: string;
  onBusyChange?: (busy: boolean) => void;
}

const ERROR_COPY: Record<string, string> = {
  invalid_code: "Kod hatalı. Lütfen kontrol edip tekrar deneyin.",
  expired_code: "Kodun süresi doldu. Yeni kod isteyin.",
  locked: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
  rate_limited: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
  network: "Bağlantı hatası. Tekrar deneyin.",
  already_verified: "Bu talep zaten doğrulanmış. Durumu talep sayfasından görebilirsiniz.",
  unknown: "Bir sorun oluştu. Lütfen tekrar deneyin.",
};

function describeError(error: unknown): { reason: string; text: string; retryAfterSec?: number } {
  const apiError = error instanceof LeadApiError ? error : null;
  const reason = apiError?.code ?? "unknown";
  let text = ERROR_COPY[reason] ?? ERROR_COPY.unknown;
  if (reason === "invalid_code" && apiError?.attemptsLeft !== undefined) {
    text = apiError.attemptsLeft > 0 ? `Kod hatalı. ${apiError.attemptsLeft} deneme hakkınız kaldı.` : "Kod hatalı. Yeni kod isteyin.";
  }
  return { reason, text, retryAfterSec: apiError?.retryAfterSec };
}

/** Code entry after submit. Shared by the wizard and the status page (recovery for visitors who left early). */
export default function VerifyPanel({
  leadId,
  statusToken = null,
  channel,
  destinationMasked,
  resendAfterSec = DEFAULT_RESEND_SECONDS,
  codeSent = true,
  source,
  service,
  city,
  submittedAt,
  beforeVerify,
  onVerified,
  onChangeContact,
  showSubmit = true,
  autoFocus = true,
  formId = "lead-verify-form",
  onBusyChange,
}: VerifyPanelProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(resendAfterSec);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(
    codeSent ? null : { tone: "error", text: "Talebiniz kaydedildi ancak doğrulama kodu gönderilemedi. Aşağıdan yeni kod isteyebilirsiniz." },
  );
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const counting = secondsLeft > 0;

  // One interval for the whole countdown; it clears itself when the countdown reaches zero.
  useEffect(() => {
    if (!counting) return;
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [counting]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const submit = async (value: string) => {
    if (busyRef.current) return;
    if (value.length !== 6) {
      setMessage({ tone: "error", text: "Lütfen 6 haneli kodu girin." });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await beforeVerify?.();
      const result = await verifyOtp({ leadId, code: value });
      const secondsSinceSubmit = submittedAt ? Math.max(0, Math.round((Date.now() - submittedAt) / 1000)) : 0;
      trackOnce(
        `lead_verified:${leadId}`,
        "lead_verified",
        { source, service, city, seconds_since_submit: secondsSinceSubmit },
        { leadId },
      );
      onVerified({ ...result, statusToken: result.statusToken ?? statusToken });
    } catch (error) {
      const { reason, text } = describeError(error);
      track("lead_otp_failed", { reason });
      setMessage({ tone: "error", text });
      setCode("");
      inputRef.current?.focus();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (resending || counting) return;
    setResending(true);
    setMessage(null);
    try {
      const { resendAfterSec: next } = await resendOtp({ leadId });
      track("lead_otp_sent", { channel, resend: true });
      setSecondsLeft(Math.min(next, MAX_COUNTDOWN_SECONDS));
      setCode("");
      setMessage({ tone: "info", text: "Yeni kod gönderildi." });
    } catch (error) {
      const { reason, text, retryAfterSec } = describeError(error);
      track("lead_otp_failed", { reason });
      if (reason === "already_verified") {
        onVerified({ statusToken, session: null, routing: null, alreadyVerified: true });
        return;
      }
      if (retryAfterSec) setSecondsLeft(Math.min(Math.ceil(retryAfterSec), MAX_COUNTDOWN_SECONDS));
      setMessage({ tone: "error", text });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(code);
  };

  const Icon = channel === "email" ? MailCheck : MessageSquareText;

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 data-step-heading tabIndex={-1} className="font-heading text-xl font-semibold text-foreground outline-none">
          {LEAD_COPY.verifyTitle[channel]}
        </h2>
        <p className="text-sm text-muted-foreground">
          {destinationMasked ? (
            <>
              <strong className="font-semibold text-foreground">{destinationMasked}</strong> {LEAD_COPY.verifyHint[channel]}
            </>
          ) : (
            LEAD_COPY.verifyHintUnknown[channel]
          )}
        </p>
      </div>

      {/* input-otp lays an invisible input wider than the slots over them: clip it so it cannot cause sideways scrolling. */}
      <div className="flex justify-center overflow-hidden p-1">
        <InputOTP
          ref={inputRef}
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={code}
          onChange={(value) => {
            setCode(value.replace(/\D/g, ""));
            setMessage(null);
          }}
          onComplete={(value) => void submit(value)}
          autoComplete="one-time-code"
          inputMode="numeric"
          autoFocus={autoFocus}
          aria-label="6 haneli doğrulama kodu"
          containerClassName="gap-1.5 sm:gap-2"
        >
          <InputOTPGroup className="gap-1.5 sm:gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} className="h-12 w-10 rounded-md border text-lg font-semibold sm:w-11" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div aria-live="polite" className="min-h-5 text-center text-sm">
        {message && <p className={message.tone === "error" ? "text-destructive" : "text-muted-foreground"}>{message.text}</p>}
      </div>

      {showSubmit && (
        <Button type="submit" variant="gold" data-lead-primary disabled={busy} className="w-full">
          {busy && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
          {busy ? "Doğrulanıyor…" : "Doğrula"}
        </Button>
      )}

      <div className="flex flex-col items-center gap-1 text-sm">
        {counting ? (
          <p className="flex min-h-11 items-center text-muted-foreground">Yeni kod için {secondsLeft} sn bekleyin.</p>
        ) : (
          <Button type="button" variant="ghost" onClick={handleResend} disabled={resending} className="min-h-11">
            {resending && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
            Kodu tekrar gönder
          </Button>
        )}
        {onChangeContact && (
          <button
            type="button"
            onClick={onChangeContact}
            className="min-h-11 rounded-lg px-3 font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LEAD_COPY.changeContact[channel]}
          </button>
        )}
        {channel === "email" && (
          <p className="text-center text-xs text-muted-foreground">Kod gelmediyse gereksiz (spam) klasörünüzü de kontrol edin.</p>
        )}
      </div>
    </form>
  );
}
