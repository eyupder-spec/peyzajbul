import { useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { LeadFormData, TURKISH_CITIES, RESIDENTIAL_PROPERTY_TYPES, COMMERCIAL_PROPERTY_TYPES, RESIDENTIAL_AREA_SIZES, COMMERCIAL_AREA_SIZES, CURRENT_CONDITION_OPTIONS, RESIDENTIAL_BUDGETS, COMMERCIAL_BUDGETS, TIMELINE_OPTIONS } from "@/lib/leadFormData";
import { DISTRICTS_BY_CITY } from "@/lib/districts";
import { toast } from "sonner";

interface StepProjectDetailsProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 10;

const RadioGroup = ({ label, options, value, onSelect }: { label: string; options: { value: string; label: string }[]; value: string; onSelect: (v: string) => void }) => (
  <div>
    <label className="block text-sm font-semibold text-foreground mb-2 font-body">{label}</label>
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`p-2.5 rounded-md border-2 transition-all font-body text-xs text-center ${
            value === opt.value
              ? "border-accent bg-accent/10 shadow-sm"
              : "border-border bg-card hover:border-primary/30"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const StepProjectDetails = ({ data, onChange }: StepProjectDetailsProps) => {
  const isCommercial = data.projectType === "commercial";
  const availableDistricts = data.city ? (DISTRICTS_BY_CITY[data.city] || []) : [];

  const propertyTypes = isCommercial ? COMMERCIAL_PROPERTY_TYPES : RESIDENTIAL_PROPERTY_TYPES;
  const areaSizes = isCommercial ? COMMERCIAL_AREA_SIZES : RESIDENTIAL_AREA_SIZES;
  const budgets = isCommercial ? COMMERCIAL_BUDGETS : RESIDENTIAL_BUDGETS;

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - data.photos.length;
    if (files.length > remaining) {
      toast.error(`En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsiniz.`);
    }
    const validFiles = files.slice(0, remaining).filter((f) => {
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        toast.error(`${f.name}: Sadece JPG/PNG kabul edilir.`);
        return false;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name}: Dosya boyutu ${MAX_SIZE_MB}MB'dan büyük.`);
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      onChange({ photos: [...data.photos, ...validFiles] });
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    onChange({ photos: data.photos.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Proje Detayları
      </h2>
      <p className="text-muted-foreground text-center mb-6 font-body text-sm">
        Firmaların size doğru teklif verebilmesi için.
      </p>
      <div className="max-w-md mx-auto space-y-5">
        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 font-body">İl *</label>
            <select
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value, district: "" })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">İl seçiniz</option>
              {TURKISH_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 font-body">İlçe</label>
            <select
              value={data.district}
              onChange={(e) => onChange({ district: e.target.value })}
              disabled={!data.city}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{data.city ? "İlçe seçiniz" : "Önce il seçiniz"}</option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <RadioGroup label="Mülk Tipi *" options={propertyTypes} value={data.propertyType} onSelect={(v) => onChange({ propertyType: v })} />
        <RadioGroup label="Alan Büyüklüğü *" options={areaSizes} value={data.areaSize} onSelect={(v) => onChange({ areaSize: v })} />
        <RadioGroup label="Mevcut Durum *" options={CURRENT_CONDITION_OPTIONS} value={data.currentCondition} onSelect={(v) => onChange({ currentCondition: v })} />
        <RadioGroup label="Bütçe *" options={budgets} value={data.budget} onSelect={(v) => onChange({ budget: v })} />
        <RadioGroup label="Başlangıç Zamanı *" options={TIMELINE_OPTIONS} value={data.timeline} onSelect={(v) => onChange({ timeline: v })} />

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 font-body">
            Fotoğraf (opsiyonel, max {MAX_PHOTOS})
          </label>
          {data.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {data.photos.map((file, i) => (
                <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {data.photos.length < MAX_PHOTOS && (
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-dashed border-input bg-card cursor-pointer hover:border-primary/30 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-body">Fotoğraf yükle (JPG/PNG, max {MAX_SIZE_MB}MB)</span>
              <input type="file" accept="image/jpeg,image/png" multiple onChange={handlePhotoAdd} className="hidden" />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5 font-body">Ek Notlar (opsiyonel)</label>
          <textarea
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Projeniz hakkında eklemek istediğiniz bilgiler..."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default StepProjectDetails;
