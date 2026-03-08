import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFormData, initialFormData } from "@/lib/leadFormData";
import StepService from "./StepService";
import StepOption from "./StepOption";
import StepLocation from "./StepLocation";
import StepContact from "./StepContact";
import StepOtp from "./StepOtp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOTAL_STEPS = 7;

const projectSizeOptions = [
  { value: "0-100", label: "0–100 m²" },
  { value: "100-500", label: "100–500 m²" },
  { value: "500-1000", label: "500–1.000 m²" },
  { value: "1000+", label: "1.000 m² üzeri" },
];

const budgetOptions = [
  { value: "0-10000", label: "10.000 ₺ altı" },
  { value: "10000-30000", label: "10.000 – 30.000 ₺" },
  { value: "30000-100000", label: "30.000 – 100.000 ₺" },
  { value: "100000+", label: "100.000 ₺ üzeri" },
];

const timelineOptions = [
  { value: "hemen", label: "Hemen (1–2 hafta)" },
  { value: "1-ay", label: "1 ay içinde" },
  { value: "3-ay", label: "3 ay içinde" },
  { value: "arastirma", label: "Sadece fiyat araştırıyorum" },
];

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
}

const LeadFormModal = ({ open, onClose }: LeadFormModalProps) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<LeadFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const navigate = useNavigate();

  if (!open) return null;

  const updateData = (partial: Partial<LeadFormData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const sendOtp = async () => {
    setOtpSending(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("send-otp", {
        body: { email: data.email },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      toast.success("Doğrulama kodu e-posta adresinize gönderildi!");
    } catch (err: any) {
      toast.error(err.message || "Kod gönderilemedi. Lütfen tekrar deneyin.");
      throw err;
    } finally {
      setOtpSending(false);
    }
  };

  const canNext = (): boolean => {
    switch (step) {
      case 1: return !!data.serviceType;
      case 2: return !!data.projectSize;
      case 3: return !!data.budget;
      case 4: return !!data.timeline;
      case 5: return !!data.city;
      case 6: return !!data.fullName && !!data.phone && !!data.email && data.kvkkAccepted;
      case 7: return otpCode.length === 6;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Verify OTP and create account
      const { data: verifyRes, error: verifyError } = await supabase.functions.invoke("verify-otp", {
        body: {
          email: data.email,
          code: otpCode,
          fullName: data.fullName,
          phone: data.phone,
        },
      });

      if (verifyError) throw verifyError;
      if (verifyRes?.error) throw new Error(verifyRes.error);

      const userId = verifyRes.userId;

      // Set session if returned
      if (verifyRes.session) {
        await supabase.auth.setSession({
          access_token: verifyRes.session.access_token,
          refresh_token: verifyRes.session.refresh_token,
        });
      }

      // Save lead
      const { error: leadError } = await supabase.from("leads").insert({
        service_type: data.serviceType,
        project_size: data.projectSize,
        budget: data.budget,
        timeline: data.timeline,
        city: data.city,
        district: data.district || null,
        address: data.address || null,
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        user_id: userId,
        status: "active",
      });

      if (leadError) throw leadError;

      toast.success("Talebiniz başarıyla oluşturuldu! Firmalar sizinle iletişime geçecek.");
      onClose();
      setStep(1);
      setData(initialFormData);
      setOtpCode("");
      navigate("/hesabim");
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 6) {
      // Send OTP before moving to step 7
      try {
        await sendOtp();
        setStep(7);
      } catch {
        // Error already shown via toast
      }
    } else if (step === TOTAL_STEPS) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-body text-muted-foreground">
          Adım {step} / {TOTAL_STEPS}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          {step === 1 && <StepService data={data} onChange={updateData} />}
          {step === 2 && (
            <StepOption
              data={data}
              onChange={updateData}
              field="projectSize"
              question="Alanınızın büyüklüğü nedir?"
              subtitle="Projenizin kapsamını anlamamıza yardımcı olur."
              options={projectSizeOptions}
            />
          )}
          {step === 3 && (
            <StepOption
              data={data}
              onChange={updateData}
              field="budget"
              question="Yaklaşık bütçeniz nedir?"
              subtitle="Size uygun firmaları eşleştirebilmemiz için."
              options={budgetOptions}
            />
          )}
          {step === 4 && (
            <StepOption
              data={data}
              onChange={updateData}
              field="timeline"
              question="Projeye ne zaman başlamak istiyorsunuz?"
              options={timelineOptions}
            />
          )}
          {step === 5 && <StepLocation data={data} onChange={updateData} />}
          {step === 6 && <StepContact data={data} onChange={updateData} />}
          {step === 7 && (
            <StepOtp
              email={data.email}
              otpCode={otpCode}
              onOtpChange={setOtpCode}
              onResend={sendOtp}
              sending={otpSending}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-4">
        <div className="max-w-xl mx-auto flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>
          <Button
            variant="gold"
            onClick={handleNext}
            disabled={!canNext() || loading || (step === 6 && otpSending)}
          >
            {(loading || (step === 6 && otpSending)) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {step === TOTAL_STEPS
              ? (loading ? "Gönderiliyor..." : "Teklif Al")
              : step === 6
                ? (otpSending ? "Kod Gönderiliyor..." : "Doğrulama Kodu Gönder")
                : "Devam Et"}
            {step < 6 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadFormModal;
