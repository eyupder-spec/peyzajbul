"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFormData, initialFormData, SCOPE_OPTIONS, SERVICE_TYPE_TO_LABEL } from "@/lib/leadFormData";
import StepProjectType from "./StepProjectType";
import StepServiceType from "./StepServiceType";
import StepScope from "./StepScope";
import StepLocationProperty from "./StepLocationProperty";
import StepConditionBudget from "./StepConditionBudget";
import StepTimelineExtras from "./StepTimelineExtras";
import StepContact from "./StepContact";
import StepOtp from "./StepOtp";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

const TOTAL_STEPS = 8;

interface LeadFormWidgetProps {
  onSuccess?: () => void;
  className?: string;
}

export default function LeadFormWidget({ onSuccess, className = "" }: LeadFormWidgetProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<LeadFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [unverifiedLeadId, setUnverifiedLeadId] = useState<string | null>(null);
  const router = useRouter();

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
      if (res?.debugCode) {
        setOtpCode(res.debugCode);
        toast.info("Geliştirme Modu: Domain onayı olmadığı için kod otomatik dolduruldu: " + res.debugCode);
      } else {
        toast.success("Doğrulama kodu e-posta adresinize gönderildi!");
      }
      if (res?.error && !res?.debugCode) throw new Error(res.error);
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
      case 7: {
        const nameOk = data.fullName.trim().length >= 3 && data.fullName.trim().includes(" ") && /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(data.fullName.trim());
        const phoneDigits = data.phone.replace(/\D/g, "");
        const phoneOk = phoneDigits.length === 11 && phoneDigits.startsWith("05");
        const emailOk = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.email.trim());
        return nameOk && phoneOk && emailOk && data.kvkkAccepted;
      }
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
  }

  const handleSubmit = async () => {
    setLoading(true);
    setOtpError("");
    try {
      const { data: verifyRes, error: verifyError } = await supabase.functions.invoke("verify-otp", {
        body: {
          email: data.email,
          code: otpCode,
          fullName: data.fullName,
          phone: data.phone,
          leadId: unverifiedLeadId,
        },
      });

      // Edge Function non-2xx hata yakalama
      if (verifyError) {
        // verifyError.context içinden gerçek hata mesajını okumaya çalış
        let errMsg = "";
        try {
          const ctx = (verifyError as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            errMsg = body?.error || "";
          }
        } catch {
          // context okunamazsa devam et
        }

        // Geçersiz/süresi dolmuş kod kontrolü
        if (errMsg.includes("Geçersiz") || errMsg.includes("süresi dolmuş") || 
            verifyError.message?.includes("non-2xx")) {
          setOtpError("Girdiğiniz kod geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.");
          setOtpCode("");
          toast.error("Geçersiz veya süresi dolmuş kod. Lütfen kontrol edip tekrar deneyin.");
          return;
        }
        throw new Error(errMsg || verifyError.message || "Doğrulama sırasında bir hata oluştu.");
      }

      if (verifyRes?.error) {
        const errMsg = verifyRes.error;
        if (errMsg.includes("Geçersiz") || errMsg.includes("süresi dolmuş")) {
          setOtpError("Girdiğiniz kod geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.");
          setOtpCode("");
          toast.error("Geçersiz veya süresi dolmuş kod. Lütfen kontrol edip tekrar deneyin.");
          return;
        }
        throw new Error(errMsg);
      }


      const userId = verifyRes.userId;

      if (verifyRes.session) {
        await supabase.auth.setSession({
          access_token: verifyRes.session.access_token,
          refresh_token: verifyRes.session.refresh_token,
        });
      }

      const photoUrls = await uploadPhotos(userId);

      if (unverifiedLeadId) {
        // Lead was already created as unverified and claimed in verify-otp. Just update photos if needed.
        if (photoUrls.length > 0) {
          const { error: updateError } = await supabase.from("leads").update({ photo_urls: photoUrls }).eq("id", unverifiedLeadId);
          if (updateError) console.error("Could not update photos:", updateError);
        }
      } else {
        // Fallback: create lead if unverifiedLeadId was not set
        const { error: leadError } = await supabase.from("leads").insert({
          project_type: data.projectType || null,
          service_type: SERVICE_TYPE_TO_LABEL[data.serviceType] ?? data.serviceType,
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
      }

      toast.success("Talebiniz başarıyla oluşturuldu! Firmalar sizinle iletişime geçecek.");

      // Kullanıcıya teklif özeti maili gönder (arka planda, hata atsa bile formu etkilemesin)
      try {
        await supabase.functions.invoke("send-lead-confirmation", {
          body: {
            email: data.email,
            fullName: data.fullName,
            serviceType: data.serviceType,
            projectType: data.projectType,
            city: data.city,
            district: data.district || null,
            propertyType: data.propertyType,
            areaSize: data.areaSize,
            currentCondition: data.currentCondition,
            budget: data.budget,
            timeline: data.timeline,
            scope: data.scope,
            notes: data.notes || null,
            address: data.address || null,
          },
        });
      } catch {
        // E-posta gönderilemese bile formu etkilmesin
      }
      
      setStep(1);
      setData(initialFormData);
      setOtpCode("");
      
      if(onSuccess) {
        onSuccess();
      }
      router.push("/hesabim");
      
    } catch (err: any) {
      setOtpError("");
      toast.error(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 7) {
      try {
        setOtpSending(true);
        const generatedLeadId = crypto.randomUUID();
        
        // Try creating unverified lead first (without .select().single() to avoid RLS SELECT issues)
        const { error: leadError } = await supabase.from("leads").insert({
          id: generatedLeadId,
          project_type: data.projectType || null,
          service_type: SERVICE_TYPE_TO_LABEL[data.serviceType] ?? data.serviceType,
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
          full_name: data.fullName,
          phone: data.phone,
          email: data.email,
          status: "unverified",
        } as any);
        
        if (leadError) {
          console.error("Unverified lead insert error:", leadError.message || leadError);
        } else {
          setUnverifiedLeadId(generatedLeadId);
        }

        const { data: res, error } = await supabase.functions.invoke("send-otp", {
          body: { email: data.email },
        });
        if (error) throw error;
        
        if (res?.debugCode) {
          setOtpCode(res.debugCode);
          toast.info("Geliştirme Modu: Domain onayı olmadığı için kod otomatik dolduruldu: " + res.debugCode);
        } else {
          toast.success("Doğrulama kodu e-posta adresinize gönderildi!");
        }
        if (res?.error && !res?.debugCode) throw new Error(res.error);
        
        setStep(8);
      } catch (err: any) {
        toast.error(err.message || "Kod gönderilemedi. Lütfen tekrar deneyin.");
      } finally {
        setOtpSending(false);
      }
    } else if (step === TOTAL_STEPS) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className={`relative bg-card border border-border shadow-md rounded-2xl flex flex-col w-full max-w-xl mx-auto overflow-hidden ${className}`}>
        
      {/* Üst Kısım: Progress Bar */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <span className="text-xs font-bold text-accent uppercase tracking-wider mb-0.5">Teklif Talebi</span>
        <span className="text-xs font-medium text-muted-foreground font-body block">Adım {step} / {TOTAL_STEPS}</span>
        <div className="h-1.5 bg-muted/50 overflow-hidden mt-3 rounded-full">
          <div className="h-full bg-gradient-to-r from-accent/60 to-accent transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Orta Kısım: Form Adımları */}
      <div className="p-6 md:px-8">
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
              onOtpChange={(code) => { setOtpCode(code); setOtpError(""); }}
              onResend={sendOtp}
              sending={otpSending}
              error={otpError}
            />
          )}
      </div>

      {/* Alt Kısım: İleri / Geri Butonları */}
      <div className="border-t border-border px-6 md:px-8 py-4 bg-muted/10 flex gap-4">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="flex-1">Geri</Button>
          <Button variant="gold" onClick={handleNext} disabled={!canNext() || loading || (step === 7 && otpSending)} className="flex-[2]">
            {(loading || (step === 7 && otpSending)) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {step === TOTAL_STEPS
              ? (loading ? "Doğrulanıyor..." : "Doğrula ve Gönder")
              : step === 7
                ? (otpSending ? "Lütfen Bekleyin..." : "Ücretsiz Teklif Al")
                : "Devam Et"}
            {step < 7 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
      </div>
    </div>
  );
}
