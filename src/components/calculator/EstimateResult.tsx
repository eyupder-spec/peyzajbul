"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRICE_BENCHMARKS_UPDATED_LABEL, type EstimateResult as EstimateData } from "@/lib/priceBenchmarks";
import { CALCULATOR_PATH, formatTryRange } from "./calcOptions";

export type EstimatePanelState =
  | { kind: "need-city" }
  | { kind: "no-estimate"; message: string; href: string; onClick?: () => void }
  | { kind: "ready"; result: EstimateData };

interface EstimateResultProps {
  /** "card": masaustu/gomulu kart. "bar": mobilde ekranin altina yapisik, detaya acilabilir cubuk. */
  variant: "card" | "bar";
  state: EstimatePanelState;
  onCta: () => void;
  busy: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  className?: string;
}

const CAPTION = `${PRICE_BENCHMARKS_UPDATED_LABEL} editoryal tahmin - bağlayıcı teklif değildir`;
const CTA_LABEL = "Bu arada ücretsiz teklif al";

function Headline({ state, size }: { state: EstimatePanelState; size: "lg" | "md" }) {
  const rangeClass = cn("font-display leading-tight text-primary", size === "lg" ? "text-3xl" : "text-xl");
  return (
    <div aria-live="polite" aria-atomic="true">
      {state.kind === "ready" && (
        <>
          <p className="text-sm text-muted-foreground">Tahmini maliyet</p>
          <p className={rangeClass}>{formatTryRange(state.result.minTry, state.result.maxTry)}</p>
          <p className="text-xs text-muted-foreground">{CAPTION}</p>
        </>
      )}
      {state.kind === "need-city" && (
        <>
          <p className="text-sm text-muted-foreground">Tahmini maliyet</p>
          <p className={cn(rangeClass, size === "lg" ? "text-xl" : "text-base")}>Aralığı görmek için il seçin</p>
        </>
      )}
      {state.kind === "no-estimate" && <p className="text-sm font-medium text-foreground">{state.message}</p>}
    </div>
  );
}

function Details({ result }: { result: EstimateData }) {
  return (
    <div className="space-y-4 text-sm">
      <table className="w-full border-collapse">
        <caption className="sr-only">Kalem bazında tahmini maliyet</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              Kalem
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Tahmini tutar
            </th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((line) => (
            <tr key={line.key} className="border-b border-border/60 align-top">
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                {line.label}
                {line.note && <span className="block text-xs text-muted-foreground">{line.note}</span>}
              </th>
              <td className="py-2 text-right">
                {line.priced ? (
                  <span className="whitespace-nowrap">{formatTryRange(line.minTry, line.maxTry)}</span>
                ) : (
                  <span className="text-muted-foreground">keşifle netleşir</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className="py-2 pr-3 text-left">
              Toplam
            </th>
            <td className="py-2 text-right whitespace-nowrap">{formatTryRange(result.minTry, result.maxTry)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-xs text-muted-foreground">Satır tutarları ayrı ayrı yuvarlanır; toplam ayrıca yuvarlandığı için satırların toplamından küçük farklar olabilir.</p>

      {result.unpricedLabels.length > 0 && (
        <p>
          <span className="font-semibold">Hesaba katılmayanlar:</span> {result.unpricedLabels.join(", ")} (keşifle netleşir).
        </p>
      )}

      <div>
        <p className="mb-1 font-semibold">Varsayımlar</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {result.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </div>

      <details className="group rounded-lg border border-border bg-muted/40 px-3 py-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold">
          Nasıl hesapladık?
          <ChevronDown className="h-4 w-4 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-2 pb-2 text-muted-foreground">
          <p>
            Rakamlar, Peyzajbul rehber yazılarındaki fiyat bilgilerinden ve 2026 piyasa gözlemlerinden türetilen editoryal tahmin aralıklarıdır.
            Teklif verisi değildir; il, kalite seviyesi ve alan büyüklüğüne göre katsayılar uygulanır.
          </p>
          <p>Kesin fiyat, keşif sonrasında firmadan alınır.</p>
          <Link href={`${CALCULATOR_PATH}#yontem`} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
            Yöntemin ayrıntısı
          </Link>
        </div>
      </details>
    </div>
  );
}

function Actions({ state, onCta, busy }: Pick<EstimateResultProps, "state" | "onCta" | "busy">) {
  if (state.kind === "need-city") return null;
  return (
    <div>
      {state.kind === "no-estimate" ? (
        <Button asChild variant="accent" size="lg" className="w-full">
          <Link href={state.href} onClick={state.onClick}>
            Doğrudan teklif alın
          </Link>
        </Button>
      ) : (
        <Button variant="accent" size="lg" className="w-full" onClick={onCta} disabled={busy}>
          {busy && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
          {CTA_LABEL}
        </Button>
      )}
    </div>
  );
}

export function EstimateResultPanel({ variant, state, onCta, busy, expanded = false, onToggleExpanded, className }: EstimateResultProps) {
  if (variant === "card") {
    return (
      <div className={cn("space-y-4 rounded-xl border border-border bg-card p-5 shadow-card", className)}>
        <Headline state={state} size="lg" />
        {state.kind === "ready" && <Details result={state.result} />}
        <Actions state={state} onCta={onCta} busy={busy} />
      </div>
    );
  }

  const canExpand = state.kind === "ready" && onToggleExpanded !== undefined;
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-lift", className)}>
      {expanded && state.kind === "ready" && (
        <div id="estimate-details" className="max-h-[55vh] overflow-y-auto px-4 pt-4 motion-safe:animate-fade-in">
          <Details result={state.result} />
        </div>
      )}
      <div className="px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-start justify-between gap-3">
          <Headline state={state} size="md" />
          {canExpand && (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              aria-controls="estimate-details"
              aria-label={expanded ? "Kalem detaylarını gizle" : "Kalem detaylarını göster"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary"
            >
              {expanded ? <ChevronDown className="h-5 w-5" aria-hidden="true" /> : <ChevronUp className="h-5 w-5" aria-hidden="true" />}
            </button>
          )}
        </div>
        <Actions state={state} onCta={onCta} busy={busy} />
      </div>
    </div>
  );
}
