"use client";

import { useState } from "react";
import { generateFirmSlug } from "@/lib/firmUtils";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
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
import { DISTRICTS_BY_CITY } from "@/lib/districts";

const SERVICE_OPTIONS = [
  "Bahçe Düzenleme",
  "Ağaç Budama & Bakım",
  "Sulama Sistemi",
  "Peyzaj Tasarımı",
  "Çim Serimi",
  "Diğer",
];

type FormErrors = Record<string, string>;

const validateEmail = (email: string): string | null => {
  if (!email.trim()) return "E-posta adresi zorunludur.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return "Geçerli bir e-posta adresi girin.";
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return "Telefon numarası zorunludur.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return "Telefon numarası 10-11 haneli olmalıdır.";
  if (!digits.startsWith("05") && !digits.startsWith("5")) return "Telefon numarası 05 ile başlamalıdır.";
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return "Şifre zorunludur.";
  if (password.length < 8) return "Şifre en az 8 karakter olmalıdır.";
  if (!/[A-Z]/.test(password)) return "Şifre en az 1 büyük harf içermelidir.";
  if (!/[0-9]/.test(password)) return "Şifre en az 1 rakam içermelidir.";
  return null;
};

const validateWebsite = (url: string): string | null => {
  if (!url.trim()) return null; // optional
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!u.hostname.includes(".")) return "Geçerli bir web adresi girin.";
    return null;
  } catch {
    return "Geçerli bir web adresi girin (örn: https://firma.com).";
  }
};

const FirmaGiris = () => {
  const router = useRouter();
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
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const availableDistricts = city ? (DISTRICTS_BY_CITY[city] || []) : [];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const emailErr = validateEmail(signupEmail);
    if (emailErr) newErrors.email = emailErr;
    const phoneErr = validatePhone(phone);
    if (phoneErr) newErrors.phone = phoneErr;
    const passErr = validatePassword(signupPassword);
    if (passErr) newErrors.password = passErr;
    const webErr = validateWebsite(website);
    if (webErr) newErrors.website = webErr;
    if (!companyName.trim()) newErrors.companyName = "Firma adı zorunludur.";
    if (!city) newErrors.city = "İl seçimi zorunludur.";
    if (services.length === 0) newErrors.services = "En az bir hizmet türü seçin.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      router.push("/firma/panel");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || window.location.origin,
          data: { company_name: companyName, phone },
        },
      });
      if (signUpError) throw signUpError;

      if (signUpData.user) {
        const { error: roleError } = await supabase.functions.invoke("assign-firm-role", {
          body: { user_id: signUpData.user.id }
        });
        if (roleError) throw roleError;

        const websiteValue = website.trim()
          ? (website.startsWith("http") ? website.trim() : `https://${website.trim()}`)
          : null;

        const firmSlug = generateFirmSlug(companyName, signUpData.user.id);

        const { error: firmError } = await supabase.from("firms").insert({
          user_id: signUpData.user.id,
          company_name: companyName,
          phone,
          email: signupEmail,
          city,
          district: district || null,
          address: address || null,
          website: websiteValue,
          description: description || null,
          services,
          is_approved: false,
          slug: firmSlug,
        });
        if (firmError) throw firmError;

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
    if (errors.services) setErrors((p) => ({ ...p, services: "" }));
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!errors[field]) return null;
    return <p className="text-sm text-destructive mt-1">{errors[field]}</p>;
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
              <Button variant="outline" onClick={() => router.push("/")}>Ana Sayfaya Dön</Button>
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
                    <Input id="login-email" type="email" placeholder="firma@ornek.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Şifre</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" />
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
                    <Input id="company-name" placeholder="Örn: Yeşil Peyzaj Ltd." value={companyName} onChange={(e) => { setCompanyName(e.target.value); if (errors.companyName) setErrors((p) => ({ ...p, companyName: "" })); }} />
                    <FieldError field="companyName" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefon *</Label>
                      <Input id="signup-phone" type="tel" placeholder="05XX XXX XX XX" value={phone} onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((p) => ({ ...p, phone: "" })); }} />
                      <FieldError field="phone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Web Sitesi</Label>
                      <Input id="website" type="url" placeholder="https://firma.com" value={website} onChange={(e) => { setWebsite(e.target.value); if (errors.website) setErrors((p) => ({ ...p, website: "" })); }} />
                      <FieldError field="website" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>İl *</Label>
                      <Select value={city} onValueChange={(val) => { setCity(val); setDistrict(""); if (errors.city) setErrors((p) => ({ ...p, city: "" })); }}>
                        <SelectTrigger><SelectValue placeholder="İl seçin" /></SelectTrigger>
                        <SelectContent>
                          {TURKISH_CITIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError field="city" />
                    </div>
                    <div className="space-y-2">
                      <Label>İlçe</Label>
                      <Select value={district} onValueChange={setDistrict} disabled={!city}>
                        <SelectTrigger><SelectValue placeholder={city ? "İlçe seçin" : "Önce il seçin"} /></SelectTrigger>
                        <SelectContent>
                          {availableDistricts.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FieldError field="services" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Firma Tanıtımı</Label>
                    <Textarea id="description" placeholder="Firmanızı kısaca tanıtın..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">Hesap Bilgileri</p>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">E-posta *</Label>
                      <Input id="signup-email" type="email" placeholder="firma@ornek.com" value={signupEmail} onChange={(e) => { setSignupEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }} autoComplete="email" />
                      <FieldError field="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Şifre *</Label>
                      <Input id="signup-password" type="password" placeholder="Min. 8 karakter, 1 büyük harf, 1 rakam" value={signupPassword} onChange={(e) => { setSignupPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: "" })); }} autoComplete="new-password" />
                      <FieldError field="password" />
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

