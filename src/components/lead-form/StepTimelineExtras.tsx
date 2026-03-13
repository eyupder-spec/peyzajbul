import { Upload, X } from "lucide-react";
import { LeadFormData, TIMELINE_OPTIONS } from "@/lib/leadFormData";
import { toast } from "sonner";

interface StepTimelineExtrasProps {
  data: LeadFormData;
  onChange: (data: Partial<LeadFormData>) => void;
}

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 10;

const StepTimelineExtras = ({ data, onChange }: StepTimelineExtrasProps) => {
  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - data.photos.length;
    if (files.length > remaining) {
      toast.error(`En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsiniz.`);
    }
    const validFiles = files.slice(0, remaining).filter((f) => {
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        toast.error(`${f.name}: Sadece JPG/PNG kabul edilir.`);
        return false;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name}: Dosya boyutu ${MAX_SIZE_MB}MB'dan büyük.`);
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      onChange({ photos: [...data.photos, ...validFiles] });
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    onChange({ photos: data.photos.filter((_, i) => i !== index) });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Zamanlama ve Ek Bilgiler
      </h2>
      <p className="text-muted-foreground text-center mb-8 font-body text-sm">
        Projenize ne zaman başlamak istiyorsunuz?
      </p>
      <div className="max-w-md mx-auto space-y-8">
        {/* Timeline */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-foreground font-body">Başlangıç Zamanı *</label>
          <div className="grid grid-cols-2 gap-3">
            {TIMELINE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ timeline: opt.value })}
                className={`p-4 rounded-xl border-2 transition-all font-body text-xs text-center ${
                  data.timeline === opt.value
                    ? "border-accent bg-accent/5 shadow-sm scale-[1.02]"
                    : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Photo upload */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-foreground font-body">
            Fotoğraf Yükle (opsiyonel, en fazla {MAX_PHOTOS})
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {data.photos.map((file, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group">
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            ))}
            {data.photos.length < MAX_PHOTOS && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group">
                <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors mb-1" />
                <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors text-center px-1">Ekle</span>
                <input type="file" accept="image/jpeg,image/png" multiple onChange={handlePhotoAdd} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Bahçenizin/alanın mevcut durumunu gösteren fotoğraflar doğru teklif almanıza yardımcı olur.
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground font-body">Ek Notlar (opsiyonel)</label>
          <textarea
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Projeniz veya ihtiyaçlarınız hakkında eklemek istediğiniz diğer detaylar..."
            rows={4}
            maxLength={1000}
            className="w-full p-4 rounded-xl border-2 border-border bg-card text-sm font-body focus:outline-none focus:border-accent/50 focus:bg-accent/5 transition-all resize-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
    </div>
  );
};


export default StepTimelineExtras;
