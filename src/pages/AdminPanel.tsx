import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, CreditCard, TrendingUp, FileText, Trash2, Edit, LogOut,
  Building2, CheckCircle, XCircle, Plus, Coins, Crown, Image, Star,
  LayoutDashboard, Menu
} from "lucide-react";
import { getScoreBadge } from "@/lib/leadScoring";
import FirmFormDialog, { type FirmFormData } from "@/components/admin/FirmFormDialog";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

type Firm = {
  id: string;
  user_id: string;
  company_name: string;
  phone: string;
  email: string;
  city: string;
  district: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  services: string[];
  is_approved: boolean;
  is_active: boolean;
  is_premium: boolean;
  premium_until: string | null;
  google_maps_url: string | null;
  detailed_services: any;
  coin_balance: number;
  created_at: string;
};

type Lead = {
  id: string;
  created_at: string;
  service_type: string;
  project_size: string;
  budget: string;
  timeline: string;
  city: string;
  district: string | null;
  full_name: string;
  phone: string;
  email: string;
  lead_score: number | null;
  status: string;
  user_id: string;
};

type UserRole = {
  id: string;
  user_id: string;
  role: "homeowner" | "firm" | "admin";
  created_at: string;
};

const SIDEBAR_ITEMS = [
  { title: "Dashboard", key: "dashboard", icon: LayoutDashboard },
  { title: "Leadler", key: "leads", icon: FileText },
  { title: "Firmalar", key: "firms", icon: Building2 },
  { title: "Jetonlar", key: "jetonlar", icon: Coins },
];

