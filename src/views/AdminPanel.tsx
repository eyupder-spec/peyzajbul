"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, CreditCard, TrendingUp, FileText, Trash2, Edit, LogOut, Eye,
  Building2, CheckCircle, XCircle, Plus, Coins, Crown, Image, Star, Box,
  LayoutDashboard, Menu, BookOpen, Rocket, HandshakeIcon, Upload, FolderKanban,
  Search, ChevronLeft, ChevronRight, Sparkles, UserX, Leaf
} from "lucide-react";
import { getScoreBadge, getScoreBreakdown } from "@/lib/leadScoring";
import FirmFormDialog, { type FirmFormData } from "@/components/admin/FirmFormDialog";
import AdminBlogTab from "@/components/admin/AdminBlogTab";
import AdminChangelogTab from "@/components/admin/AdminChangelogTab";
import AdminClaimTab from "@/components/admin/AdminClaimTab";
import AdminBulkFirmTab from "@/components/admin/AdminBulkFirmTab";
import AdminProjectsTab from "@/components/admin/AdminProjectsTab";
import AdminTasksTab from "@/components/admin/AdminTasksTab";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import AdminDeletionTab from "@/components/admin/AdminDeletionTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import FirmPhotoCrawler from "@/components/admin/FirmPhotoCrawler";
import AdminPremiumTab from "@/components/admin/AdminPremiumTab";
import AdminPlantsTab from "@/components/admin/AdminPlantsTab";
import AdminFirmProductsDialog from "@/components/admin/AdminFirmProductsDialog";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  SERVICE_LABELS,
  PROJECT_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  CONDITION_LABELS,
  BUDGET_LABELS,
  TIMELINE_LABELS,
  AREA_LABELS,
  IRRIGATION_TYPE_LABELS,
  IRRIGATION_SYSTEM_LABELS,
  WATER_SOURCE_LABELS,
  getLeadLabel
} from "@/lib/formatLead";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
  response_time?: string;
  trust_badges?: any;
  faq_items?: any;
  before_after?: any;
};

