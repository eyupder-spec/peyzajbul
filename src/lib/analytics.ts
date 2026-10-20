import { sendGAEvent } from "@next/third-parties/google";
import { hasAnalyticsConsent } from "./consent";
import type { LeadSource } from "./leadFormData";

/**
 * Single typed registry of product events. Two sinks:
 *  - GA4 (only after the visitor accepted analytics cookies; without consent the call is skipped)
 *  - first-party Supabase table `funnel_events` (anonymous session id, no cookies, no IP, no contact data)
 * track() never throws and is a no-op on the server, so it can be called from any handler.
 */

export interface AnalyticsEvents {
  lead_form_open: { source: LeadSource; service?: string; city?: string; has_target_firm: boolean; start_step: number };
  lead_step_view: { step: number; source: LeadSource };
  lead_step_complete: { step: number; source: LeadSource };
  lead_field_error: { step: number; field: string };
  lead_submit: {
    source: LeadSource;
    service: string;
    city: string;
    area_size: string;
    budget: string;
    timeline: string;
    has_photos: boolean;
    has_target_firm: boolean;
    city_firm_count?: number;
  };
  lead_otp_sent: { channel: string; resend: boolean };
  lead_otp_failed: { reason: string };
  /** The GA4 key event (conversion): a verified lead. */
  lead_verified: { source: LeadSource; service: string; city: string; seconds_since_submit: number };
  lead_form_abandon: { step: number; phase: string };
  lead_status_view: { stage: string };
  cta_click: { placement: string; label?: string };
  firm_phone_reveal: { firm_id: string; placement: string };
  firm_whatsapp_click: { firm_id: string; placement: string };
  estimator_start: Record<string, never>;
  estimator_complete: { service?: string; area_size?: string; city?: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

/** Only the lead_id may reach the first-party table, never GA4. */
export interface InternalParams {
  leadId?: string;
}

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  /** Host of the first external referrer, never a full URL. */
  referrer?: string;
  /** Path of the first page of the session, never the query string. */
  landing_path?: string;
  captured_at?: string;
}

const SESSION_KEY = "pz_sid";
const ATTRIBUTION_KEY = "pz_attr_v1";
const ONCE_PREFIX = "pz_once_";
const MAX_VALUE_LENGTH = 100;
/** Keys that can carry personal data are dropped whatever their value is. */
const SENSITIVE_KEY = /(phone|tel|mail|name|address|adres|note|token|code)/i;
const FIRST_PARTY_EVENT = /^(lead_|cta_click$|firm_|estimator_)/;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

type Primitive = string | number | boolean;

function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage is blocked (private window): the feature degrades, nothing breaks.
  }
}

/** Keeps short strings, numbers and booleans; drops everything else and every personal-data key. */
export function sanitize(params: Record<string, unknown> | undefined): Record<string, Primitive> {
  const clean: Record<string, Primitive> = {};
  if (!params) return clean;
  for (const [key, value] of Object.entries(params)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === "string") clean[key] = value.slice(0, MAX_VALUE_LENGTH);
    else if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === "boolean") clean[key] = value;
  }
  return clean;
}

// --- Identity: one random id per tab session, no persistent visitor id --------------------------

let memorySessionId: string | null = null;

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getSessionId(): string {
  const stored = readStorage(SESSION_KEY);
  if (stored) return stored;
  memorySessionId ??= randomId();
  writeStorage(SESSION_KEY, memorySessionId);
  return memorySessionId;
}

// --- Attribution: first touch within the session -----------------------------------------------

function clip(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim().slice(0, MAX_VALUE_LENGTH);
  return trimmed ? trimmed : undefined;
}

function externalReferrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const host = new URL(document.referrer).host;
    return host && host !== window.location.host ? host : undefined;
  } catch {
    return undefined;
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const raw = readStorage(ATTRIBUTION_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Attribution) : {};
  } catch {
    return {};
  }
}

/** Idempotent: the first call of a session stores the attribution, later calls return it unchanged. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  if (readStorage(ATTRIBUTION_KEY)) return getAttribution();

  const query = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    referrer: externalReferrerHost(),
    landing_path: window.location.pathname,
    captured_at: new Date().toISOString(),
  };
  for (const key of UTM_KEYS) attribution[key] = clip(query.get(key));
  attribution.gclid = clip(query.get("gclid"));

  const compact = Object.fromEntries(Object.entries(attribution).filter(([, value]) => value !== undefined));
  writeStorage(ATTRIBUTION_KEY, JSON.stringify(compact));
  return compact as Attribution;
}

/** Best guess of where a form was opened from, for call sites that do not pass `source`. */
export function inferSource(pathname: string): LeadSource {
  if (pathname === "/") return "hero";
  if (pathname.startsWith("/teklif-al")) return "teklif_al";
  if (pathname.startsWith("/firma/")) return "firm_profile";
  if (pathname.startsWith("/hizmet")) return "service_page";
  if (pathname.startsWith("/blog")) return "blog";
  if (pathname.startsWith("/projeler")) return "projects";
  if (pathname.startsWith("/maliyet-hesapla")) return "calculator";
  return "unknown";
}

// --- Sinks -------------------------------------------------------------------------------------

type FunnelInsert = (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;

/** Switched off for the rest of the session on the first failure (missing table, RLS, offline). */
let funnelSinkDisabled = false;

function sendToGoogleAnalytics(event: string, params: Record<string, Primitive>): void {
  try {
    if (!hasAnalyticsConsent()) return;
    sendGAEvent("event", event, params);
  } catch {
    // GA is not mounted or was blocked: harmless.
  }
}

async function sendToFunnelTable(event: string, params: Record<string, Primitive>, internal?: InternalParams): Promise<void> {
  if (funnelSinkDisabled || !FIRST_PARTY_EVENT.test(event)) return;
  try {
    const { supabase } = await import("./supabase/client");
    const attribution = getAttribution();
    const utm: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = attribution[key];
      if (value) utm[key] = value;
    }
    const table = (supabase as unknown as { from: (name: string) => { insert: FunnelInsert } }).from("funnel_events");
    const { error } = await table.insert({
      session_id: getSessionId(),
      event,
      path: window.location.pathname,
      props: internal?.leadId ? { ...params, lead_id: internal.leadId } : params,
      utm,
    });
    if (error) funnelSinkDisabled = true;
  } catch {
    funnelSinkDisabled = true;
  }
}

export function track<E extends AnalyticsEventName>(event: E, params?: AnalyticsEvents[E], internal?: InternalParams): void {
  if (typeof window === "undefined") return;
  try {
    const clean = sanitize(params);
    sendToGoogleAnalytics(event, clean);
    void sendToFunnelTable(event, clean, internal);
  } catch {
    // Analytics must never affect the page.
  }
}

/** Fires an event at most once per tab session for `key` (e.g. one conversion per lead, even after a refresh). */
export function trackOnce<E extends AnalyticsEventName>(
  key: string,
  event: E,
  params?: AnalyticsEvents[E],
  internal?: InternalParams,
): void {
  if (typeof window === "undefined") return;
  const storageKey = `${ONCE_PREFIX}${key}`;
  if (readStorage(storageKey)) return;
  writeStorage(storageKey, "1");
  track(event, params, internal);
}
