import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFormData, initialFormData, SCOPE_OPTIONS } from "@/lib/leadFormData";
import StepProjectType from "./StepProjectType";
import StepServiceType from "./StepServiceType";
import StepScope from "./StepScope";
import StepLocationProperty from "./StepLocationProperty";
import StepConditionBudget from "./StepConditionBudget";
import StepTimelineExtras from "./StepTimelineExtras";
import StepContact from "./StepContact";
import StepOtp from "./StepOtp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOTAL_STEPS = 8;

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
      case 1: return !!data.projectType;
      case 2: return !!data.serviceType;
      case 3: {
        if (data.serviceType === "sulama-sistemi") {
          return !!data.irrigationType && !!data.irrigationSystem && !!data.waterSource;
        }
        const scopeOpts = SCOPE_OPTIONS[data.serviceType];
        if (!scopeOpts || scopeOpts.length === 0) return true;
        return data.scope.length > 0;
      }
      case 4: return !!data.city && !!data.propertyType && !!data.areaSize;
      case 5: return !!data.currentCondition && !!data.budget;
      case 6: return !!data.timeline;
      case 7: return !!data.fullName && !!data.phone && !!data.email && data.kvkkAccepted;
      case 8: return otpCode.length === 6;
      default: return false;
    }
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    if (data.photos.length === 0) return [];
    const urls: string[] = [];
    for (const file of data.photos) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("lead-photos").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("lead-photos").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
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

      if (verifyRes.session) {
        await supabase.auth.setSession({
          access_token: verifyRes.session.access_token,
          refresh_token: verifyRes.session.refresh_token,
        });
      }

      const photoUrls = await uploadPhotos(userId);

      const { error: leadError } = await supabase.from("leads").insert({
        project_type: data.projectType || null,
        service_type: data.serviceType,
        project_size: data.areaSize || null,
        area_size: data.areaSize || null,
        scope: data.scope.length > 0 ? data.scope : null,
        irrigation_type: data.irrigationType || null,
        irrigation_system: data.irrigationSystem || null,
        water_source: data.waterSource || null,
        property_type: data.propertyType || null,
        current_condition: data.currentCondition || null,
        budget: data.budget,
        timeline: data.timeline,
        city: data.city,
        district: data.district || null,
        address: data.address || null,
        notes: data.notes || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        user_id: userId,
        status: "active",
      } as any);

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
    if (step === 7) {
      try {
        await sendOtp();
        setStep(8);
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-body text-muted-foreground">
          Adım {step} / {TOTAL_STEPS}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="h-1 bg-muted">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          {step === 1 && <StepProjectType data={data} onChange={updateData} />}
          {step === 2 && <StepServiceType data={data} onChange={updateData} />}
          {step === 3 && <StepScope data={data} onChange={updateData} />}
          {step === 4 && <StepLocationProperty data={data} onChange={updateData} />}
          {step === 5 && <StepConditionBudget data={data} onChange={updateData} />}
          {step === 6 && <StepTimelineExtras data={data} onChange={updateData} />}
          {step === 7 && <StepContact data={data} onChange={updateData} />}
          {step === 8 && (
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
            disabled={!canNext() || loading || (step === 7 && otpSending)}
          >
            {(loading || (step === 7 && otpSending)) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {step === TOTAL_STEPS
              ? (loading ? "Gönderiliyor..." : "Teklif Al")
              : step === 7
                ? (otpSending ? "Kod Gönderiliyor..." : "Doğrulama Kodu Gönder")
                : "Devam Et"}
            {step < 7 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadFormModal;
