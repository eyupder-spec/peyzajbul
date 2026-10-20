"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { getCitySlug } from "@/lib/cities";
import { LEAD_COPY, LEAD_FORM_CONFIG, SUPPORT_WHATSAPP_E164 } from "@/lib/leadFormData";
import { cn } from "@/lib/utils";
import { LeadApiError, applyLeadSession, getLeadStatus, type VerifyResult } from "@/components/lead-form/leadApi";
import {
  CLOSED_NOTICE,
  buildTimeline,
  deriveStage,
  formatLeadDate,
  refCode,
  stageHeading,
  type LeadStatusDTO,
  type TimelineStep,
} from "@/components/lead-form/leadStatus";
import CoverageNote from "@/components/lead-form/CoverageNote";
import { useCityCoverage } from "@/components/lead-form/useCityCoverage";
import VerifyPanel from "@/components/lead-form/VerifyPanel";

const LAST_LEAD_KEY = "pz_last_lead";

function whatsappHref(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

/** Token from the link, or the one stored for this tab when the visitor just submitted the form. */
function resolveToken(id: string): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("t");
  if (fromUrl) return fromUrl;
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(LAST_LEAD_KEY) ?? "null");
    if (typeof stored === "object" && stored !== null) {
      const { id: storedId, token } = stored as { id?: unknown; token?: unknown };
      if (storedId === id && typeof token === "string" && token) return token;
    }
  } catch {
    // No stored lead: the link is incomplete.
  }
  return null;
}

function WhatsAppButton({ message, placement }: { message: string; placement: string }) {
  return (
    <Button asChild variant="outline" className="min-h-11">
      <a
        href={whatsappHref(message)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("cta_click", { placement })}
      >
        <MessageCircle aria-hidden="true" />
        WhatsApp ile yazın
      </a>
    </Button>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
      <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
      {children}
    </div>
  );
}

function TimelineItem({ step, index }: { step: TimelineStep; index: number }) {
  return (
    <li className="flex gap-3" aria-current={step.state === "current" ? "step" : undefined}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          step.state === "done" && "bg-primary text-primary-foreground",
          step.state === "current" && "border-2 border-accent bg-card text-foreground",
          step.state === "upcoming" && "bg-muted text-muted-foreground",
        )}
      >
        {step.state === "done" ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
      </span>
      <div className="min-w-0 pb-1 pt-1">
        <p className={cn("text-sm font-semibold", step.state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
          {step.title}
        </p>
        {step.detail && <p className="text-sm text-muted-foreground">{step.detail}</p>}
      </div>
    </li>
  );
}

function StatusView({
  dto,
  onRefresh,
  refreshing,
  onVerified,
}: {
  dto: LeadStatusDTO;
  onRefresh: () => void;
  refreshing: boolean;
  onVerified: (result: VerifyResult) => void;
}) {
  // A closed request has no use for the supply note, so the count is not even requested.
  const { count } = useCityCoverage(dto.closed ? "" : dto.city);
  const stage = deriveStage(dto);
  const location = [dto.city, dto.district].filter(Boolean).join(" / ");
  const created = formatLeadDate(dto.createdAt);

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Talep no: {refCode(dto.id)}</p>
        <h1 className="font-heading text-2xl font-semibold leading-tight text-foreground md:text-3xl">{stageHeading(dto)}</h1>
      </header>

      <section aria-label="Talep özeti" className="rounded-xl border border-border bg-card p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {dto.serviceLabel && (
            <>
              <dt className="text-muted-foreground">Hizmet</dt>
              <dd className="font-medium text-foreground">{dto.serviceLabel}</dd>
            </>
          )}
          {location && (
            <>
              <dt className="text-muted-foreground">Konum</dt>
              <dd className="font-medium text-foreground">{location}</dd>
            </>
          )}
          {created && (
            <>
              <dt className="text-muted-foreground">Tarih</dt>
              <dd className="font-medium text-foreground">{created}</dd>
            </>
          )}
        </dl>
      </section>

      {stage === "awaiting_verification" && (
        <section aria-label="Doğrulama" className="rounded-xl border border-accent/40 bg-card p-5">
          <VerifyPanel
            leadId={dto.id}
            channel={LEAD_FORM_CONFIG.verifyChannel}
            resendAfterSec={0}
            autoFocus={false}
            source="unknown"
            service={dto.serviceLabel}
            city={dto.city}
            submittedAt={Date.parse(dto.createdAt) || undefined}
            onVerified={onVerified}
          />
        </section>
      )}

      <section aria-label="Talebin durumu">
        <ol className="space-y-3">
          {buildTimeline(dto).map((step, index) => (
            <TimelineItem key={step.key} step={step} index={index} />
          ))}
        </ol>
      </section>

      {stage === "in_review" && <p className="text-sm leading-relaxed text-muted-foreground">{LEAD_COPY.reviewText}</p>}

      {dto.closed && (
        <section aria-label="Sonraki adım" className="space-y-4 rounded-xl bg-muted/60 p-4">
          <p className="text-sm leading-relaxed text-foreground">{CLOSED_NOTICE[dto.closed]}</p>
          <Button asChild variant="gold" className="min-h-11">
            <Link href="/teklif-al">Yeni talep oluştur</Link>
          </Button>
        </section>
      )}

      {/* Only once a firm actually received the request: before that, any promise about calls would be a guess. */}
      {(stage === "sent" || stage === "accepted") && (
        <section aria-label="Sırada ne var?" className="space-y-2 rounded-xl bg-muted/60 p-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Sırada ne var?</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            <li>Bir firma talebinizi kabul ederse sizi doğrudan telefonla arar.</li>
            <li>Teklif aldığınızda karşılaştırıp dilediğinizle devam edebilirsiniz.</li>
            <li>Hiçbir firmayla çalışma zorunluluğunuz yoktur.</li>
          </ul>
        </section>
      )}

      {!dto.closed && <CoverageNote city={dto.city} count={count} />}

      <div className="flex flex-wrap items-center gap-3">
        <WhatsAppButton
          message={`Merhaba, ${refCode(dto.id)} numaralı Peyzajbul talebim hakkında bilgi almak istiyorum.`}
          placement="lead_status_whatsapp"
        />
        {dto.city && (
          <Button asChild variant="outline" className="min-h-11">
            <Link href={`/iller/${getCitySlug(dto.city)}-peyzaj-firmalari`}>Firmaları incele</Link>
          </Button>
        )}
        <Button type="button" variant="ghost" className="min-h-11" onClick={onRefresh} disabled={refreshing}>
          {refreshing && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
          {refreshing ? "Yenileniyor…" : "Yenile"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/hesap-silme" className="inline-flex min-h-11 items-center underline underline-offset-2">
          Talebimi / verilerimi sil
        </Link>
      </p>
    </div>
  );
}

