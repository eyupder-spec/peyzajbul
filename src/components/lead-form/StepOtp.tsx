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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center border-4 border-accent/10">
          <MailCheck className="h-10 w-10 text-accent" />
        </div>
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        E-posta Doğrulama
      </h2>
      <p className="text-muted-foreground text-center mb-10 font-body text-sm max-w-[280px] mx-auto">
        <strong>{email}</strong> adresine gönderilen 6 haneli kodu aşağıya giriniz.
      </p>
      <div className="flex justify-center mb-10 scale-110">
        <InputOTP maxLength={6} value={otpCode} onChange={onOtpChange}>
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot 
                key={i} 
                index={i} 
                className="w-12 h-14 rounded-xl border-2 border-border focus:border-accent text-lg font-bold"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="text-center">
        {canResend ? (
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={sending}
            className="text-sm rounded-xl px-8 h-10 border-2"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              "Kodu Tekrar Gönder"
            )}
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <p className="text-xs text-muted-foreground font-body">
              Kodu <span className="font-bold text-foreground">{countdown}s</span> sonra tekrar isteyebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


export default StepOtp;
