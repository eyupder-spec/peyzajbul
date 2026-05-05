import { useState, useEffect } from "react";
import { generateFirmSlug } from "@/lib/firmUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Globe, X, Crown, Plus, Trash2, Upload, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { TURKISH_CITIES } from "@/lib/leadFormData";
import { SERVICE_LABELS } from "@/lib/categories";
import { DISTRICTS_BY_CITY } from "@/lib/districts";

const SERVICE_OPTIONS = SERVICE_LABELS;

export type FirmFormData = {
  id?: string;
  company_name: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  website: string;
  slug: string;
  description: string;
  services: string[];
  is_approved: boolean;
  is_active: boolean;
  user_id?: string;
  is_premium?: boolean;
  premium_until?: string;
  google_maps_url?: string;
  detailed_services?: { title: string; description: string }[];
  logo_url?: string;
  response_time?: string;
  trust_badges?: { icon: string; label: string }[];
  faq_items?: { question: string; answer: string }[];
  before_after?: { before: string; after: string };
  youtube_videos?: { url: string; title: string }[];
};

const emptyForm: FirmFormData = {
  company_name: "",
  phone: "",
  email: "",
  city: "",
  district: "",
  address: "",
  website: "",
  slug: "",
  description: "",
  services: [],
  is_approved: true,
  is_active: true,
  is_premium: false,
  premium_until: "",
  google_maps_url: "",
  detailed_services: [],
  response_time: "",
  trust_badges: [],
  faq_items: [],
  before_after: undefined,
  youtube_videos: [],
};

interface FirmFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: FirmFormData | null;
}

