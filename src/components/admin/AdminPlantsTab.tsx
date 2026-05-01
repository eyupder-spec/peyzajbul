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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Leaf, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string; icon: string | null; sort_order: number | null };
type Plant = {
  id: string; slug: string; name: string; scientific_name: string;
  category_id: string; description: string; watering: string;
  sunlight: string; growth_speed: string; soil_type: string;
  climate_zones: string; is_published: boolean; image_url: string;
  plant_categories?: Category;
};

const emptyPlant = {
  slug: "", name: "", scientific_name: "", category_id: "",
  description: "", watering: "orta", sunlight: "tam_gunes",
  growth_speed: "orta", soil_type: "", climate_zones: "", is_published: true, image_url: "",
};

export default function AdminPlantsTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  // Plant dialog
  const [plantDialogOpen, setPlantDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Partial<Plant> | null>(null);
  const [plantForm, setPlantForm] = useState<typeof emptyPlant>(emptyPlant);
  const [savingPlant, setSavingPlant] = useState(false);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", slug: "", icon: "🌿", sort_order: 0 });
  const [savingCat, setSavingCat] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [catRes, plantRes] = await Promise.all([
      supabase.from("plant_categories").select("*").order("sort_order"),
      supabase.from("plants").select("*, plant_categories(name, icon)").order("name"),
    ]);
    setCategories((catRes.data || []) as Category[]);
    setPlants((plantRes.data as unknown as Plant[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAddPlant = () => { setEditingPlant(null); setPlantForm(emptyPlant); setPlantDialogOpen(true); };
  const openEditPlant = (p: Plant) => {
    setEditingPlant(p);
    setPlantForm({
      slug: p.slug, name: p.name, scientific_name: p.scientific_name || "",
      category_id: p.category_id || "", description: p.description || "",
      watering: p.watering || "orta", sunlight: p.sunlight || "tam_gunes",
      growth_speed: p.growth_speed || "orta", soil_type: p.soil_type || "",
      climate_zones: p.climate_zones || "", is_published: p.is_published, image_url: p.image_url || "",
    });
    setPlantDialogOpen(true);
  };
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingImage(true);
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("plants")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("plants")
        .getPublicUrl(path);

      setPlantForm(p => ({ ...p, image_url: publicUrl }));
      toast.success("Görsel yüklendi");
    } catch (error: any) {
      toast.error("Görsel yüklenirken hata oluştu: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };


  const savePlant = async () => {
    if (!plantForm.name || !plantForm.slug) { toast.error("Ad ve slug zorunlu"); return; }
    setSavingPlant(true);
    try {
      const payload = { ...plantForm, category_id: plantForm.category_id || null };
      if (editingPlant?.id) {
        const { error } = await supabase.from("plants").update(payload).eq("id", editingPlant.id);
        if (error) throw error;
        toast.success("Bitki güncellendi!");
      } else {
        const { error } = await supabase.from("plants").insert(payload);
        if (error) throw error;
        toast.success("Bitki eklendi!");
      }
      setPlantDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPlant(false);
    }
  };

  const deletePlant = async (id: string, name: string) => {
    if (!confirm(`"${name}" bitkisini silmek istediğinize emin misiniz?`)) return;
    const { error } = await supabase.from("plants").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Bitki silindi"); load(); }
  };

  const saveCat = async () => {
    if (!catForm.name || !catForm.slug) { toast.error("Ad ve slug zorunlu"); return; }
    setSavingCat(true);
    try {
      const { error } = await supabase.from("plant_categories").insert(catForm);
      if (error) throw error;
      toast.success("Kategori eklendi!");
      setCatDialogOpen(false);
      setCatForm({ name: "", slug: "", icon: "🌿", sort_order: 0 });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingCat(false);
    }
  };

  const filtered = plants.filter(p => {
    if (filterCat !== "all" && p.category_id !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) || (p.scientific_name || "").toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="py-20 text-center text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{plants.length}</p><p className="text-xs text-muted-foreground">Toplam Bitki</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{categories.length}</p><p className="text-xs text-muted-foreground">Kategori</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{plants.filter(p => p.is_published).length}</p><p className="text-xs text-muted-foreground">Yayında</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{plants.filter(p => !p.is_published).length}</p><p className="text-xs text-muted-foreground">Taslak</p></CardContent></Card>
      </div>

      {/* Kategoriler */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Leaf className="h-4 w-4" /> Kategoriler</CardTitle>
          <Button size="sm" onClick={() => setCatDialogOpen(true)}><Plus className="h-3 w-3 mr-1" /> Kategori Ekle</Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm">
                <span>{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
                <span className="text-muted-foreground text-xs">({plants.filter(p => p.category_id === cat.id).length})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bitkiler Listesi */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Bitki adı veya latince ara..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAddPlant}><Plus className="h-4 w-4 mr-1" /> Bitki Ekle</Button>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Bitki</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Latince</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Kategori</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Bakım</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Durum</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(plant => (
                <tr key={plant.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {plant.image_url ? (
                        <img src={plant.image_url} alt={plant.name} className="w-8 h-8 rounded-md object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center rounded-md bg-muted text-lg border border-border">
                          {(plant.plant_categories as any)?.icon || "🌿"}
                        </div>
                      )}
                      {plant.name}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground italic text-xs">{plant.scientific_name}</td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="text-xs">{(plant.plant_categories as any)?.name || "-"}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {plant.watering && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">💧{plant.watering}</span>}
                      {plant.sunlight && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">☀️{plant.sunlight === 'tam_gunes' ? 'T' : plant.sunlight === 'yari_golge' ? 'Y' : 'G'}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={plant.is_published ? "default" : "secondary"}>{plant.is_published ? "Yayında" : "Taslak"}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditPlant(plant)} title="Düzenle">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <a href={`/bitkiler/${plant.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Sayfayı Görüntüle">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deletePlant(plant.id, plant.name)} title="Sil">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">Bitki bulunamadı.</div>
          )}
        </div>
      </div>

      {/* Bitki Ekle/Düzenle Dialog */}
      <Dialog open={plantDialogOpen} onOpenChange={setPlantDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlant ? "Bitki Düzenle" : "Yeni Bitki Ekle"}</DialogTitle>
            <DialogDescription className="sr-only">Bitki bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bitki Adı *</Label>
                <Input value={plantForm.name} onChange={e => setPlantForm(p => ({ ...p, name: e.target.value }))} placeholder="Lavanta" />
              </div>
              <div className="space-y-1.5">
                <Label>URL Slug *</Label>
                <Input value={plantForm.slug} onChange={e => setPlantForm(p => ({ ...p, slug: e.target.value }))} placeholder="lavanta" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Latince Adı</Label>
              <Input value={plantForm.scientific_name} onChange={e => setPlantForm(p => ({ ...p, scientific_name: e.target.value }))} placeholder="Lavandula angustifolia" />
            </div>
            <div className="space-y-1.5">
              <Label>Görsel Yükle veya URL Gir</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="flex-1" />
                {uploadingImage && <span className="text-sm text-muted-foreground animate-pulse">Yükleniyor...</span>}
              </div>
              <Input value={plantForm.image_url} onChange={e => setPlantForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://ornek.com/gorsel.jpg" />
              {plantForm.image_url && (
                <div className="mt-2 relative w-32 h-32 rounded-lg border border-border overflow-hidden">
                  <img src={plantForm.image_url} alt="Önizleme" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={plantForm.category_id} onValueChange={v => setPlantForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={plantForm.description} onChange={e => setPlantForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Sulama</Label>
                <Select value={plantForm.watering} onValueChange={v => setPlantForm(p => ({ ...p, watering: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="az">💧 Az</SelectItem>
                    <SelectItem value="orta">💧💧 Orta</SelectItem>
                    <SelectItem value="cok">💧💧💧 Bol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Işık</Label>
                <Select value={plantForm.sunlight} onValueChange={v => setPlantForm(p => ({ ...p, sunlight: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tam_gunes">☀️ Tam Güneş</SelectItem>
                    <SelectItem value="yari_golge">⛅ Yarı Gölge</SelectItem>
                    <SelectItem value="golge">🌥️ Gölge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Büyüme</Label>
                <Select value={plantForm.growth_speed} onValueChange={v => setPlantForm(p => ({ ...p, growth_speed: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yavas">🐢 Yavaş</SelectItem>
                    <SelectItem value="orta">➡️ Orta</SelectItem>
                    <SelectItem value="hizli">🚀 Hızlı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Toprak Tipi</Label>
                <Input value={plantForm.soil_type} onChange={e => setPlantForm(p => ({ ...p, soil_type: e.target.value }))} placeholder="Kum karma, iyi drene edilmiş" />
              </div>
              <div className="space-y-1.5">
                <Label>İklim Bölgesi</Label>
                <Input value={plantForm.climate_zones} onChange={e => setPlantForm(p => ({ ...p, climate_zones: e.target.value }))} placeholder="Akdeniz, Karadeniz" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Yayında</Label>
              <Switch checked={plantForm.is_published} onCheckedChange={v => setPlantForm(p => ({ ...p, is_published: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlantDialogOpen(false)}>İptal</Button>
            <Button onClick={savePlant} disabled={savingPlant}>{savingPlant ? "Kaydediliyor..." : editingPlant ? "Güncelle" : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kategori Ekle Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kategori Ekle</DialogTitle>
            <DialogDescription className="sr-only">Yeni bitki kategorisi</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>İkon (Emoji)</Label>
                <Input value={catForm.icon} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))} placeholder="🌿" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Kategori Adı *</Label>
                <Input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Çiçekli Çalılar" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input value={catForm.slug} onChange={e => setCatForm(p => ({ ...p, slug: e.target.value }))} placeholder="cicekli-calilar" />
              </div>
              <div className="space-y-1.5">
                <Label>Sıra</Label>
                <Input type="number" value={catForm.sort_order} onChange={e => setCatForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>İptal</Button>
            <Button onClick={saveCat} disabled={savingCat}>{savingCat ? "..." : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
