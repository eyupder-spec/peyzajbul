import { ClipboardList, Handshake, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: ClipboardList,
    title: "Projenizi anlatın",
    desc: "Hizmet, il ve alan büyüklüğü gibi birkaç soruyu yanıtlayın.",
  },
  {
    icon: Send,
    title: "Talebiniz firmalara iletilir",
    desc: "Talebinizi doğruladıktan sonra bölgenizdeki ilgili firmalara gönderilir.",
  },
  {
    icon: Handshake,
    title: "Teklifleri karşılaştırın",
    desc: "Firmalarla görüşün, size uygun teklifi seçin. Teklif almak ücretsiz ve bağlayıcı değildir.",
  },
];

interface HowItWorksProps {
  onTeklifAl: () => void;
}

const HowItWorks = ({ onTeklifAl }: HowItWorksProps) => {
  return (
    <section id="nasil-calisir" className="bg-muted py-20">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold text-foreground md:text-4xl">Nasıl Çalışır?</h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Talebinizi bırakın, teklifleri kendi hızınızda değerlendirin.
          </p>
        </div>
        <div className="relative mx-auto max-w-4xl">
          {/* Connector line, desktop only */}
          <div
            aria-hidden
            className="absolute left-[calc(33.33%+0.5rem)] right-[calc(33.33%+0.5rem)] top-8 hidden h-px border-t-2 border-dashed border-primary/20 md:block"
          />
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="relative text-center">
                <div className="relative mb-5 inline-flex">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-primary ring-1 ring-border">
                    <step.icon aria-hidden className="h-7 w-7" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-12 text-center">
          <Button variant="accent" size="lg" className="px-8 text-base" onClick={onTeklifAl}>
            Ücretsiz Teklif Al
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
