"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle, Copy, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { claimCodeWaText, removalRequestWaText, supportWaLink } from "@/lib/outreachTemplates";
import OtpStep from "@/app/firma-sahiplen/_components/OtpStep";
import {
  callClaimFirm,
  isClaimError,
  startSession,
  type CreditInfo,
  type FirmEmailVerified,
  type SendOtpOk,
  type WhatsAppPending,
} from "@/app/firma-sahiplen/_components/claimClient";

/** What claim_preview() returns: enough to recognise the firm, never the full phone, e-mail or claim code. */
export interface ClaimPreview {
  firm_id: string;
  company_name: string;
  city: string;
  district: string | null;
  slug: string | null;
  logo_url: string | null;
  services_count: number;
  is_claimed: boolean;
  has_email: boolean;
  email_hint: string | null;
  phone_hint: string | null;
}

interface FirmaSahiplenProps {
  /** null when the code or id is unknown, malformed or points at a hidden firm. */
  preview: ClaimPreview | null;
  /** Claim code of the /s/{code} link, used for the click log. */
  code?: string;
  /** Firm id of the /firma-sahiplen/{id} link, used for the click log. */
  firmId?: string;
  /** The preview could not be loaded (database or network problem), not an invalid link. */
  unavailable?: boolean;
}

