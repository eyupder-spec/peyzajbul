"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  CONSENT_OPEN_EVENT_ALIAS,
  COOKIE_POLICY_PATH,
  GA_MEASUREMENT_ID,
  HAS_COOKIE_POLICY_PAGE,
  PRIVACY_POLICY_PATH,
  readConsent,
  writeConsent,
} from "@/lib/consent";

type ConsentStatus = "unset" | "granted" | "denied";

function subscribeToConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
}

function getConsentStatus(): ConsentStatus {
  const consent = readConsent();
  if (consent === null) return "unset";
  return consent.analytics ? "granted" : "denied";
}

function getServerConsentStatus(): ConsentStatus {
  return "unset";
}

// Sunucu HTML'inde ve hidrasyon sırasında false, yalnızca istemcide true: banner SSR'a hiç girmez.
const subscribeNever = () => () => {};
const getMounted = () => true;
const getServerMounted = () => false;

/** Footer gibi server component'lerden çerez tercihlerini yeniden açar. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      Çerez Tercihleri
    </button>
  );
}

export default function ConsentBanner() {
  const status = useSyncExternalStore(subscribeToConsent, getConsentStatus, getServerConsentStatus);
  const mounted = useSyncExternalStore(subscribeNever, getMounted, getServerMounted);
  const [reopened, setReopened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setAnalyticsChoice(readConsent()?.analytics === true);
      setShowSettings(true);
      setReopened(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, handleOpen);
    window.addEventListener(CONSENT_OPEN_EVENT_ALIAS, handleOpen);
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, handleOpen);
      window.removeEventListener(CONSENT_OPEN_EVENT_ALIAS, handleOpen);
    };
  }, []);

  const choose = (analytics: boolean) => {
    writeConsent(analytics);
    setReopened(false);
    setShowSettings(false);
  };

  const visible = mounted && (status === "unset" || reopened);

  return (
    <>
      {status === "granted" && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      {visible && (
        <div
          role="region"
          aria-label="Çerez tercihleri"
          className="fixed inset-x-0 bottom-0 z-[60] rounded-t-xl border border-b-0 bg-card p-5 pb-[max(16px,env(safe-area-inset-bottom))] shadow-lift md:inset-x-auto md:left-0 md:m-4 md:w-full md:max-w-md md:rounded-xl md:border-b md:pb-5"
        >
          <p className="font-display text-lg font-semibold text-foreground">Çerez tercihleriniz</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Peyzajbul, sitenin çalışması için zorunlu çerezleri kullanır. Ziyaretçi istatistiklerini anlamak için Google
            Analytics çerezlerini yalnızca onay verirseniz yükleriz.
          </p>
          <p className="mt-2 text-sm">
            {HAS_COOKIE_POLICY_PAGE && (
              <>
                <Link href={COOKIE_POLICY_PATH} className="font-medium text-primary underline underline-offset-4">
                  Çerez Politikası
                </Link>
                <span aria-hidden="true" className="mx-2 text-muted-foreground">
                  ·
                </span>
              </>
            )}
            <Link href={PRIVACY_POLICY_PATH} className="font-medium text-primary underline underline-offset-4">
              Gizlilik Politikası
            </Link>
          </p>

          {showSettings && (
            <div id="consent-settings" className="mt-4 space-y-3 rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="consent-necessary" className="text-sm">
                  <span className="block font-medium text-foreground">Zorunlu çerezler</span>
                  <span className="block text-muted-foreground">Sitenin çalışması için gerekir, kapatılamaz.</span>
                </label>
                <Switch id="consent-necessary" checked disabled />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="consent-analytics" className="text-sm">
                  <span className="block font-medium text-foreground">Analitik çerezler (Google Analytics)</span>
                  <span className="block text-muted-foreground">Ziyaretçi istatistikleri için. Varsayılan olarak kapalı.</span>
                </label>
                <Switch id="consent-analytics" checked={analyticsChoice} onCheckedChange={setAnalyticsChoice} />
              </div>
              <Button className="w-full" onClick={() => choose(analyticsChoice)}>
                Seçimimi kaydet
              </Button>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button className="flex-1" onClick={() => choose(false)}>
              Reddet
            </Button>
            <Button className="flex-1" onClick={() => choose(true)}>
              Kabul et
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            aria-expanded={showSettings}
            aria-controls="consent-settings"
            onClick={() => setShowSettings((open) => !open)}
          >
            Ayarlar
          </button>
        </div>
      )}
    </>
  );
}
