"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Building2, CheckCircle, Clock, Loader2, LogIn, UserPlus } from "lucide-react";
import { TURKISH_CITIES } from "@/lib/leadFormData";
import { DISTRICTS_BY_CITY } from "@/lib/districts";
import { maskEmail } from "@/lib/outreachTemplates";
import OtpStep from "@/app/firma-sahiplen/_components/OtpStep";
import {
  callClaimFirm,
  isClaimError,
  startSession,
  type ClaimErrorBody,
  type LoginVerified,
  type RegisterPending,
  type SendOtpOk,
} from "@/app/firma-sahiplen/_components/claimClient";

const SERVICE_OPTIONS = [
  "Bahçe Düzenleme",
  "Ağaç Budama & Bakım",
  "Sulama Sistemi",
  "Peyzaj Tasarımı",
  "Çim Serimi",
  "Diğer",
];

type FormErrors = Record<string, string>;
type LoginStep = "email" | "otp" | "pending" | "none";
type RegisterStep = "form" | "otp" | "done" | "exists" | "pending";

const validateEmail = (email: string): string | null => {
  if (!email.trim()) return "E-posta adresi zorunludur.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Geçerli bir e-posta adresi girin.";
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return "Telefon numarası zorunludur.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return "Telefon numarası 10-11 haneli olmalıdır.";
  if (!digits.startsWith("05") && !digits.startsWith("5")) return "Telefon numarası 05 ile başlamalıdır.";
  return null;
};