function AdminSidebar({ tab, setTab, pendingFirmCount }: { tab: string; setTab: (t: any) => void; pendingFirmCount: number }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {!collapsed && <span className="font-heading font-bold">Admin</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_ITEMS.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => setTab(item.key)}
                    className={`cursor-pointer ${tab === item.key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {!collapsed && (
                      <span className="flex items-center gap-2">
                        {item.title}
                        {item.key === "firms" && pendingFirmCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{pendingFirmCount}</Badge>
                        )}
                      </span>
                    )}
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

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [firmsData, setFirmsData] = useState<Firm[]>([]);
  const [tab, setTab] = useState<"dashboard" | "leads" | "firms" | "jetonlar">("dashboard");
  const [coinTransactions, setCoinTransactions] = useState<any[]>([]);
  const [selectedFirmTransactions, setSelectedFirmTransactions] = useState<string | null>(null);
  const [adminGalleryFirmId, setAdminGalleryFirmId] = useState<string | null>(null);
  const [adminGallery, setAdminGallery] = useState<any[]>([]);
  const [adminReviewsFirmId, setAdminReviewsFirmId] = useState<string | null>(null);
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");

  // Filters
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Delete dialog
  const [deletingLead, setDeletingLead] = useState<string | null>(null);

  // Status edit
  const [editingStatus, setEditingStatus] = useState<{ id: string; status: string } | null>(null);

  // Firm form dialog
  const [firmFormOpen, setFirmFormOpen] = useState(false);
  const [editingFirm, setEditingFirm] = useState<FirmFormData | null>(null);

  // Manual coin add
  const [addCoinFirmId, setAddCoinFirmId] = useState<string | null>(null);
  const [addCoinAmount, setAddCoinAmount] = useState("");
  const [addCoinDesc, setAddCoinDesc] = useState("Admin tarafından manuel yükleme");
  const [addingCoin, setAddingCoin] = useState(false);

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin/giris"); return; }

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) { navigate("/admin/giris"); return; }

    const [leadsRes, rolesRes, purchasesRes, firmsRes, coinTxRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("lead_purchases").select("*"),
      supabase.from("firms").select("*").order("created_at", { ascending: false }),
      supabase.from("coin_transactions").select("*").order("created_at", { ascending: false }),
    ]);

    setLeads(leadsRes.data || []);
    setRoles(rolesRes.data || []);
    setPurchases(purchasesRes.data || []);
    setFirmsData((firmsRes.data as Firm[]) || []);
    setCoinTransactions(coinTxRes.data || []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);

  const handleDeleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Lead silindi" });
    }
    setDeletingLead(null);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
      toast({ title: "Durum güncellendi" });
    }
    setEditingStatus(null);
  };

  const handleApproveFirm = async (firmId: string) => {
    const { error } = await supabase.from("firms").update({ is_approved: true }).eq("id", firmId);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setFirmsData((prev) => prev.map((f) => f.id === firmId ? { ...f, is_approved: true } : f));
      toast({ title: "Firma onaylandı!" });
    }
  };

  const handleRejectFirm = async (firmId: string, userId: string) => {
    await supabase.from("firms").delete().eq("id", firmId);
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "firm");
    setFirmsData((prev) => prev.filter((f) => f.id !== firmId));
    setRoles((prev) => prev.filter((r) => !(r.user_id === userId && r.role === "firm")));
    toast({ title: "Firma başvurusu reddedildi" });
  };

  const handleToggleFirmActive = async (firmId: string, currentActive: boolean) => {
    const { error } = await supabase.from("firms").update({ is_active: !currentActive }).eq("id", firmId);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setFirmsData((prev) => prev.map((f) => f.id === firmId ? { ...f, is_active: !currentActive } : f));
      toast({ title: currentActive ? "Firma devre dışı bırakıldı" : "Firma aktifleştirildi" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/giris");
  };

  // Manual coin add
  const handleAddCoins = async () => {
    if (!addCoinFirmId || !addCoinAmount) return;
    const amount = parseInt(addCoinAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Geçerli bir miktar girin", variant: "destructive" });
      return;
    }
    setAddingCoin(true);
    try {
      const firm = firmsData.find(f => f.id === addCoinFirmId);
      if (!firm) throw new Error("Firma bulunamadı");

      const { error: updateError } = await supabase
        .from("firms")
        .update({ coin_balance: firm.coin_balance + amount })
        .eq("id", firm.id);
      if (updateError) throw updateError;

      const { error: txError } = await supabase.from("coin_transactions").insert({
        firm_id: firm.id,
        amount: amount,
        type: "purchase",
        description: addCoinDesc || "Admin tarafından manuel yükleme",
      });
      if (txError) throw txError;

      setFirmsData(prev => prev.map(f => f.id === firm.id ? { ...f, coin_balance: f.coin_balance + amount } : f));
      toast({ title: `${amount} jeton eklendi!` });
      setAddCoinFirmId(null);
      setAddCoinAmount("");
      checkAdmin(); // refresh transactions
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setAddingCoin(false);
    }
  };

  // Admin gallery management
  const loadAdminGallery = async (firmId: string) => {
    setAdminGalleryFirmId(firmId);
    const { data } = await supabase
      .from("firm_gallery")
      .select("*")
      .eq("firm_id", firmId)
      .order("sort_order", { ascending: true });
    setAdminGallery(data || []);
  };

  const handleAdminGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminGalleryFirmId) return;
    setGalleryUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${adminGalleryFirmId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("firm-gallery").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("firm-gallery").getPublicUrl(path);
      await supabase.from("firm_gallery").insert({
        firm_id: adminGalleryFirmId,
        image_url: publicUrl,
        caption: galleryCaption || null,
        sort_order: adminGallery.length,
      });
      toast({ title: "Fotoğraf eklendi!" });
      setGalleryCaption("");
      loadAdminGallery(adminGalleryFirmId);
    } catch {
      toast({ title: "Yükleme başarısız", variant: "destructive" });
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleAdminGalleryDelete = async (id: string, imageUrl: string) => {
    const urlParts = imageUrl.split("/firm-gallery/");
    if (urlParts[1]) await supabase.storage.from("firm-gallery").remove([urlParts[1]]);
    await supabase.from("firm_gallery").delete().eq("id", id);
    if (adminGalleryFirmId) loadAdminGallery(adminGalleryFirmId);
    toast({ title: "Fotoğraf silindi" });
  };

  const loadAdminReviews = async (firmId: string) => {
    setAdminReviewsFirmId(firmId);
    const { data } = await supabase
      .from("firm_reviews")
      .select("*")
      .eq("firm_id", firmId)
      .order("created_at", { ascending: false });
    setAdminReviews(data || []);
  };

  const handleToggleReviewApproval = async (reviewId: string, currentApproved: boolean) => {
    await supabase.from("firm_reviews").update({ is_approved: !currentApproved }).eq("id", reviewId);
    if (adminReviewsFirmId) loadAdminReviews(adminReviewsFirmId);
    toast({ title: currentApproved ? "Yorum gizlendi" : "Yorum onaylandı" });
  };

  const handleDeleteReview = async (reviewId: string) => {
    await supabase.from("firm_reviews").delete().eq("id", reviewId);
    if (adminReviewsFirmId) loadAdminReviews(adminReviewsFirmId);
    toast({ title: "Yorum silindi" });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  }

  // Stats
  const now = new Date();
  const todayLeads = leads.filter((l) => new Date(l.created_at).toDateString() === now.toDateString()).length;
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekLeads = leads.filter((l) => new Date(l.created_at) >= weekAgo).length;
  const monthLeads = leads.filter((l) => new Date(l.created_at).getMonth() === now.getMonth()).length;
  const totalCoinRevenue = coinTransactions.filter(t => t.type === "purchase").reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalRevenue = purchases.length * 20;
  const firmCount = firmsData.filter((f) => f.is_approved).length;
  const pendingFirmCount = firmsData.filter((f) => !f.is_approved).length;
  const conversionRate = leads.length > 0 ? Math.round((purchases.length / leads.length) * 100) : 0;

  const filteredLeads = leads.filter((l) => {
    if (filterCity && !l.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar tab={tab} setTab={setTab} pendingFirmCount={pendingFirmCount} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-heading text-lg font-bold text-foreground">{SIDEBAR_ITEMS.find(i => i.key === tab)?.title || "Admin"}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Çıkış
            </Button>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6">
            {/* Dashboard */}
            {tab === "dashboard" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Bugün</CardTitle>
                      <FileText className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold text-foreground">{todayLeads}</p><p className="text-xs text-muted-foreground">Bu hafta: {weekLeads} · Bu ay: {monthLeads}</p></CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Gelir</CardTitle>
                      <CreditCard className="h-5 w-5 text-accent" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold text-foreground">${totalRevenue}</p></CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Firma</CardTitle>
                      <Building2 className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold text-foreground">{firmCount}</p></CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Dönüşüm</CardTitle>
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold text-foreground">{conversionRate}%</p></CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Leads */}
            {tab === "leads" && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <Input placeholder="İl filtrele..." value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="w-48" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="purchased">Satın Alınmış</SelectItem>
                      <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tarih</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Ad Soyad</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Telefon</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">E-posta</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Hizmet</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">İl</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Bütçe</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Skor</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Durum</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLeads.map((lead) => {
                        const badge = getScoreBadge(lead.lead_score);
                        return (
                          <tr key={lead.id} className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-foreground">{new Date(lead.created_at).toLocaleDateString("tr-TR")}</td>
                            <td className="px-3 py-2 text-foreground font-medium">{lead.full_name}</td>
                            <td className="px-3 py-2 text-foreground">{lead.phone}</td>
                            <td className="px-3 py-2 text-foreground">{lead.email}</td>
                            <td className="px-3 py-2 text-foreground">{lead.service_type}</td>
                            <td className="px-3 py-2 text-foreground">{lead.city}</td>
                            <td className="px-3 py-2 text-foreground">{lead.budget}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                                {badge.emoji} {lead.lead_score || 0}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={lead.status === "active" ? "default" : lead.status === "expired" ? "destructive" : "secondary"}>
                                {lead.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingStatus({ id: lead.id, status: lead.status })}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeletingLead(lead.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jetonlar */}
            {tab === "jetonlar" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Jeton Satışı</CardTitle>
                      <Coins className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">{totalCoinRevenue} jeton</p>
                      <p className="text-xs text-muted-foreground">${totalCoinRevenue} gelir</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Harcanan Jeton</CardTitle>
                      <CreditCard className="h-5 w-5 text-accent" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">
                        {coinTransactions.filter(t => t.type === "spend").reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)} jeton
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Bakiye</CardTitle>
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">
                        {firmsData.reduce((sum, f) => sum + f.coin_balance, 0)} jeton
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <h3 className="text-lg font-semibold text-foreground">Firma Bakiyeleri</h3>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Firma</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">İl</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Bakiye</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Toplam Yükleme</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Toplam Harcama</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {firmsData.filter(f => f.is_approved).map((firm) => {
                        const firmTx = coinTransactions.filter(t => t.firm_id === firm.id);
                        const totalPurchased = firmTx.filter(t => t.type === "purchase").reduce((s: number, t: any) => s + t.amount, 0);
                        const totalSpent = firmTx.filter(t => t.type === "spend").reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
                        return (
                          <tr key={firm.id} className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-foreground font-medium">{firm.company_name}</td>
                            <td className="px-3 py-2 text-foreground">{firm.city}</td>
                            <td className="px-3 py-2">
                              <Badge variant={firm.coin_balance > 0 ? "default" : "destructive"}>
                                {firm.coin_balance} jeton
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-foreground">{totalPurchased} jeton</td>
                            <td className="px-3 py-2 text-foreground">{totalSpent} jeton</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => { setAddCoinFirmId(firm.id); setAddCoinAmount(""); }}>
                                  <Plus className="h-3 w-3 mr-1" /> Jeton Ekle
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedFirmTransactions(selectedFirmTransactions === firm.id ? null : firm.id)}>
                                  {selectedFirmTransactions === firm.id ? "Gizle" : "Detay"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedFirmTransactions && (() => {
                  const firm = firmsData.find(f => f.id === selectedFirmTransactions);
                  const firmTx = coinTransactions.filter(t => t.firm_id === selectedFirmTransactions);
                  return (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {firm?.company_name} - İşlem Geçmişi
                      </h3>
                      <div className="rounded-lg border border-border overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tarih</th>
                              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tür</th>
                              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Miktar</th>
                              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Açıklama</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {firmTx.map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-muted/50">
                                <td className="px-3 py-2 text-foreground">{new Date(tx.created_at).toLocaleString("tr-TR")}</td>
                                <td className="px-3 py-2">
                                  <Badge variant={tx.type === "purchase" ? "default" : "secondary"}>
                                    {tx.type === "purchase" ? "Yükleme" : "Harcama"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-foreground font-medium">
                                  {tx.type === "purchase" ? "+" : ""}{tx.amount} jeton
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{tx.description || "-"}</td>
                              </tr>
                            ))}
                            {firmTx.length === 0 && (
                              <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Henüz işlem yok</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Firms */}
            {tab === "firms" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div />
                  <div className="flex items-center gap-3">
                    {pendingFirmCount > 0 && (
                      <Badge variant="destructive">{pendingFirmCount} onay bekliyor</Badge>
                    )}
                    <Button onClick={() => { setEditingFirm(null); setFirmFormOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Firma Ekle
                    </Button>
                  </div>
                </div>

                {firmsData.filter((f) => !f.is_approved).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">Onay Bekleyenler</h3>
                    <div className="grid gap-4">
                      {firmsData.filter((f) => !f.is_approved).map((firm) => (
                        <Card key={firm.id} className="border-accent/30 bg-accent/5">
                          <CardContent className="pt-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <p className="font-semibold text-foreground">{firm.company_name}</p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                  <span>📧 {firm.email}</span>
                                  <span>📞 {firm.phone}</span>
                                  <span>📍 {firm.city}{firm.district ? ` / ${firm.district}` : ""}</span>
                                  {firm.website && <span>🌐 {firm.website}</span>}
                                </div>
                                {firm.services.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {firm.services.map((s) => (
                                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button size="sm" onClick={() => handleApproveFirm(firm.id)}>
                                  <CheckCircle className="h-4 w-4 mr-1" /> Onayla
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectFirm(firm.id, firm.user_id)}>
                                  <XCircle className="h-4 w-4 mr-1" /> Reddet
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-foreground">Onaylı Firmalar</h3>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Firma Adı</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">İl</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Premium</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Bakiye</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Durum</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {firmsData.filter((f) => f.is_approved).map((firm) => (
                        <tr key={firm.id} className="hover:bg-muted/50">
                          <td className="px-3 py-2 text-foreground font-medium">{firm.company_name}</td>
                          <td className="px-3 py-2 text-foreground">{firm.city}</td>
                          <td className="px-3 py-2">
                            {firm.is_premium ? (
                              <Badge className="bg-yellow-500/90 text-white gap-1"><Crown className="h-3 w-3" /> Premium</Badge>
                            ) : (
                              <Badge variant="outline">Standart</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={firm.coin_balance > 0 ? "default" : "secondary"}>
                              {firm.coin_balance} jeton
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={firm.is_active ? "default" : "destructive"}>
                              {firm.is_active ? "Aktif" : "Pasif"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="ghost" title="Düzenle" onClick={() => {
                setEditingFirm({
                                  id: firm.id,
                                  user_id: firm.user_id,
                                  company_name: firm.company_name,
                                  phone: firm.phone,
                                  email: firm.email,
                                  city: firm.city,
                                  district: firm.district || "",
                                  address: firm.address || "",
                                  website: (firm as any).website || "",
                                  slug: (firm as any).slug || "",
                                  description: firm.description || "",
                                  services: firm.services,
                                  is_approved: firm.is_approved,
                                  is_active: firm.is_active,
                                  is_premium: firm.is_premium,
                                  premium_until: firm.premium_until || "",
                                  google_maps_url: firm.google_maps_url || "",
                                  detailed_services: firm.detailed_services || [],
                                });
                                setFirmFormOpen(true);
                              }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Galeri" onClick={() => loadAdminGallery(firm.id)}>
                                <Image className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Yorumlar" onClick={() => loadAdminReviews(firm.id)}>
                                <Star className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Jeton Ekle" onClick={() => { setAddCoinFirmId(firm.id); setAddCoinAmount(""); }}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant={firm.is_active ? "destructive" : "default"} onClick={() => handleToggleFirmActive(firm.id, firm.is_active)}>
                                {firm.is_active ? "Devre Dışı" : "Aktifleştir"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {firmsData.filter((f) => f.is_approved).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">Henüz onaylı firma yok.</div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lead'i silmek istediğinize emin misiniz?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLead(null)}>İptal</Button>
            <Button variant="destructive" onClick={() => deletingLead && handleDeleteLead(deletingLead)}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status edit */}
      <Dialog open={!!editingStatus} onOpenChange={() => setEditingStatus(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Durum Güncelle</DialogTitle></DialogHeader>
          <Select value={editingStatus?.status || ""} onValueChange={(val) => setEditingStatus((prev) => prev ? { ...prev, status: val } : null)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="purchased">Purchased</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)}>İptal</Button>
            <Button onClick={() => editingStatus && handleStatusUpdate(editingStatus.id, editingStatus.status)}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Coins Dialog */}
      <Dialog open={!!addCoinFirmId} onOpenChange={() => setAddCoinFirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" /> Manuel Jeton Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Firma: <span className="font-semibold text-foreground">{firmsData.find(f => f.id === addCoinFirmId)?.company_name}</span>
            </p>
            <div className="space-y-1.5">
              <Label>Miktar (Jeton)</Label>
              <Input
                type="number"
                placeholder="Örn: 100"
                value={addCoinAmount}
                onChange={(e) => setAddCoinAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Input
                value={addCoinDesc}
                onChange={(e) => setAddCoinDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCoinFirmId(null)}>İptal</Button>
            <Button onClick={handleAddCoins} disabled={addingCoin || !addCoinAmount}>
              {addingCoin ? "Ekleniyor..." : "Jeton Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Firm form dialog */}
      <FirmFormDialog
        open={firmFormOpen}
        onClose={() => { setFirmFormOpen(false); setEditingFirm(null); }}
        onSaved={() => checkAdmin()}
        initialData={editingFirm}
      />

      {/* Admin Gallery Dialog */}
      <Dialog open={!!adminGalleryFirmId} onOpenChange={() => setAdminGalleryFirmId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" /> Galeri Yönetimi - {firmsData.find(f => f.id === adminGalleryFirmId)?.company_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Açıklama (opsiyonel)"
                value={galleryCaption}
                onChange={(e) => setGalleryCaption(e.target.value)}
                className="flex-1"
              />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleAdminGalleryUpload} className="hidden" disabled={galleryUploading} />
                <Button asChild disabled={galleryUploading}>
                  <span>{galleryUploading ? "Yükleniyor..." : "Fotoğraf Ekle"}</span>
                </Button>
              </label>
            </div>
            {adminGallery.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {adminGallery.map((img) => (
                  <div key={img.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-border">
                    <img src={img.image_url} alt={img.caption || "Galeri"} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Button variant="destructive" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleAdminGalleryDelete(img.id, img.image_url)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Sil
                      </Button>
                    </div>
                    {img.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">{img.caption}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Henüz fotoğraf yok.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Reviews Dialog */}
      <Dialog open={!!adminReviewsFirmId} onOpenChange={() => setAdminReviewsFirmId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" /> Yorum Yönetimi - {firmsData.find(f => f.id === adminReviewsFirmId)?.company_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {adminReviews.length > 0 ? adminReviews.map((review) => (
              <div key={review.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">{review.reviewer_name}</span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < review.rating ? "text-yellow-500 fill-current" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <Badge variant={review.is_approved ? "default" : "secondary"}>
                    {review.is_approved ? "Onaylı" : "Beklemede"}
                  </Badge>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleToggleReviewApproval(review.id, review.is_approved)}>
                    {review.is_approved ? "Gizle" : "Onayla"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteReview(review.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Sil
                  </Button>
                </div>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">Henüz yorum yok.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminPanel;
