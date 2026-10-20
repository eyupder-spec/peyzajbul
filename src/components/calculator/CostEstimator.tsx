"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampArea,
  computeEstimate,
  getAreaLimits,
  toAreaBucket,
  toBudgetBucket,
  type CalcInputs,
  type CalcService,
  type HardShare,
  type IrrigationKind,
  type QualityTier,
} from "@/lib/priceBenchmarks";
import {
  CITY_OPTIONS,
  DEFAULT_GARDEN_ADD_ONS,
  GARDEN_ADD_ONS,
  HARD_MATERIAL_OPTIONS,
  HARD_SHARE_OPTIONS,
  IRRIGATION_OPTIONS,
  LEAD_FORM_PATH,
  NO_ESTIMATE_MESSAGE,
  SERVICE_CHIPS,
  TIER_OPTIONS,
  type CalculatorPreset,
  type HardMaterialChoice,
} from "./calcOptions";
import { EstimateResultPanel, type EstimatePanelState } from "./EstimateResult";
import { buildDirectLeadQuery, buildLeadPrefillQuery } from "./prefill";
import { saveEstimate } from "./saveEstimate";
import { trackEvent } from "./track";

export interface CostEstimatorProps {
  preset?: CalculatorPreset;
  /** Hizmet/blog sayfalarina gomme: tek sutun, ekrana yapisik cubuk yok, sonuc formun altinda. */
  compact?: boolean;
  /** Takip icin: hesaplayicinin hangi sayfada gosterildigi (ornek: 'maliyet-hesapla-page'). */
  source: string;
}

const DEFAULT_AREA = 150;
const DEBOUNCE_MS = 150;
const RESULT_EVENT_DELAY_MS = 1200;
const NO_MATERIAL_MESSAGE = "Bu malzeme için fiyat aralığı yok - doğrudan teklif alın";

function parseArea(text: string): number {
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) ? value : 0;
}

function Choice({
  type,
  name,
  checked,
  onChange,
  children,
  className,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className="block cursor-pointer">
      <input type={type} name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={cn(
          "flex min-h-11 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-center text-sm font-medium peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          className,
        )}
      >
        {children}
      </span>
    </label>
  );
}

