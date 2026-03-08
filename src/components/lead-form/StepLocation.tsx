import { LeadFormData, TURKISH_CITIES } from "@/lib/leadFormData";

interface StepLocationProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const StepLocation = ({ data, onChange }: StepLocationProps) => {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Projenizin konumu nerede?
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Size yakın firmaları eşleştirebilmemiz için konum bilgisi gereklidir.
      </p>
      <div className="max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">İl *</label>
          <select
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">İl seçiniz</option>
            {TURKISH_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">İlçe</label>
          <input
            type="text"
            value={data.district}
            onChange={(e) => onChange({ district: e.target.value })}
            placeholder="İlçe adı"
            className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-body">Açık Adres (opsiyonel)</label>
          <textarea
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Mahalle, sokak, bina no..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default StepLocation;