const FirmFormDialog = ({ open, onClose, onSaved, initialData }: FirmFormDialogProps) => {
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState<FirmFormData>(initialData || emptyForm);
  const [saving, setSaving] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Re-initialize form when dialog opens with different data
  useEffect(() => {
    if (open) {
      setForm(initialData || emptyForm);
    }
  }, [open, initialData]);

  const update = (partial: Partial<FirmFormData>) => setForm((p) => ({ ...p, ...partial }));

  const availableDistricts = form.city ? (DISTRICTS_BY_CITY[form.city] || []) : [];

  const toggleService = (s: string) => {
    setForm((p) => ({
      ...p,
      services: p.services.includes(s) ? p.services.filter((x) => x !== s) : [...p.services, s],
    }));
  };

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setCrawling(true);
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-company", {
        body: { url: crawlUrl.trim() },
      });
      if (error) throw error;
      if (data?.success && data.company) {
        const c = data.company;
        update({
          company_name: c.company_name || form.company_name,
          phone: c.phone || form.phone,
          email: c.email || form.email,
          description: c.description || form.description,
          address: c.address || form.address,
          services: c.services?.length ? c.services : form.services,
          city: c.city || form.city,
          district: c.district || form.district,
          website: crawlUrl.trim(),
        });
        toast.success("Firma bilgileri web sitesinden çekildi!");
      } else {
        toast.error(data?.error || "Bilgi çekilemedi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Crawler hatası.");
    } finally {
      setCrawling(false);
    }
  };

  const handleSave = async () => {
    if (!form.company_name || !form.phone || !form.email || !form.city) {
      toast.error("Firma adı, telefon, e-posta ve il zorunludur.");
      return;
    }
    const cleanEmail = form.email.trim().replace(/^https?:\/\//, "");
    setSaving(true);
    try {
      if (isEdit && initialData?.id) {
        const { error } = await supabase.from("firms").update({
          company_name: form.company_name,
          phone: form.phone,
          email: cleanEmail,
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          website: form.website || null,
          slug: form.slug || null,
          description: form.description || null,
          services: form.services,
          is_approved: form.is_approved,
          is_active: form.is_active,
          is_premium: form.is_premium || false,
          premium_until: form.premium_until || null,
          google_maps_url: form.google_maps_url || null,
          detailed_services: form.detailed_services || [],
          response_time: form.response_time || null,
          trust_badges: form.trust_badges?.length ? form.trust_badges : null,
          faq_items: form.faq_items?.length ? form.faq_items : null,
          before_after: form.before_after || null,
          youtube_videos: form.youtube_videos?.length ? form.youtube_videos : null,
        }).eq("id", initialData.id);
        if (error) throw error;
        toast.success("Firma güncellendi!");
      } else {
        // Use admin's own user_id — will be transferred on claim approval
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Oturum bulunamadı.");

        const firmSlug = generateFirmSlug(form.company_name, user.id);
        const { error } = await supabase.from("firms").insert({
          user_id: user.id,
          company_name: form.company_name,
          phone: form.phone,
          email: cleanEmail,
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          website: form.website || null,
          slug: firmSlug,
          description: form.description || null,
          services: form.services,
          is_approved: form.is_approved,
          is_active: form.is_active,
        });
        if (error) throw error;
        toast.success("Firma eklendi!");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Firma Düzenle" : "Yeni Firma Ekle"}</DialogTitle>
          <DialogDescription className="sr-only">
            Firma bilgilerini eklemek veya mevcut bir firmanın bilgilerini güncellemek için bu formu kullanabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        {/* Crawler section */}
        {!isEdit && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" /> Web sitesinden bilgileri otomatik çek
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://firmaweb.com"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
              />
              <Button onClick={handleCrawl} disabled={crawling || !crawlUrl.trim()} variant="outline">
                {crawling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Çek"}
              </Button>
            </div>
          </div>
        )}

        {/* Logo upload - only for existing firms */}
        {isEdit && initialData?.id && (
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !initialData?.id) return;
                  setUploadingLogo(true);
                  try {
                    const ext = file.name.split(".").pop();
                    const path = `${initialData.id}/logo.${ext}`;
                    await supabase.storage.from("firm-logos").upload(path, file, { upsert: true });
                    const { data: { publicUrl } } = supabase.storage.from("firm-logos").getPublicUrl(path);
                    const url = publicUrl + "?t=" + Date.now();
                    await supabase.from("firms").update({ logo_url: url }).eq("id", initialData.id);
                    update({ logo_url: url });
                    toast.success("Logo güncellendi!");
                  } catch (err: any) {
                    toast.error(err.message || "Logo yüklenemedi");
                  } finally {
                    setUploadingLogo(false);
                  }
                }} />
                <Button asChild variant="outline" size="sm" disabled={uploadingLogo}>
                  <span>{uploadingLogo ? "Yükleniyor..." : "Logo Yükle"}</span>
                </Button>
              </label>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Firma Adı *</Label>
              <Input value={form.company_name || ""} onChange={(e) => update({ company_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta *</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => update({ email: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Telefon *</Label>
              <Input value={form.phone || ""} onChange={(e) => update({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Web Sitesi</Label>
              <Input placeholder="https://firma.com" value={form.website || ""} onChange={(e) => update({ website: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>İl *</Label>
              <Select value={form.city} onValueChange={(val) => update({ city: val, district: "" })}>
                <SelectTrigger><SelectValue placeholder="İl seçin" /></SelectTrigger>
                <SelectContent>
                  {TURKISH_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>İlçe</Label>
              <Select value={form.district} onValueChange={(val) => update({ district: val })} disabled={!form.city}>
                <SelectTrigger><SelectValue placeholder={form.city ? "İlçe seçin" : "Önce il seçin"} /></SelectTrigger>
                <SelectContent>
                  {availableDistricts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adres</Label>
            <Input value={form.address || ""} onChange={(e) => update({ address: e.target.value })} />
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label>Slug (URL yolu)</Label>
              <Input
                value={form.slug || ""}
                onChange={(e) => update({ slug: e.target.value })}
                placeholder="firma-adi-12345678"
              />
              <p className="text-xs text-muted-foreground">Firmanın URL'de görünen benzersiz tanımlayıcısı. Dikkatli değiştirin.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Textarea value={form.description || ""} onChange={(e) => update({ description: e.target.value })} rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Hizmetler</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((s) => (
                <Badge
                  key={s}
                  variant={form.services.includes(s) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleService(s)}
                >
                  {form.services.includes(s) && <X className="h-3 w-3 mr-1" />}
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {/* Premium Section - Only in edit mode */}
          {isEdit && (
            <div className="border-t border-border pt-4 space-y-4">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" /> Premium Ayarları
              </h3>
              
              <div className="flex items-center justify-between">
                <Label>Premium Aktif</Label>
                <Switch
                  checked={form.is_premium || false}
                  onCheckedChange={(checked) => update({ is_premium: checked })}
                />
              </div>

              {form.is_premium && (
                <div className="space-y-1.5">
                  <Label>Premium Bitiş Tarihi</Label>
                  <Input
                    type="date"
                    value={form.premium_until ? new Date(form.premium_until).toISOString().split("T")[0] : ""}
                    onChange={(e) => update({ premium_until: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Google Maps Embed URL</Label>
                <Input
                  placeholder="https://www.google.com/maps/embed?..."
                  value={form.google_maps_url || ""}
                  onChange={(e) => update({ google_maps_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Detaylı Hizmetler</Label>
                {(form.detailed_services || []).map((ds, i) => (
                  <div key={i} className="flex gap-2 items-start bg-muted/50 rounded-lg p-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Hizmet başlığı"
                        value={ds.title || ""}
                        onChange={(e) => {
                          const updated = [...(form.detailed_services || [])];
                          updated[i] = { ...updated[i], title: e.target.value };
                          update({ detailed_services: updated });
                        }}
                      />
                      <Textarea
                        placeholder="Açıklama"
                        value={ds.description || ""}
                        rows={2}
                        onChange={(e) => {
                          const updated = [...(form.detailed_services || [])];
                          updated[i] = { ...updated[i], description: e.target.value };
                          update({ detailed_services: updated });
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive shrink-0"
                      onClick={() => {
                        const updated = (form.detailed_services || []).filter((_, idx) => idx !== i);
                        update({ detailed_services: updated });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Yeni hizmet başlığı"
                    value={newServiceTitle}
                    onChange={(e) => setNewServiceTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Açıklama"
                    value={newServiceDesc}
                    onChange={(e) => setNewServiceDesc(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!newServiceTitle.trim()) return;
                      update({
                        detailed_services: [...(form.detailed_services || []), { title: newServiceTitle, description: newServiceDesc }],
                      });
                      setNewServiceTitle("");
                      setNewServiceDesc("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Ekstra Premium İçerikler */}
              <div className="space-y-1.5 mt-6 border-t border-border pt-4">
                <Label>Yanıt Süresi (örn: Genellikle 2 saat içinde yanıtlar)</Label>
                <Input
                  value={form.response_time || ""}
                  onChange={(e) => update({ response_time: e.target.value })}
                />
              </div>

              {/* Trust Badges */}
              <div className="space-y-2">
                <Label>Trust Rozetleri</Label>
                <div className="space-y-2">
                  {(form.trust_badges || []).map((b, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Emoji"
                        value={b.icon || ""}
                        onChange={(e) => {
                          const updated = [...(form.trust_badges || [])];
                          updated[i] = { ...updated[i], icon: e.target.value };
                          update({ trust_badges: updated });
                        }}
                        className="w-20"
                      />
                      <Input
                        placeholder="Rozet metni"
                        value={b.label || ""}
                        onChange={(e) => {
                          const updated = [...(form.trust_badges || [])];
                          updated[i] = { ...updated[i], label: e.target.value };
                          update({ trust_badges: updated });
                        }}
                      />
                      <Button variant="ghost" size="icon" onClick={() => update({ trust_badges: (form.trust_badges || []).filter((_, j) => j !== i) })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => update({ trust_badges: [...(form.trust_badges || []), { icon: "", label: "" }] })}>
                    <Plus className="h-4 w-4 mr-1" /> Rozet Ekle
                  </Button>
                </div>
              </div>

              {/* Before/After */}
              <div className="space-y-2">
                <Label>Önce/Sonra Fotoğrafları</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Önce URL</Label>
                    <Input
                      value={form.before_after?.before || ""}
                      onChange={(e) => update({ before_after: { before: e.target.value, after: form.before_after?.after || "" } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Sonra URL</Label>
                    <Input
                      value={form.before_after?.after || ""}
                      onChange={(e) => update({ before_after: { before: form.before_after?.before || "", after: e.target.value } })}
                    />
                  </div>
                </div>
                </div>
              </div>

              {/* YouTube Videos */}
              <div className="space-y-2">
                <Label>Video Galeri (YouTube)</Label>
                <div className="space-y-3">
                  {(form.youtube_videos || []).map((v, i) => (
                    <div key={i} className="flex gap-2 bg-muted/50 rounded-lg p-2 relative">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="YouTube URL (örn: https://youtu.be/...)"
                          value={v.url || ""}
                          onChange={(e) => {
                            const updated = [...(form.youtube_videos || [])];
                            updated[i] = { ...updated[i], url: e.target.value };
                            update({ youtube_videos: updated });
                          }}
                        />
                        <Input
                          placeholder="Video Başlığı (Opsiyonel)"
                          value={v.title || ""}
                          onChange={(e) => {
                            const updated = [...(form.youtube_videos || [])];
                            updated[i] = { ...updated[i], title: e.target.value };
                            update({ youtube_videos: updated });
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => update({ youtube_videos: (form.youtube_videos || []).filter((_, j) => j !== i) })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => update({ youtube_videos: [...(form.youtube_videos || []), { url: "", title: "" }] })}>
                    <Plus className="h-4 w-4 mr-1" /> Video Ekle
                  </Button>
                </div>
              </div>

              {/* FAQ Items */}
              <div className="space-y-2">
                <Label>Sık Sorulan Sorular</Label>
                <div className="space-y-3">
                  {(form.faq_items || []).map((faq, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-2 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => update({ faq_items: (form.faq_items || []).filter((_, j) => j !== i) })}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Input
                        placeholder="Soru"
                        value={faq.question || ""}
                        onChange={(e) => {
                          const updated = [...(form.faq_items || [])];
                          updated[i] = { ...updated[i], question: e.target.value };
                          update({ faq_items: updated });
                        }}
                        className="pr-8"
                      />
                      <Textarea
                        placeholder="Cevap"
                        value={faq.answer || ""}
                        rows={2}
                        onChange={(e) => {
                          const updated = [...(form.faq_items || [])];
                          updated[i] = { ...updated[i], answer: e.target.value };
                          update({ faq_items: updated });
                        }}
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => update({ faq_items: [...(form.faq_items || []), { question: "", answer: "" }] })}>
                    <Plus className="h-4 w-4 mr-1" /> Soru Ekle
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Güncelle" : "Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FirmFormDialog;

