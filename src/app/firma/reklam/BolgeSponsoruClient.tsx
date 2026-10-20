"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FirmaSidebar } from "@/components/firma/FirmaSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/categories";
import {
  OFFER_FLAGS,
  SALES_WHATSAPP_URL,
  TAX_LABEL,
  formatTRY,
  sponsorPlacement,
  sponsorTierFor,
} from "@/lib/pricing";
import { queryUntyped } from "@/app/firma/panel/rpc";

interface FirmRow {
  id: string;
  company_name: string | null;
  is_premium: boolean | null;
}

interface SponsorRequestRow {
  id: string;
  city_slug: string;
  category_slug: string;
  status: string;
  created_at: string;
}

const MAX_NOTE_LENGTH = 500;
const UNIQUE_VIOLATION = "23505";

const STATUS_LABELS: Record<string, string> = {
  new: "Talebiniz alındı",
  contacted: "İletişime geçildi",
  confirmed: "Onaylandı",
  cancelled: "İptal edildi",
};

type Availability = "checking" | "free" | "taken" | "unknown";

export default function BolgeSponsoruClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firm, setFirm] = useState<FirmRow | null>(null);
  const [citySlug, setCitySlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [note, setNote] = useState("");
  const [availability, setAvailability] = useState<Availability>("unknown");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [requests, setRequests] = useState<SponsorRequestRow[]>([]);

  const city = CITIES.find((item) => item.slug === citySlug);
  const category = CATEGORIES.find((item) => item.slug === categorySlug);
  const slotChosen = Boolean(city && category);
  const tier = citySlug ? sponsorTierFor(citySlug) : null;

  const loadRequests = async () => {
    const { data } = await queryUntyped<SponsorRequestRow[]>("sponsor_requests", (q) =>
      q.select("id, city_slug, category_slug, status, created_at").order("created_at", { ascending: false }).limit(20),
    );
    setRequests(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "firm");
      if (!roles || roles.length === 0) {
        router.push("/");
        return;
      }

      const { data: firmData } = await supabase
        .from("firms")
        .select("id, company_name, is_premium")
        .eq("user_id", user.id)
        .single();
      setFirm(firmData);
      await loadRequests();
      setLoading(false);
    };
    void checkAccess();
  }, [router]);

  // Slotta yayında bir sponsor banner'ı varsa 'Dolu'. Aktif banner'lar herkese açık okunur.
  useEffect(() => {
    if (!city || !category) {
      setAvailability("unknown");
      return;
    }
    let cancelled = false;
    setAvailability("checking");
    void queryUntyped<{ id: string }[]>("banners", (q) =>
      q
        .select("id")
        .eq("placement", sponsorPlacement(category.slug, city.slug))
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString())
        .limit(1),
    ).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !Array.isArray(data)) setAvailability("unknown");
      else setAvailability(data.length > 0 ? "taken" : "free");
    });
    return () => {
      cancelled = true;
    };
  }, [city, category]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Sponsor yerleşimi henüz sayfalarda yayında değilken doluluk yalnızca ön rezervasyon için geçerlidir.
  const availabilityLabel = (label: "Müsait" | "Dolu") => (OFFER_FLAGS.sponsorLive ? label : `Ön rezervasyon için ${label.toLowerCase()}`);

  const whatsappFor = (cityName: string, categoryLabel: string) =>
    SALES_WHATSAPP_URL(
      `Merhaba, ${firm?.company_name ?? "firmamız"} olarak ${cityName} / ${categoryLabel} Bölge Sponsoru için ön rezervasyon talebimle ilgili görüşmek istiyorum.`,
    );

  const handleSubmit = async () => {
    if (!firm || !city || !category) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const { error } = await queryUntyped<unknown>("sponsor_requests", (q) =>
        q.insert({
          firm_id: firm.id,
          city_slug: city.slug,
          category_slug: category.slug,
          note: note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : null,
        }),
      );
      if (error) {
        setMessage({
          tone: "error",
          text:
            error.code === UNIQUE_VIOLATION
              ? "Bu slot için zaten talebiniz var."
              : "Talebiniz şu an alınamadı. Lütfen WhatsApp’tan bize yazın.",
        });
        return;
      }
      setMessage({
        tone: "ok",
        text: "Ön rezervasyon talebiniz alındı. Ödeme şimdi alınmaz; sizinle iletişime geçeceğiz.",
      });
      setNote("");
      await loadRequests();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FirmaSidebar isPremium={firm?.is_premium ?? false} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <h1 className="font-heading text-lg text-foreground truncate">Bölge Sponsoru</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Çıkış
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <section className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-heading text-2xl text-foreground mb-2">İl ve hizmet sayfasında tek sponsor olun</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {OFFER_FLAGS.sponsorLive
                    ? "Seçtiğiniz il ve hizmet sayfasında tek sponsor olarak, “Sponsorlu” etiketiyle en üstte yer alırsınız. Görüntülenme ve tıklama sayılarınızı panelinizden takip edersiniz."
                    : "Seçtiğiniz il ve hizmet sayfasında tek sponsor olarak, “Sponsorlu” etiketiyle en üstte yer almak için ön rezervasyon yapabilirsiniz. Yayın henüz başlamadı; yayına alındığında görüntülenme ve tıklama sayılarınızı panelinizden takip edersiniz."}
                </p>
                <p className="mt-3 text-sm text-foreground">
                  {OFFER_FLAGS.sponsorLive
                    ? "Talebiniz alındıktan sonra ödeme linki WhatsApp veya e-posta ile gönderilir."
                    : "Ön rezervasyon: ödeme şimdi alınmaz; yayın tarihi netleşince ödeme linki gönderilir."}
                </p>
              </section>

              <section className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="font-heading text-xl text-foreground">Slot seçin</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-city">İl</Label>
                    <Select value={citySlug} onValueChange={setCitySlug}>
                      <SelectTrigger id="sponsor-city" className="h-11">
                        <SelectValue placeholder="İl seçin" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CITIES.map((item) => (
                          <SelectItem key={item.slug} value={item.slug}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sponsor-category">Hizmet</Label>
                    <Select value={categorySlug} onValueChange={setCategorySlug}>
                      <SelectTrigger id="sponsor-category" className="h-11">
                        <SelectValue placeholder="Hizmet seçin" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CATEGORIES.map((item) => (
                          <SelectItem key={item.slug} value={item.slug}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {slotChosen && city && category && tier && (
                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {city.name} / {category.label}
                      </p>
                      {availability === "free" && <Badge variant="secondary">{availabilityLabel("Müsait")}</Badge>}
                      {availability === "taken" && <Badge variant="outline">{availabilityLabel("Dolu")}</Badge>}
                      {availability === "unknown" && <Badge variant="outline">Müsaitlik kontrol edilemedi</Badge>}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-heading text-3xl text-foreground">{formatTRY(tier.monthlyTRY)}</span>
                      <span className="text-muted-foreground">/ay</span>
                      <span className="text-xs text-muted-foreground">{TAX_LABEL}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.label}. Fiyat bir tekliftir; yayın öncesinde netleştirilir.</p>
                    {availability === "taken" && (
                      <p className="text-sm text-muted-foreground">Bu slot şu anda dolu; başka bir il veya hizmet seçebilirsiniz.</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="sponsor-note">Not (isteğe bağlı)</Label>
                  <Textarea
                    id="sponsor-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={MAX_NOTE_LENGTH}
                    rows={3}
                    placeholder="Başlangıç tarihi tercihiniz gibi notlar"
                  />
                </div>

                <Button
                  variant="accent"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={handleSubmit}
                  disabled={!slotChosen || submitting || availability === "taken" || availability === "checking"}
                >
                  {submitting ? "Gönderiliyor..." : "Ön rezervasyon talebi gönder"}
                </Button>

                {message && (
                  <div className="space-y-2" role="status">
                    <p className={message.tone === "ok" ? "text-sm text-foreground" : "text-sm text-destructive"}>{message.text}</p>
                    {city && category && (
                      <Button variant="outline" className="min-h-11" asChild>
                        <a href={whatsappFor(city.name, category.label)} target="_blank" rel="noopener noreferrer">
                          WhatsApp’tan yaz
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </section>

              {requests.length > 0 && (
                <section className="rounded-xl border border-border bg-card p-6">
                  <h2 className="font-heading text-xl text-foreground mb-3">Taleplerim</h2>
                  <ul className="divide-y divide-border">
                    {requests.map((request) => (
                      <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                        <span className="text-foreground">
                          {CITIES.find((item) => item.slug === request.city_slug)?.name ?? request.city_slug} /{" "}
                          {CATEGORIES.find((item) => item.slug === request.category_slug)?.label ?? request.category_slug}
                        </span>
                        <span className="text-muted-foreground">{STATUS_LABELS[request.status] ?? request.status}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
