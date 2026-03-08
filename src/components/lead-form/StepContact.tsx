import { LeadFormData } from "@/lib/leadFormData";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface StepContactProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const StepContact = ({ data, onChange }: StepContactProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Kişisel Bilgileriniz
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
            placeholder="Adınız Soyadınız"
            className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">Telefon *</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="05XX XXX XX XX"
            className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">E-posta *</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="ornek@email.com"
            className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">Şifre *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="En az 6 karakter"
              className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
