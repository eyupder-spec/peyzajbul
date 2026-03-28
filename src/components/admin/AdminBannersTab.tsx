"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Eye, BarChart, Image as ImageIcon } from "lucide-react";

export default function AdminBannersTab() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<any[]>([]);
  const [firms, setFirms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [firmId, setFirmId] = useState("none");
  const [desktopUrl, setDesktopUrl] = useState("");
  const [mobileUrl, setMobileUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [placement, setPlacement] = useState("home_top");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Stats Dialog
  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);

  // Load Banners
  const loadData = async () => {
    setIsLoading(true);
    const client = supabase as any;
    const { data: bData } = await client.from("banners").select("*").order("created_at", { ascending: false });
    const { data: fData } = await client.from("firms").select("id, company_name").eq("is_approved", true);
    
    setBanners(bData || []);
    setFirms(fData || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openForm = (banner?: any) => {
    if (banner) {
      setEditingId(banner.id);
      setTitle(banner.title);
      setFirmId(banner.firm_id || "none");
      setDesktopUrl(banner.image_url_desktop);
      setMobileUrl(banner.image_url_mobile || "");
      setTargetUrl(banner.target_url);
      setPlacement(banner.placement);
      setStartDate(banner.start_date.split("T")[0]);
      setEndDate(banner.end_date.split("T")[0]);
    } else {
      setEditingId(null);
      setTitle("");
      setFirmId("none");
      setDesktopUrl("");
      setMobileUrl("");
      setTargetUrl("");
      setPlacement("home_top");
      
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);
      
      setStartDate(today.toISOString().split("T")[0]);
      setEndDate(nextMonth.toISOString().split("T")[0]);
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!title || !desktopUrl || !targetUrl || !startDate || !endDate) {
      toast({ title: "Zorunlu alanları doldurun", variant: "destructive" });
      return;
    }

    const payload = {
      title,
      firm_id: firmId === "none" ? null : firmId,
      image_url_desktop: desktopUrl,
      image_url_mobile: mobileUrl || null,
      target_url: targetUrl,
      placement,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
    };

    let error;
    const client = supabase as any;
    if (editingId) {
      const { error: updErr } = await client.from("banners").update(payload).eq("id", editingId);
      error = updErr;
    } else {
      const { error: insErr } = await client.from("banners").insert([payload]);
      error = insErr;
    }

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reklam başarıyla kaydedildi" });
      setFormOpen(false);
      loadData();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const client = supabase as any;
    const { error } = await client.from("banners").update({ is_active: !current }).eq("id", id);
    if (!error) loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bu reklamı tamamen silmek istediğinize emin misiniz? (Tüm istatistikleri de silinir)")) {
      const client = supabase as any;
      const { error } = await client.from("banners").delete().eq("id", id);
      if (!error) {
        toast({ title: "Reklam silindi" });
        loadData();
      } else {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
      }
    }
  };

  const openStats = async (banner: any) => {
    setSelectedBanner(banner);
    const client = supabase as any;
    const { data } = await client
      .from("banner_daily_stats")
      .select("*")
      .eq("banner_id", banner.id)
      .order("date", { ascending: false });
    
    setDailyStats(data || []);
    setStatsOpen(true);
  };

  if (isLoading) return <p>Yükleniyor...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading">Reklam (Banner) Yönetimi</h2>
          <p className="text-muted-foreground text-sm">Responsive banner reklamlarını ve istatistiklerini yönetin.</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Reklam Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 mb-6">
        <Card>
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Reklam Başlığı</th>
                  <th className="text-left px-4 py-3 font-medium">Yerleşim</th>
                  <th className="text-left px-4 py-3 font-medium">Gösterim/Tık</th>
                  <th className="text-left px-4 py-3 font-medium">Bitiş Tarihi</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                  <th className="text-left px-4 py-3 font-medium">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {banners.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.title}</div>
                      <a href={b.target_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <Eye className="h-3 w-3" /> URL'ye Git
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{b.placement}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-4">
                        <span className="text-muted-foreground" title="Gösterim"><Eye className="inline h-3 w-3 mr-1" />{b.total_views}</span>
                        <span className="text-primary font-medium" title="Tıklanma"><BarChart className="inline h-3 w-3 mr-1" />{b.total_clicks}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(b.end_date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={b.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(b.id, b.is_active)}>
                        {b.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openStats(b)} title="İstatistikler">
                          <BarChart className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openForm(b)} title="Düzenle">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)} title="Sil" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {banners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">Sistemde reklam bulunmuyor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Reklamı Düzenle" : "Yeni Reklam Ekle"}</DialogTitle>
            <DialogDescription className="sr-only">
              Banner reklam başlığı, firma ilişkisi, konum, görsel URL'leri ve yayın tarihlerini yönetin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Reklam Başlığı / Kampanya Adı</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bahar İndirimi Paketi" />
            </div>

            <div className="space-y-2">
              <Label>İlgili Firma (Opsiyonel)</Label>
              <Select value={firmId} onValueChange={setFirmId}>
                <SelectTrigger><SelectValue placeholder="Firma Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Hiçbiri (Sistem Reklamı) --</SelectItem>
                  {firms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Firma paneli istatistikleri için.</p>
            </div>

            <div className="space-y-2">
              <Label>Reklam Konumu (Placement)</Label>
              <Select value={placement} onValueChange={setPlacement}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_top">Ana Sayfa Üst (Leaderboard)</SelectItem>
                  <SelectItem value="home_middle">Ana Sayfa Orta (Leaderboard)</SelectItem>
                  <SelectItem value="home_left">Ana Sayfa Sol Dikey (Skyscraper)</SelectItem>
                  <SelectItem value="home_right">Ana Sayfa Sağ Dikey (Skyscraper)</SelectItem>
                  <SelectItem value="sidebar_right">Sağ Kolon (Kare / Dikey)</SelectItem>
                  <SelectItem value="blog_inline">Blog Yazı İçi</SelectItem>
                  <SelectItem value="firm_list_top">Firma Listesi Üstü</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Masaüstü Görsel URL (Zorunlu)</Label>
              <Input value={desktopUrl} onChange={(e) => setDesktopUrl(e.target.value)} placeholder="https://.../banner-desktop.webp" />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Mobil Görsel URL (Opsiyonel)</Label>
              <Input value={mobileUrl} onChange={(e) => setMobileUrl(e.target.value)} placeholder="https://.../banner-mobile.webp" />
              <p className="text-xs text-amber-600/80">Boş bırakılırsa, bu reklam mobilde (dar ekranda) gizlenir. Dikey (Skyscraper) bannerlar için boş bırakılması tavsiye edilir.</p>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Hedef URL (Tıklanınca gidilecek adres)</Label>
              <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://peyzajbul.com/firma/..." />
            </div>

            <div className="space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Bitiş Tarihi</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button onClick={handleSave}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>İstatistikler: {selectedBanner?.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Seçili reklamın toplam gösterim, tıklanma ve günlük performans verileri.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <Card className="bg-primary/5 border-primary/20">
                 <CardContent className="p-4 flex flex-col items-center justify-center">
                   <p className="text-sm font-semibold text-muted-foreground uppercase">Toplam Gösterim</p>
                   <p className="text-3xl font-bold text-primary mt-1">{selectedBanner?.total_views}</p>
                 </CardContent>
               </Card>
               <Card className="bg-emerald-500/5 border-emerald-500/20">
                 <CardContent className="p-4 flex flex-col items-center justify-center">
                   <p className="text-sm font-semibold text-muted-foreground uppercase">Toplam Tıklanma</p>
                   <p className="text-3xl font-bold text-emerald-600 mt-1">{selectedBanner?.total_clicks}</p>
                 </CardContent>
               </Card>
            </div>

            <h3 className="font-bold text-lg mt-6">Günlük Kırılım (Son Günler)</h3>
            <table className="w-full text-sm mt-2 border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                   <th className="text-left py-2 px-4">Tarih</th>
                   <th className="text-left py-2 px-4">Gösterim</th>
                   <th className="text-left py-2 px-4">Tıklanma</th>
                   <th className="text-left py-2 px-4">CTR (Oran)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dailyStats.map(s => {
                  const ctr = s.views > 0 ? ((s.clicks / s.views) * 100).toFixed(2) : "0.00";
                  return (
                  <tr key={s.id}>
                    <td className="py-2 px-4 font-medium">{new Date(s.date).toLocaleDateString("tr-TR")}</td>
                    <td className="py-2 px-4">{s.views}</td>
                    <td className="py-2 px-4 text-emerald-600 font-semibold">{s.clicks}</td>
                    <td className="py-2 px-4">%{ctr}</td>
                  </tr>
                )})}
                {dailyStats.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Henüz günlük veri yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
