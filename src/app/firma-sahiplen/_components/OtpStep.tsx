"use client";

import { useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface OtpStepProps {
  /** Masked address the code went to. */
  hint: string | null;
  /** When the last code was sent (ms since epoch); a new value restarts the resend countdown. */
  sentAt: number;
  /** Seconds the user has to wait before asking for another code. */
  resendAfter: number;
  busy: boolean;
  /** Message of the last failed attempt; the input is cleared when it changes. */
  error: string | null;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack?: () => void;
  backLabel?: string;
}

const CODE_LENGTH = 6;

/** Six slot one-time code entry with auto-submit on the last digit and a resend countdown. */
const OtpStep = ({ hint, sentAt, resendAfter, busy, error, onSubmit, onResend, onBack, backLabel }: OtpStepProps) => {
  const [value, setValue] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const secondsLeft = Math.max(0, Math.ceil(resendAfter - Math.max(0, now - sentAt) / 1000));

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (error) setValue("");
  }, [error]);

  const submit = (code: string) => {
    if (!busy && code.length === CODE_LENGTH) onSubmit(code);
  };

  return (
    <div className="space-y-5">
      {hint && (
        <p className="text-sm text-muted-foreground">
          Kod <span className="font-medium text-foreground">{hint}</span> adresine gönderildi. 10 dakika geçerlidir.
        </p>
      )}

      <div className="flex justify-center">
        <InputOTP
          maxLength={CODE_LENGTH}
          value={value}
          onChange={setValue}
          onComplete={submit}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={REGEXP_ONLY_DIGITS}
          disabled={busy}
          autoFocus
          aria-label="6 haneli doğrulama kodu"
        >
          <InputOTPGroup className="gap-2">
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <InputOTPSlot key={index} index={index} className="h-12 w-11 rounded-md border text-lg" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="min-h-6 text-center" aria-live="polite">
        {busy ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> Doğrulanıyor
          </span>
        ) : (
          error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button type="button" variant="ghost" onClick={onResend} disabled={busy || secondsLeft > 0}>
          {secondsLeft > 0 ? `Yeni kod iste (${secondsLeft} sn)` : "Yeni kod iste"}
        </Button>
        {onBack && (
          <Button type="button" variant="link" onClick={onBack} disabled={busy}>
            {backLabel ?? "Geri dön"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OtpStep;
