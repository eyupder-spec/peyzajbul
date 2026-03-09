import { useState } from "react";
import { LeadFormData } from "@/lib/leadFormData";
import { AlertCircle } from "lucide-react";

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
  // Strip everything except digits
  const digits = value.replace(/\D/g, "");
  // Remove leading 90 country code if pasted
  const local = digits.startsWith("90") && digits.length > 10 ? digits.slice(2) : digits;
  const d = local.slice(0, 10);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
};

const validatePhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Telefon numarası zorunludur.";
  if (digits.length < 10) return "Telefon numarası 10 haneli olmalıdır.";
  if (digits.length > 10) return "Telefon numarası en fazla 10 haneli olabilir.";
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
    <div className="flex items-center gap-1.5 mt-1.5">
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

  const inputClass = (error: string | null) =>
    `w-full px-4 py-2.5 rounded-md border text-sm font-body focus:outline-none focus:ring-2 transition-colors ${
      error
        ? "border-destructive bg-destructive/5 focus:ring-destructive/30"
        : "border-input bg-background focus:ring-ring"
    }`;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        İletişim Bilgileriniz
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Firmalar sizinle iletişime geçebilsin ve hesabınız oluşturulsun.
      </p>
      <div className="max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">Ad Soyad *</label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            onBlur={() => handleBlur("fullName")}
            placeholder="Adınız Soyadınız"
            maxLength={100}
            className={inputClass(nameError)}
          />
          <FieldError error={nameError} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">Telefon *</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
            onBlur={() => handleBlur("phone")}
            placeholder="05XX XXX XXXX"
            className={inputClass(phoneError)}
          />
          <FieldError error={phoneError} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">E-posta *</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={() => handleBlur("email")}
            placeholder="ornek@email.com"
            maxLength={255}
            className={inputClass(emailError)}
          />
          <FieldError error={emailError} />
        </div>
        <label className="flex items-start gap-2 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={data.kvkkAccepted}
            onChange={(e) => onChange({ kvkkAccepted: e.target.checked })}
            className="mt-1 rounded border-input"
          />
          <span className="text-xs text-muted-foreground font-body">
            Kişisel verilerimin işlenmesine ilişkin KVKK Aydınlatma Metni'ni okudum ve kabul ediyorum. *
          </span>
        </label>
      </div>
    </div>
  );
};

export default StepContact;
