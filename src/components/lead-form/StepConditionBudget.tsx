import { LeadFormData, CURRENT_CONDITION_OPTIONS, RESIDENTIAL_BUDGETS, COMMERCIAL_BUDGETS } from "@/lib/leadFormData";

interface StepConditionBudgetProps {
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

const StepConditionBudget = ({ data, onChange }: StepConditionBudgetProps) => {
  const isCommercial = data.projectType === "commercial";
  const budgets = isCommercial ? COMMERCIAL_BUDGETS : RESIDENTIAL_BUDGETS;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Mevcut Durum ve Bütçe
      </h2>
      <p className="text-muted-foreground text-center mb-6 font-body text-sm">
        Firmaların size doğru teklif verebilmesi için.
      </p>
      <div className="max-w-md mx-auto space-y-5">
        <RadioGroup label="Mevcut Durum *" options={CURRENT_CONDITION_OPTIONS} value={data.currentCondition} onSelect={(v) => onChange({ currentCondition: v })} />
        <RadioGroup label="Bütçe *" options={budgets} value={data.budget} onSelect={(v) => onChange({ budget: v })} />
      </div>
    </div>
  );
};

export default StepConditionBudget;
