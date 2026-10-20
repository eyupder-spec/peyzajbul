"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeadFormInitial } from "@/lib/leadFormData";
import { supportWhatsAppUrl } from "@/lib/publicStats";
import { cn } from "@/lib/utils";

const LeadFormModal = dynamic(() => import("@/components/lead-form/LeadFormModal"), { ssr: false });

const DEFAULT_WHATSAPP_TEXT = "Merhaba, bahçem için peyzaj teklifi almak istiyorum.";
const ADMIN_SECRET_PATH = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || "/admin-dash";

/** Çubuğun gösterilmediği yollar: her biri yolun kendisiyle ve alt yollarıyla eşleşir. */
const HIDDEN_PREFIXES = [
  "/admin",
  ADMIN_SECRET_PATH,
  "/firma/panel",
  "/firma/profil",
  "/firma/leadler",
  "/firma/jeton",
  "/firma/premium",
  "/firma/galeri",
  "/firma/projeler",
  "/firma/urunler",
  "/firma/reklam",
  "/firma/landing",
  "/maliyet-hesapla",
  "/firma/giris",
  "/teklif-al",
  "/talep",
  "/talebiniz-alindi",
  "/hesabim",
  "/hesap-silme",
  "/isletme-ekle",
  "/firma-sahiplen",
  "/fiyatlandirma",
  "/s",
  "/cerez-politikasi",
];

const KEYBOARDLESS_INPUT_TYPES = new Set(["checkbox", "radio", "button", "submit", "reset", "image", "range", "color", "file"]);

export interface StickyCtaOverride {
  firmId: string;
  firmName: string;
  /**
   * false: the firm cannot receive the request (unclaimed profile). Ara/WhatsApp stay the firm's, but the form
   * opens as a generic request (no target firm) and the main button keeps the generic "Ücretsiz Teklif Al" label.
   * Default true.
   */
  targetsFirm?: boolean;
  /** Pre-filled form choices, e.g. the firm's city on a profile whose requests go to the regional pool. */
  initial?: LeadFormInitial;
  phoneHref?: string;
  whatsappHref?: string;
  onCallClick?: () => void;
  onWhatsappClick?: () => void;
}

let currentOverride: StickyCtaOverride | null = null;
const overrideListeners = new Set<() => void>();

function setOverride(next: StickyCtaOverride | null) {
  currentOverride = next;
  overrideListeners.forEach((listener) => listener());
}

function subscribeOverride(listener: () => void) {
  overrideListeners.add(listener);
  return () => {
    overrideListeners.delete(listener);
  };
}

const getOverride = () => currentOverride;
const getServerOverride = (): StickyCtaOverride | null => null;

/**
 * Firma sayfaları çubuğu firmaya özel hale getirir: Ara, WhatsApp ve teklif düğmesi. Sahiplenilmiş firmada talep o
 * firmaya bağlanır; `targetsFirm: false` ile talep genel kalır ve düğme "Ücretsiz Teklif Al" yazar.
 * `null` verilirse genel çubuk kalır. Tıklama geri çağrıları telefon/WhatsApp açma olaylarını kaydetmek içindir.
 */
export function useStickyCtaOverride(cfg: StickyCtaOverride | null) {
  const latest = useRef(cfg);
  useEffect(() => {
    latest.current = cfg;
  });

  const firmId = cfg?.firmId;
  const firmName = cfg?.firmName;
  const targetsFirm = cfg?.targetsFirm;
  const phoneHref = cfg?.phoneHref;
  const whatsappHref = cfg?.whatsappHref;
  // Nesne kimliği her render'da değişebilir; bağımlılık olarak içeriği alınır.
  const initialKey = cfg?.initial ? JSON.stringify(cfg.initial) : "";

  useEffect(() => {
    if (!firmId || !firmName) return;
    setOverride({
      firmId,
      firmName,
      targetsFirm,
      initial: initialKey ? (JSON.parse(initialKey) as LeadFormInitial) : undefined,
      phoneHref,
      whatsappHref,
      onCallClick: () => latest.current?.onCallClick?.(),
      onWhatsappClick: () => latest.current?.onWhatsappClick?.(),
    });
    return () => setOverride(null);
  }, [firmId, firmName, targetsFirm, initialKey, phoneHref, whatsappHref]);
}

function isHiddenRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function opensSoftKeyboard(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) return !KEYBOARDLESS_INPUT_TYPES.has(target.type);
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLElement && target.isContentEditable;
}

const StickyCtaBar = () => {
  const pathname = usePathname();
  const override = useSyncExternalStore(subscribeOverride, getOverride, getServerOverride);
  const [pastHero, setPastHero] = useState(false);
  // Yol bilgisiyle tutulur: odaklı alan sayfa geçişinde odak olayı olmadan DOM'dan kalkarsa takılı kalmaz.
  const [typingPath, setTypingPath] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hiddenRoute = isHiddenRoute(pathname);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      setPastHero(false);
    };
  }, [hiddenRoute]);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => setTypingPath(opensSoftKeyboard(event.target) ? pathname : null);
    const handleFocusOut = () => setTypingPath(null);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [pathname]);

  if (hiddenRoute) return null;

  const typing = typingPath !== null && typingPath === pathname;
  const visible = pastHero && !typing;
  const iconLinkClass = "h-12 w-12 flex-none px-0 [&_svg]:size-6";
  // Sahiplenilmemiş firma talebi alamaz: düğme genel kalır, talep firmaya bağlanmaz.
  const targetsFirm = override !== null && override.targetsFirm !== false;

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-[480px] h-px w-px md:hidden"
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur transition-[transform,visibility] duration-200 ease-out md:hidden",
          visible ? "translate-y-0 visible" : "invisible translate-y-full",
        )}
      >
        <div className="flex h-12 items-center gap-3">
          {override ? (
            <>
              {override.phoneHref && (
                <Button asChild variant="outline" className="h-12 flex-none px-4 text-base">
                  <a href={override.phoneHref} onClick={override.onCallClick}>
                    <Phone />
                    Ara
                  </a>
                </Button>
              )}
              {override.whatsappHref && (
                <Button asChild variant="outline" className={iconLinkClass}>
                  <a
                    href={override.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp ile yaz"
                    onClick={override.onWhatsappClick}
                  >
                    <MessageCircle />
                  </a>
                </Button>
              )}
              <Button variant="accent" className="h-12 flex-1 text-base" onClick={() => setFormOpen(true)}>
                {targetsFirm ? "Teklif iste" : "Ücretsiz Teklif Al"}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" className={iconLinkClass}>
                <a
                  href={supportWhatsAppUrl(DEFAULT_WHATSAPP_TEXT)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp ile yaz"
                >
                  <MessageCircle />
                </a>
              </Button>
              <Button variant="accent" className="h-12 flex-1 text-base" onClick={() => setFormOpen(true)}>
                Ücretsiz Teklif Al
              </Button>
            </>
          )}
        </div>
      </div>
      {formOpen && (
        <LeadFormModal
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setTypingPath(null);
          }}
          source="sticky_cta"
          targetFirmId={targetsFirm ? override?.firmId : undefined}
          targetFirmName={targetsFirm ? override?.firmName : undefined}
          initial={override?.initial}
        />
      )}
    </>
  );
};

export default StickyCtaBar;