type Lead = {
  id: string;
  created_at: string;
  service_type: string;
  project_size: string | null;
  area_size?: string | null;
  budget: string;
  timeline: string;
  city: string;
  district: string | null;
  address?: string | null;
  full_name: string;
  phone: string;
  email: string;
  lead_score: number | null;
  status: string;
  user_id: string;
  assigned_firms?: string[] | null;
  token_price?: number;
  admin_approved?: boolean;
  project_type?: string | null;
  property_type?: string | null;
  current_condition?: string | null;
  notes?: string | null;
  scope?: string[] | null;
  irrigation_type?: string | null;
  irrigation_system?: string | null;
  water_source?: string | null;
  photo_urls?: string[] | null;
  target_firm_id?: string | null;
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
  { title: "Premium", key: "premium", icon: Crown },
  { title: "Bitkiler", key: "plants", icon: Leaf },
  { title: "Toplu Ekle", key: "bulk", icon: Upload },
  { title: "Sahiplenme", key: "claims", icon: HandshakeIcon },
  { title: "Jetonlar", key: "jetonlar", icon: Coins },
  { title: "Projeler", key: "projects", icon: FolderKanban },
  { title: "Blog", key: "blog", icon: BookOpen },
  { title: "Görevler", key: "tasks", icon: CheckCircle },
  { title: "Changelog", key: "changelog", icon: Rocket },
  { title: "Reklamlar", key: "banners", icon: Image },
  { title: "Hesap Silme", key: "deletion", icon: UserX },
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
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [firmsData, setFirmsData] = useState<Firm[]>([]);
  const [tab, setTab] = useState<"dashboard" | "leads" | "firms" | "premium" | "plants" | "bulk" | "claims" | "jetonlar" | "projects" | "blog" | "changelog" | "tasks" | "banners" | "deletion">("dashboard");
  const [coinTransactions, setCoinTransactions] = useState<any[]>([]);
  const [selectedFirmTransactions, setSelectedFirmTransactions] = useState<string | null>(null);
  const [adminGalleryFirmId, setAdminGalleryFirmId] = useState<string | null>(null);
  const [adminGallery, setAdminGallery] = useState<any[]>([]);
  const [adminReviewsFirmId, setAdminReviewsFirmId] = useState<string | null>(null);
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [adminProductsFirmId, setAdminProductsFirmId] = useState<string | null>(null);

  // Admin review form state
  const [adminReviewName, setAdminReviewName] = useState("");
  const [adminReviewRating, setAdminReviewRating] = useState(5);
  const [adminReviewComment, setAdminReviewComment] = useState("");
  const [adminReviewPhoto, setAdminReviewPhoto] = useState<File | null>(null);
  const [adminReviewPhotoPreview, setAdminReviewPhotoPreview] = useState<string | null>(null);
  const [adminReviewSubmitting, setAdminReviewSubmitting] = useState(false);

  // Firm pagination & search
  const [firmSearch, setFirmSearch] = useState("");
  const [firmPage, setFirmPage] = useState(1);
  const FIRMS_PER_PAGE = 20;

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

  // AI Enrichment state
  const [enrichingFirmId, setEnrichingFirmId] = useState<string | null>(null);

  // Manual coin add
  const [addCoinFirmId, setAddCoinFirmId] = useState<string | null>(null);
  const [addCoinAmount, setAddCoinAmount] = useState("");
  const [addCoinDesc, setAddCoinDesc] = useState("Admin tarafından manuel yükleme");
  const [addingCoin, setAddingCoin] = useState(false);

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const secretPath = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || "/admin-dash";
    if (!user) { router.push(`${secretPath}/giris`); return; }

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) { router.push(`${secretPath}/giris`); return; }

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
  }, [router]);

  useEffect(() => {
    checkAdmin();

    // Supabase Realtime Subscription for Leads
    const channel = supabase
      .channel("admin-realtime-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          checkAdmin(); // Lead değiştiğinde tüm listeyi tazele
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_purchases" },
        () => {
          checkAdmin(); // Satın alım olduğunda geliri ve durumu tazele
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAdmin]);

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

  const handleEnrichFirm = async (firmId: string) => {
    try {
      setEnrichingFirmId(firmId);
      const { data, error } = await supabase.functions.invoke('enrich-firm-profile', {
        body: { firmId }
      });

      if (error) {
        throw new Error(error.message || `İşlem Hatası`);
      }

      if (data?.success && data?.description) {
        toast({ title: "Başarılı", description: "Firma açıklaması YZ ile dolduruldu." });
        // Update local state to reflect the new description
        setFirmsData(prev => prev.map(f => f.id === firmId ? { ...f, description: data.description } : f));
      } else {
        throw new Error(data?.error || "Beklenmeyen bir hata oluştu.");
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setEnrichingFirmId(null);
    }
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

  const handleApproveLead = async (id: string, currentTokenPrice: number) => {
    const { error } = await supabase.from("leads").update({ admin_approved: true, token_price: currentTokenPrice }).eq("id", id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, admin_approved: true, token_price: currentTokenPrice } as Lead : l));
      toast({ title: "Lead onaylandı ve firmalara açıldı" });
    }
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
    const secretPath = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || "/admin-dash";
    await supabase.auth.signOut();
    router.push(`${secretPath}/giris`);
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

  const handleAdminReviewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdminReviewPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setAdminReviewPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdminAddReview = async () => {
    if (!adminReviewsFirmId || !adminReviewName.trim()) return;
    setAdminReviewSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (adminReviewPhoto) {
        const ext = adminReviewPhoto.name.split(".").pop();
        const path = `${adminReviewsFirmId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("firm-reviews").upload(path, adminReviewPhoto);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("firm-reviews").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }
      const { error } = await supabase.from("firm_reviews").insert({
        firm_id: adminReviewsFirmId,
        reviewer_name: adminReviewName.trim(),
        rating: adminReviewRating,
        comment: adminReviewComment.trim() || null,
        photo_url: photoUrl,
        is_approved: true,
      });
      if (error) throw error;
      setAdminReviewName(""); setAdminReviewRating(5); setAdminReviewComment("");
      setAdminReviewPhoto(null); setAdminReviewPhotoPreview(null);
      loadAdminReviews(adminReviewsFirmId);
      toast({ title: "Yorum eklendi (onaylı)" });
    } catch {
      toast({ title: "Hata", description: "Yorum eklenemedi", variant: "destructive" });
    } finally {
      setAdminReviewSubmitting(false);
    }
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

  // Daily Stats Calculations
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayPremiumCount = coinTransactions.filter((t: any) => 
    t.type === "spend" && t.description?.toLowerCase().includes("premium") && new Date(t.created_at) >= startOfToday
  ).length;

  const todayCoinLoads = coinTransactions.filter((t: any) => 
    (t.type === "purchase" || t.type === "add") && new Date(t.created_at) >= startOfToday
  ).reduce((sum: number, t: any) => sum + t.amount, 0);

  const todayLeadSales = purchases.filter((p: any) => 
    new Date(p.created_at) >= startOfToday
  ).length;

  const filteredLeads = leads.filter((l) => {
    if (filterCity && !l.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  const filteredApprovedFirms = firmsData.filter((f) => {
    if (!f.is_approved) return false;
    if (firmSearch) {
      const search = firmSearch.toLowerCase();
      return (
        f.company_name?.toLowerCase().includes(search) ||
        f.email?.toLowerCase().includes(search) ||
        f.phone?.toLowerCase().includes(search) ||
        f.city?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const totalFirmPages = Math.ceil(filteredApprovedFirms.length / FIRMS_PER_PAGE);
  const paginatedFirms = filteredApprovedFirms.slice(
    (firmPage - 1) * FIRMS_PER_PAGE,
    firmPage * FIRMS_PER_PAGE
  );

  return (
    <TooltipProvider>
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
                      <CardTitle className="text-sm font-medium text-muted-foreground">Bugün (Elenen)</CardTitle>
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

                {/* Daily Stats Row */}
                <div>
                  <h3 className="font-heading text-lg font-bold mb-4 text-foreground/80">Bugünkü Faaliyetler</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-border bg-primary/5">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Satılan Premium</CardTitle>
                        <Crown className="h-5 w-5 text-primary" />
                      </CardHeader>
                      <CardContent><p className="text-2xl font-bold text-foreground">{todayPremiumCount}</p></CardContent>
                    </Card>
                    <Card className="border-border bg-emerald-50 dark:bg-emerald-950/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600">Yüklenen Jeton</CardTitle>
                        <Coins className="h-5 w-5 text-emerald-600" />
                      </CardHeader>
                      <CardContent><p className="text-2xl font-bold text-foreground">{todayCoinLoads} <span className="text-sm font-normal text-emerald-600/70">Jeton</span></p></CardContent>
                    </Card>
                    <Card className="border-border bg-amber-50 dark:bg-amber-950/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600">Satılan Lead</CardTitle>
                        <HandshakeIcon className="h-5 w-5 text-amber-600" />
                      </CardHeader>
                      <CardContent><p className="text-2xl font-bold text-foreground">{todayLeadSales} <span className="text-sm font-normal text-amber-600/70">Adet</span></p></CardContent>
                    </Card>
                  </div>
                </div>

                <div className="mt-8">
                  <AdminAnalyticsTab />
                </div>

                {/* Recent Activities */}
                <Card className="border-border mt-8">
                  <CardHeader>
                    <CardTitle className="text-lg font-heading">Son İşlemler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {coinTransactions.slice(0, 10).map((tx: any) => {
                        const firm = firmsData.find(f => f.user_id === tx.firm_id || f.id === tx.firm_id);
                        const isAdd = tx.type === "purchase" || tx.type === "add" || tx.amount > 0;
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-muted/10 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isAdd ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {isAdd ? <Plus className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground text-sm md:text-base">{firm?.company_name || "Bilinmeyen Firma"}</span>
                                <span className="text-xs md:text-sm text-muted-foreground">{tx.description || (isAdd ? "Jeton Yüklendi" : "Harcama Yapıldı")}</span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className={`font-bold text-sm md:text-base ${isAdd ? 'text-emerald-600' : 'text-foreground'}`}>
                                {isAdd ? '+' : ''}{tx.amount} Jeton
                              </span>
                              <span className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}</span>
                            </div>
                          </div>
                        )
                      })}
                      {coinTransactions.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">Henüz hiçbir işlem bulunmuyor.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Leads */}
            {tab === "leads" && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <Input placeholder="İl filtrele..." value={filterCity || ""} onChange={(e) => setFilterCity(e.target.value)} className="w-48" />
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
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Jeton</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Skor</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Durum</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Dağıtım</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLeads.map((lead) => {
                        const badge = getScoreBadge(lead.lead_score);
                        return (
                          <tr key={lead.id} className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-foreground">{new Date(lead.created_at).toLocaleDateString("tr-TR")}</td>
                            <td className="px-3 py-2 text-foreground font-medium">
                              <div className="flex flex-col gap-1">
                                {lead.full_name}
                                {lead.target_firm_id && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 w-fit">
                                    ⭐ Premium Özel
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-foreground">{lead.phone}</td>
                            <td className="px-3 py-2 text-foreground">{lead.email}</td>
                            <td className="px-3 py-2 text-foreground">{lead.service_type}</td>
                            <td className="px-3 py-2 text-foreground">{lead.city}</td>
                            <td className="px-3 py-2 text-foreground">{lead.budget}</td>
                            <td className="px-3 py-2">
                              {!lead.admin_approved ? (
                                <Input 
                                  type="number" 
                                  className="w-16 h-8 text-xs bg-muted/50 border-border" 
                                  defaultValue={lead.token_price || 20} 
                                  id={`price-${lead.id}`}
                                />
                              ) : (
                                <Badge variant="outline" className="text-foreground">{lead.token_price || 20} Jeton</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                                {badge.emoji} {lead.lead_score || 0}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {!lead.admin_approved ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Onay Bekliyor</Badge>
                              ) : (
                                <Badge variant={lead.status === "active" ? "default" : lead.status === "expired" ? "destructive" : "secondary"}>
                                  {lead.status}
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {lead.assigned_firms && lead.assigned_firms.length > 0 ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 text-xs px-2 cursor-pointer bg-primary/5 hover:bg-primary/10 border-primary/20">
                                      {new Set(lead.assigned_firms).size} Firma
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Bildirim Gönderilen Firmalar ({new Set(lead.assigned_firms).size})</DialogTitle>
                                      <DialogDescription className="sr-only">
                                        Bu leade dair bildirim gönderilen firmaların listesi.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                                      {Array.from(new Set(lead.assigned_firms)).map(fid => {
                                        const firm = firmsData.find(f => f.id === fid || f.user_id === fid);
                                        return (
                                          <div key={fid} className="flex justify-between items-center p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex flex-col">
                                              <span className="font-semibold text-sm">{firm?.company_name || 'Bilinmeyen Firma'}</span>
                                              {firm && <span className="text-xs text-muted-foreground">{firm.phone}</span>}
                                            </div>
                                            {firm && <Badge variant="secondary">{firm.city}</Badge>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-muted-foreground text-xs px-2">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1" style={{ alignItems: 'center' }}>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSelectedLeadForDetail(lead)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                {!lead.admin_approved && (
                                  <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={() => {
                                    const val = (document.getElementById(`price-${lead.id}`) as HTMLInputElement)?.value;
                                    handleApproveLead(lead.id, parseInt(val || "20"));
                                  }}>
                                    Onayla
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingStatus({ id: lead.id, status: lead.status })}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setDeletingLead(lead.id)}>
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
                  <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Firma adı, e-posta veya il ile ara..." 
                      className="pl-9" 
                      value={firmSearch || ""}
                      onChange={(e) => {
                        setFirmSearch(e.target.value);
                        setFirmPage(1);
                      }}
                    />
                  </div>
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
                      {paginatedFirms.map((firm) => (
                        <tr key={firm.id} className="hover:bg-muted/50">
                          <td className="px-3 py-2 text-foreground font-medium">{firm.company_name}</td>
                          <td className="px-3 py-2 text-foreground">{firm.city}</td>
                          <td className="px-3 py-2">
                            {(() => {
                              const now = new Date();
                              const isPremiumActive = firm.is_premium && firm.premium_until && new Date(firm.premium_until) > now;
                              const isPremiumExpired = firm.is_premium && (!firm.premium_until || new Date(firm.premium_until) <= now);
                              
                              if (isPremiumActive) {
                                return <Badge className="bg-yellow-500/90 text-white gap-1"><Crown className="h-3 w-3" /> Premium</Badge>;
                              } else if (isPremiumExpired) {
                                return <Badge variant="destructive" className="gap-1"><Crown className="h-3 w-3" /> Süresi Dolmuş</Badge>;
                              } else {
                                return <Badge variant="outline">Standart</Badge>;
                              }
                            })()}
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
                              <Button
                                size="sm" 
                                variant="outline" 
                                title="YZ Açıklama Yaz" 
                                onClick={() => handleEnrichFirm(firm.id)}
                                disabled={enrichingFirmId === firm.id || !!(firm.description && firm.description.trim().length > 0)}
                                className={firm.description && firm.description.trim().length > 0 ? "opacity-50" : "bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 border-purple-200"}
                              >
                                {enrichingFirmId === firm.id ? (
                                  <span className="animate-spin text-sm">⏳</span>
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                              </Button>
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
                                  // Süresi dolmuşsa is_premium=false olarak göster (DB henüz güncellenmemiş olabilir)
                                  is_premium: firm.is_premium && !!firm.premium_until && new Date(firm.premium_until) > new Date(),
                                  premium_until: firm.premium_until || "",
                                  google_maps_url: firm.google_maps_url || "",
                                  detailed_services: firm.detailed_services || [],
                                  logo_url: (firm as any).logo_url || "",
                                  response_time: firm.response_time || "",
                                  trust_badges: firm.trust_badges || [],
                                  faq_items: firm.faq_items || [],
                                  before_after: firm.before_after || undefined,
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
                              <Button size="sm" variant="ghost" title="Ürünler" onClick={() => setAdminProductsFirmId(firm.id)}>
                                <Box className="h-3 w-3" />
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
                  {filteredApprovedFirms.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">Henüz onaylı firma yok.</div>
                  )}
                </div>

                {totalFirmPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-4">
                    <p className="text-sm text-muted-foreground">
                      Toplam <span className="font-medium">{filteredApprovedFirms.length}</span> firmadan 
                      <span className="font-medium mx-1">{(firmPage - 1) * FIRMS_PER_PAGE + 1} - {Math.min(firmPage * FIRMS_PER_PAGE, filteredApprovedFirms.length)}</span> 
                      arası gösteriliyor
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFirmPage(p => Math.max(1, p - 1))}
                        disabled={firmPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Önceki
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalFirmPages }).map((_, i) => (
                          <Button
                            key={i}
                            variant={firmPage === i + 1 ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setFirmPage(i + 1)}
                          >
                            {i + 1}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFirmPage(p => Math.min(totalFirmPages, p + 1))}
                        disabled={firmPage === totalFirmPages}
                      >
                        Sonraki <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Premium */}
            {tab === "premium" && <AdminPremiumTab />}

            {/* Bitkiler */}
            {tab === "plants" && <AdminPlantsTab />}

            {/* Projects */}
            {tab === "projects" && <AdminProjectsTab />}

            {/* Banners */}
            {tab === "banners" && <AdminBannersTab />}

            {/* Claims */}
            {tab === "claims" && <AdminClaimTab />}

            {/* Bulk */}
            {tab === "bulk" && <AdminBulkFirmTab />}

            {/* Blog */}
            {tab === "blog" && <AdminBlogTab />}

            {/* Tasks */}
            {tab === "tasks" && <AdminTasksTab />}

            {/* Changelog */}
            {tab === "changelog" && <AdminChangelogTab />}

            {/* Account Deletion */}
            {tab === "deletion" && <AdminDeletionTab />}
          </main>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Lead'i silmek istediğinize emin misiniz?</DialogTitle>
            <DialogDescription className="sr-only">
              Bu işlem geri alınamaz. Lead kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLead(null)}>İptal</Button>
            <Button variant="destructive" onClick={() => deletingLead && handleDeleteLead(deletingLead)}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status edit */}
      <Dialog open={!!editingStatus} onOpenChange={() => setEditingStatus(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Durum Güncelle</DialogTitle>
            <DialogDescription className="sr-only">
              Leadin mevcut durumunu (Aktif, Satın Alındı, Süresi Doldu) değiştirmek için bir seçenek belirleyin.
            </DialogDescription>
          </DialogHeader>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" /> Manuel Jeton Ekle
            </DialogTitle>
            <DialogDescription className="sr-only">
              Belirtilen firmaya manuel olarak jeton ekleme formu.
            </DialogDescription>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" /> Galeri Yönetimi - {firmsData.find(f => f.id === adminGalleryFirmId)?.company_name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Firmanın galeri fotoğraflarını yükleyin, silin veya açıklamalarını düzenleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {adminGalleryFirmId && (
              <FirmPhotoCrawler
                firmId={adminGalleryFirmId}
                firmWebsite={firmsData.find(f => f.id === adminGalleryFirmId)?.website || ""}
                firmName={firmsData.find(f => f.id === adminGalleryFirmId)?.company_name}
                firmSlug={(firmsData.find(f => f.id === adminGalleryFirmId) as any)?.slug}
                onUploadSuccess={() => loadAdminGallery(adminGalleryFirmId)}
                currentGalleryCount={adminGallery.length}
              />
            )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" /> Yorum Yönetimi - {firmsData.find(f => f.id === adminReviewsFirmId)?.company_name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Müşteri yorumlarını onayla, gizle, sil veya yeni yorum ekle.
            </DialogDescription>
          </DialogHeader>

          {/* Add Review Form */}
          <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Manuel Yorum Ekle</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Müşteri Adı" value={adminReviewName} onChange={(e) => setAdminReviewName(e.target.value)} />
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setAdminReviewRating(i + 1)}>
                    <Star className={`h-5 w-5 ${i < adminReviewRating ? "text-yellow-500 fill-current" : "text-muted"}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea placeholder="Yorum metni (opsiyonel)" value={adminReviewComment} onChange={(e) => setAdminReviewComment(e.target.value)} rows={2} />
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleAdminReviewPhotoChange} className="hidden" />
                <Button asChild variant="outline" size="sm"><span>Fotoğraf Ekle</span></Button>
              </label>
              {adminReviewPhotoPreview && (
                <div className="relative">
                  <img src={adminReviewPhotoPreview} alt="Önizleme" className="h-10 w-10 object-cover rounded border" />
                  <button onClick={() => { setAdminReviewPhoto(null); setAdminReviewPhotoPreview(null); }} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">✕</button>
                </div>
              )}
              <Button size="sm" onClick={handleAdminAddReview} disabled={adminReviewSubmitting || !adminReviewName.trim()} className="ml-auto">
                {adminReviewSubmitting ? "Ekleniyor..." : "Ekle (Onaylı)"}
              </Button>
            </div>
          </div>

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
                {review.photo_url && (
                  <button onClick={() => setSelectedPhoto(review.photo_url)} className="block">
                    <img src={review.photo_url} alt="Yorum fotoğrafı" className="h-20 w-auto object-cover rounded-lg border border-border/50 hover:opacity-80 transition-opacity" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString("tr-TR")}</p>
                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" variant="outline" onClick={() => handleToggleReviewApproval(review.id, review.is_approved)}>
                      {review.is_approved ? "Gizle" : "Onayla"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteReview(review.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Sil
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">Henüz yorum yok.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </SidebarProvider>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLeadForDetail} onOpenChange={() => setSelectedLeadForDetail(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Lead Detayları
            </DialogTitle>
            <DialogDescription className="sr-only">
              Leadin tüm detaylarını, müşteri bilgilerini ve skor dökümünü inceleyin.
            </DialogDescription>
          </DialogHeader>
          {selectedLeadForDetail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Hizmet Türü</p>
                  <p className="font-medium text-foreground">{getLeadLabel(SERVICE_LABELS, selectedLeadForDetail.service_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Proje Türü</p>
                  <p className="font-medium text-foreground">{getLeadLabel(PROJECT_TYPE_LABELS, selectedLeadForDetail.project_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mülk Tipi</p>
                  <p className="font-medium text-foreground">{getLeadLabel(PROPERTY_TYPE_LABELS, selectedLeadForDetail.property_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Alan Büyüklüğü</p>
                  <p className="font-medium text-foreground">{getLeadLabel(AREA_LABELS, selectedLeadForDetail.area_size || selectedLeadForDetail.project_size)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mevcut Durum</p>
                  <p className="font-medium text-foreground">{getLeadLabel(CONDITION_LABELS, selectedLeadForDetail.current_condition)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Bütçe</p>
                  <p className="font-medium text-foreground">{getLeadLabel(BUDGET_LABELS, selectedLeadForDetail.budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Zaman Çizelgesi</p>
                  <p className="font-medium text-foreground">{getLeadLabel(TIMELINE_LABELS, selectedLeadForDetail.timeline)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Konum</p>
                  <p className="font-medium text-foreground">
                    {selectedLeadForDetail.city} {selectedLeadForDetail.district ? `/ ${selectedLeadForDetail.district}` : ""}
                  </p>
                </div>

                {selectedLeadForDetail.service_type === "sulama-sistemi" && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Sulama Türü</p>
                      <p className="font-medium text-foreground">{getLeadLabel(IRRIGATION_TYPE_LABELS, selectedLeadForDetail.irrigation_type)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Sulama Sistemi</p>
                      <p className="font-medium text-foreground">{getLeadLabel(IRRIGATION_SYSTEM_LABELS, selectedLeadForDetail.irrigation_system)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Su Kaynağı</p>
                      <p className="font-medium text-foreground">{getLeadLabel(WATER_SOURCE_LABELS, selectedLeadForDetail.water_source)}</p>
                    </div>
                  </>
                )}
              </div>

              {selectedLeadForDetail.scope && selectedLeadForDetail.scope.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Kapsam</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedLeadForDetail.scope.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] py-0">{s.replace(/-/g, " ")}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedLeadForDetail.notes && (
                <div className="pt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Notlar</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedLeadForDetail.notes}</p>
                </div>
              )}

              {selectedLeadForDetail.photo_urls && selectedLeadForDetail.photo_urls.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Fotoğraflar</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedLeadForDetail.photo_urls.map((url, i) => (
                      <div key={i} onClick={() => setSelectedPhoto(url)} className="relative w-20 h-20 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity cursor-pointer shadow-sm">
                        <img src={url} alt={`Lead Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3">Müşteri Bilgileri</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Ad Soyad</p>
                    <p className="font-medium text-foreground">{selectedLeadForDetail.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefon</p>
                    <p className="font-medium text-foreground">{selectedLeadForDetail.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">E-posta</p>
                    <p className="font-medium text-foreground">{selectedLeadForDetail.email}</p>
                  </div>
                  {selectedLeadForDetail.address && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Adres</p>
                      <p className="font-medium text-foreground">{selectedLeadForDetail.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Birim Jeton Fiyatı:</span>
                    <Badge variant="outline" className="text-primary font-bold">
                      {selectedLeadForDetail.token_price || 20} Jeton
                    </Badge>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Lead Skoru:</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={`${getScoreBadge(selectedLeadForDetail.lead_score).className} border-none`}>
                          {getScoreBadge(selectedLeadForDetail.lead_score).emoji} {selectedLeadForDetail.lead_score || 0}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {getScoreBreakdown(selectedLeadForDetail).map((item, i) => (
                          <div key={i} className="flex justify-between text-xs gap-4">
                            <span>{item.label}</span>
                            <span className="font-mono">+{item.points}</span>
                          </div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                 </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedLeadForDetail(null)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Screen Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none flex justify-center items-center [&>button]:text-white [&>button]:bg-black/50 hover:[&>button]:bg-black/70 [&>button]:rounded-full [&>button]:p-2 max-h-[95vh] w-[95vw]">
          <DialogTitle className="sr-only">Görsel İnceleme</DialogTitle>
          <DialogDescription className="sr-only">Büyütülmüş fotoğraf görünümü.</DialogDescription>
          {selectedPhoto && (
            <img src={selectedPhoto} alt="Detaylı Görsel" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" />
          )}
        </DialogContent>
      </Dialog>

      <AdminFirmProductsDialog 
        firmId={adminProductsFirmId} 
        open={!!adminProductsFirmId} 
        onOpenChange={(open) => !open && setAdminProductsFirmId(null)} 
      />
    </TooltipProvider>
  );
};

export default AdminPanel;

