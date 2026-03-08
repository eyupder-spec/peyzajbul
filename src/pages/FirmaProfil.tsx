import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, X, AlertTriangle, Crown, Users, Coins, Image, FileText, LogOut, Upload, Camera } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { TURKISH_CITIES } from "@/lib/leadFormData";
import { SERVICE_LABELS } from "@/lib/categories";
import { DISTRICTS_BY_CITY } from "@/lib/districts";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const FIRMA_MENU = [
  { title: "Özet", key: "panel", icon: FileText, path: "/firma/panel" },
  { title: "Profil", key: "profil", icon: Crown, path: "/firma/profil" },
  { title: "Leadler", key: "leadler", icon: Users, path: "/firma/leadler" },
  { title: "Jeton Yükle", key: "jeton", icon: Coins, path: "/firma/jeton" },
  { title: "Premium", key: "premium", icon: Crown, path: "/firma/premium" },
  { title: "Galeri", key: "galeri", icon: Image, path: "/firma/galeri" },
];

function FirmaSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              {!collapsed && <span className="font-heading font-bold">Firma Paneli</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FIRMA_MENU.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

type FirmData = {
  id: string;
  company_name: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  website: string;
  description: string;
  services: string[];
  telegram_chat_id: string;
};

const FirmaProfil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firmId, setFirmId] = useState("");
  const [firmName, setFirmName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState<FirmData>({
    id: "",
    company_name: "",
    phone: "",
    email: "",
    city: "",
    district: "",
    address: "",
    website: "",
    description: "",
    services: [],
    telegram_chat_id: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "firm");
      if (!roles || roles.length === 0) { navigate("/"); return; }

      const { data: firm } = await supabase
        .from("firms")
        .select("id, company_name, phone, email, city, district, address, website, description, services, is_approved, logo_url, telegram_chat_id")
        .eq("user_id", user.id)
        .single();

      if (!firm) { navigate("/firma/giris"); return; }
      if (!firm.is_approved) { navigate("/firma/giris"); return; }

      setFirmId(firm.id);
      setFirmName(firm.company_name);
      setLogoUrl(firm.logo_url || null);
      setForm({
        id: firm.id,
        company_name: firm.company_name,
        phone: firm.phone || "",
        email: firm.email || "",
        city: firm.city || "",
        district: firm.district || "",
        address: firm.address || "",
        website: firm.website || "",
        description: firm.description || "",
        services: firm.services || [],
        telegram_chat_id: (firm as any).telegram_chat_id || "",
      });
      setLoading(false);
    };
    load();
  }, [navigate]);

  const update = (partial: Partial<FirmData>) => setForm((p) => ({ ...p, ...partial }));
  const availableDistricts = form.city ? (DISTRICTS_BY_CITY[form.city] || []) : [];

  const toggleService = (s: string) => {
    setForm((p) => ({
      ...p,
      services: p.services.includes(s) ? p.services.filter((x) => x !== s) : [...p.services, s],
    }));
  };
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firmId) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${firmId}/logo.${ext}`;
      // Remove old logo if exists
      await supabase.storage.from("firm-logos").remove([path]);
      const { error: uploadError } = await supabase.storage.from("firm-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("firm-logos").getPublicUrl(path);
      const url = publicUrl + "?t=" + Date.now();
      await supabase.from("firms").update({ logo_url: url }).eq("id", firmId);
      setLogoUrl(url);
      toast({ title: "Logo güncellendi!" });
    } catch (err: any) {
      toast({ title: "Logo yüklenemedi", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!form.company_name || !form.phone || !form.email || !form.city) {
      toast({ title: "Hata", description: "Firma adı, telefon, e-posta ve il zorunludur.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    try {
      const { error } = await supabase.from("firms").update({
        company_name: form.company_name,
        phone: form.phone,
        city: form.city,
        district: form.district || null,
        address: form.address || null,
        website: form.website || null,
        description: form.description || null,
        services: form.services,
        is_approved: false, // Goes back to pending approval
      }).eq("id", firmId);

      if (error) throw error;

      toast({
        title: "Bilgileriniz güncellendi",
        description: "Değişiklikleriniz admin onayına gönderildi. Onaylandıktan sonra firmanız görüntülenmeye devam edecektir.",
      });
      navigate("/firma/panel");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-bold text-foreground">{firmName}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Çıkış
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Firma Bilgilerini Düzenle</h2>
                <div className="flex items-start gap-2 bg-muted border border-border rounded-lg p-3 text-sm text-foreground">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                  <p>Bilgilerinizi güncelledikten sonra değişiklikler admin onayına gönderilecektir. Onaylandıktan sonra firmanız görüntülenmeye devam edecektir.</p>
                </div>
              </div>

              {/* Logo */}
              <Card className="border-border">
                <CardContent className="pt-6">
                  <Label className="mb-3 block">Firma Logosu</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                        <Button asChild variant="outline" size="sm" disabled={uploadingLogo}>
                          <span>{uploadingLogo ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yükleniyor...</> : <><Upload className="h-4 w-4 mr-2" /> Logo Yükle</>}</span>
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground">PNG veya JPG, max 2MB önerilir</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Firma Adı *</Label>
                      <Input value={form.company_name} onChange={(e) => update({ company_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-posta *</Label>
                      <Input type="email" value={form.email} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Telefon *</Label>
                      <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Web Sitesi</Label>
                      <Input placeholder="https://firma.com" value={form.website} onChange={(e) => update({ website: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Input value={form.address} onChange={(e) => update({ address: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Açıklama</Label>
                    <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} />
                  </div>

                  {/* Telegram Bildirim */}
                  <div className="space-y-1.5">
                    <Label>Telegram Chat ID (Bildirim)</Label>
                    <Input
                      placeholder="Örn: 123456789"
                      value={form.telegram_chat_id}
                      onChange={(e) => update({ telegram_chat_id: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Yeni lead geldiğinde Telegram'dan bildirim almak için: @userinfobot'a mesaj atıp Chat ID'nizi öğrenin, ardından @PeyzajRehberiBot'u başlatın.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Hizmetler</Label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_LABELS.map((s) => (
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

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Değişiklikleri Kaydet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" /> Değişiklikleri Onaylayın
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bilgilerinizi güncelledikten sonra firmanız admin onayına gönderilecektir. Onaylandıktan sonra firmanız görüntülenmeye devam edecektir. Devam etmek istiyor musunuz?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>İptal</Button>
            <Button onClick={confirmSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Evet, Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default FirmaProfil;
