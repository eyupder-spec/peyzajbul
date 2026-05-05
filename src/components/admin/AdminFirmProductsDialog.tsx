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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Leaf, Box, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { compressAndConvertToWebP } from "@/lib/imageUtils";

interface AdminFirmProductsDialogProps {
  firmId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminFirmProductsDialog({ firmId, open, onOpenChange }: AdminFirmProductsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [firm, setFirm] = useState<any>(null);

  // Data
  const [firmPlants, setFirmPlants] = useState<any[]>([]);
  const [firmProducts, setFirmProducts] = useState<any[]>([]);
  const [catalogPlants, setCatalogPlants] = useState<any[]>([]);

  // Inner Dialogs for Add/Edit
  const [plantDialogOpen, setPlantDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  // Forms
  const [plantForm, setPlantForm] = useState<any>({
    id: null, plant_id: "", show_price: false, price_display: "", stock_status: "available", notes: ""
  });
  const [productForm, setProductForm] = useState<any>({
    id: null, title: "", category: "Saksı & Dekorasyon", description: "", price_display: "", show_price: false, is_active: true, image_url: ""
  });
  
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = useCallback(async () => {
    if (!firmId || !open) return;
    setLoading(true);

    const { data: firmData } = await supabase
      .from("firms")
      .select("id, company_name")
      .eq("id", firmId)
      .single();

    if (!firmData) {
      toast.error("Firma bulunamadı.");
      onOpenChange(false);
      return;
    }
    setFirm(firmData);

    const [fPlantsRes, fProductsRes, cPlantsRes] = await Promise.all([
      supabase.from("firm_plants").select("*, plants(name, scientific_name, plant_categories(name, icon))").eq("firm_id", firmId),
      supabase.from("firm_products").select("*").eq("firm_id", firmId).order("sort_order"),
      supabase.from("plants").select("id, name, scientific_name, plant_categories(name)").eq("is_published", true).order("name")
    ]);

    setFirmPlants(fPlantsRes.data || []);
    setFirmProducts(fProductsRes.data || []);
    setCatalogPlants(cPlantsRes.data || []);
    setLoading(false);
  }, [firmId, open, onOpenChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const savePlant = async () => {
    if (!plantForm.plant_id) return toast.error("Lütfen katalogdan bitki seçin.");
    setSaving(true);
    try {
      if (plantForm.id) {
        const { error } = await supabase.from("firm_plants").update({
          show_price: plantForm.show_price,
          price_display: plantForm.price_display,
          stock_status: plantForm.stock_status,
          notes: plantForm.notes
        }).eq("id", plantForm.id);
        if (error) throw error;
        toast.success("Bitki güncellendi!");
      } else {
        const { error } = await supabase.from("firm_plants").insert({
          firm_id: firm.id,
          plant_id: plantForm.plant_id,
          show_price: plantForm.show_price,
          price_display: plantForm.price_display,
          stock_status: plantForm.stock_status,
          notes: plantForm.notes
        });
        if (error) {
          if (error.code === '23505') throw new Error("Bu bitki zaten firmanın listesinde ekli.");
          throw error;
        }
        toast.success("Bitki vitrine eklendi!");
      }
      setPlantDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePlant = async (id: string) => {
    if (!confirm("Bu bitkiyi firmanın vitrininden kaldırmak istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("firm_plants").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Bitki kaldırıldı!"); loadData(); }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firm) return;
    setUploadingImage(true);
    try {
      const optimized = await compressAndConvertToWebP(file);
      const originalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/g, "-").toLowerCase();
      const path = `products/${firm.id}/${originalName}-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, optimized);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("project-images").getPublicUrl(path);
      setProductForm((prev: any) => ({ ...prev, image_url: publicUrl }));
      toast.success("Görsel yüklendi!");
    } catch (err: any) {
      toast.error("Görsel yükleme başarısız.");
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProduct = async () => {
    if (!productForm.title) return toast.error("Ürün başlığı zorunludur.");
    setSaving(true);
    try {
      if (productForm.id) {
        const { error } = await supabase.from("firm_products").update({
          title: productForm.title,
          category: productForm.category,
          description: productForm.description,
          price_display: productForm.price_display,
          show_price: productForm.show_price,
          is_active: productForm.is_active,
          image_url: productForm.image_url
        }).eq("id", productForm.id);
        if (error) throw error;
        toast.success("Ürün güncellendi!");
      } else {
        const { error } = await supabase.from("firm_products").insert({
          firm_id: firm.id,
          title: productForm.title,
          category: productForm.category,
          description: productForm.description,
          price_display: productForm.price_display,
          show_price: productForm.show_price,
          is_active: productForm.is_active,
          image_url: productForm.image_url
        });
        if (error) throw error;
        toast.success("Ürün eklendi!");
      }
      setProductDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("firm_products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ürün silindi!"); loadData(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            {firm ? `${firm.company_name} - Ürün Vitrini` : 'Yükleniyor...'}
          </DialogTitle>
          <DialogDescription>
            Bu firmanın vitrininde gösterilecek bitki ve serbest ürünleri yönetebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 bg-muted/20">
          {loading ? (
            <div className="h-full flex items-center justify-center">Yükleniyor...</div>
          ) : (
            <Tabs defaultValue="plants" className="w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <TabsList>
                  <TabsTrigger value="plants" className="gap-2"><Leaf className="h-4 w-4" /> Katalog Bitkileri ({firmPlants.length})</TabsTrigger>
                  <TabsTrigger value="products" className="gap-2"><Box className="h-4 w-4" /> Serbest Ürünler ({firmProducts.length})</TabsTrigger>
                </TabsList>
              </div>

              {/* BİTKİLER TAB */}
              <TabsContent value="plants" className="space-y-4 m-0">
                <div className="flex justify-end">
                  <Button onClick={() => {
                    setPlantForm({ id: null, plant_id: "", show_price: false, price_display: "", stock_status: "in_stock", notes: "" });
                    setPlantDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" /> Bitki Ekle
                  </Button>
                </div>

                {firmPlants.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {firmPlants.map(fp => {
                      const p = fp.plants;
                      return (
                        <Card key={fp.id} className="border-border">
                          <CardContent className="p-4 flex flex-col h-full gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-2xl shrink-0">
                                {p?.plant_categories?.icon || "🌿"}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground leading-tight">{p?.name || "Bilinmeyen Bitki"}</h3>
                                <p className="text-xs text-muted-foreground italic">{p?.scientific_name}</p>
                              </div>
                            </div>
                            <div className="mt-auto space-y-2 pt-2 border-t">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Stok:</span>
                                <span className="font-medium">{fp.stock_status === 'available' ? '🟢 Var' : fp.stock_status === 'limited' ? '🟠 Az' : '🔴 Yok'}</span>
                              </div>
                              {fp.show_price && fp.price_display && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Fiyat:</span>
                                  <span className="font-medium text-emerald-600">{fp.price_display}</span>
                                </div>
                              )}
                              <div className="flex gap-2 pt-2">
                                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => {
                                  setPlantForm({ id: fp.id, plant_id: fp.plant_id, show_price: fp.show_price, price_display: fp.price_display || "", stock_status: fp.stock_status, notes: fp.notes || "" });
                                  setPlantDialogOpen(true);
                                }}>
                                  <Edit className="h-3 w-3 mr-1" /> Düzenle
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => deletePlant(fp.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-xl bg-card border-dashed">
                    <p className="text-muted-foreground font-medium mb-1">Hiç bitki eklenmemiş</p>
                  </div>
                )}
              </TabsContent>

              {/* ÜRÜNLER TAB */}
              <TabsContent value="products" className="space-y-4 m-0">
                <div className="flex justify-end">
                  <Button onClick={() => {
                    setProductForm({ id: null, title: "", category: "Saksı & Dekorasyon", description: "", price_display: "", show_price: false, is_active: true, image_url: "" });
                    setProductDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" /> Serbest Ürün Ekle
                  </Button>
                </div>

                {firmProducts.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {firmProducts.map(p => (
                      <Card key={p.id} className="border-border overflow-hidden">
                        {p.image_url ? (
                          <div className="aspect-[4/3] w-full relative bg-muted">
                            <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                            {!p.is_active && <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"><Badge variant="destructive">Pasif</Badge></div>}
                          </div>
                        ) : (
                          <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8 opacity-20" />
                            {!p.is_active && <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"><Badge variant="destructive">Pasif</Badge></div>}
                          </div>
                        )}
                        <CardContent className="p-3 space-y-2">
                          <div>
                            <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                            <p className="text-[10px] text-muted-foreground">{p.category}</p>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-border">
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => {
                              setProductForm({ ...p });
                              setProductDialogOpen(true);
                            }}>
                              <Edit className="h-3 w-3 mr-1" /> Düzenle
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => deleteProduct(p.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-xl bg-card border-dashed">
                    <p className="text-muted-foreground font-medium mb-1">Hiç ürün eklenmemiş</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>

      {/* Bitki Ekle/Düzenle Inner Modal */}
      <Dialog open={plantDialogOpen} onOpenChange={setPlantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{plantForm.id ? "Bitkiyi Düzenle" : "Katalogdan Bitki Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!plantForm.id && (
              <div className="space-y-1.5">
                <Label>Bitki Seçin *</Label>
                <Select value={plantForm.plant_id} onValueChange={v => setPlantForm((prev: any) => ({ ...prev, plant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Bitki arayın..." /></SelectTrigger>
                  <SelectContent>
                    {catalogPlants.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.plant_categories?.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Stok Durumu</Label>
              <Select value={plantForm.stock_status} onValueChange={v => setPlantForm((prev: any) => ({ ...prev, stock_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">🟢 Stokta Var</SelectItem>
                  <SelectItem value="limited">🟠 Sınırlı Stok</SelectItem>
                  <SelectItem value="unavailable">🔴 Tükendi (Gizle)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>Fiyatı Göster</Label>
              <Switch checked={plantForm.show_price} onCheckedChange={v => setPlantForm((prev: any) => ({ ...prev, show_price: v }))} />
            </div>
            {plantForm.show_price && (
              <div className="space-y-1.5">
                <Label>Fiyat & Birim</Label>
                <Input value={plantForm.price_display} onChange={e => setPlantForm((prev: any) => ({ ...prev, price_display: e.target.value }))} placeholder="Örn: 250 TL / Adet" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Ek Notlar</Label>
              <Textarea value={plantForm.notes} onChange={e => setPlantForm((prev: any) => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlantDialogOpen(false)}>İptal</Button>
            <Button onClick={savePlant} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Serbest Ürün Ekle/Düzenle Inner Modal */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{productForm.id ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center mb-2">
              <div className="relative group w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/20">
                {productForm.image_url ? (
                  <img src={productForm.image_url} alt="Görsel" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                )}
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                  <Upload className="h-6 w-6 mb-1" />
                  <span className="text-xs">{uploadingImage ? "Yükleniyor" : "Görsel Seç"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} disabled={uploadingImage} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Ürün Başlığı *</Label>
                <Input value={productForm.title} onChange={e => setProductForm((prev: any) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Kategori</Label>
                <Input value={productForm.category} onChange={e => setProductForm((prev: any) => ({ ...prev, category: e.target.value }))} />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={productForm.description} onChange={e => setProductForm((prev: any) => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>Fiyatı Göster</Label>
              <Switch checked={productForm.show_price} onCheckedChange={v => setProductForm((prev: any) => ({ ...prev, show_price: v }))} />
            </div>
            
            {productForm.show_price && (
              <div className="space-y-1.5">
                <Label>Fiyat & Birim</Label>
                <Input value={productForm.price_display} onChange={e => setProductForm((prev: any) => ({ ...prev, price_display: e.target.value }))} />
              </div>
            )}
            
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>Yayında</Label>
              <Switch checked={productForm.is_active} onCheckedChange={v => setProductForm((prev: any) => ({ ...prev, is_active: v }))} />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>İptal</Button>
            <Button onClick={saveProduct} disabled={saving || uploadingImage}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Dialog>
  );
}
