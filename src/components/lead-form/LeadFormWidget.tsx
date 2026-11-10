"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Loader2, Lock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { captureAttribution, getAttribution, getSessionId, inferSource, track } from "@/lib/analytics";
import {
  DRAFT_STORAGE_KEY,
  LEAD_COPY,
  LEAD_TOTAL_STEPS,
  SUPPORT_WHATSAPP_E164,
  firstIncompleteStep,
  initialFormData,
  parseDraft,
  pickDraft,
  routesToRegionalFirms,
  validateStep,
  type LeadFormData,
  type LeadFormInitial,
  type LeadSource,
  type LeadStep,
} from "@/lib/leadFormData";
import { cn } from "@/lib/utils";
import { isLegacyLeadId } from "./legacyBackend";
import { LeadApiError, applyLeadSession, createLead, uploadLeadPhotos, type CreateLeadResult, type VerifyResult } from "./leadApi";
import { refCode } from "./leadStatus";
import StepContact from "./StepContact";
import StepDetails from "./StepDetails";
import StepProject from "./StepProject";
import type { TurnstileHandle } from "./TurnstileWidget";
import VerifyPanel from "./VerifyPanel";
import { parseLeadPrefill, resolveFormSource, resolvePrefill } from "./urlPrefill";
import { useCityCoverage } from "./useCityCoverage";

const LAST_LEAD_KEY = "pz_last_lead";
const DRAFT_DEBOUNCE_MS = 400;
/** Verification waits this long for photo uploads; after that it goes ahead without them (photos are optional). */
const PHOTO_WAIT_MS = 20_000;
const CONTACT_FIELDS = ["fullName", "phone", "email", "kvkkAccepted"];

type Phase = "form" | "verify";
type CreatedLead = Extract<CreateLeadResult, { deduped: false }> & { submittedAt: number };

export interface LeadFormProgress {
  step: LeadStep;
  phase: Phase;
  /** The visitor changed something since the form opened (or the lead already exists). */
  dirty: boolean;
  leadId?: string;
  statusToken?: string | null;
}

export interface LeadFormWidgetProps {
  onSuccess?: () => void;
  className?: string;
  targetFirmId?: string;
  targetFirmName?: string;
  /** Where the form was opened from; inferred from the page path when omitted. */
  source?: LeadSource;
  /** Pre-filled choices (hero search, calculator). Only values that exist in the option lists are accepted. */
  initial?: LeadFormInitial;
  /** "dialog": fills a fixed-height container and scrolls its own body. "inline": a card in the page flow. */
  layout?: "inline" | "dialog";
  onProgress?: (state: LeadFormProgress) => void;
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage is blocked: the form still works, it just cannot keep a draft.
  }
}

/** Resolves true once the promise settles, false when `ms` pass first. Never rejects and leaves no timer behind. */
function settlesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), ms);
    const settled = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    promise.then(settled, settled);
  });
}

/** Changes in these values make the form "dirty": the visitor has something to lose. */
function snapshotKey(data: LeadFormData): string {
  return JSON.stringify([pickDraft(data), data.fullName, data.phone, data.email, data.kvkkAccepted, data.photos.length]);
}

