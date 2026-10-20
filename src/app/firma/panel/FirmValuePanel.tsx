"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Eye, FileText, MessageCircle, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  contactClicks,
  fetchFirmEventStats,
  hasAnyEvent,
  type FirmDailyPoint,
  type FirmEventCounts,
  type FirmEventStats,
} from "./firmStats";

const PERIODS = [7, 30] as const;
type Period = (typeof PERIODS)[number];

const SITE_ORIGIN = "https://www.peyzajbul.com";

const DATE_FORMAT = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DAY_FORMAT = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

const TILES: { key: keyof FirmEventCounts; label: string; icon: typeof Eye }[] = [
  { key: "profile_view", label: "Profil görüntüleme", icon: Eye },
  { key: "call_click", label: "Arama tıklaması", icon: Phone },
  { key: "whatsapp_click", label: "WhatsApp tıklaması", icon: MessageCircle },
  { key: "quote_click", label: "Teklif tıklaması", icon: FileText },
];

/** Önceki dönemde veri yoksa karşılaştırma gösterilmez. */
function deltaLabel(current: number, previous: number): string {
  if (previous <= 0) return "—";
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "+" : "-"}%${Math.abs(percent)}`;
}

function formatDay(iso: string): string {
  const date = new Date(`${iso}T12:00:00+03:00`);
  return Number.isNaN(date.getTime()) ? iso : DAY_FORMAT.format(date);
}

function Sparkline({ daily }: { daily: FirmDailyPoint[] }) {
  if (daily.length === 0) return null;
  const barWidth = 6;
  const gap = 2;
  const height = 40;
  const max = Math.max(1, ...daily.map((point) => point.profile_view));
  const width = daily.length * (barWidth + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-12 w-full"
      role="img"
      aria-label="Günlük profil görüntüleme sayısı"
    >
      {daily.map((point, index) => {
        const barHeight = point.profile_view > 0 ? Math.max(2, Math.round((point.profile_view / max) * height)) : 0;
        return (
          <rect
            key={point.d}
            x={index * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={1}
            className="fill-primary/70"
          >
            <title>{`${formatDay(point.d)}: ${point.profile_view} görüntüleme`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

interface FirmValuePanelProps {
  firmId: string;
  slug: string | null;
  isPro: boolean;
}

/**
 * Firma panelinin değer kanıtı bloğu: profil görüntüleme ve iletişim tıklamaları.
 * RPC yoksa veya hata verirse (migration uygulanmadı) hiçbir şey çizmez.
 */
export default function FirmValuePanel({ firmId, slug, isPro }: FirmValuePanelProps) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>(30);
  const [stats, setStats] = useState<FirmEventStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchFirmEventStats(firmId, period).then((result) => {
      if (cancelled) return;
      setStats(result);
      setFailed(result === null);
    });
    return () => {
      cancelled = true;
    };
  }, [firmId, period]);

  if (failed || !stats) return null;

  const { current, previous } = stats;
  const empty = !hasAnyEvent(current);
  const contacts = contactClicks(current);
  const profileUrl = slug ? `${SITE_ORIGIN}/firma/${slug}` : null;
  const trackingSince = stats.tracking_since ? DATE_FORMAT.format(new Date(stats.tracking_since)) : null;

  const copyProfileUrl = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({ title: "Bağlantı kopyalandı" });
    } catch {
      toast({ title: "Bağlantı kopyalanamadı", description: profileUrl, variant: "destructive" });
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="firm-value-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="firm-value-heading" className="font-heading text-xl text-foreground">
          Profilinizin son {period} günü
        </h2>
        <div className="inline-flex rounded-lg border border-border p-1" role="group" aria-label="Dönem">
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`min-h-11 min-w-16 rounded-md px-3 text-sm font-medium transition-colors duration-150 ${
                period === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {value} gün
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Bu dönemde henüz kayıtlı ziyaret yok. İlk veriler, ziyaretçiler profilinizi açtıkça burada görünür.
          </p>
          {profileUrl && (
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <p className="text-sm font-medium text-foreground">Profilinizi paylaşın</p>
              <p className="break-all text-sm text-muted-foreground">{profileUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="min-h-11" onClick={copyProfileUrl}>
                  <Copy className="h-4 w-4" /> Kopyala
                </Button>
                <Button size="sm" variant="outline" className="min-h-11" asChild>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Peyzajbul profilimiz: ${profileUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Share2 className="h-4 w-4" /> WhatsApp’ta paylaş
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-foreground">
            Bu dönem ziyaretçiler iletişim düğmelerinize <strong className="font-semibold">{contacts}</strong> kez tıkladı.
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TILES.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="font-heading text-2xl text-foreground">{current[key]}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Önceki {period} güne göre: <span className="font-medium text-foreground">{deltaLabel(current[key], previous[key])}</span>
                </p>
              </div>
            ))}
          </div>

          <div>
            <Sparkline daily={stats.daily} />
            <p className="mt-1 text-xs text-muted-foreground">Günlük profil görüntüleme</p>
          </div>

          {!isPro && (
            <Button variant="accent" className="min-h-11" asChild>
              <Link href="/firma/premium">Pro ile profilinizi öne çıkarın</Link>
            </Button>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {trackingSince ? `Takip ${trackingSince} tarihinde başladı. ` : ""}
        Sayılar gösterge niteliğindedir; aynı kişi farklı günlerde tekrar sayılabilir.
      </p>
    </section>
  );
}
