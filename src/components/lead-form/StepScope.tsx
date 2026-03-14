import { LeadFormData, SCOPE_OPTIONS, IRRIGATION_TYPE_OPTIONS, IRRIGATION_SYSTEM_OPTIONS, WATER_SOURCE_OPTIONS } from "@/lib/leadFormData";
import { Checkbox } from "@/components/ui/checkbox";

interface StepScopeProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const StepScope = ({ data, onChange }: StepScopeProps) => {
  const isIrrigation = data.serviceType === "sulama-sistemi";
  const scopeOptions = SCOPE_OPTIONS[data.serviceType] || [];

  const toggleScope = (value: string) => {
    const current = data.scope;
    if (current.includes(value)) {
      onChange({ scope: current.filter((v) => v !== value) });
    } else {
      onChange({ scope: [...current, value] });
    }
  };

  if (isIrrigation) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
          Sulama sistemi detayları
        </h2>
        <p className="text-muted-foreground text-center mb-8 font-body text-sm">
          İhtiyacınıza en uygun teklifi alabilmeniz için.
        </p>
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 font-body">Ne yapmak istiyorsunuz?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {IRRIGATION_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ irrigationType: opt.value })}
                  className={`p-3 rounded-xl border-2 transition-all font-body text-sm text-center ${
                    data.irrigationType === opt.value
                      ? "border-accent bg-accent/5 shadow-sm scale-[1.02]"
                      : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 font-body">Sistem tipi</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {IRRIGATION_SYSTEM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ irrigationSystem: opt.value })}
                  className={`p-3 rounded-xl border-2 transition-all font-body text-sm text-center ${
                    data.irrigationSystem === opt.value
                      ? "border-accent bg-accent/5 shadow-sm scale-[1.02]"
                      : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 font-body">Su kaynağı</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WATER_SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ waterSource: opt.value })}
                  className={`p-3 rounded-xl border-2 transition-all font-body text-sm text-center ${
                    data.waterSource === opt.value
                      ? "border-accent bg-accent/5 shadow-sm scale-[1.02]"
                      : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scopeOptions.length === 0) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
          Detaylı bilgi
        </h2>
        <p className="text-muted-foreground text-center mb-4 font-body text-sm">
          Bu hizmet için ek kapsam bilgisi gerekmemektedir. Devam edebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Hangi işleri kapsıyor?
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Birden fazla seçebilirsiniz.
      </p>
      <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
        {scopeOptions.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer font-body text-sm ${
              data.scope.includes(opt.value)
                ? "border-accent bg-accent/5 scale-[1.02]"
                : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
            }`}
          >
            <Checkbox
              checked={data.scope.includes(opt.value)}
              onCheckedChange={() => toggleScope(opt.value)}
            />
            <span className="text-foreground font-medium">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};


export default StepScope;
