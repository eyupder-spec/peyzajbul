import { sendGAEvent } from "@next/third-parties/google";
import { readConsent } from "@/lib/consent";

type EventParams = Record<string, string | number | boolean>;

/**
 * Google Analytics olayi gonderir. Yalnizca analitik izni verildiyse calisir; hata firlatmaz.
 * Parametrelere kisisel veri (ad, telefon, e-posta, fotograf) KONMAZ.
 */
export function trackEvent(name: string, params: EventParams = {}): void {
  try {
    if (!readConsent()?.analytics) return;
    sendGAEvent("event", name, params);
  } catch {
    // Analitik hicbir zaman kullanici akisini bozmamali.
  }
}
