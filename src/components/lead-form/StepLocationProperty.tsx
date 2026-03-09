import { LeadFormData, TURKISH_CITIES, RESIDENTIAL_PROPERTY_TYPES, COMMERCIAL_PROPERTY_TYPES, RESIDENTIAL_AREA_SIZES, COMMERCIAL_AREA_SIZES } from "@/lib/leadFormData";
import { DISTRICTS_BY_CITY } from "@/lib/districts";

interface StepLocationPropertyProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

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

const StepLocationProperty = ({ data, onChange }: StepLocationPropertyProps) => {
  const isCommercial = data.projectType === "commercial";
  const availableDistricts = data.city ? (DISTRICTS_BY_CITY[data.city] || []) : [];
  const propertyTypes = isCommercial ? COMMERCIAL_PROPERTY_TYPES : RESIDENTIAL_PROPERTY_TYPES;
  const areaSizes = isCommercial ? COMMERCIAL_AREA_SIZES : RESIDENTIAL_AREA_SIZES;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Konum ve Mülk Bilgileri
      </h2>
      <p className="text-muted-foreground text-center mb-6 font-body text-sm">
        Size yakın firmaları eşleştirebilmemiz için.
      </p>
      <div className="max-w-md mx-auto space-y-5">
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
      </div>
    </div>
  );
};

export default StepLocationProperty;
