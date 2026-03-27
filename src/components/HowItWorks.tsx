import { ClipboardList, PhoneCall, CheckCircle, ChevronRight } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Formu Doldur",
    desc: "Projenizin detaylarını ve ihtiyaçlarınızı bize bildirin.",
  },
  {
    icon: PhoneCall,
    title: "Firmalar Seni Arar",
    desc: "Bölgenizdeki en iyi firmalar sizinle iletişime geçer.",
  },
  {
    icon: CheckCircle,
    title: "En İyi Teklifi Seç",
    desc: "Teklifleri karşılaştırın, en uygun firmayı seçin.",
  },
];

const HowItWorks = () => {
  return (
    <section id="nasil-calisir" className="py-20 bg-primary/8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nasıl Çalışır?
          </h2>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground max-w-xl mx-auto font-body">
            3 kolay adımda hayalinizdeki peyzaj projesine başlayın.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
          {/* Connector lines - desktop only */}
          <div className="hidden md:block absolute top-8 left-[calc(33.33%+0.5rem)] right-[calc(33.33%+0.5rem)] h-px border-t-2 border-dashed border-accent/30" />

          {steps.map((step, i) => (
            <div key={i} className="text-center group relative">
              <div className="relative inline-flex">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300 shadow-sm">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow-md">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm font-body">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
