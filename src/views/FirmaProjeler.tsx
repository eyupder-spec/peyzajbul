"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Image, Eye, EyeOff, Loader2, Upload } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";
import { toast } from "sonner";
import { generateProjectSlug } from "@/lib/firmUtils";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import { compressAndConvertToWebP } from "@/lib/imageUtils";

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
  title: string;
  description: string;
  category: string;
  city: string;
  status: string;
};

const emptyForm: ProjectForm = {
  title: "",
  description: "",
  category: "",
  city: "",
  status: "draft",
};

const FirmaProjeler = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firm, setFirm] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Gallery
  const [galleryProjectId, setGalleryProjectId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<ProjectImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");

  // Cover
  const [coverUploading, setCoverUploading] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { data: firmData } = await supabase
      .from("firms")
      .select("id, is_premium, company_name, city")
      .eq("user_id", user.id)
      .single();

    if (!firmData) { router.push("/firma/panel"); return; }
    if (!firmData.is_premium) { router.push("/firma/premium"); return; }

    setFirm(firmData);

    const { data: projectsData } = await (supabase
      .from as any)("projects")
      .select("*")
      .eq("firm_id", firmData.id)
      .order("created_at", { ascending: false });

    setProjects((projectsData as Project[]) || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const update = (partial: Partial<ProjectForm>) => setForm((p) => ({ ...p, ...partial }));

  const handleSave = async () => {
    if (!form.title || !form.category || !form.city) {
      toast.error("Başlık, hizmet türü ve il zorunludur.");
      return;
    }
    if (!firm) return;
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await (supabase.from as any)("projects").update({
          title: form.title,
          description: form.description || null,
          category: form.category,
          city: form.city,
          status: form.status,
        }).eq("id", form.id);
        if (error) throw error;
        toast.success("Proje güncellendi!");
      } else {
        const tempId = crypto.randomUUID();
        const slug = generateProjectSlug(form.title, tempId);
        const { error } = await (supabase.from as any)("projects").insert({
          id: tempId,
          firm_id: firm.id,
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
    if (error) toast.error(error.message);
    else { toast.success("Proje silindi!"); loadData(); }
    setDeletingId(null);
  };

  const handleToggleStatus = async (project: Project) => {
    const newStatus = project.status === "published" ? "draft" : "published";
    const { error } = await (supabase.from as any)("projects").update({ status: newStatus }).eq("id", project.id);
    if (error) toast.error(error.message);
    else { toast.success(newStatus === "published" ? "Proje yayınlandı!" : "Proje taslağa alındı."); loadData(); }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const optimized = await compressAndConvertToWebP(file);
      const path = `covers/${projectId}/${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, optimized);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("project-images").getPublicUrl(path);
      await (supabase.from as any)("projects").update({ cover_image: publicUrl }).eq("id", projectId);
      toast.success("Kapak yüklendi!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Yükleme başarısız.");
    } finally {
      setCoverUploading(false);
    }
  };

  const loadGallery = async (projectId: string) => {
    setGalleryProjectId(projectId);
    const { data } = await (supabase
      .from as any)("project_images")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    setGalleryImages((data as ProjectImage[]) || []);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !galleryProjectId) return;
    setGalleryUploading(true);
    try {
      const optimized = await compressAndConvertToWebP(file);
      const path = `gallery/${galleryProjectId}/${Date.now()}.webp`;
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  }

  const getCategoryLabel = (slug: string) => CATEGORIES.find(c => c.slug === slug)?.label || slug;

  return (
    <SidebarProvider>
      <FirmaSidebar isPremium={firm?.is_premium} />
      <div className="flex-1 overflow-auto bg-background">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
          <SidebarTrigger />
          <h1 className="font-semibold">Projeler</h1>
        </header>

        <main className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Projelerim</h2>
              <p className="text-sm text-muted-foreground">{projects.length} proje</p>
            </div>
            <Button onClick={() => { setForm({ ...emptyForm, city: CITIES.find(c => c.name === firm?.city)?.slug || "" }); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Yeni Proje
            </Button>
          </div>

          {/* Project cards */}
          {projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card key={p.id} className="border-border overflow-hidden">
                  {/* Cover */}
                  <div className="aspect-video relative group bg-muted">
                    {p.cover_image ? (
                      <img src={p.cover_image} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Image className="h-8 w-8 opacity-50" />
                        <span className="text-xs">Kapak ekleyin</span>
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverUpload(e, p.id)} disabled={coverUploading} />
                      <div className="flex items-center gap-2 text-white text-sm font-medium">
                        <Upload className="h-4 w-4" /> Kapak Yükle
                      </div>
                    </label>
                    <Badge variant={p.status === "published" ? "default" : "secondary"} className="absolute top-2 right-2">
                      {p.status === "published" ? "Yayında" : "Taslak"}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{p.title}</h3>
                      <p className="text-xs text-muted-foreground">{getCategoryLabel(p.category)}</p>
                    </div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                        setForm({
                          id: p.id,
                          title: p.title,
                          description: p.description || "",
                          category: p.category,
                          city: p.city,
                          status: p.status,
                        });
                        setFormOpen(true);
                        loadGallery(p.id);
                      }}>
                        <Edit className="h-3 w-3 mr-1" /> Düzenle
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setForm({
                          id: p.id,
                          title: p.title,
                          description: p.description || "",
                          category: p.category,
                          city: p.city,
                          status: p.status,
                        });
                        setFormOpen(true);
                        loadGallery(p.id);
                      }}>
                        <Image className="h-3 w-3 mr-1" /> Galeri
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(p)} title={p.status === "published" ? "Taslağa Al" : "Yayınla"}>
                        {p.status === "published" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeletingId(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Image className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <h3 className="font-semibold text-foreground mb-1">Henüz proje eklenmemiş</h3>
                <p className="text-sm text-muted-foreground mb-4">Projelerinizi ekleyerek potansiyel müşterilere portföyünüzü gösterin.</p>
                <Button onClick={() => { setForm({ ...emptyForm, city: CITIES.find(c => c.name === firm?.city)?.slug || "" }); setFormOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> İlk Projemi Ekle
                </Button>
              </CardContent>
            </Card>
          )}

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
              </DialogHeader>
              <div className="grid gap-4">
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
                        <span>{galleryUploading ? "Yükleniyor..." : "Görsel Ekle"}</span>
                      </Button>
                    </label>
                  </div>

                  {galleryImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
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
              <DialogHeader><DialogTitle>Projeyi Sil</DialogTitle></DialogHeader>
              <p className="text-muted-foreground">Bu projeyi ve tüm görsellerini kalıcı olarak silmek istediğinize emin misiniz?</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeletingId(null)}>İptal</Button>
                <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>Sil</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default FirmaProjeler;