/** Homeowner request wizard: 3 steps, then code verification. The lead is created by the create-lead edge function. */
export default function LeadFormWidget({
  onSuccess,
  className,
  targetFirmId,
  targetFirmName,
  source,
  initial,
  layout = "inline",
  onProgress,
}: LeadFormWidgetProps) {
  const router = useRouter();
  const [initialData] = useState<LeadFormData>(() => ({ ...initialFormData, ...resolvePrefill(initial ?? {}) }));
  const [data, setData] = useState<LeadFormData>(initialData);
  const [step, setStep] = useState<LeadStep>(() => firstIncompleteStep(initialData));
  const [phase, setPhase] = useState<Phase>("form");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [created, setCreated] = useState<CreatedLead | null>(null);
  const [ready, setReady] = useState(false);
  const [baselineKey, setBaselineKey] = useState(() => snapshotKey(initialData));
  // Opened without a target firm from a firm page: that firm cannot receive the request, the region's firms do.
  const [regionalRouting, setRegionalRouting] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const submittingRef = useRef(false);
  const initializedRef = useRef(false);
  const userNavigatedRef = useRef(false);
  const sourceRef = useRef<LeadSource>(source ?? "unknown");
  const estimateTokenRef = useRef<string | null>(null);
  const mountedAtRef = useRef(Date.now());
  const photoUploadRef = useRef<Promise<void> | null>(null);
  const photoNoticeRef = useRef(false);
  const onProgressRef = useRef(onProgress);

  const coverage = useCityCoverage(data.city);
  const dirty = phase === "verify" || snapshotKey(data) !== baselineKey;

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // Mount: attribution, draft restore, deep-link pre-fill, funnel start. Runs once.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    captureAttribution();

    const fromUrl = parseLeadPrefill(window.location.search);
    sourceRef.current = resolveFormSource(fromUrl.source, source, () => inferSource(window.location.pathname));
    estimateTokenRef.current = fromUrl.estimateToken;
    setRegionalRouting(routesToRegionalFirms(sourceRef.current, targetFirmId));

    const overrides = { ...fromUrl.fields, ...resolvePrefill(initial ?? {}) };
    // An explicit pre-fill wins over a stored draft; the two are never mixed.
    const draft = Object.keys(overrides).length === 0 ? parseDraft(readSession(DRAFT_STORAGE_KEY)) : null;
    const merged: LeadFormData = { ...initialFormData, ...(draft?.data ?? {}), ...overrides };
    const startStep = firstIncompleteStep(merged);

    setData(merged);
    setStep(startStep);
    setBaselineKey(snapshotKey(merged));
    track("lead_form_open", {
      source: sourceRef.current,
      service: merged.serviceType || undefined,
      city: merged.city || undefined,
      has_target_firm: Boolean(targetFirmId),
      start_step: startStep,
    });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
  }, []);

  useEffect(() => {
    if (!ready || phase !== "form") return;
    track("lead_step_view", { step, source: sourceRef.current });
  }, [ready, step, phase]);

  // Keep the choices (never contact data) for the rest of this tab session.
  useEffect(() => {
    if (!ready || phase !== "form" || snapshotKey(data) === baselineKey) return;
    const timer = window.setTimeout(
      () => writeSession(DRAFT_STORAGE_KEY, JSON.stringify({ v: 1, step: Math.min(step, 2), data: pickDraft(data) })),
      DRAFT_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [data, step, ready, phase, baselineKey]);

  useEffect(() => {
    onProgressRef.current?.({ step, phase, dirty, leadId: created?.leadId, statusToken: created?.statusToken });
  }, [step, phase, dirty, created]);

  // After a step change started by the visitor: back to the top of the body and focus the new heading.
  // The code screen keeps the focus in its own input (announced through the live region instead).
  useEffect(() => {
    if (!userNavigatedRef.current) return;
    const body = bodyRef.current;
    body?.scrollTo({ top: 0 });
    if (phase === "form") body?.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: layout === "dialog" });
  }, [step, phase, layout]);

  // A failed request is reported at the top of the contact step, but the visitor just tapped the footer button:
  // bring the message into view (the body scrolls in the dialog, the page in the inline card) and move focus to it.
  useEffect(() => {
    if (!formError) return;
    const alert = bodyRef.current?.querySelector<HTMLElement>("[data-form-error]");
    alert?.focus({ preventScroll: true });
    alert?.scrollIntoView({ block: "nearest" });
  }, [formError]);

  const updateData = (partial: Partial<LeadFormData>) => {
    setData((previous) => ({ ...previous, ...partial }));
    setErrors((previous) => {
      const touched = Object.keys(partial).filter((key) => key in previous);
      if (touched.length === 0) return previous;
      const next = { ...previous };
      for (const key of touched) delete next[key];
      return next;
    });
  };

  const showErrors = (found: Record<string, string>, forStep: LeadStep) => {
    setErrors(found);
    const fields = Object.keys(found);
    for (const field of fields) track("lead_field_error", { step: forStep, field });
    document.getElementById(`lead-field-${fields[0]}`)?.focus();
  };

  const goTo = (nextStep: LeadStep) => {
    userNavigatedRef.current = true;
    setErrors({});
    setFormError("");
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step === LEAD_TOTAL_STEPS) return;
    const found = validateStep(step, data);
    if (Object.keys(found).length > 0) {
      showErrors(found, step);
      return;
    }
    track("lead_step_complete", { step, source: sourceRef.current });
    goTo((step + 1) as LeadStep);
  };

  const handleBack = () => {
    if (step > 1) goTo((step - 1) as LeadStep);
  };

  // One notice per submission, whether the uploads failed or the wait for them ran out first.
  const notifyPhotoFailure = (leadId: string) => {
    if (photoNoticeRef.current) return;
    photoNoticeRef.current = true;
    const text = `Merhaba, ${refCode(leadId)} numaralı Peyzajbul talebim için fotoğraf göndermek istiyorum.`;
    toast(LEAD_COPY.photoFallback, {
      description: `Talep no: ${refCode(leadId)}`,
      duration: 15000,
      action: {
        label: "WhatsApp",
        onClick: () => window.open(`https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"),
      },
    });
  };

  const handleSubmit = async (honeypot: string) => {
    if (submittingRef.current) return;
    const found = validateStep(3, data);
    if (Object.keys(found).length > 0) {
      showErrors(found, 3);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");
    try {
      const token = await turnstileRef.current?.getToken();
      // A Turnstile token is single use: renew it whether or not the request succeeded.
      const result = await createLead(data, {
        source: sourceRef.current,
        attribution: getAttribution(),
        sessionId: getSessionId(),
        targetFirmId,
        estimateToken: estimateTokenRef.current ?? undefined,
        elapsedMs: Date.now() - mountedAtRef.current,
        honeypot,
        turnstileToken: token,
      }).finally(() => turnstileRef.current?.reset());

      if (result.deduped) {
        setFormError(LEAD_COPY.duplicate);
        return;
      }

      const lead: CreatedLead = { ...result, submittedAt: Date.now() };
      writeSession(LAST_LEAD_KEY, JSON.stringify({ id: lead.leadId, token: lead.statusToken ?? "" }));
      track(
        "lead_submit",
        {
          source: sourceRef.current,
          service: data.serviceType,
          city: data.city,
          area_size: data.areaSize,
          budget: data.budget,
          timeline: data.timeline,
          has_photos: data.photos.length > 0,
          has_target_firm: Boolean(targetFirmId),
          city_firm_count: coverage.count ?? undefined,
        },
        { leadId: lead.leadId },
      );
      if (lead.verification.sent) {
        track("lead_otp_sent", { channel: lead.verification.channel, resend: false }, { leadId: lead.leadId });
      }
      if (data.photos.length > 0) {
        photoNoticeRef.current = false;
        photoUploadRef.current = uploadLeadPhotos(data.photos, lead.uploads).then((failed) => {
          if (failed > 0) notifyPhotoFailure(lead.leadId);
        });
      }
      userNavigatedRef.current = true;
      setCreated(lead);
      setPhase("verify");
    } catch (error) {
      const apiError = error instanceof LeadApiError ? error : null;
      const contactErrors = Object.fromEntries(
        Object.entries(apiError?.fieldErrors ?? {}).filter(([field]) => CONTACT_FIELDS.includes(field)),
      );
      if (Object.keys(contactErrors).length > 0) {
        showErrors(contactErrors, 3);
      } else if (apiError?.fieldErrors) {
        setFormError("Formdaki bazı bilgiler kabul edilmedi. Lütfen önceki adımları kontrol edin.");
      } else if (apiError?.code === "rate_limited") {
        setFormError("Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.");
      } else if (apiError?.code === "captcha") {
        setFormError("Güvenlik doğrulaması tamamlanamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
      } else if (apiError?.code === "network") {
        setFormError("Bağlantı hatası. Tekrar deneyin.");
      } else {
        setFormError("Talebiniz gönderilemedi. Lütfen tekrar deneyin.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleVerified = async (result: VerifyResult) => {
    if (!created) return;
    if (result.session) await applyLeadSession(result.session);
    const token = result.statusToken ?? created.statusToken;
    writeSession(DRAFT_STORAGE_KEY, null);
    writeSession(LAST_LEAD_KEY, JSON.stringify({ id: created.leadId, token: token ?? "" }));
    onSuccess?.();
    // Yedek akışta durum sayfası yok: eski teşekkür sayfasına git.
    if (isLegacyLeadId(created.leadId)) { router.push("/talebiniz-alindi"); return; }
    router.push(token ? `/talep/${created.leadId}?t=${encodeURIComponent(token)}` : `/talep/${created.leadId}`);
  };

  const handleChangeContact = () => {
    userNavigatedRef.current = true;
    setCreated(null);
    setPhase("form");
    setStep(3);
  };

  const stepLabel = phase === "verify" ? "Doğrulama" : `Adım ${step} / ${LEAD_TOTAL_STEPS}`;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-card",
        layout === "dialog" ? "h-full flex-1" : "mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-border shadow-card",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border px-5 pb-3 pt-4 md:px-8">
        {/* The close button of the dialog sits over the top-right corner: keep the text clear of it. */}
        <div className={cn(layout === "dialog" && "pr-11")}>
          {targetFirmName ? (
            <p className="mb-2 flex items-center gap-2 text-sm text-foreground">
              <Building2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <span className="font-semibold">{targetFirmName}</span> firmasına teklif talebi gönderiyorsunuz
              </span>
            </p>
          ) : (
            regionalRouting && (
              <p className="mb-2 flex items-center gap-2 text-sm text-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{LEAD_COPY.regionalRouting}</span>
              </p>
            )
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {phase === "verify" && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
              {stepLabel}
            </p>
            <p className="text-xs text-muted-foreground">{LEAD_COPY.reassurance}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((segment) => (
            <div key={segment} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left bg-accent transition-transform duration-300 motion-reduce:transition-none"
                style={{ transform: `scaleX(${phase === "verify" || segment <= step ? 1 : 0})` }}
              />
            </div>
          ))}
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {stepLabel}
        </p>
      </div>

      <div
        ref={bodyRef}
        data-lead-body
        className={cn("min-h-0 flex-1 px-5 py-5 md:px-8", layout === "dialog" ? "overflow-y-auto overflow-x-hidden overscroll-contain" : "overflow-visible")}
      >
        {phase === "form" && step === 1 && (
          <StepProject data={data} errors={errors} onChange={updateData} coverageCount={coverage.count} />
        )}
        {phase === "form" && step === 2 && <StepDetails data={data} errors={errors} onChange={updateData} />}
        {phase === "form" && step === 3 && (
          <StepContact
            data={data}
            errors={errors}
            formError={formError}
            onChange={updateData}
            onSubmit={(honeypot) => void handleSubmit(honeypot)}
            turnstileRef={turnstileRef}
          />
        )}
        {phase === "verify" && created && (
          <VerifyPanel
            leadId={created.leadId}
            statusToken={created.statusToken}
            channel={created.verification.channel}
            destinationMasked={created.verification.destinationMasked}
            resendAfterSec={created.verification.resendAfterSec}
            codeSent={created.verification.sent}
            source={sourceRef.current}
            service={data.serviceType}
            city={data.city}
            submittedAt={created.submittedAt}
            beforeVerify={async () => {
              const pending = photoUploadRef.current;
              if (!pending || (await settlesWithin(pending, PHOTO_WAIT_MS))) return;
              // A stalled connection must not hold the code check hostage: go on without the photos and
              // do not wait for them again when the visitor retries the code.
              photoUploadRef.current = null;
              notifyPhotoFailure(created.leadId);
            }}
            onVerified={(result) => void handleVerified(result)}
            onChangeContact={handleChangeContact}
            showSubmit={false}
            onBusyChange={setVerifyBusy}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8">
        <div className="flex gap-3">
          {phase === "form" && step > 1 && (
            <Button type="button" variant="outline" onClick={handleBack} disabled={submitting} className="min-h-11">
              <ArrowLeft aria-hidden="true" />
              Geri
            </Button>
          )}
          {phase === "form" && step < LEAD_TOTAL_STEPS && (
            <Button type="button" variant="gold" data-lead-primary onClick={handleNext} className="min-h-11 flex-1">
              Devam Et
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
          {phase === "form" && step === LEAD_TOTAL_STEPS && (
            <Button type="submit" form="lead-contact-form" variant="gold" data-lead-primary disabled={submitting} className="min-h-11 flex-1">
              {submitting && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
              {submitting ? "Gönderiliyor…" : "Ücretsiz Teklif Al"}
            </Button>
          )}
          {phase === "verify" && (
            <Button type="submit" form="lead-verify-form" variant="gold" data-lead-primary disabled={verifyBusy} className="min-h-11 flex-1">
              {verifyBusy && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
              {verifyBusy ? "Doğrulanıyor…" : "Doğrula"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
