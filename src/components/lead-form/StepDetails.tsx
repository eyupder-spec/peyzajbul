"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ChevronDown, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CURRENT_CONDITION_OPTIONS,
  IRRIGATION_SYSTEM_OPTIONS,
  IRRIGATION_TYPE_OPTIONS,
  LEAD_COPY,
  LEAD_FORM_CONFIG,
  SCOPE_OPTIONS,
  TIMELINE_OPTIONS,
  WATER_SOURCE_OPTIONS,
  budgetsFor,
  propertyTypesFor,
  type LeadFormData,
} from "@/lib/leadFormData";
import ChipGroup from "./ChipGroup";
import FieldError from "./FieldError";
import { ACCEPTED_PHOTO_TYPES, photoFileError } from "./photos";
import TapCheckbox from "./TapCheckbox";

interface StepDetailsProps {
  data: LeadFormData;
  errors: Record<string, string>;
  onChange: (partial: Partial<LeadFormData>) => void;
}

/** Object URLs for the selected photos, revoked as soon as they are replaced or the step unmounts. */
function usePhotoPreviews(photos: File[]): string[] {
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);
  return previews;
}

/** Anything in the optional section that already has a value, e.g. what a calculator link pre-filled. */
function hasOptionalInput(data: LeadFormData): boolean {
  const irrigationInput = data.serviceType === "sulama-sistemi" && Boolean(data.irrigationType || data.irrigationSystem || data.waterSource);
  return Boolean(data.notes || data.scope.length > 0 || data.propertyType || data.currentCondition || data.photos.length > 0 || irrigationInput);
}

