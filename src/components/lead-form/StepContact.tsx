import { useState } from "react";
import { LeadFormData } from "@/lib/leadFormData";
import { AlertCircle, User, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface StepContactProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const validateName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return "Ad Soyad zorunludur.";
  if (trimmed.length < 3) return "Ad Soyad en az 3 karakter olmalıdır.";
  if (trimmed.length > 100) return "Ad Soyad en fazla 100 karakter olabilir.";
  if (!trimmed.includes(" ")) return "Lütfen ad ve soyadınızı birlikte girin.";
  if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(trimmed)) return "Ad Soyad yalnızca harf içermelidir.";
  return null;
};

const formatPhone = (value: string): string => {
  let digits = value.replace(/\D/g, "");
  
  // Guarantee it starts with 05
  if (!digits.startsWith("05")) {
    if (digits.startsWith("5")) digits = "0" + digits;
    else digits = "05" + digits;
  }
  
  const d = digits.slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
};



const validatePhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Telefon numarası zorunludur.";
  if (digits.length < 11) return "Telefon numarası 11 haneli olmalıdır (05XX XXX XX XX).";
  if (digits.length > 11) return "Telefon numarası en fazla 11 haneli olabilir.";
  if (!digits.startsWith("05")) return "Telefon numarası 05 ile başlamalıdır.";
  return null;
};

const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return "E-posta adresi zorunludur.";
  if (trimmed.length > 255) return "E-posta adresi çok uzun.";
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return "Geçerli bir e-posta adresi girin.";
  return null;
};

const FieldError = ({ error }: { error: string | null }) => {
  if (!error) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
      <span className="text-xs text-destructive font-body">{error}</span>
    </div>
  );
};

const StepContact = ({ data, onChange }: StepContactProps) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const nameError = touched.fullName ? validateName(data.fullName) : null;
  const phoneError = touched.phone ? validatePhone(data.phone) : null;
  const emailError = touched.email ? validateEmail(data.email) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        İletişim Bilgileriniz
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Teklif talebinizi doğrulamak ve size özel hesabınızı oluşturmak için.
      </p>
      <div className="max-w-md mx-auto space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-semibold font-body">Ad Soyad *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={data.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
              onBlur={() => handleBlur("fullName")}
              placeholder="Adınız Soyadınız"
              maxLength={100}
              className={`pl-10 h-11 rounded-xl transition-all ${nameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
          </div>
          <FieldError error={nameError} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold font-body">Telefon *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                value={data.phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  onChange({ phone: formatted });
                }}
                onBlur={() => handleBlur("phone")}
                placeholder="05XX XXX XXXX"
                className={`pl-10 h-11 rounded-xl transition-all ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />

          </div>
          <FieldError error={phoneError} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold font-body">E-posta Adresi *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              onBlur={() => handleBlur("email")}
              placeholder="ornek@email.com"
              maxLength={255}
              className={`pl-10 h-11 rounded-xl transition-all ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
          </div>
          <FieldError error={emailError} />
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30 mt-4">
          <Checkbox
            id="kvkk"
            checked={data.kvkkAccepted}
            onCheckedChange={(checked) => onChange({ kvkkAccepted: checked as boolean })}
            className="mt-1"
          />
          <Label htmlFor="kvkk" className="text-xs leading-relaxed text-muted-foreground cursor-pointer font-body">
            Kişisel verilerimin işlenmesine ilişkin <span className="text-primary underline">KVKK Aydınlatma Metni</span>'ni okudum ve kabul ediyorum. *
          </Label>
        </div>
      </div>
    </div>
  );
};

export default StepContact;