function Group({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-1 text-base font-semibold text-foreground">{legend}</legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

const fieldClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground";

export default function CostEstimator({ preset, compact = false, source }: CostEstimatorProps) {
  const router = useRouter();
  const [serviceValue, setServiceValue] = useState<string>(preset?.hizmet ?? "bahce-tasarimi");
  const [areaText, setAreaText] = useState(String(preset?.m2 ?? DEFAULT_AREA));
  const [citySlug, setCitySlug] = useState(preset?.il ?? "");
  const [ilce, setIlce] = useState(preset?.ilce ?? "");
  const [tier, setTier] = useState<QualityTier>("standart");
  const [addOns, setAddOns] = useState<string[]>([...DEFAULT_GARDEN_ADD_ONS]);
  const [hardShare, setHardShare] = useState<HardShare>("orta");
  const [irrigation, setIrrigation] = useState<IrrigationKind>("yagmurlama");
  const [hardMaterial, setHardMaterial] = useState<HardMaterialChoice>("parke-tasi");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [formVisible, setFormVisible] = useState(true);

  const chip = SERVICE_CHIPS.find((entry) => entry.value === serviceValue) ?? SERVICE_CHIPS[0];
  const calcService: CalcService | undefined = chip.calc;
  const limits = getAreaLimits(calcService ?? "bahce-tasarimi");
  const area = clampArea(calcService ?? "bahce-tasarimi", parseArea(areaText));
  const showServiceChips = !(compact && preset?.hizmet);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    trackEvent("calc_start", { source });
  };

  // Mobilde sonuc cubugu ekrana sabittir; form ekrandan ciktiginda (yontem, SSS, footer) alttaki icerigi ve
  // alakasiz bolumlerin ustunde teklif butonunu kapatmamasi icin gizlenir.
  useEffect(() => {
    const node = formRef.current;
    if (compact || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact]);

  const inputs = useMemo<CalcInputs | null>(() => {
    if (!calcService || !citySlug) return null;
    return {
      service: calcService,
      areaM2: area,
      citySlug,
      tier,
      addOns,
      hardShare,
      irrigation,
      hardMaterial: hardMaterial === "diger" ? undefined : hardMaterial,
    };
  }, [calcService, citySlug, area, tier, addOns, hardShare, irrigation, hardMaterial]);

  // Panelin durumu (il secili mi, bu secim icin fiyat var mi) anlik girdiden turetilir; yalnizca gosterilen rakam
  // 150 ms gecikmeyle guncellenir. Boylece motor henuz calismamisken yanlis "fiyat yok" mesaji gorunmez.
  const estimate = useMemo(() => (inputs ? { inputs, result: computeEstimate(inputs) } : null), [inputs]);
  const [settled, setSettled] = useState(estimate);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(estimate), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [estimate]);

  useEffect(() => {
    if (!settled?.result) return;
    const { inputs: settledInputs, result: settledResult } = settled;
    const timer = window.setTimeout(() => {
      trackEvent("calc_result", {
        source,
        service: settledInputs.service,
        area_bucket: toAreaBucket(settledInputs.areaM2),
        il: settledInputs.citySlug,
        tier: settledInputs.tier,
        mid_bucket: toBudgetBucket(settledResult.midTry),
      });
    }, RESULT_EVENT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [settled, source]);

  const directHref = `${LEAD_FORM_PATH}?${buildDirectLeadQuery(serviceValue, { citySlug, ilce, areaM2: area }).toString()}`;

  let panelState: EstimatePanelState;
  if (!calcService) {
    panelState = {
      kind: "no-estimate",
      message: NO_ESTIMATE_MESSAGE,
      href: directHref,
      onClick: () => trackEvent("calc_cta_click", { source, service: serviceValue, estimate: false }),
    };
  } else if (!estimate) {
    panelState = { kind: "need-city" };
  } else if (estimate.result) {
    panelState = { kind: "ready", result: settled?.result ?? estimate.result };
  } else {
    panelState = {
      kind: "no-estimate",
      message: NO_MATERIAL_MESSAGE,
      href: directHref,
      onClick: () => trackEvent("calc_cta_click", { source, service: serviceValue, estimate: false }),
    };
  }

  const handleCta = async () => {
    if (busy || !estimate?.result) return;
    const { inputs: current, result: currentResult } = estimate;
    setBusy(true);
    try {
      trackEvent("calc_cta_click", {
        source,
        service: current.service,
        area_bucket: toAreaBucket(current.areaM2),
        il: current.citySlug,
        tier: current.tier,
        mid_bucket: toBudgetBucket(currentResult.midTry),
        estimate: true,
      });
      const token = await saveEstimate(current, currentResult);
      const query = buildLeadPrefillQuery(current, currentResult, { estimateToken: token ?? undefined, ilce });
      router.push(`${LEAD_FORM_PATH}?${query.toString()}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleAddOn = (value: string) => {
    markStarted();
    setAddOns((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]));
  };

  const selectService = (value: string) => {
    markStarted();
    setServiceValue(value);
    const next = SERVICE_CHIPS.find((entry) => entry.value === value)?.calc ?? "bahce-tasarimi";
    setAreaText(String(clampArea(next, parseArea(areaText))));
  };

  const areaLabel =
    calcService === "sulama-sistemi" ? "Sulanacak alan" : calcService === "sert-zemin" ? "Kaplanacak yüzey" : "Bahçe alanı";
  const showGardenOptions = calcService === "bahce-tasarimi";
  const showIrrigationChips = calcService === "sulama-sistemi" || (showGardenOptions && addOns.includes("sulama-sistemi"));

  return (
    <div className={cn(!compact && "pb-44 lg:pb-0")}>
      <div ref={formRef} className={cn("grid gap-8", !compact && "lg:grid-cols-[minmax(0,1fr)_400px]")}>
        <div className="min-w-0 space-y-8">
          {showServiceChips && (
            <Group legend="1. Hangi hizmet için fiyat arıyorsunuz?">
              <div role="radiogroup" aria-label="Hizmet" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SERVICE_CHIPS.map((entry) => (
                  <Choice key={entry.value} type="radio" name="calc-hizmet" checked={serviceValue === entry.value} onChange={() => selectService(entry.value)}>
                    {entry.label}
                  </Choice>
                ))}
              </div>
            </Group>
          )}

          <Group legend={`${areaLabel} (m²)`} hint={`${limits.min} - ${limits.max} m² arasında girebilirsiniz.`}>
            <div className="flex items-center gap-4">
              <input
                type="range"
                aria-label={`${areaLabel} (m²), kaydırıcı`}
                min={limits.min}
                max={limits.max}
                step={5}
                value={area}
                onChange={(event) => {
                  markStarted();
                  setAreaText(event.target.value);
                }}
                className="h-11 min-w-0 flex-1 cursor-pointer accent-primary"
              />
              <div className="flex shrink-0 items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label={`${areaLabel} (m²)`}
                  value={areaText}
                  onChange={(event) => {
                    markStarted();
                    setAreaText(event.target.value.replace(/\D/g, "").slice(0, 4));
                  }}
                  onBlur={() => setAreaText(String(area))}
                  className={cn(fieldClass, "w-24 text-right")}
                />
                <span className="text-sm text-muted-foreground">m²</span>
              </div>
            </div>
          </Group>

          <Group legend="Konum">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">İl</span>
                <select
                  value={citySlug}
                  onChange={(event) => {
                    markStarted();
                    setCitySlug(event.target.value);
                  }}
                  className={fieldClass}
                >
                  <option value="">İl seçin</option>
                  {CITY_OPTIONS.map((city) => (
                    <option key={city.slug} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">İlçe (isteğe bağlı)</span>
                <input
                  type="text"
                  value={ilce}
                  maxLength={40}
                  autoComplete="off"
                  onChange={(event) => setIlce(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          </Group>

          {calcService && (
            <Group legend="Kalite seviyesi">
              <div role="radiogroup" aria-label="Kalite seviyesi" className="grid gap-2 sm:grid-cols-3">
                {TIER_OPTIONS.map((option) => (
                  <Choice
                    key={option.value}
                    type="radio"
                    name="calc-kalite"
                    checked={tier === option.value}
                    onChange={() => {
                      markStarted();
                      setTier(option.value);
                    }}
                    className="h-full flex-col items-start gap-0.5 text-left"
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-xs font-normal opacity-80">{option.description}</span>
                  </Choice>
                ))}
              </div>
            </Group>
          )}

          {showGardenOptions && (
            <Group legend="Kapsam" hint="Hesaba katılacak işleri seçin. Fiyatı olmayan işler toplama girmez, keşifle netleşir.">
              <div className="grid gap-2 sm:grid-cols-2">
                {GARDEN_ADD_ONS.map((option) => (
                  <label key={option.value} className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 py-2">
                    <input
                      type="checkbox"
                      checked={addOns.includes(option.value)}
                      onChange={() => toggleAddOn(option.value)}
                      className="peer absolute -left-px -top-px z-10 h-[calc(100%+2px)] w-[calc(100%+2px)] cursor-pointer opacity-0"
                    />
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 rounded border border-primary bg-background peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                    />
                    <Check
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground opacity-0 peer-checked:opacity-100"
                    />
                    <span className="text-sm">
                      {option.label}
                      {!option.priced && <span className="block text-xs text-muted-foreground">keşifle netleşir</span>}
                    </span>
                  </label>
                ))}
              </div>

              {addOns.includes("tas-ahsap-zemin") && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium">Sert zemin payı (alanın ne kadarı taş/ahşap olacak?)</p>
                  <div role="radiogroup" aria-label="Sert zemin payı" className="grid grid-cols-3 gap-2">
                    {HARD_SHARE_OPTIONS.map((option) => (
                      <Choice
                        key={option.value}
                        type="radio"
                        name="calc-sert-pay"
                        checked={hardShare === option.value}
                        onChange={() => {
                          markStarted();
                          setHardShare(option.value);
                        }}
                      >
                        {option.label}
                      </Choice>
                    ))}
                  </div>
                </div>
              )}
            </Group>
          )}

          {showIrrigationChips && (
            <Group legend="Sulama sistemi türü">
              <div role="radiogroup" aria-label="Sulama sistemi türü" className="grid gap-2 sm:grid-cols-3">
                {IRRIGATION_OPTIONS.map((option) => (
                  <Choice
                    key={option.value}
                    type="radio"
                    name="calc-sulama"
                    checked={irrigation === option.value}
                    onChange={() => {
                      markStarted();
                      setIrrigation(option.value);
                    }}
                  >
                    {option.label}
                  </Choice>
                ))}
              </div>
            </Group>
          )}

          {calcService === "sert-zemin" && (
            <Group legend="Zemin malzemesi" hint="Yalnızca fiyat bilgisi olan malzemeler için aralık gösterilir.">
              <div role="radiogroup" aria-label="Zemin malzemesi" className="grid gap-2 sm:grid-cols-2">
                {HARD_MATERIAL_OPTIONS.map((option) => (
                  <Choice
                    key={option.value}
                    type="radio"
                    name="calc-malzeme"
                    checked={hardMaterial === option.value}
                    onChange={() => {
                      markStarted();
                      setHardMaterial(option.value);
                    }}
                  >
                    {option.label}
                  </Choice>
                ))}
              </div>
            </Group>
          )}
        </div>

        {compact ? (
          <EstimateResultPanel variant="card" state={panelState} onCta={handleCta} busy={busy} />
        ) : (
          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <EstimateResultPanel variant="card" state={panelState} onCta={handleCta} busy={busy} />
            </div>
          </div>
        )}
      </div>

      {!compact && formVisible && (
        <EstimateResultPanel
          variant="bar"
          className="lg:hidden"
          state={panelState}
          onCta={handleCta}
          busy={busy}
          expanded={expanded}
          onToggleExpanded={() => setExpanded((value) => !value)}
        />
      )}
    </div>
  );
}
