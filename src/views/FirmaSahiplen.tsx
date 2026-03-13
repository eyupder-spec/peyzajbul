"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle, LogIn, UserPlus, ArrowLeft } from "lucide-react";

const FirmaSahiplen = () => {
  const params = useParams();
  const firmId = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [firm, setFirm] = useState<any>(null);
  const [firmLoading, setFirmLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  // Auth form
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");

  // Claim form
  const [phone, setPhone] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const loadFirm = async () => {
      if (!firmId) return;
      const { data } = await supabase
        .from("firms")
        .select("id, company_name, city, district, phone, is_claimed")
        .eq("id", firmId)
        .single();

      if (data) {
        setFirm(data);
        if (data.is_claimed) setAlreadyClaimed(true);
      }
      setFirmLoading(false);
    };

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    loadFirm();
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [firmId]);

  // Check existing claim
  useEffect(() => {
    const checkExisting = async () => {
      if (!user || !firmId) return;
      const { data } = await supabase
        .from("claim_requests")
        .select("id, status")
        .eq("firm_id", firmId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setSubmitted(true);
    };
    checkExisting();
  }, [user, firmId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authTab === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Hesap oluşturuldu!", description: "Şimdi sahiplenme formunu doldurun." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firmId) return;
    if (!phone.trim()) {
      toast({ title: "Telefon numarası zorunludur", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("claim_requests").insert({
        firm_id: firmId,
        user_id: user.id,
        phone: phone.trim(),
        tax_number: taxNumber.trim() || null,
        note: note.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (firmLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 pt-24">
          <p className="text-muted-foreground text-lg">Firma bulunamadı</p>
          <Link href="/firmalar">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Firmalara Dön</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (alreadyClaimed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20 px-4">
          <Card className="w-full max-w-md border-border text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <p className="text-muted-foreground">Bu firma zaten sahiplenilmiş.</p>
              <Button variant="outline" onClick={() => router.push("/firmalar")}>Firmalara Dön</Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20 px-4">
          <Card className="w-full max-w-md border-border text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Talebiniz Alındı!</h2>
              <p className="text-muted-foreground">
                <strong>{firm.company_name}</strong> için sahiplenme talebiniz admin onayına gönderildi.
                Onaylandığında firma panelinize erişebileceksiniz.
              </p>
              <Button variant="outline" onClick={() => router.push("/")}>Ana Sayfaya Dön</Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-12 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Firm info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-foreground">{firm.company_name}</h2>
                  <p className="text-sm text-muted-foreground">{firm.city}{firm.district ? ` / ${firm.district}` : ""}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!user ? (
            /* Auth step */
            <Card className="border-border">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-foreground">Firma Sahiplenme</CardTitle>
                <CardDescription>
                  Önce bir hesap oluşturun veya mevcut hesabınızla giriş yapın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "signup")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signup"><UserPlus className="h-4 w-4 mr-2" /> Kayıt Ol</TabsTrigger>
                    <TabsTrigger value="login"><LogIn className="h-4 w-4 mr-2" /> Giriş Yap</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signup">
                    <form onSubmit={handleAuth} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>E-posta</Label>
                        <Input type="email" placeholder="ornek@email.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Şifre</Label>
                        <Input type="password" placeholder="Min. 6 karakter" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "İşleniyor..." : "Hesap Oluştur"}
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="login">
                    <form onSubmit={handleAuth} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>E-posta</Label>
                        <Input type="email" placeholder="ornek@email.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Şifre</Label>
                        <Input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            /* Claim form */
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Doğrulama Bilgileri</CardTitle>
                <CardDescription>
                  Bu firmanın size ait olduğunu doğrulamak için aşağıdaki bilgileri doldurun
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleClaim} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Firma Telefonu *</Label>
                    <Input
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Firmanızda kayıtlı telefon numarasını girin</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Vergi Numarası</Label>
                    <Input
                      placeholder="Opsiyonel"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ek Açıklama</Label>
                    <Textarea
                      placeholder="Firmanın size ait olduğunu kanıtlayan ek bilgi..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                    ⚠️ Talebiniz admin tarafından incelenecektir. Girdiğiniz telefon numarası firma kaydındaki telefonla karşılaştırılacaktır.
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Gönderiliyor..." : "Sahiplenme Talebi Gönder"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FirmaSahiplen;

