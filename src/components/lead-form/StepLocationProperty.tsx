import { LeadFormData, TURKISH_CITIES, RESIDENTIAL_PROPERTY_TYPES, COMMERCIAL_PROPERTY_TYPES, RESIDENTIAL_AREA_SIZES, COMMERCIAL_AREA_SIZES } from "@/lib/leadFormData";
import { DISTRICTS_BY_CITY } from "@/lib/districts";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StepLocationPropertyProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const RadioGroup = ({ label, options, value, onSelect }: { label: string; options: { value: string; label: string }[]; value: string; onSelect: (v: string) => void }) => (
  <div>
    <Label className="block text-sm font-semibold text-foreground mb-3 font-body">{label}</Label>
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`p-3 rounded-xl border-2 transition-all font-body text-xs text-center ${
            value === opt.value
              ? "border-accent bg-accent/5 shadow-sm scale-[1.02]"
              : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Konum ve Mülk Bilgileri
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Hedeflediğiniz bölgeye en yakın uzman firmalarımızı bulalım.
      </p>
      <div className="max-w-md mx-auto space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold font-body">İl *</Label>
            <Select value={data.city} onValueChange={(val) => onChange({ city: val, district: "" })}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="İl seçiniz" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] z-[9999]">
                {TURKISH_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold font-body">İlçe</Label>
            <Select 
              value={data.district} 
              onValueChange={(val) => onChange({ district: val })}
              disabled={!data.city}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder={data.city ? "İlçe seçiniz" : "Önce il seçiniz"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] z-[9999]">
                {availableDistricts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <RadioGroup label="Mülk Tipi *" options={propertyTypes} value={data.propertyType} onSelect={(v) => onChange({ propertyType: v })} />
        <RadioGroup label="Alan Büyüklüğü *" options={areaSizes} value={data.areaSize} onSelect={(v) => onChange({ areaSize: v })} />
      </div>
    </div>
  );
};


export default StepLocationProperty;

