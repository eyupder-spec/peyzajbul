import { LeadFormData } from "@/lib/leadFormData";
import residentialImg from "@/assets/form/residential.png";
import commercialImg from "@/assets/form/commercial.png";

interface StepProjectTypeProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const options = [
  { value: "residential" as const, label: "Konut", img: residentialImg, desc: "Villa, müstakil ev, site, yazlık" },
  { value: "commercial" as const, label: "Ticari", img: commercialImg, desc: "Otel, AVM, konut projesi, kamu" },
];

const StepProjectType = ({ data, onChange }: StepProjectTypeProps) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all font-body ${
              data.projectType === opt.value
                ? "border-accent bg-accent/5 shadow-md scale-[1.02]"
                : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
            }`}
          >
            <div className="p-4 rounded-full bg-muted/50">
              <img src={opt.img.src} alt={opt.label} className="w-16 h-16 object-contain" />
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-foreground mb-1">{opt.label}</span>
              <span className="block text-xs text-muted-foreground leading-relaxed">{opt.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};


export default StepProjectType;


