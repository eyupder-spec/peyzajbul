import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Building2, LogIn, UserPlus, CheckCircle } from "lucide-react";
import { TURKISH_CITIES } from "@/lib/leadFormData";

const SERVICE_OPTIONS = [
  "Bahçe Düzenleme",
  "Ağaç Budama & Bakım",
  "Sulama Sistemi",
  "Peyzaj Tasarımı",
  "Çim Serimi",
  "Diğer",
];

const FirmaGiris = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

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

      // Check if firm is approved
      const { data: firm } = await supabase
        .from("firms")
        .select("is_approved")
        .eq("user_id", user.id)
        .single();

      if (!firm?.is_approved) {
        await supabase.auth.signOut();
        throw new Error("Firma hesabınız henüz onaylanmamış. Admin onayı bekleniyor.");
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
    if (!companyName.trim() || !phone.trim() || !city) {
      toast({ title: "Hata", description: "Zorunlu alanları doldurun.", variant: "destructive" });
      return;
    }
    if (services.length === 0) {
      toast({ title: "Hata", description: "En az bir hizmet türü seçin.", variant: "destructive" });
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
        // Assign firm role
        const { error: roleError } = await supabase.functions.invoke("assign-firm-role");
        if (roleError) throw roleError;

        // Create firm record (unapproved by default)
        const { error: firmError } = await supabase.from("firms").insert({
          user_id: signUpData.user.id,
          company_name: companyName,
          phone,
          email: signupEmail,
          city,
          district: district || null,
          address: address || null,
          tax_number: taxNumber || null,
          description: description || null,
          services,
          is_approved: false,
        });
        if (firmError) throw firmError;

        // Sign out — they need admin approval first
        await supabase.auth.signOut();
        setSignupSuccess(true);
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service: string) => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  if (signupSuccess) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-20 bg-background flex items-center justify-center px-4">
          <Card className="w-full max-w-md border-border text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Başvurunuz Alındı!</h2>
              <p className="text-muted-foreground">
                Firma başvurunuz admin onayına gönderildi. Onaylandığında e-posta ile bilgilendirileceksiniz.
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>Ana Sayfaya Dön</Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-background flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">Firma Girişi</CardTitle>
            <CardDescription className="text-muted-foreground">
              Firma hesabınıza giriş yapın veya yeni başvuru oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login"><LogIn className="h-4 w-4 mr-2" /> Giriş Yap</TabsTrigger>
                <TabsTrigger value="signup"><UserPlus className="h-4 w-4 mr-2" /> Kayıt Ol</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-posta</Label>
                    <Input id="login-email" type="email" placeholder="firma@ornek.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Şifre</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  {/* Company info */}
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Firma Adı *</Label>
                    <Input id="company-name" placeholder="Örn: Yeşil Peyzaj Ltd." value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefon *</Label>
                      <Input id="signup-phone" type="tel" placeholder="05XX XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-number">Vergi No</Label>
                      <Input id="tax-number" placeholder="Opsiyonel" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>İl *</Label>
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger><SelectValue placeholder="İl seçin" /></SelectTrigger>
                        <SelectContent>
                          {TURKISH_CITIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">İlçe</Label>
                      <Input id="district" placeholder="İlçe" value={district} onChange={(e) => setDistrict(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Adres</Label>
                    <Textarea id="address" placeholder="Firma adresi (opsiyonel)" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label>Hizmet Türleri *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICE_OPTIONS.map((service) => (
                        <label key={service} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={services.includes(service)}
                            onCheckedChange={() => toggleService(service)}
                          />
                          <span className="text-foreground">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Firma Tanıtımı</Label>
                    <Textarea id="description" placeholder="Firmanızı kısaca tanıtın..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">Hesap Bilgileri</p>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">E-posta *</Label>
                      <Input id="signup-email" type="email" placeholder="firma@ornek.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Şifre *</Label>
                      <Input id="signup-password" type="password" placeholder="Min. 6 karakter" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} minLength={6} required />
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                    ⚠️ Başvurunuz admin onayından geçtikten sonra sisteme giriş yapabilirsiniz.
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Başvuru gönderiliyor..." : "Firma Başvurusu Gönder"}
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
