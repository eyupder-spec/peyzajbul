"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, TrendingUp, Coins, Activity, CheckCircle, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

type DailyStat = {
  date: string;
  leads: number;
  purchases: number;
};

const AdminAnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalPurchases: 0,
    pendingLeads: 0,
    totalCoinsSpent: 0,
    totalFirms: 0,
    activeFirms: 0, // at least 1 purchase
    conversionRate: 0,
  });

  const [dailyData, setDailyData] = useState<DailyStat[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Leads
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("id, status, admin_approved, created_at");

      // 2. Purchases
      const { data: purchases, error: purchasesError } = await supabase
        .from("lead_purchases")
        .select(`
          id, 
          firm_id, 
          created_at,
          leads:lead_id (
            token_price
          )
        `);

      // 3. Firms
      const { data: firms, error: firmsError } = await supabase
        .from("firms")
        .select("id");

      if (leadsError || purchasesError || firmsError) throw new Error("Veri çekme hatası");

      const totalLeads = leads?.length || 0;
      const totalPurchases = purchases?.length || 0;
      const pendingLeads = leads?.filter(l => !l.admin_approved && l.status !== 'spam').length || 0;
      const totalCoinsSpent = purchases?.reduce((acc: number, p: any) => {
        const tokenPrice = p.leads?.token_price || 20;
        return acc + tokenPrice;
      }, 0) || 0;
      
      const totalFirms = firms?.length || 0;
      const purchasingFirmIds = new Set(purchases?.map((p: any) => p.firm_id));
      const activeFirms = purchasingFirmIds.size;

      const conversionRate = totalLeads > 0 ? ((totalPurchases / totalLeads) * 100).toFixed(1) : 0;

      setStats({
        totalLeads,
        totalPurchases,
        pendingLeads,
        totalCoinsSpent,
        totalFirms,
        activeFirms,
        conversionRate: Number(conversionRate),
      });

      // Gelişmiş Tarihsel Veri Dağılımı (Son 7 Gün)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      const dailyStats = last7Days.map(date => {
        const dayLeads = leads?.filter(l => l.created_at.startsWith(date)).length || 0;
        const dayPurchases = purchases?.filter((p: any) => p.created_at.startsWith(date)).length || 0;
        return {
          date: new Date(date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }),
          leads: dayLeads,
          purchases: dayPurchases,
        };
      });

      setDailyData(dailyStats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Analitik verileri yükleniyor...</div>;
  }

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  const pieData = [
    { name: 'Onay Bekleyen', value: stats.pendingLeads },
    { name: 'Aktif / Satışta', value: stats.totalLeads - stats.pendingLeads },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelen Lead</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Platforma düşen toplam talep</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satın Alınan Leadler</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPurchases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dönüşüm Oranı: %{stats.conversionRate}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Harcatılan Jeton</CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoinsSpent} ⬡</div>
            <p className="text-xs text-muted-foreground mt-1">Sistemde harcanan toplam değer</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktif Firma</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeFirms} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalFirms}</span></div>
            <p className="text-xs text-muted-foreground mt-1">En az 1 lead almış firmalar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Son 7 Gün: Gelen & Satılan Leadler</CardTitle>
            <CardDescription>Platforma giren talepler ile harcanan leadlerin günlük dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="leads" name="Gelen" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="purchases" name="Satılan" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pending vs Active Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Bekleyen Onaylar</CardTitle>
            <CardDescription>Müşteri taleplerinin onay durumu</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {stats.pendingLeads > 0 ? (
              <div className="flex flex-col items-center p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 w-full text-center">
                <Clock className="h-8 w-8 text-amber-500 mb-2" />
                <p className="font-semibold text-amber-700">{stats.pendingLeads} Onay Bekleyen Lead</p>
                <p className="text-xs text-amber-600/80 mt-1">Admin listesinden hemen onaylayın</p>
              </div>
            ) : (
             <div className="flex flex-col items-center p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 w-full text-center">
               <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
               <p className="font-semibold text-emerald-700">Bekleyen Onay Yok</p>
             </div>
            )}
            
            <div className="h-[180px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col -mt-1 pointer-events-none">
                 <span className="text-2xl font-bold">{stats.totalLeads}</span>
                 <span className="text-[10px] text-muted-foreground uppercase">Toplam</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalyticsTab;