export default function LeadStatusClient({ id }: { id: string }) {
  // undefined: still reading the URL; null: no token available.
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const viewTracked = useRef(false);

  useEffect(() => {
    setToken(resolveToken(id));
  }, [id]);

  const query = useQuery<LeadStatusDTO, LeadApiError>({
    queryKey: ["lead-status", id],
    enabled: Boolean(token),
    queryFn: () => getLeadStatus(id, token ?? ""),
    refetchOnWindowFocus: true,
    retry: (failures, error) => error.code !== "not_found" && failures < 1,
  });

  const dto = query.data;
  useEffect(() => {
    if (!dto || viewTracked.current) return;
    viewTracked.current = true;
    track("lead_status_view", { stage: deriveStage(dto) });
  }, [dto]);

  const handleVerified = async (result: VerifyResult) => {
    if (result.session) await applyLeadSession(result.session);
    await query.refetch();
  };

  if (token === undefined || (token && query.isPending)) {
    return (
      <Notice title="Talep durumu">
        <p role="status" className="text-sm text-muted-foreground">
          Yükleniyor…
        </p>
      </Notice>
    );
  }

  if (token === null || query.error?.code === "not_found") {
    return (
      <Notice title="Bu bağlantı geçersiz veya süresi dolmuş">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Talep bilgilerine yalnızca size gönderilen özel bağlantıyla ulaşılabilir. Bağlantıyı kontrol edin veya yeni bir talep oluşturun.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="gold" className="min-h-11">
            <Link href="/teklif-al">Yeni talep oluştur</Link>
          </Button>
          <WhatsAppButton message="Merhaba, Peyzajbul talebim hakkında bilgi almak istiyorum." placement="lead_status_whatsapp" />
        </div>
      </Notice>
    );
  }

  if (!dto) {
    return (
      <Notice title="Talebiniz kaydedildi.">
        <p className="text-sm leading-relaxed text-muted-foreground">Durum bilgisi şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="gold" className="min-h-11" onClick={() => void query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? "Yenileniyor…" : "Tekrar dene"}
          </Button>
          <WhatsAppButton
            message={`Merhaba, ${refCode(id)} numaralı Peyzajbul talebim hakkında bilgi almak istiyorum.`}
            placement="lead_status_whatsapp"
          />
        </div>
      </Notice>
    );
  }

  return <StatusView dto={dto} onRefresh={() => void query.refetch()} refreshing={query.isFetching} onVerified={(result) => void handleVerified(result)} />;
}
