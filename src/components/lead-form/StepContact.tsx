"use client";

import type { FormEvent, Ref } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KVKK_URL, LEAD_COPY, LEAD_FORM_CONFIG, emailRequired, formatPhone, type LeadFormData } from "@/lib/leadFormData";
import FieldError from "./FieldError";
import TapCheckbox from "./TapCheckbox";
import TurnstileWidget, { type TurnstileHandle } from "./TurnstileWidget";

interface StepContactProps {
  data: LeadFormData;
  errors: Record<string, string>;
  /** Error of the request itself (rate limit, network, duplicate), shown above the fields. */
  formError?: string;
  onChange: (partial: Partial<LeadFormData>) => void;
  /** Called with the value of the hidden honeypot field when the form is submitted. */
  onSubmit: (honeypot: string) => void;
  turnstileRef: Ref<TurnstileHandle>;
}

/** Step 3: contact details. The submit button lives in the widget footer and points at this form by id. */
export default function StepContact({ data, errors, formError, onChange, onSubmit, turnstileRef }: StepContactProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(String(new FormData(event.currentTarget).get("website") ?? ""));
  };

  return (
    <form
      id="lead-contact-form"
      noValidate
      onSubmit={handleSubmit}
      className="relative space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
    >
      <div className="space-y-1">
        <h2 data-step-heading tabIndex={-1} className="font-heading text-xl font-semibold text-foreground outline-none">
          İletişim bilgileriniz
        </h2>
        <p className="text-sm text-muted-foreground">{LEAD_COPY.contactIntro[LEAD_FORM_CONFIG.verifyChannel]}</p>
      </div>

      {formError && (
        <div
          role="alert"
          data-form-error
          tabIndex={-1}
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive outline-none"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="lead-field-fullName" className="font-semibold">
          Ad Soyad
        </Label>
        <Input
          id="lead-field-fullName"
          name="name"
          autoComplete="name"
          value={data.fullName}
          onChange={(event) => onChange({ fullName: event.target.value })}
          maxLength={80}
          placeholder="Adınız Soyadınız"
          aria-invalid={Boolean(errors.fullName) || undefined}
          aria-describedby={errors.fullName ? "lead-error-fullName" : undefined}
          className="h-11"
        />
        <FieldError id="lead-error-fullName" message={errors.fullName} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-field-phone" className="font-semibold">
          Telefon
        </Label>
        <Input
          id="lead-field-phone"
          name="tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={data.phone}
          onChange={(event) => onChange({ phone: formatPhone(event.target.value) })}
          placeholder="05XX XXX XX XX"
          aria-invalid={Boolean(errors.phone) || undefined}
          aria-describedby={errors.phone ? "lead-error-phone" : "lead-hint-phone"}
          className="h-11"
        />
        <FieldError id="lead-error-phone" message={errors.phone} />
        <p id="lead-hint-phone" className="text-xs leading-relaxed text-muted-foreground">
          {LEAD_COPY.phoneShare}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-field-email" className="font-semibold">
          E-posta
          {!emailRequired() && <span className="font-normal text-muted-foreground"> (isteğe bağlı)</span>}
        </Label>
        <Input
          id="lead-field-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={data.email}
          onChange={(event) => onChange({ email: event.target.value })}
          maxLength={254}
          placeholder="ornek@eposta.com"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "lead-error-email" : undefined}
          className="h-11"
        />
        <FieldError id="lead-error-email" message={errors.email} />
      </div>

      <div>
        <label
          htmlFor="lead-field-kvkkAccepted"
          className="flex min-h-11 cursor-pointer items-center rounded-lg border border-border bg-muted/40 pr-3 text-xs leading-relaxed text-muted-foreground"
        >
          <TapCheckbox
            id="lead-field-kvkkAccepted"
            checked={data.kvkkAccepted}
            onCheckedChange={(checked) => onChange({ kvkkAccepted: checked === true })}
            aria-invalid={Boolean(errors.kvkkAccepted) || undefined}
            aria-describedby={errors.kvkkAccepted ? "lead-error-kvkkAccepted" : undefined}
          />
          <span className="py-2">
            Kişisel verilerimin işlenmesine ilişkin{" "}
            <Link
              href={KVKK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              KVKK Aydınlatma Metni
            </Link>
            &apos;ni okudum ve kabul ediyorum.
          </span>
        </label>
        <FieldError id="lead-error-kvkkAccepted" message={errors.kvkkAccepted} />
      </div>

      {/* Honeypot: invisible to people and assistive technology, tempting to form-filling bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore
        defaultValue=""
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <TurnstileWidget ref={turnstileRef} />
    </form>
  );
}
