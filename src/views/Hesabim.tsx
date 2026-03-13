"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LogOut, FileText, Clock, MapPin, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Hesabim = () => {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        fetchLeads(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        fetchLeads(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLeads = async (userId: string) => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Lütfen e-posta ve şifrenizi girin", variant: "destructive" });
      return;
    }
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Giriş başarılı!" });
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setLeads([]);
  };

  const serviceLabels: Record<string, string> = {
    "bahce-duzenleme": "Bahçe Düzenleme",
    "agac-budama": "Ağaç Budama & Bakım",
    "sulama-sistemi": "Sulama Sistemi",
    "peyzaj-tasarimi": "Peyzaj Tasarımı",
    "cim-serimi": "Çim Serimi",
    "diger": "Diğer",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktif",
    purchased: "Satın Alındı",
    expired: "Süresi Doldu",
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-24">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Not logged in — show login form
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          <div className="bg-primary py-10">
            <div className="container mx-auto px-4">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">
                Hesabım
              </h1>
              <p className="text-primary-foreground/70 font-body text-sm mt-1">
                Taleplerinizi takip etmek için giriş yapın
              </p>
            </div>
          </div>

          <div className="container mx-auto px-4 py-10 flex justify-center">
            <Card className="w-full max-w-md border-border">
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-xl">Giriş Yap</CardTitle>
                <CardDescription>
                  Teklif talebi oluştururken kullandığınız e-posta ve şifrenizle giriş yapın.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-posta</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="ornek@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Şifre</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Logged in — show dashboard
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">
                  Hesabım
                </h1>
                <p className="text-primary-foreground/70 font-body text-sm mt-1">
                  {user?.email}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-accent text-accent-foreground bg-accent hover:bg-accent/90">
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <h2 className="font-heading text-xl font-semibold text-foreground mb-6">Taleplerim</h2>
          {loading ? (
            <p className="text-muted-foreground font-body">Yükleniyor...</p>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border border-border">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-heading text-lg text-foreground mb-2">Henüz talebiniz yok</p>
              <p className="text-sm text-muted-foreground font-body">
                "Teklif Al" butonunu kullanarak ilk talebinizi oluşturun.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-card rounded-lg border border-border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">
                        {serviceLabels[lead.service_type] || lead.service_type}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground font-body">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {lead.city}{lead.district ? `, ${lead.district}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(lead.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full font-body ${
                      lead.status === "active"
                        ? "bg-secondary text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {statusLabels[lead.status] || lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Hesabim;