type Screen = "start" | "email_otp" | "wa_email" | "wa_otp" | "wa_pending" | "done";
type ClaimPurpose = "claim_firm_email" | "claim_whatsapp";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-background">
    <Navbar />
    <main className="flex-1 px-4 pb-12 pt-24">
      <div className="mx-auto w-full max-w-lg space-y-6">{children}</div>
    </main>
    <Footer />
  </div>
);

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-xl border border-border bg-card p-5 shadow-card sm:p-6 ${className}`}>{children}</section>
);

const TextLink = ({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) => {
  const className =
    "inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4 transition-colors duration-150 hover:text-accent";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

const FirmaSahiplen = ({ preview, code, firmId, unavailable = false }: FirmaSahiplenProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const [screen, setScreen] = useState<Screen>("start");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [resendAfter, setResendAfter] = useState(60);
  const [waEmail, setWaEmail] = useState("");
  const [waResult, setWaResult] = useState<WhatsAppPending | null>(null);
  const [done, setDone] = useState<{ credit: CreditInfo; signedIn: boolean } | null>(null);
  const [claimedNow, setClaimedNow] = useState(false);

  // Count the visit from the browser only: link-preview crawlers render the page too and must not create clicks.
  useEffect(() => {
    if (!preview || preview.is_claimed || (!code && !firmId)) return;
    const key = `claim-click:${code ?? firmId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage is blocked (private window): count the visit anyway, the database ignores repeats.
    }
    // claim_log_click is not in the generated types yet (src/lib/supabase/types.ts predates the claim migrations).
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<unknown>;
    // Query builders only run once awaited, so the call is wrapped in a promise.
    void Promise.resolve(rpc("claim_log_click", code ? { p_code: code } : { p_firm_id: firmId })).catch(() => undefined);
  }, [preview, code, firmId]);

  if (unavailable) {
    return (
      <Shell>
        <Panel className="space-y-4 text-center">
          <h1 className="text-[1.75rem] leading-tight">Sayfa şu an açılamıyor</h1>
          <p className="text-muted-foreground">
            Bağlantınız büyük olasılıkla doğru; ama bilgilere şu an ulaşamadık. Lütfen birkaç dakika sonra tekrar deneyin.
          </p>
          <div className="flex flex-col items-center">
            <TextLink href="/firmalar">Firmanızı arayın</TextLink>
            <TextLink href={supportWaLink()} external>
              WhatsApp ile bize yazın
            </TextLink>
          </div>
        </Panel>
      </Shell>
    );
  }

  if (!preview) {
    return (
      <Shell>
        <Panel className="space-y-4 text-center">
          <h1 className="text-[1.75rem] leading-tight">Bu bağlantı geçersiz veya süresi dolmuş</h1>
          <p className="text-muted-foreground">Firmanızı dizinde arayıp profil sayfasından sahiplenebilirsiniz.</p>
          <Button asChild variant="accent" size="lg" className="w-full">
            <Link href="/firmalar">Firmanızı arayın</Link>
          </Button>
          <TextLink href={supportWaLink()} external>
            Sorun mu var? WhatsApp ile bize yazın
          </TextLink>
        </Panel>
      </Shell>
    );
  }

  const firmName = preview.company_name;
  const place = preview.district ? `${preview.city} / ${preview.district}` : preview.city;
  const claimed = preview.is_claimed || claimedNow;

  const firmCard = (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      {preview.logo_url ? (
        <img src={preview.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{firmName}</p>
        <p className="text-sm text-muted-foreground">{place}</p>
      </div>
      {preview.slug && (
        <TextLink href={`/firma/${preview.slug}`}>
          <span className="whitespace-nowrap text-sm">Profilinizi görün</span>
        </TextLink>
      )}
    </div>
  );

  if (claimed) {
    return (
      <Shell>
        {firmCard}
        <Panel className="space-y-4 text-center">
          <h1 className="text-[1.75rem] leading-tight">Bu profil zaten sahiplenilmiş.</h1>
          <p className="text-muted-foreground">Firma sahibiyseniz e-posta adresinize gelen kodla giriş yapabilirsiniz.</p>
          <Button asChild variant="accent" size="lg" className="w-full">
            <Link href="/firma/giris">Giriş yap</Link>
          </Button>
          <TextLink
            href={supportWaLink(`Bu benim firmam, itiraz ediyorum: ${firmName} (${place})`)}
            external
          >
            Bu benim firmam, itiraz et
          </TextLink>
        </Panel>
      </Shell>
    );
  }

  const target = { firm_id: preview.firm_id };

  const requestCode = async (purpose: ClaimPurpose) => {
    if (purpose === "claim_whatsapp" && !EMAIL_PATTERN.test(waEmail.trim())) {
      setError("Geçerli bir e-posta adresi yazın.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await callClaimFirm<SendOtpOk>({
      action: "send_otp",
      purpose,
      ...target,
      ...(purpose === "claim_whatsapp" ? { email: waEmail.trim() } : {}),
    });
    setBusy(false);

    if (isClaimError(result)) {
      if (result.error === "already_claimed") setClaimedNow(true);
      if (result.error === "no_email_on_file") setScreen("wa_email");
      setError(result.message);
      return;
    }
    setHint(result.target_hint ?? null);
    setSentAt(Date.now());
    setResendAfter(result.resend_after);
    setScreen(purpose === "claim_firm_email" ? "email_otp" : "wa_otp");
  };

  const verify = async (otp: string) => {
    setBusy(true);
    setError(null);

    if (screen === "email_otp") {
      const result = await callClaimFirm<FirmEmailVerified>({
        action: "verify_otp",
        purpose: "claim_firm_email",
        ...target,
        otp,
      });
      if (isClaimError(result)) {
        if (result.error === "already_claimed") setClaimedNow(true);
        setBusy(false);
        setError(result.message);
        return;
      }
      const signedIn = await startSession(result.token_hash);
      setBusy(false);
      setDone({ credit: result.credit, signedIn });
      setScreen("done");
      return;
    }

    const result = await callClaimFirm<WhatsAppPending>({
      action: "verify_otp",
      purpose: "claim_whatsapp",
      ...target,
      email: waEmail.trim(),
      otp,
    });
    setBusy(false);
    if (isClaimError(result)) {
      if (result.error === "already_claimed") setClaimedNow(true);
      setError(result.message);
      return;
    }
    setWaResult(result);
    setScreen("wa_pending");
  };

  const goTo = (next: Screen) => {
    setError(null);
    setScreen(next);
  };

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Kod kopyalandı" });
    } catch {
      toast({ title: "Kod kopyalanamadı", description: "Kodu elle yazabilirsiniz.", variant: "destructive" });
    }
  };

  const errorLine = error && (
    <p role="alert" className="text-sm font-medium text-destructive">
      {error}
    </p>
  );

  const waMethodLabel = preview.has_email ? "E-postama erişemiyorum / listede e-posta yok" : "E-postam listede yok, WhatsApp ile doğrula";

  return (
    <Shell>
      {firmCard}

      {screen === "start" && (
        <>
          <div className="space-y-3">
            <h1 className="text-[1.75rem] leading-tight sm:text-4xl">{firmName} profiliniz yayında. Sahiplenmek 2 dakika sürer.</h1>
            <p className="text-sm text-muted-foreground">
              Bu bilgiler kamuya açık kaynaklardan derlenmiştir. Listeden kaldırılmasını isterseniz{" "}
              <a
                href={supportWaLink(removalRequestWaText(firmName))}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                WhatsApp&apos;tan KALDIR yazın
              </a>
              .
            </p>
          </div>

          <Panel className="space-y-3">
            <h2 className="text-xl">Firmanızın sizin olduğunu doğrulayın</h2>
            {preview.has_email ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Dizinde kayıtlı e-posta adresine 6 haneli bir kod göndeririz. Kodu girince profil hemen sizin olur.
                </p>
                <Button
                  type="button"
                  variant="accent"
                  size="lg"
                  className="h-auto min-h-12 w-full whitespace-normal py-2"
                  onClick={() => requestCode("claim_firm_email")}
                  disabled={busy}
                >
                  {busy && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
                  Kayıtlı e-postama kod gönder{preview.email_hint ? ` (${preview.email_hint})` : ""}
                </Button>
                {errorLine}
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto min-h-11 whitespace-normal py-2 text-center"
                    onClick={() => goTo("wa_email")}
                    disabled={busy}
                  >
                    {waMethodLabel}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Bu firma için dizinde e-posta adresi yok. Kendi e-posta adresinizi doğrulayıp WhatsApp&apos;tan bize bir kod
                  göndererek sahiplenebilirsiniz.
                </p>
                <Button
                  type="button"
                  variant="accent"
                  size="lg"
                  className="h-auto min-h-12 w-full whitespace-normal py-2 text-center"
                  onClick={() => goTo("wa_email")}
                >
                  {waMethodLabel}
                </Button>
              </>
            )}
          </Panel>
        </>
      )}

      {screen === "email_otp" && (
        <Panel className="space-y-4">
          <h1 className="text-[1.75rem] leading-tight">E-postanızı kontrol edin</h1>
          <OtpStep
            hint={hint ?? preview.email_hint}
            sentAt={sentAt}
            resendAfter={resendAfter}
            busy={busy}
            error={error}
            onSubmit={verify}
            onResend={() => requestCode("claim_firm_email")}
            onBack={() => goTo("start")}
            backLabel="Başka bir yöntem seç"
          />
        </Panel>
      )}

      {screen === "wa_email" && (
        <Panel className="space-y-4">
          <h1 className="text-[1.75rem] leading-tight">WhatsApp ile doğrulama</h1>
          <p className="text-sm text-muted-foreground">
            Önce e-posta adresinizi doğrularız, ardından size özel bir kodu WhatsApp&apos;tan bize gönderirsiniz. Mesajınız
            ulaşınca başvurunuzu inceleriz.
          </p>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void requestCode("claim_whatsapp");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="claim-email">E-posta adresiniz</Label>
              <Input
                id="claim-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="firma@ornek.com"
                className="h-11"
                value={waEmail}
                onChange={(event) => {
                  setWaEmail(event.target.value);
                  if (error) setError(null);
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Giriş bağlantısı ve bildirimler bu adrese gelir.
                {preview.has_email ? "" : " Dizinde e-posta olmadığı için onaylanınca profilinizde iletişim e-postası olarak da gösterilir."}
              </p>
            </div>
            {errorLine}
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
              Doğrulama kodu gönder
            </Button>
          </form>
          <div className="text-center">
            <Button type="button" variant="link" onClick={() => goTo("start")} disabled={busy}>
              Geri dön
            </Button>
          </div>
        </Panel>
      )}

      {screen === "wa_otp" && (
        <Panel className="space-y-4">
          <h1 className="text-[1.75rem] leading-tight">E-postanızı doğrulayın</h1>
          <OtpStep
            hint={hint}
            sentAt={sentAt}
            resendAfter={resendAfter}
            busy={busy}
            error={error}
            onSubmit={verify}
            onResend={() => requestCode("claim_whatsapp")}
            onBack={() => goTo("wa_email")}
            backLabel="E-posta adresini değiştir"
          />
        </Panel>
      )}

      {screen === "wa_pending" && waResult && (
        <Panel className="space-y-5">
          <h1 className="text-[1.75rem] leading-tight">Son adım: kodu WhatsApp&apos;tan gönderin</h1>
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Sahiplenme kodunuz</p>
            <p className="font-display text-4xl tracking-wider text-primary" aria-label={`Sahiplenme kodunuz ${waResult.whatsapp_code}`}>
              {waResult.whatsapp_code}
            </p>
            <Button type="button" variant="ghost" onClick={() => copyCode(waResult.whatsapp_code)}>
              <Copy className="h-4 w-4" aria-hidden="true" /> Kodu kopyala
            </Button>
          </div>
          <Button asChild variant="accent" size="lg" className="w-full">
            <a
              href={supportWaLink(claimCodeWaText(waResult.whatsapp_code, firmName))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp&apos;ta kodu gönder
            </a>
          </Button>
          <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
            Talebiniz alındı. WhatsApp mesajınız bize ulaşınca 1 iş günü içinde onaylayıp e-posta ile haber vereceğiz.
          </p>
        </Panel>
      )}

      {screen === "done" && done && (
        <Panel className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-verified/10 text-verified">
            <CheckCircle className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-[1.75rem] leading-tight">Profiliniz sizin.</h1>
          {done.credit.granted && (
            <p className="text-foreground">İlk müşteri talebiniz bizden: hesabınıza {done.credit.amount} jeton tanımlandı.</p>
          )}
          {done.signedIn ? (
            <Button type="button" variant="accent" size="lg" className="w-full" onClick={() => router.push("/firma/panel?hosgeldiniz=1")}>
              Firma panelime git
            </Button>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Panele girmek için firma girişi sayfasında e-posta adresinizi yazın; size yeni bir kod göndeririz.
              </p>
              <Button asChild variant="accent" size="lg" className="w-full">
                <Link href="/firma/giris">Firma girişine git</Link>
              </Button>
            </>
          )}
        </Panel>
      )}
    </Shell>
  );
};

export default FirmaSahiplen;
