import { LeadFormData } from "@/lib/leadFormData";

interface StepProjectTypeProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const options = [
  { value: "residential" as const, label: "Konut", icon: "🏠", desc: "Villa, müstakil ev, site, yazlık" },
  { value: "commercial" as const, label: "Ticari", icon: "🏢", desc: "Otel, AVM, konut projesi, kamu" },
];

const StepProjectType = ({ data, onChange }: StepProjectTypeProps) => {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Projenizin türü nedir?
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Size en doğru hizmet ve firma eşleşmesi sunabilmemiz için.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ projectType: opt.value, serviceType: "", scope: [], irrigationType: "", irrigationSystem: "", waterSource: "" })}
            className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all font-body ${
              data.projectType === opt.value
                ? "border-accent bg-accent/10 shadow-md"
                : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            <span className="text-5xl">{opt.icon}</span>
            <span className="text-lg font-semibold text-foreground">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepProjectType;
