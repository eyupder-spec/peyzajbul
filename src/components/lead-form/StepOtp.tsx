import { useState, useEffect } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck } from "lucide-react";

interface StepOtpProps {
  email: string;
  otpCode: string;
  onOtpChange: (code: string) => void;
  onResend: () => Promise<void>;
  sending: boolean;
}

const StepOtp = ({ email, otpCode, onOtpChange, onResend, sending }: StepOtpProps) => {
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    await onResend();
  };

  return (
    <div>
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <MailCheck className="h-7 w-7 text-accent" />
        </div>
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        E-posta Doğrulama
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        <strong>{email}</strong> adresine 6 haneli doğrulama kodu gönderdik.
      </p>
      <div className="flex justify-center mb-6">
        <InputOTP maxLength={6} value={otpCode} onChange={onOtpChange}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="text-center">
        {canResend ? (
          <Button
            variant="link"
            onClick={handleResend}
            disabled={sending}
            className="text-sm"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              "Kodu Tekrar Gönder"
            )}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground font-body">
            Kodu almadınız mı? <span className="font-medium">{countdown}s</span> sonra tekrar gönderebilirsiniz.
          </p>
        )}
      </div>
    </div>
  );
};

export default StepOtp;
