import { LeadFormData, RESIDENTIAL_SERVICES, COMMERCIAL_SERVICES } from "@/lib/leadFormData";

import bahceTasarimiImg from "@/assets/form/bahce-tasarimi.png";
import bahceBakimiImg from "@/assets/form/bahce-bakimi.png";
import sulamaSistemiImg from "@/assets/form/sulama-sistemi.png";
import sertZeminImg from "@/assets/form/sert-zemin.png";
import bitkiAgacImg from "@/assets/form/bitki-agac.png";
import havuzCevresiImg from "@/assets/form/havuz-cevresi.png";
import projeTasarimImg from "@/assets/form/proje-tasarim.png";
import sadeceUygulamaImg from "@/assets/form/sadece-uygulama.png";
import yesilCatiImg from "@/assets/form/yesil-cati.png";
import otoparkYolImg from "@/assets/form/otopark-yol.png";
import periyodikBakimImg from "@/assets/form/periyodik-bakim.png";

const SERVICE_IMAGES: Record<string, string> = {
  "bahce-tasarimi": bahceTasarimiImg,
  "bahce-bakimi": bahceBakimiImg,
  "sulama-sistemi": sulamaSistemiImg,
  "sert-zemin": sertZeminImg,
  "bitki-agac": bitkiAgacImg,
  "havuz-cevresi": havuzCevresiImg,
  "proje-tasarim-uygulama": projeTasarimImg,
  "sadece-uygulama": sadeceUygulamaImg,
  "yesil-cati-teras": yesilCatiImg,
  "otopark-yol": otoparkYolImg,
  "havuz-cevresi-ticari": havuzCevresiImg,
  "periyodik-bakim": periyodikBakimImg,
};

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
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all font-body text-sm font-medium ${
              data.serviceType === s.value
                ? "border-accent bg-accent/10 shadow-md"
                : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            <img
              src={SERVICE_IMAGES[s.value]}
              alt={s.label}
              className="w-14 h-14 object-contain"
            />
            <span className="text-foreground text-center leading-tight">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepServiceType;