const validateWebsite = (url: string): string | null => {
  if (!url.trim()) return null; // optional
  const value = url.trim();
  if (/^http:\/\//i.test(value)) return "Web adresi https:// ile başlamalıdır.";
  try {
    const u = new URL(/^https:\/\//i.test(value) ? value : `https://${value}`);
    if (!u.hostname.includes(".")) return "Geçerli bir web adresi girin.";
    return null;
  } catch {
    return "Geçerli bir web adresi girin (örn: https://firma.com).";
  }
};

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-sm text-destructive">{message}</p> : null;

const FirmaGiris = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [resendAfter, setResendAfter] = useState(60);

  // Login state
  const [loginStep, setLoginStep] = useState<LoginStep>("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  // Registration state
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [existingFirmId, setExistingFirmId] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const availableDistricts = city ? (DISTRICTS_BY_CITY[city] || []) : [];

  // A signed-in, approved firm owner goes straight to the panel
  useEffect(() => {
    let cancelled = false;
    const redirectOwner = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const [{ data: roles }, { data: firms }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "firm"),
        supabase.from("firms").select("id").eq("user_id", session.user.id).eq("is_approved", true).limit(1),
      ]);
      if (!cancelled && (roles?.length ?? 0) > 0 && (firms?.length ?? 0) > 0) router.push("/firma/panel");
    };
    void redirectOwner();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const finishLogin = () => {
    toast({ title: "Giriş başarılı!", description: "Firma paneline yönlendiriliyorsunuz." });
    router.push("/firma/panel");
  };

  const switchTab = (next: string) => {
    setError(null);
    setTab(next);
  };

  // --- Passwordless login ----------------------------------------------------------------------

  const sendLoginCode = async () => {
    const email = loginEmail.trim().toLowerCase();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await callClaimFirm<SendOtpOk>({ action: "login_send", email });
    setBusy(false);
    if (isClaimError(result)) {
      setError(result.message);
      return;
    }
    setSentAt(Date.now());
    setResendAfter(result.resend_after);
    setLoginStep("otp");
  };

  const verifyLoginCode = async (otp: string) => {
    setBusy(true);
    setError(null);
    const result = await callClaimFirm<LoginVerified>({
      action: "login_verify",
      email: loginEmail.trim().toLowerCase(),
      otp,
    });
    if (isClaimError(result)) {
      setBusy(false);
      setError(result.message);
      return;
    }

    if (result.firm_status === "approved") {
      const signedIn = await startSession(result.token_hash);
      setBusy(false);
      if (!signedIn) {
        setError("Giriş başlatılamadı. Lütfen yeni bir kod isteyin.");
        return;
      }
      finishLogin();
      return;
    }
    setBusy(false);
    setLoginStep(result.firm_status === "pending" ? "pending" : "none");
  };

  const resetLogin = () => {
    setError(null);
    setLoginStep("email");
  };

  // --- Password login (accounts created before the e-mail code) ---------------------------------

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (signInError) {
        throw new Error(
          /invalid login credentials/i.test(signInError.message)
            ? "E-posta veya şifre hatalı."
            : "Giriş yapılamadı. Lütfen tekrar deneyin.",
        );
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Giriş başarısız.");

      const [{ data: roles }, { data: firms }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "firm"),
        supabase
          .from("firms")
          .select("is_approved")
          .eq("user_id", user.id)
          .order("is_approved", { ascending: false })
          .limit(1),
      ]);
      const firm = firms?.[0];

      // Approval is checked first: the firm role is only granted when an admin approves the firm.
      if (firm && !firm.is_approved) {
        await supabase.auth.signOut();
        setLoginStep("pending");
        return;
      }
      if (!firm || (roles?.length ?? 0) === 0) {
        await supabase.auth.signOut();
        throw new Error("Bu hesap firma hesabı değil.");
      }

      finishLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  // --- Registration ------------------------------------------------------------------------------

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const emailErr = validateEmail(signupEmail);
    if (emailErr) newErrors.email = emailErr;
    const phoneErr = validatePhone(phone);
    if (phoneErr) newErrors.phone = phoneErr;
    const webErr = validateWebsite(website);
    if (webErr) newErrors.website = webErr;
    if (companyName.trim().length < 2) newErrors.companyName = "Firma adı zorunludur.";
    if (!city) newErrors.city = "İl seçimi zorunludur.";
    if (services.length === 0) newErrors.services = "En az bir hizmet türü seçin.";
    if (!consent) newErrors.consent = "Devam etmek için aydınlatma metnini okuduğunuzu onaylayın.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const toggleService = (service: string) => {
    setServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]));
    clearFieldError("services");
  };

  /**
   * The phone number is already in the directory: a live listing is claimed instead of registered again
   * (phone_exists), and an application that is still waiting for review gets the same "inceleniyor" card as
   * the login (application_pending), not a link to a page that does not exist yet.
   */
  const showRegisterRefusal = (result: ClaimErrorBody) => {
    if (result.error === "phone_exists" && result.firm_id) {
      setExistingFirmId(result.firm_id);
      setRegisterStep("exists");
    } else if (result.error === "application_pending") {
      setRegisterStep("pending");
    } else {
      setError(result.message);
    }
  };

  const sendRegisterCode = async () => {
    setBusy(true);
    setError(null);
    const result = await callClaimFirm<SendOtpOk>({
      action: "send_otp",
      purpose: "register",
      email: signupEmail.trim().toLowerCase(),
      register: {
        company_name: companyName.trim(),
        phone: phone.trim(),
        city,
        district: district || undefined,
        address: address.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        services,
      },
    });
    setBusy(false);

    if (isClaimError(result)) {
      showRegisterRefusal(result);
      return;
    }
    setSentAt(Date.now());
    setResendAfter(result.resend_after);
    setRegisterStep("otp");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await sendRegisterCode();
  };

  const verifyRegisterCode = async (otp: string) => {
    setBusy(true);
    setError(null);
    const result = await callClaimFirm<RegisterPending>({
      action: "verify_otp",
      purpose: "register",
      email: signupEmail.trim().toLowerCase(),
      otp,
    });
    setBusy(false);

    if (isClaimError(result)) {
      showRegisterRefusal(result);
      return;
    }
    setRegisterStep("done");
  };

  const spinner = busy ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null;

  const errorLine = error && (
    <p role="alert" className="text-sm font-medium text-destructive">
      {error}
    </p>
  );

  // --- Screens -----------------------------------------------------------------------------------

  const statusCard = (icon: React.ReactNode, title: string, body: React.ReactNode, actions: React.ReactNode) => (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-8 pt-20">
        <Card className="w-full max-w-md border-border text-center">
          <CardContent className="space-y-4 pb-8 pt-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">{icon}</div>
            <h1 className="text-[1.75rem] leading-tight">{title}</h1>
            <div className="text-muted-foreground">{body}</div>
            <div className="flex flex-col gap-2">{actions}</div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  if (registerStep === "done") {
    return statusCard(
      <CheckCircle className="h-8 w-8" aria-hidden="true" />,
      "Başvurunuz alındı",
      <p>Başvurunuz inceleniyor. Onaylandığında e-posta ile haber vereceğiz.</p>,
      <Button variant="outline" onClick={() => router.push("/")}>
        Ana sayfaya dön
      </Button>,
    );
  }

  if (registerStep === "exists" && existingFirmId) {
    return statusCard(
      <Building2 className="h-8 w-8" aria-hidden="true" />,
      "Firmanız dizinde zaten kayıtlı",
      <p>Bu telefon numarasıyla kayıtlı bir profil var. Yeni başvuru yerine mevcut profili sahiplenin.</p>,
      <Button asChild variant="accent" size="lg">
        <Link href={`/firma-sahiplen/${existingFirmId}`}>Profili sahiplen</Link>
      </Button>,
    );
  }

  if (registerStep === "pending" || (tab === "login" && loginStep === "pending")) {
    return statusCard(
      <Clock className="h-8 w-8" aria-hidden="true" />,
      "Başvurunuz inceleniyor",
      <p>Başvurunuz inceleniyor. Onaylandığında e-posta ile haber vereceğiz.</p>,
      <Button variant="outline" onClick={() => router.push("/")}>
        Ana sayfaya dön
      </Button>,
    );
  }

  if (tab === "login" && loginStep === "none") {
    return statusCard(
      <Building2 className="h-8 w-8" aria-hidden="true" />,
      "Bu e-posta ile kayıtlı firma hesabı yok",
      <p>Firmanız dizinde listeleniyorsa profilinizi sahiplenebilir, listede yoksa yeni başvuru yapabilirsiniz.</p>,
      <>
        <Button asChild variant="accent" size="lg">
          <Link href="/firma-sahiplen">Firmamı sahiplen</Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            resetLogin();
            setTab("register");
          }}
        >
          Yeni firma başvurusu
        </Button>
        <Button variant="link" onClick={resetLogin}>
          Başka bir e-posta dene
        </Button>
      </>,
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-8 pt-24">
        <Card className="w-full max-w-lg border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <Building2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl text-foreground">Firma Girişi</CardTitle>
            <CardDescription className="text-muted-foreground">
              E-posta adresinize gelen tek kullanımlık kodla girin ya da yeni başvuru oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={switchTab} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2 p-1">
                <TabsTrigger value="login" className="min-h-11">
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" /> Giriş
                </TabsTrigger>
                <TabsTrigger value="register" className="min-h-11">
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Yeni Firma Başvurusu
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {loginStep === "otp" ? (
                  <div className="mt-4 space-y-4">
                    <h2 className="text-xl">Kodu girin</h2>
                    <OtpStep
                      hint={maskEmail(loginEmail.trim().toLowerCase())}
                      sentAt={sentAt}
                      resendAfter={resendAfter}
                      busy={busy}
                      error={error}
                      onSubmit={verifyLoginCode}
                      onResend={sendLoginCode}
                      onBack={resetLogin}
                      backLabel="E-posta adresini değiştir"
                    />
                  </div>
                ) : usePassword ? (
                  <form onSubmit={handlePasswordLogin} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-posta</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="firma@ornek.com"
                        className="h-11"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Şifre</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="h-11"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    {errorLine}
                    <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
                      {spinner}
                      {busy ? "Giriş yapılıyor..." : "Şifreyle giriş yap"}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setError(null);
                          setUsePassword(false);
                        }}
                      >
                        E-posta koduyla giriş yap
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendLoginCode();
                    }}
                    className="mt-4 space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-posta</Label>
                      <Input
                        id="login-email"
                        type="email"
                        inputMode="email"
                        placeholder="firma@ornek.com"
                        className="h-11"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        required
                        autoComplete="email"
                      />
                      <p className="text-xs text-muted-foreground">Size 6 haneli tek kullanımlık bir kod göndeririz. Şifre gerekmez.</p>
                    </div>
                    {errorLine}
                    <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
                      {spinner}
                      {busy ? "Kod gönderiliyor..." : "Giriş kodu gönder"}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setError(null);
                          setUsePassword(true);
                        }}
                      >
                        Şifrem var
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="register">
                {registerStep === "otp" ? (
                  <div className="mt-4 space-y-4">
                    <h2 className="text-xl">E-postanızı doğrulayın</h2>
                    <OtpStep
                      hint={maskEmail(signupEmail.trim().toLowerCase())}
                      sentAt={sentAt}
                      resendAfter={resendAfter}
                      busy={busy}
                      error={error}
                      onSubmit={verifyRegisterCode}
                      onResend={sendRegisterCode}
                      onBack={() => {
                        setError(null);
                        setRegisterStep("form");
                      }}
                      backLabel="Bilgileri düzenle"
                    />
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="mt-4 space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Firma Adı *</Label>
                      <Input
                        id="company-name"
                        placeholder="Örn: Yeşil Peyzaj Ltd."
                        className="h-11"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          clearFieldError("companyName");
                        }}
                      />
                      <FieldError message={errors.companyName} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Telefon *</Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          inputMode="tel"
                          placeholder="05XX XXX XX XX"
                          className="h-11"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            clearFieldError("phone");
                          }}
                        />
                        <FieldError message={errors.phone} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Web Sitesi</Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://firma.com"
                          className="h-11"
                          value={website}
                          onChange={(e) => {
                            setWebsite(e.target.value);
                            clearFieldError("website");
                          }}
                        />
                        <FieldError message={errors.website} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>İl *</Label>
                        <Select
                          value={city}
                          onValueChange={(val) => {
                            setCity(val);
                            setDistrict("");
                            clearFieldError("city");
                          }}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="İl seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {TURKISH_CITIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={errors.city} />
                      </div>
                      <div className="space-y-2">
                        <Label>İlçe</Label>
                        <Select value={district} onValueChange={setDistrict} disabled={!city}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={city ? "İlçe seçin" : "Önce il seçin"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDistricts.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Adres</Label>
                      <Textarea
                        id="address"
                        placeholder="Firma adresi (opsiyonel)"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <fieldset className="space-y-1">
                      <legend className="mb-1 text-sm font-medium">Hizmet Türleri *</legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2">
                        {SERVICE_OPTIONS.map((service) => (
                          <label key={service} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                            <Checkbox checked={services.includes(service)} onCheckedChange={() => toggleService(service)} />
                            <span className="text-foreground">{service}</span>
                          </label>
                        ))}
                      </div>
                      <FieldError message={errors.services} />
                    </fieldset>

                    <div className="space-y-2">
                      <Label htmlFor="description">Firma Tanıtımı</Label>
                      <Textarea
                        id="description"
                        placeholder="Firmanızı kısaca tanıtın..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={1000}
                      />
                    </div>

                    <div className="space-y-2 border-t border-border pt-4">
                      <Label htmlFor="signup-email">E-posta *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        inputMode="email"
                        placeholder="firma@ornek.com"
                        className="h-11"
                        value={signupEmail}
                        onChange={(e) => {
                          setSignupEmail(e.target.value);
                          clearFieldError("email");
                        }}
                        autoComplete="email"
                      />
                      <p className="text-xs text-muted-foreground">Doğrulama kodu ve giriş kodları bu adrese gelir. Şifre belirlemeniz gerekmez.</p>
                      <FieldError message={errors.email} />
                    </div>

                    <div>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm">
                        <Checkbox
                          className="mt-0.5"
                          checked={consent}
                          onCheckedChange={(checked) => {
                            setConsent(checked === true);
                            clearFieldError("consent");
                          }}
                        />
                        <span className="text-foreground">
                          <Link href="/gizlilik-politikasi" target="_blank" className="font-medium text-primary underline underline-offset-4">
                            Aydınlatma metnini
                          </Link>{" "}
                          okudum.
                        </span>
                      </label>
                      <FieldError message={errors.consent} />
                    </div>

                    <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                      Başvurunuz e-posta doğrulamasından sonra incelenir. Onaylandığında e-posta ile haber veririz.
                    </p>

                    {errorLine}
                    <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
                      {spinner}
                      {busy ? "Kod gönderiliyor..." : "Doğrulama kodu gönder"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default FirmaGiris;
