import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, CreditCard, TrendingUp, FileText, Trash2, Edit, LogOut, Building2, CheckCircle, XCircle } from "lucide-react";
import { getScoreBadge } from "@/lib/leadScoring";

type Firm = {
  id: string;
  user_id: string;
  company_name: string;
  phone: string;
  email: string;
  city: string;
  district: string | null;
  tax_number: string | null;
  description: string | null;
  services: string[];
  is_approved: boolean;
  is_active: boolean;
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

const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [tab, setTab] = useState<"dashboard" | "leads" | "firms">("dashboard");

  // Filters
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Delete dialog
  const [deletingLead, setDeletingLead] = useState<string | null>(null);

  // Status edit
  const [editingStatus, setEditingStatus] = useState<{ id: string; status: string } | null>(null);

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin/giris"); return; }

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) { navigate("/admin/giris"); return; }

    // Fetch all data
    const [leadsRes, rolesRes, purchasesRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("lead_purchases").select("*"),
    ]);

    setLeads(leadsRes.data || []);
    setRoles(rolesRes.data || []);
    setPurchases(purchasesRes.data || []);
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

  const handleToggleFirmActive = async (userId: string, currentRole: string) => {
    // Toggle by deleting/re-adding firm role
    if (currentRole === "firm") {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "firm");
      setRoles((prev) => prev.filter((r) => !(r.user_id === userId && r.role === "firm")));
      toast({ title: "Firma devre dışı bırakıldı" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/giris");
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
  const totalRevenue = purchases.length * 20;
  const firmCount = roles.filter((r) => r.role === "firm").length;
  const conversionRate = leads.length > 0 ? Math.round((purchases.length / leads.length) * 100) : 0;

  const filteredLeads = leads.filter((l) => {
    if (filterCity && !l.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  const firms = roles.filter((r) => r.role === "firm");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold text-foreground">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={tab === "dashboard" ? "default" : "ghost"} size="sm" onClick={() => setTab("dashboard")}>Dashboard</Button>
            <Button variant={tab === "leads" ? "default" : "ghost"} size="sm" onClick={() => setTab("leads")}>Leadler</Button>
            <Button variant={tab === "firms" ? "default" : "ghost"} size="sm" onClick={() => setTab("firms")}>Firmalar</Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
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
            <h2 className="text-2xl font-bold text-foreground">Lead Yönetimi</h2>
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

        {/* Firms */}
        {tab === "firms" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Firma Yönetimi</h2>
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">User ID</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Rol</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Kayıt Tarihi</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Satın Almalar</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {firms.map((firm) => {
                    const firmPurchases = purchases.filter((p) => p.firm_id === firm.user_id);
                    return (
                      <tr key={firm.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2 text-foreground font-mono text-xs">{firm.user_id.slice(0, 12)}...</td>
                        <td className="px-3 py-2"><Badge>firm</Badge></td>
                        <td className="px-3 py-2 text-foreground">{new Date(firm.created_at).toLocaleDateString("tr-TR")}</td>
                        <td className="px-3 py-2 text-foreground">{firmPurchases.length} (${firmPurchases.length * 20})</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="destructive" onClick={() => handleToggleFirmActive(firm.user_id, "firm")}>
                            Devre Dışı
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {firms.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Henüz kayıtlı firma yok.</div>
              )}
            </div>
          </div>
        )}
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
    </div>
  );
};

export default AdminPanel;
