"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Box, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string; icon: string | null; sort_order: number | null };
type Material = {
  id: string; slug: string; name: string;
  category_id: string; description: string; usage_areas: string;
  material_type: string; is_published: boolean; image_url: string; gallery_urls: string[];
  material_categories?: Category;
};

const emptyMaterial = {
  slug: "", name: "", category_id: "", description: "", 
  usage_areas: "", material_type: "", is_published: true, image_url: "", gallery_urls: [] as string[],
};

export default function AdminMaterialsTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [materialForm, setMaterialForm] = useState<typeof emptyMaterial>(emptyMaterial);
  const [savingMaterial, setSavingMaterial] = useState(false);

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", slug: "", icon: "🪨", sort_order: 0 });
  const [savingCat, setSavingCat] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [catRes, matRes] = await Promise.all([
      supabase.from("material_categories").select("*").order("sort_order"),
      supabase.from("materials").select("*, material_categories(name, icon)").order("name"),
    ]);
    setCategories((catRes.data || []) as Category[]);
    setMaterials((matRes.data as unknown as Material[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAddMaterial = () => { setEditingMaterial(null); setMaterialForm(emptyMaterial); setMaterialDialogOpen(true); };
  const openEditMaterial = (m: Material) => {
    setEditingMaterial(m);
    setMaterialForm({
      slug: m.slug, name: m.name, 
      category_id: m.category_id || "", description: m.description || "",
      usage_areas: m.usage_areas || "", material_type: m.material_type || "",
      is_published: m.is_published, image_url: m.image_url || "", gallery_urls: m.gallery_urls || [],
    });
    setMaterialDialogOpen(true);
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingImage(true);
      const ext = file.name.split(".").pop();
      const slug = materialForm.slug || "malzeme";
      const path = `${slug}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("materials").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);

      setMaterialForm(p => ({ ...p, image_url: publicUrl }));
      toast.success("Ana görsel yüklendi");
    } catch (error: any) {
      toast.error("Ana görsel yüklenirken hata oluştu: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const [uploadingGallery, setUploadingGallery] = useState(false);
  const uploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setUploadingGallery(true);
      const newUrls: string[] = [];
      const slug = materialForm.slug || "malzeme";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${slug}-galeri-${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("materials").upload(path, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);
        newUrls.push(publicUrl);
      }

      setMaterialForm(p => ({ ...p, gallery_urls: [...(p.gallery_urls || []), ...newUrls] }));
      toast.success(`${files.length} görsel galeriye eklendi`);
    } catch (error: any) {
      toast.error("Galeri yüklenirken hata oluştu: " + error.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setMaterialForm(p => {
      const newGallery = [...(p.gallery_urls || [])];
      newGallery.splice(index, 1);
      return { ...p, gallery_urls: newGallery };
    });
  };

  const saveMaterial = async () => {
    if (!materialForm.name || !materialForm.slug) { toast.error("Ad ve slug zorunlu"); return; }
    setSavingMaterial(true);
    try {
      const payload = { ...materialForm, category_id: materialForm.category_id || null };
      if (editingMaterial?.id) {
        const { error } = await supabase.from("materials").update(payload).eq("id", editingMaterial.id);
        if (error) throw error;
        toast.success("Malzeme güncellendi!");
      } else {
        const { error } = await supabase.from("materials").insert(payload);
        if (error) throw error;
        toast.success("Malzeme eklendi!");
      }
      setMaterialDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingMaterial(false);
    }
  };

  const deleteMaterial = async (id: string, name: string) => {
    if (!confirm(`"${name}" malzemesini silmek istediğinize emin misiniz?`)) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Malzeme silindi"); load(); }
  };

  const saveCat = async () => {
    if (!catForm.name || !catForm.slug) { toast.error("Ad ve slug zorunlu"); return; }
    setSavingCat(true);
    try {
      const { error } = await supabase.from("material_categories").insert(catForm);
      if (error) throw error;
      toast.success("Kategori eklendi!");
      setCatDialogOpen(false);
      setCatForm({ name: "", slug: "", icon: "🪨", sort_order: 0 });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingCat(false);
    }
  };

  const filtered = materials.filter(m => {
    if (filterCat !== "all" && m.category_id !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return m.name.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="py-20 text-center text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{materials.length}</p><p className="text-xs text-muted-foreground">Toplam Malzeme</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{categories.length}</p><p className="text-xs text-muted-foreground">Kategori</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{materials.filter(p => p.is_published).length}</p><p className="text-xs text-muted-foreground">Yayında</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{materials.filter(p => !p.is_published).length}</p><p className="text-xs text-muted-foreground">Taslak</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Box className="h-4 w-4" /> Kategoriler</CardTitle>
          <Button size="sm" onClick={() => setCatDialogOpen(true)}><Plus className="h-3 w-3 mr-1" /> Kategori Ekle</Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm">
                <span>{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
                <span className="text-muted-foreground text-xs">({materials.filter(p => p.category_id === cat.id).length})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Malzeme adı ara..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAddMaterial}><Plus className="h-4 w-4 mr-1" /> Malzeme Ekle</Button>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Malzeme</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Kategori</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Kullanım Alanı</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Durum</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(material => (
                <tr key={material.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {material.image_url ? (
                        <img src={material.image_url} alt={material.name} className="w-8 h-8 rounded-md object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center rounded-md bg-muted text-lg border border-border">
                          {(material.material_categories as any)?.icon || "🪨"}
                        </div>
                      )}
                      {material.name}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="text-xs">{(material.material_categories as any)?.name || "-"}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{material.usage_areas || "-"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={material.is_published ? "default" : "secondary"}>{material.is_published ? "Yayında" : "Taslak"}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditMaterial(material)} title="Düzenle">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <a href={`/malzemeler/${material.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Sayfayı Görüntüle">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteMaterial(material.id, material.name)} title="Sil">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">Malzeme bulunamadı.</div>
          )}
        </div>
      </div>

      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Malzeme Düzenle" : "Yeni Malzeme Ekle"}</DialogTitle>
            <DialogDescription className="sr-only">Malzeme bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Malzeme Adı *</Label>
                <Input value={materialForm.name} onChange={e => setMaterialForm(p => ({ ...p, name: e.target.value }))} placeholder="Traverten Taş" />
              </div>
              <div className="space-y-1.5">
                <Label>URL Slug *</Label>
                <Input value={materialForm.slug} onChange={e => setMaterialForm(p => ({ ...p, slug: e.target.value }))} placeholder="traverten-tas" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kullanım Alanları</Label>
              <Input value={materialForm.usage_areas} onChange={e => setMaterialForm(p => ({ ...p, usage_areas: e.target.value }))} placeholder="Zemin, Yürüme Yolu, Duvar..." />
            </div>
            <div className="space-y-1.5">
              <Label>Materyal Türü</Label>
              <Input value={materialForm.material_type} onChange={e => setMaterialForm(p => ({ ...p, material_type: e.target.value }))} placeholder="Doğal Taş, Kompozit, Ahşap..." />
            </div>
            
            <div className="space-y-1.5 border-t border-border pt-4">
              <Label>Ana Görsel</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="flex-1" />
                {uploadingImage && <span className="text-sm text-muted-foreground animate-pulse">Yükleniyor...</span>}
              </div>
              {materialForm.image_url && (
                <div className="mt-2 relative w-32 h-32 rounded-lg border border-border overflow-hidden">
                  <img src={materialForm.image_url} alt="Önizleme" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-1.5 border-t border-border pt-4">
              <Label>Galeri Görselleri (Çoklu Yükleme)</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" multiple onChange={uploadGallery} disabled={uploadingGallery} className="flex-1" />
                {uploadingGallery && <span className="text-sm text-muted-foreground animate-pulse">Yükleniyor...</span>}
              </div>
              <p className="text-xs text-muted-foreground">İsteğe bağlı. Çoklu seçim yapabilirsiniz.</p>
              
              {materialForm.gallery_urls && materialForm.gallery_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {materialForm.gallery_urls.map((url, i) => (
                    <div key={i} className="w-16 h-16 relative rounded-md overflow-hidden border border-border group">
                      <img src={url} alt={`Galeri ${i}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeGalleryImage(i)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5 border-t border-border pt-4">
              <Label>Kategori</Label>
              <Select value={materialForm.category_id} onValueChange={v => setMaterialForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={materialForm.description} onChange={e => setMaterialForm(p => ({ ...p, description: e.target.value }))} rows={4} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
              <Label>Yayında (Sitede görünsün mü?)</Label>
              <Switch checked={materialForm.is_published} onCheckedChange={c => setMaterialForm(p => ({ ...p, is_published: c }))} />
            </div>
            <Button onClick={saveMaterial} disabled={savingMaterial} className="w-full mt-4">
              {savingMaterial ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Kategori Ekle</DialogTitle>
            <DialogDescription className="sr-only">Yeni kategori detaylarını girin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Kategori Adı</Label><Input value={catForm.name} onChange={e => setCatForm(c => ({ ...c, name: e.target.value }))} placeholder="Doğal Taşlar" /></div>
            <div className="space-y-2"><Label>URL Slug</Label><Input value={catForm.slug} onChange={e => setCatForm(c => ({ ...c, slug: e.target.value }))} placeholder="dogal-taslar" /></div>
            <div className="space-y-2"><Label>İkon (Emoji)</Label><Input value={catForm.icon} onChange={e => setCatForm(c => ({ ...c, icon: e.target.value }))} placeholder="🪨" /></div>
            <div className="space-y-2"><Label>Sıralama (Küçük olan üstte)</Label><Input type="number" value={catForm.sort_order} onChange={e => setCatForm(c => ({ ...c, sort_order: parseInt(e.target.value) || 0 }))} /></div>
            <Button onClick={saveCat} disabled={savingCat} className="w-full">{savingCat ? "Ekleniyor..." : "Ekle"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
