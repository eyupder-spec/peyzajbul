import { LeadFormData } from "@/lib/leadFormData";

interface StepOptionProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
  field: keyof LeadFormData;
  question: string;
  subtitle?: string;
  options: { value: string; label: string }[];
}

const StepOption = ({ data, onChange, field, question, subtitle, options }: StepOptionProps) => {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        {question}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground text-center mb-8 font-body text-sm">{subtitle}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ [field]: opt.value })}
            className={`p-4 rounded-lg border-2 transition-all font-body text-sm font-medium text-center ${
              data[field] === opt.value
                ? "border-accent bg-accent/10 shadow-md"
                : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepOption;
