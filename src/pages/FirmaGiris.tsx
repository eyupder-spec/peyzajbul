import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Building2, LogIn, UserPlus } from "lucide-react";

const FirmaGiris = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      // Check if user has firm role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Giriş başarısız");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "firm");

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        throw new Error("Bu hesap firma hesabı değil.");
      }

      toast({ title: "Giriş başarılı!", description: "Firma paneline yönlendiriliyorsunuz." });
      navigate("/firma/panel");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !phone.trim()) {
      toast({ title: "Hata", description: "Tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { company_name: companyName, phone },
        },
      });
      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Assign firm role via edge function
        const { error: roleError } = await supabase.functions.invoke("assign-firm-role");
        if (roleError) throw roleError;

        toast({ title: "Hesap oluşturuldu!", description: "Firma paneline yönlendiriliyorsunuz." });
        navigate("/firma/panel");
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">Firma Girişi</CardTitle>
            <CardDescription className="text-muted-foreground">
              Firma hesabınıza giriş yapın veya yeni hesap oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">
                  <LogIn className="h-4 w-4 mr-2" /> Giriş Yap
                </TabsTrigger>
                <TabsTrigger value="signup">
                  <UserPlus className="h-4 w-4 mr-2" /> Kayıt Ol
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-posta</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="firma@ornek.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Şifre</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Firma Adı *</Label>
                    <Input
                      id="company-name"
                      placeholder="Örn: Yeşil Peyzaj Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefon *</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-posta *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="firma@ornek.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Şifre *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min. 6 karakter"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Hesap oluşturuluyor..." : "Firma Hesabı Oluştur"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default FirmaGiris;
