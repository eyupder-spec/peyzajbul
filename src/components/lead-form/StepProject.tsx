"use client";

import Image, { type StaticImageData } from "next/image";
import { DISTRICTS_BY_CITY } from "@/lib/districts";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { areaSizesFor, servicesFor, type LeadFormData } from "@/lib/leadFormData";
import { cn } from "@/lib/utils";
import ChipGroup from "./ChipGroup";
import CityCombobox from "./CityCombobox";
import CoverageNote from "./CoverageNote";
import FieldError from "./FieldError";
import { NO_MOTION_WHEN_REDUCED } from "./motion";

import bahceTasarimiImg from "@/assets/form/bahce-tasarimi.png";
import bahceBakimiImg from "@/assets/form/bahce-bakimi.png";
import sulamaSistemiImg from "@/assets/form/sulama-sistemi.png";
import sertZeminImg from "@/assets/form/sert-zemin.png";
import bitkiAgacImg from "@/assets/form/bitki-agac.png";
import havuzCevresiImg from "@/assets/form/havuz-cevresi.png";
import projeTasarimImg from "@/assets/form/proje-tasarim.png";
import sadeceUygulamaImg from "@/assets/form/sadece-uygulama.png";
import yesilCatiImg from "@/assets/form/yesil-cati.png";
import otoparkYolImg from "@/assets/form/otopark-yol.png";
import periyodikBakimImg from "@/assets/form/periyodik-bakim.png";

const SERVICE_IMAGES: Record<string, StaticImageData> = {
  "bahce-tasarimi": bahceTasarimiImg,
  "bahce-bakimi": bahceBakimiImg,
  "sulama-sistemi": sulamaSistemiImg,
  "sert-zemin": sertZeminImg,
  "bitki-agac": bitkiAgacImg,
  "havuz-cevresi": havuzCevresiImg,
  "proje-tasarim-uygulama": projeTasarimImg,
  "sadece-uygulama": sadeceUygulamaImg,
  "yesil-cati-teras": yesilCatiImg,
  "otopark-yol": otoparkYolImg,
  "havuz-cevresi-ticari": havuzCevresiImg,
  "periyodik-bakim": periyodikBakimImg,
};

const PROJECT_TYPE_OPTIONS = [
  { value: "residential", label: "Konut" },
  { value: "commercial", label: "Ticari" },
];

interface StepProjectProps {
  data: LeadFormData;
  errors: Record<string, string>;
  onChange: (partial: Partial<LeadFormData>) => void;
  /** Live number of listed firms in the selected province (null while unknown). */
  coverageCount: number | null;
}

/** Step 1: what, where and how big. */
export default function StepProject({ data, errors, onChange, coverageCount }: StepProjectProps) {
  const districts = data.city ? (DISTRICTS_BY_CITY[data.city] ?? []) : [];

  const serviceOptions = servicesFor(data.projectType).map((service) => {
    const image = SERVICE_IMAGES[service.value];
    return {
      value: service.value,
      label: service.label,
      icon: image ? <Image src={image} alt="" width={48} height={48} sizes="48px" className="h-12 w-12 object-contain" /> : undefined,
    };
  });

  return (
    <div className="space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <h2 data-step-heading tabIndex={-1} className="font-heading text-xl font-semibold text-foreground outline-none">
        Ne yaptırmak istiyorsunuz?
      </h2>

      <ChipGroup
        label="Proje türü"
        options={PROJECT_TYPE_OPTIONS}
        value={data.projectType}
        onChange={(value) =>
          onChange({
            projectType: value === "commercial" ? "commercial" : "residential",
            serviceType: "",
            areaSize: "",
            budget: "",
            propertyType: "",
            scope: [],
            irrigationType: "",
            irrigationSystem: "",
            waterSource: "",
          })
        }
      />

      <div>
        <ChipGroup
          id="lead-field-serviceType"
          label="Hizmet türü"
          variant="tile"
          columns={3}
          options={serviceOptions}
          value={data.serviceType}
          onChange={(value) =>
            onChange({ serviceType: value, scope: [], irrigationType: "", irrigationSystem: "", waterSource: "" })
          }
          invalid={Boolean(errors.serviceType)}
          describedBy={errors.serviceType ? "lead-error-serviceType" : undefined}
        />
        <FieldError id="lead-error-serviceType" message={errors.serviceType} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-field-city" className="font-semibold">
            İl
          </Label>
          <CityCombobox
            id="lead-field-city"
            value={data.city}
            onChange={(city) => onChange({ city, district: "" })}
            invalid={Boolean(errors.city)}
            describedBy={errors.city ? "lead-error-city" : undefined}
          />
          <FieldError id="lead-error-city" message={errors.city} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-field-district" className="font-semibold">
            İlçe <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
          </Label>
          <Select value={data.district} onValueChange={(district) => onChange({ district })} disabled={!data.city}>
            <SelectTrigger id="lead-field-district" className="h-11">
              <SelectValue placeholder={data.city ? "İlçe seçin" : "Önce il seçin"} />
            </SelectTrigger>
            <SelectContent className={cn("z-[120] max-h-64", NO_MOTION_WHEN_REDUCED)}>
              {districts.map((district) => (
                <SelectItem key={district} value={district} className="min-h-11">
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <CoverageNote city={data.city} count={coverageCount} />

      <div className="space-y-1.5">
        <p id="lead-label-areaSize" className="text-sm font-semibold">
          Alan büyüklüğü
        </p>
        <ChipGroup
          id="lead-field-areaSize"
          labelledBy="lead-label-areaSize"
          options={areaSizesFor(data.projectType)}
          value={data.areaSize}
          onChange={(areaSize) => onChange({ areaSize })}
          invalid={Boolean(errors.areaSize)}
          describedBy={errors.areaSize ? "lead-error-areaSize" : undefined}
        />
        <FieldError id="lead-error-areaSize" message={errors.areaSize} />
      </div>
    </div>
  );
}
