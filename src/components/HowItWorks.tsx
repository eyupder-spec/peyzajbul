import { ClipboardList, PhoneCall, CheckCircle } from "lucide-react";

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
    <section id="nasil-calisir" className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Nasıl Çalışır?
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-14">
          3 kolay adımda hayalinizdeki peyzaj projesine başlayın.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center group">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="text-xs font-semibold text-accent mb-2 uppercase tracking-wider font-body">
                Adım {i + 1}
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
