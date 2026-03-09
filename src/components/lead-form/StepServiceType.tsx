import { LeadFormData, RESIDENTIAL_SERVICES, COMMERCIAL_SERVICES } from "@/lib/leadFormData";

interface StepServiceTypeProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const StepServiceType = ({ data, onChange }: StepServiceTypeProps) => {
  const services = data.projectType === "commercial" ? COMMERCIAL_SERVICES : RESIDENTIAL_SERVICES;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Ne tür bir hizmet istiyorsunuz?
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Size en uygun firmaları bulmamıza yardımcı olun.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto">
        {services.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange({ serviceType: s.value, scope: [], irrigationType: "", irrigationSystem: "", waterSource: "" })}
            className={`flex flex-col items-center gap-2 p-5 rounded-lg border-2 transition-all font-body text-sm font-medium ${
              data.serviceType === s.value
                ? "border-accent bg-accent/10 shadow-md"
                : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            <span className="text-3xl">{s.icon}</span>
            <span className="text-foreground text-center leading-tight">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepServiceType;
