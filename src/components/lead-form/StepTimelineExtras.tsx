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
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
        Zamanlama ve Ek Bilgiler
      </h2>
      <p className="text-muted-foreground text-center mb-6 font-body text-sm">
        Projenize ne zaman başlamak istiyorsunuz?
      </p>
      <div className="max-w-md mx-auto space-y-5">
        {/* Timeline */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 font-body">Başlangıç Zamanı *</label>
          <div className="grid grid-cols-2 gap-2">
            {TIMELINE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ timeline: opt.value })}
                className={`p-2.5 rounded-md border-2 transition-all font-body text-xs text-center ${
                  data.timeline === opt.value
                    ? "border-accent bg-accent/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 font-body">
            Fotoğraf (opsiyonel, max {MAX_PHOTOS})
          </label>
          {data.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {data.photos.map((file, i) => (
                <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {data.photos.length < MAX_PHOTOS && (
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-dashed border-input bg-card cursor-pointer hover:border-primary/30 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-body">Fotoğraf yükle (JPG/PNG, max {MAX_SIZE_MB}MB)</span>
              <input type="file" accept="image/jpeg,image/png" multiple onChange={handlePhotoAdd} className="hidden" />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5 font-body">Ek Notlar (opsiyonel)</label>
          <textarea
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Projeniz hakkında eklemek istediğiniz bilgiler..."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default StepTimelineExtras;
