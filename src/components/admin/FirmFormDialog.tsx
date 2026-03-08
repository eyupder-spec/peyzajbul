import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TURKISH_CITIES } from "@/lib/leadFormData";
import { SERVICE_LABELS } from "@/lib/categories";

const SERVICE_OPTIONS = SERVICE_LABELS;

export type FirmFormData = {
  id?: string;
  company_name: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  tax_number: string;
  description: string;
  services: string[];
  is_approved: boolean;
  is_active: boolean;
  user_id?: string;
  is_premium?: boolean;
  premium_until?: string;
  google_maps_url?: string;
  detailed_services?: { title: string; description: string }[];
};

const emptyForm: FirmFormData = {
  company_name: "",
  phone: "",
  email: "",
  city: "",
  district: "",
  address: "",
  tax_number: "",
  description: "",
  services: [],
  is_approved: true,
  is_active: true,
  is_premium: false,
  premium_until: "",
  google_maps_url: "",
  detailed_services: [],
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

  const update = (partial: Partial<FirmFormData>) => setForm((p) => ({ ...p, ...partial }));

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
    setSaving(true);
    try {
      if (isEdit && initialData?.id) {
        const { error } = await supabase.from("firms").update({
          company_name: form.company_name,
          phone: form.phone,
          email: form.email,
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          tax_number: form.tax_number || null,
          description: form.description || null,
          services: form.services,
          is_approved: form.is_approved,
          is_active: form.is_active,
        }).eq("id", initialData.id);
        if (error) throw error;
        toast.success("Firma güncellendi!");
      } else {
        // Create user first, then insert firm
        const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
        const { data: authData, error: authError } = await supabase.functions.invoke("create-firm-user", {
          body: { email: form.email, password: tempPassword, company_name: form.company_name },
        });
        if (authError) throw authError;
        if (!authData?.user_id) throw new Error("Kullanıcı oluşturulamadı.");

        const { error } = await supabase.from("firms").insert({
          user_id: authData.user_id,
          company_name: form.company_name,
          phone: form.phone,
          email: form.email,
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          tax_number: form.tax_number || null,
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

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Firma Adı *</Label>
              <Input value={form.company_name} onChange={(e) => update({ company_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta *</Label>
              <Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} disabled={isEdit} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Telefon *</Label>
              <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Vergi No</Label>
              <Input value={form.tax_number} onChange={(e) => update({ tax_number: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>İl *</Label>
              <Select value={form.city} onValueChange={(val) => update({ city: val })}>
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
              <Input value={form.district} onChange={(e) => update({ district: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adres</Label>
            <Input value={form.address} onChange={(e) => update({ address: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} />
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