/** Step 2: budget and timing are required; everything below the fold is optional. */
export default function StepDetails({ data, errors, onChange }: StepDetailsProps) {
  const previews = usePhotoPreviews(data.photos);
  const scopeOptions = SCOPE_OPTIONS[data.serviceType] ?? [];
  const isIrrigation = data.serviceType === "sulama-sistemi";
  // Open from the start when it holds pre-filled values, so nothing is sent that the visitor has not seen.
  const [optionalOpen, setOptionalOpen] = useState(() => hasOptionalInput(data));

  const toggleScope = (value: string) => {
    onChange({
      scope: data.scope.includes(value) ? data.scope.filter((item) => item !== value) : [...data.scope, value],
    });
  };

  const handlePhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    const room = LEAD_FORM_CONFIG.maxPhotos - data.photos.length;
    if (picked.length > room) toast.error(`En fazla ${LEAD_FORM_CONFIG.maxPhotos} fotoğraf ekleyebilirsiniz.`);
    const accepted: File[] = [];
    for (const file of picked.slice(0, Math.max(room, 0))) {
      const error = photoFileError(file);
      if (error) toast.error(error);
      else accepted.push(file);
    }
    if (accepted.length > 0) onChange({ photos: [...data.photos, ...accepted] });
  };

  return (
    <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <h2 data-step-heading tabIndex={-1} className="font-heading text-xl font-semibold text-foreground outline-none">
        Bütçe ve zamanlama
      </h2>

      <div className="space-y-1.5">
        <p id="lead-label-budget" className="text-sm font-semibold">
          Bütçe aralığı
        </p>
        <ChipGroup
          id="lead-field-budget"
          labelledBy="lead-label-budget"
          options={budgetsFor(data.projectType)}
          value={data.budget}
          onChange={(budget) => onChange({ budget })}
          invalid={Boolean(errors.budget)}
          describedBy={errors.budget ? "lead-error-budget" : undefined}
        />
        <FieldError id="lead-error-budget" message={errors.budget} />
      </div>

      <div className="space-y-1.5">
        <p id="lead-label-timeline" className="text-sm font-semibold">
          Ne zaman başlamak istiyorsunuz?
        </p>
        <ChipGroup
          id="lead-field-timeline"
          labelledBy="lead-label-timeline"
          options={TIMELINE_OPTIONS}
          value={data.timeline}
          onChange={(timeline) => onChange({ timeline })}
          invalid={Boolean(errors.timeline)}
          describedBy={errors.timeline ? "lead-error-timeline" : undefined}
        />
        <FieldError id="lead-error-timeline" message={errors.timeline} />
      </div>

      <details
        data-testid="lead-optional"
        open={optionalOpen}
        onToggle={(event) => setOptionalOpen(event.currentTarget.open)}
        className="group rounded-lg border border-border bg-muted/40"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span>{LEAD_COPY.optionalSummary}</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </summary>

        <div className="space-y-6 border-t border-border p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{LEAD_COPY.optionalHelp}</p>

          <div className="space-y-1.5">
            <p id="lead-label-propertyType" className="text-sm font-semibold">
              Mülk tipi
            </p>
            <ChipGroup
              labelledBy="lead-label-propertyType"
              options={propertyTypesFor(data.projectType)}
              value={data.propertyType}
              onChange={(propertyType) => onChange({ propertyType })}
            />
          </div>

          <div className="space-y-1.5">
            <p id="lead-label-currentCondition" className="text-sm font-semibold">
              Mevcut durum
            </p>
            <ChipGroup
              labelledBy="lead-label-currentCondition"
              options={CURRENT_CONDITION_OPTIONS}
              value={data.currentCondition}
              onChange={(currentCondition) => onChange({ currentCondition })}
            />
          </div>

          {isIrrigation && (
            <>
              <div className="space-y-1.5">
                <p id="lead-label-irrigationType" className="text-sm font-semibold">
                  Sulama için ne yapmak istiyorsunuz?
                </p>
                <ChipGroup
                  labelledBy="lead-label-irrigationType"
                  options={IRRIGATION_TYPE_OPTIONS}
                  value={data.irrigationType}
                  onChange={(irrigationType) => onChange({ irrigationType })}
                />
              </div>
              <div className="space-y-1.5">
                <p id="lead-label-irrigationSystem" className="text-sm font-semibold">
                  Sistem tipi
                </p>
                <ChipGroup
                  labelledBy="lead-label-irrigationSystem"
                  options={IRRIGATION_SYSTEM_OPTIONS}
                  value={data.irrigationSystem}
                  onChange={(irrigationSystem) => onChange({ irrigationSystem })}
                />
              </div>
              <div className="space-y-1.5">
                <p id="lead-label-waterSource" className="text-sm font-semibold">
                  Su kaynağı
                </p>
                <ChipGroup
                  labelledBy="lead-label-waterSource"
                  columns={3}
                  options={WATER_SOURCE_OPTIONS}
                  value={data.waterSource}
                  onChange={(waterSource) => onChange({ waterSource })}
                />
              </div>
            </>
          )}

          {!isIrrigation && scopeOptions.length > 0 && (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold">Hangi işleri kapsıyor? (birden fazla seçebilirsiniz)</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {scopeOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex min-h-11 cursor-pointer items-center rounded-lg border pr-3 text-sm transition-colors duration-150 ${
                      data.scope.includes(option.value) ? "border-accent bg-accent/10" : "border-border bg-card"
                    }`}
                  >
                    <TapCheckbox checked={data.scope.includes(option.value)} onCheckedChange={() => toggleScope(option.value)} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lead-field-notes" className="font-semibold">
              Notunuz
            </Label>
            <Textarea
              id="lead-field-notes"
              rows={3}
              maxLength={1000}
              value={data.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="Projeniz veya beklentileriniz hakkında eklemek istedikleriniz"
              className="resize-none text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Fotoğraf{" "}
              <span className="font-normal text-muted-foreground">
                (en fazla {LEAD_FORM_CONFIG.maxPhotos}, JPG/PNG/WebP, {LEAD_FORM_CONFIG.maxPhotoMb} MB)
              </span>
            </p>
            {previews.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {data.photos.map((file, index) => (
                  <li key={`${file.name}-${file.lastModified}-${index}`} className="space-y-1">
                    {previews[index] && (
                      <img
                        src={previews[index]}
                        alt={`Seçilen fotoğraf ${index + 1}`}
                        className="aspect-square w-full rounded-lg border border-border object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onChange({ photos: data.photos.filter((_, i) => i !== index) })}
                      className="min-h-11 w-full rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Kaldır
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data.photos.length < LEAD_FORM_CONFIG.maxPhotos && (
              <label
                htmlFor="lead-field-photos"
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-background px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                Fotoğraf ekle
                <input
                  id="lead-field-photos"
                  type="file"
                  accept={ACCEPTED_PHOTO_TYPES.join(",")}
                  multiple
                  onChange={handlePhotos}
                  className="sr-only"
                />
              </label>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
