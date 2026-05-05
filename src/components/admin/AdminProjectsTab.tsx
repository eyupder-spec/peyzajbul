"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Edit, Trash2, Image, Eye, EyeOff, Loader2, Upload, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { generateProjectSlug } from "@/lib/firmUtils";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import { compressAndConvertToWebP } from "@/lib/imageUtils";

type Firm = {
  id: string;
  company_name: string;
  city: string;
  slug: string;
  is_active: boolean;
};

type Project = {
  id: string;
  firm_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  category: string;
  city: string;
  status: string;
  sort_order: number;
  created_at: string;
  firms?: { company_name: string; slug: string; city: string };
};

type ProjectImage = {
  id: string;
  project_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

type ProjectForm = {
  id?: string;
  firm_id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  status: string;
};

const emptyForm: ProjectForm = {
  firm_id: "",
  title: "",
  description: "",
  category: "",
  city: "",
  status: "draft",
};

const AdminProjectsTab = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [firmComboboxOpen, setFirmComboboxOpen] = useState(false);

  // Gallery management
  const [galleryProjectId, setGalleryProjectId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<ProjectImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");

  // Cover upload
  const [coverUploading, setCoverUploading] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [projectsRes, firmsRes] = await Promise.all([
      (supabase.from as any)("projects")
        .select("*, firms!inner(company_name, slug, city)")
        .order("created_at", { ascending: false }),
      supabase
        .from("firms")
        .select("id, company_name, city, slug, is_active")
        .order("company_name", { ascending: true }),
    ]);
    setProjects((projectsRes.data as any[]) || []);
    setFirms((firmsRes.data as Firm[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const update = (partial: Partial<ProjectForm>) => setForm((p) => ({ ...p, ...partial }));

  const handleSave = async () => {
    if (!form.title || !form.firm_id || !form.category || !form.city) {
      toast.error("Başlık, firma, hizmet ve il zorunludur.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        // Update
        const { error } = await (supabase.from as any)("projects").update({
          title: form.title,
          description: form.description || null,
          category: form.category,
          city: form.city,
          status: form.status,
          firm_id: form.firm_id,
        }).eq("id", form.id);
        if (error) throw error;
        toast.success("Proje güncellendi!");
      } else {
        // Create
        const tempId = crypto.randomUUID();
        const slug = generateProjectSlug(form.title, tempId);
        const { error } = await (supabase.from as any)("projects").insert({
          id: tempId,
          firm_id: form.firm_id,
          title: form.title,
          slug,
          description: form.description || null,
          category: form.category,
          city: form.city,
          status: form.status,
        });
        if (error) throw error;
        toast.success("Proje oluşturuldu!");
      }
      setFormOpen(false);
      setForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("projects").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Proje silindi!");
      loadData();
    }
    setDeletingId(null);
  };

  const handleToggleStatus = async (project: Project) => {
    const newStatus = project.status === "published" ? "draft" : "published";
    const { error } = await (supabase.from as any)("projects").update({ status: newStatus }).eq("id", project.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newStatus === "published" ? "Proje yayınlandı!" : "Proje taslağa alındı.");
      loadData();
    }
  };

  // Cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const optimized = await compressAndConvertToWebP(file);
      const originalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/g, "-").toLowerCase();
      const path = `covers/${projectId}/${originalName}-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, optimized);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("project-images").getPublicUrl(path);
      await (supabase.from as any)("projects").update({ cover_image: publicUrl }).eq("id", projectId);
      toast.success("Kapak görseli yüklendi!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Yükleme başarısız.");
    } finally {
      setCoverUploading(false);
    }
  };

  // Gallery
  const loadGallery = async (projectId: string) => {
    setGalleryProjectId(projectId);
    const { data } = await (supabase
      .from as any)("project_images")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    setGalleryImages(data || []);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !galleryProjectId) return;
    setGalleryUploading(true);
    try {
      const optimized = await compressAndConvertToWebP(file);
      const originalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/g, "-").toLowerCase();
      const path = `gallery/${galleryProjectId}/${originalName}-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, optimized);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("project-images").getPublicUrl(path);
      await (supabase.from as any)("project_images").insert({
        project_id: galleryProjectId,
        image_url: publicUrl,
        caption: galleryCaption || null,
        sort_order: galleryImages.length,
      });
      toast.success("Görsel eklendi!");
      setGalleryCaption("");
      loadGallery(galleryProjectId);
    } catch {
      toast.error("Yükleme başarısız.");
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleGalleryDelete = async (imgId: string, imageUrl: string) => {
    const urlParts = imageUrl.split("/project-images/");
    if (urlParts[1]) await supabase.storage.from("project-images").remove([urlParts[1]]);
    await (supabase.from as any)("project_images").delete().eq("id", imgId);
    if (galleryProjectId) loadGallery(galleryProjectId);
    toast.success("Görsel silindi.");
  };

  if (loading) return <p className="text-muted-foreground py-8 text-center">Yükleniyor...</p>;

  const getCategoryLabel = (slug: string) => CATEGORIES.find(c => c.slug === slug)?.label || slug;
  const getCityName = (slug: string) => CITIES.find(c => c.slug === slug)?.name || slug;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{projects.length} proje</p>
        <Button onClick={() => { setForm(emptyForm); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Proje
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Kapak</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Proje Adı</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Firma</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Hizmet</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">İl</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Durum</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-muted/50">
                <td className="px-3 py-2">
                  <div className="w-16 h-12 rounded border border-border overflow-hidden bg-muted relative group">
                    {p.cover_image ? (
                      <img src={p.cover_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Image className="h-4 w-4" />
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverUpload(e, p.id)} disabled={coverUploading} />
                      <Upload className="h-4 w-4 text-white" />
                    </label>
                  </div>
                </td>
                <td className="px-3 py-2 text-foreground font-medium">{p.title}</td>
                <td className="px-3 py-2 text-foreground">{(p as any).firms?.company_name || "-"}</td>
                <td className="px-3 py-2 text-foreground">{getCategoryLabel(p.category)}</td>
                <td className="px-3 py-2 text-foreground">{getCityName(p.city)}</td>
                <td className="px-3 py-2">
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>
                    {p.status === "published" ? "Yayında" : "Taslak"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" title="Düzenle" onClick={() => {
                        setForm({
                          id: p.id,
                          firm_id: p.firm_id,
                          title: p.title,
                          description: p.description || "",
                          category: p.category,
                          city: p.city,
                          status: p.status,
                        });
                        setFormOpen(true);
                        loadGallery(p.id);
                      }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Galeri" onClick={() => {
                        setForm({
                          id: p.id,
                          firm_id: p.firm_id,
                          title: p.title,
                          description: p.description || "",
                          category: p.category,
                          city: p.city,
                          status: p.status,
                        });
                        setFormOpen(true);
                        loadGallery(p.id);
                      }}>
                      <Image className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" title={p.status === "published" ? "Taslağa Al" : "Yayınla"} onClick={() => handleToggleStatus(p)}>
                      {p.status === "published" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeletingId(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Henüz proje yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { 
        if (!open) {
          setFormOpen(false); 
          setForm(emptyForm);
          setGalleryProjectId(null);
          setGalleryImages([]);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Proje Düzenle" : "Yeni Proje"}</DialogTitle>
            <DialogDescription className="sr-only">
              Proje başlığı, firma seçimi, hizmet türü ve görsellerini yönetmek için bu formu kullanın.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label>Firma *</Label>
              <Popover open={firmComboboxOpen} onOpenChange={setFirmComboboxOpen} modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={firmComboboxOpen}
                    className="justify-between"
                  >
                    {form.firm_id
                      ? firms.find((firm) => firm.id === form.firm_id)?.company_name
                      : "Firma ara..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 z-[100] pointer-events-auto" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Command>
                    <CommandInput placeholder="Firma adı ile ara..." />
                    <CommandList>
                      <CommandEmpty>Firma bulunamadı.</CommandEmpty>
                      <CommandGroup>
                        {firms.map((firm) => (
                          <CommandItem
                            key={firm.id}
                            value={firm.id}
                            keywords={[firm.company_name, firm.city, !firm.is_active ? "pasif" : ""]}
                            onSelect={() => {
                              update({ firm_id: firm.id, city: CITIES.find(c => c.name === firm.city)?.slug || "" });
                              setFirmComboboxOpen(false);
                            }}
                            onPointerDown={(e) => e.preventDefault()}
                            className="cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${form.firm_id === firm.id ? "opacity-100" : "opacity-0"}`}
                            />
                            <div className="flex flex-col">
                              <span>{firm.company_name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {firm.city} {!firm.is_active && "• (Pasif)"}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Proje Başlığı *</Label>
              <Input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="Villa Bahçe Projesi" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hizmet Türü *</Label>
                <Select value={form.category} onValueChange={(val) => update({ category: val })}>
                  <SelectTrigger><SelectValue placeholder="Hizmet seçin" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>İl *</Label>
                <Select value={form.city} onValueChange={(val) => update({ city: val })}>
                  <SelectTrigger><SelectValue placeholder="İl seçin" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={4} placeholder="Proje detaylarını yazın..." />
            </div>
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={(val) => update({ status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Taslak</SelectItem>
                  <SelectItem value="published">Yayında</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Gallery Section inside Edit Form */}
          {form.id ? (
            <div className="mt-8 border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" /> Proje Görselleri
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Input placeholder="Görsel açıklaması (opsiyonel)" value={galleryCaption} onChange={(e) => setGalleryCaption(e.target.value)} className="flex-1" />
                <label className="cursor-pointer shrink-0">
                  <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} disabled={galleryUploading} />
                  <Button asChild disabled={galleryUploading}>
                    <span>{galleryUploading ? "Yükleniyor..." : "Görsel Seç & Yükle"}</span>
                  </Button>
                </label>
              </div>
              
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-border">
                      <img src={img.image_url} alt={img.caption || "Proje"} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <Button variant="destructive" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleGalleryDelete(img.id, img.image_url)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Sil
                        </Button>
                      </div>
                      {img.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 truncate">
                          {img.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Image className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Henüz projeye ait görsel galerisi yok.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 border-t border-border pt-6 text-center text-muted-foreground">
              <Image className="h-8 w-8 mx-auto mb-2 opacity-50 text-primary" />
              <p className="text-sm">Görsel galerisine fotoğraf yükleyebilmek için lütfen önce projeyi <strong>"Oluştur"</strong> butonuna basarak kaydedin.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => { 
              setFormOpen(false); 
              setForm(emptyForm); 
              setGalleryProjectId(null);
              setGalleryImages([]);
            }}>İptal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {form.id ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projeyi Sil</DialogTitle>
            <DialogDescription className="sr-only">
              Bu projeyi ve tüm görsellerini kalıcı olarak silme onayı.
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground">Bu projeyi ve tüm görsellerini kalıcı olarak silmek istediğinize emin misiniz?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>İptal</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProjectsTab;
