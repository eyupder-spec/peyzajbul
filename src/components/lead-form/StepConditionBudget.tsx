import { LeadFormData, CURRENT_CONDITION_OPTIONS, RESIDENTIAL_BUDGETS, COMMERCIAL_BUDGETS } from "@/lib/leadFormData";

interface StepConditionBudgetProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const RadioGroup = ({ label, options, value, onSelect }: { label: string; options: { value: string; label: string }[]; value: string; onSelect: (v: string) => void }) => (
  <div className="space-y-3">
    <label className="block text-sm font-semibold text-foreground font-body">{label}</label>
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`p-4 rounded-xl border-2 transition-all font-body text-xs text-center ${
            value === opt.value
              ? "border-accent bg-accent/5 shadow-sm scale-[1.02]"
              : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
          }`}
        >
          <span className="font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const StepConditionBudget = ({ data, onChange }: StepConditionBudgetProps) => {
  const isCommercial = data.projectType === "commercial";
  const budgets = isCommercial ? COMMERCIAL_BUDGETS : RESIDENTIAL_BUDGETS;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Mevcut Durum ve Bütçe
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Projeniz için ayırdığınız bütçeye en yakın firmaları önereceğiz.
      </p>
      <div className="max-w-md mx-auto space-y-8">
        <RadioGroup label="Mevcut Durum *" options={CURRENT_CONDITION_OPTIONS} value={data.currentCondition} onSelect={(v) => onChange({ currentCondition: v })} />
        <RadioGroup label="Hedeflenen Bütçe *" options={budgets} value={data.budget} onSelect={(v) => onChange({ budget: v })} />
      </div>
    </div>
  );
};


export default StepConditionBudget;
