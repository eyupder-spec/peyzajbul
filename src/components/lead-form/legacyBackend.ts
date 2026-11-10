import { supabase } from "@/lib/supabase/client";
import { SERVICE_TYPE_TO_LABEL, type LeadFormData } from "@/lib/leadFormData";
import { LeadApiError, type CreateLeadContext, type CreateLeadResult, type VerifyResult } from "./leadApiCore";

/**
 * Yedek yol: yeni `create-lead` edge function'ı henüz yayında değilken teklif formunun çalışmaya devam etmesi için
 * eski (canlıda çalışan) send-otp / verify-otp / leads tablosu akışını kullanır. Yeni arka uç yayınlanınca
 * `create-lead` yanıt verdiği için bu dosyaya hiç girilmez; yayından sonra silinebilir.
 */

export const LEGACY_ID_PREFIX = "legacy-";
export const isLegacyLeadId = (id: string): boolean => id.startsWith(LEGACY_ID_PREFIX);

interface Draft {
  data: LeadFormData;
  ctx: CreateLeadContext;
}
const drafts = new Map<string, Draft>();

/** Bekleyen yedek-akış talebi var mı? (fotoğraflar doğrulamada yüklenir) */
export const legacyPhotosDeferred = (): boolean => drafts.size > 0;

/** create-lead yok mu? (404 ya da CORS'suz 404 yüzünden ağ hatası) */
export function isBackendMissing(error: unknown): boolean {
  const e = error as { name?: string; context?: { status?: number } } | null;
  return e?.name === "FunctionsFetchError" || e?.context?.status === 404;
}

async function sendLegacyOtp(email: string): Promise<void> {
  const { data: res, error } = await supabase.functions.invoke("send-otp", { body: { email } });
  if (error) throw new LeadApiError("delivery_failed", "Kod gönderilemedi.");
  // Eski fonksiyonun geliştirme modunda döndürdüğü debugCode bilinçli olarak kullanılmaz (kod yalnızca e-postayla gelir).
  if (res?.error && !res?.debugCode) throw new LeadApiError("delivery_failed", String(res.error));
}

export async function legacyCreateLead(data: LeadFormData, ctx: CreateLeadContext, destinationMasked: string): Promise<CreateLeadResult> {
  await sendLegacyOtp(data.email);
  const leadId = `${LEGACY_ID_PREFIX}${crypto.randomUUID()}`;
  drafts.set(leadId, { data, ctx });
  return {
    deduped: false,
    leadId,
    statusToken: null,
    verification: { channel: "email", destinationMasked, resendAfterSec: 60, sent: true },
    uploads: [],
  };
}

export async function legacyResendOtp(leadId: string): Promise<{ resendAfterSec: number }> {
  const draft = drafts.get(leadId);
  if (!draft) throw new LeadApiError("not_found", "Talep bulunamadı, lütfen formu yeniden doldurun.");
  await sendLegacyOtp(draft.data.email);
  return { resendAfterSec: 60 };
}

async function readErrorMessage(error: unknown): Promise<string> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    if (ctx && typeof ctx.json === "function") return (await ctx.json())?.error ?? "";
  } catch {
    // gövde okunamadı
  }
  return "";
}

const isBadCode = (message: string) => message.includes("Geçersiz") || message.includes("süresi dolmuş");

export async function legacyVerifyOtp(leadId: string, code: string): Promise<VerifyResult> {
  const draft = drafts.get(leadId);
  if (!draft) throw new LeadApiError("not_found", "Talep bulunamadı, lütfen formu yeniden doldurun.");
  const { data, ctx } = draft;

  const { data: res, error } = await supabase.functions.invoke("verify-otp", {
    body: { email: data.email, code, fullName: data.fullName, phone: data.phone, leadId: null },
  });
  if (error) {
    const message = await readErrorMessage(error);
    if (isBadCode(message) || String(error.message).includes("non-2xx")) throw new LeadApiError("invalid_code", "Kod geçersiz veya süresi dolmuş.");
    throw new LeadApiError("unknown", message || "Doğrulama sırasında bir hata oluştu.");
  }
  if (res?.error) {
    if (isBadCode(String(res.error))) throw new LeadApiError("invalid_code", "Kod geçersiz veya süresi dolmuş.");
    throw new LeadApiError("unknown", String(res.error));
  }

  const userId: string = res.userId;
  if (res.session) {
    await supabase.auth.setSession({ access_token: res.session.access_token, refresh_token: res.session.refresh_token });
  }

  const photoUrls: string[] = [];
  for (const file of data.photos) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("lead-photos").upload(path, file);
    if (!uploadError) photoUrls.push(supabase.storage.from("lead-photos").getPublicUrl(path).data.publicUrl);
  }

  const { error: leadError } = await supabase.from("leads").insert({
    project_type: data.projectType || null,
    service_type: SERVICE_TYPE_TO_LABEL[data.serviceType] ?? data.serviceType,
    project_size: data.areaSize || null,
    area_size: data.areaSize || null,
    scope: data.scope.length > 0 ? data.scope : null,
    irrigation_type: data.irrigationType || null,
    irrigation_system: data.irrigationSystem || null,
    water_source: data.waterSource || null,
    property_type: data.propertyType || null,
    current_condition: data.currentCondition || null,
    budget: data.budget,
    timeline: data.timeline,
    city: data.city,
    district: data.district || null,
    address: data.address || null,
    notes: data.notes || null,
    photo_urls: photoUrls.length > 0 ? photoUrls : null,
    full_name: data.fullName,
    phone: data.phone,
    email: data.email,
    user_id: userId,
    status: "active",
    target_firm_id: ctx.targetFirmId || null,
  } as never);
  if (leadError) throw new LeadApiError("unknown", "Talebiniz kaydedilemedi. Lütfen tekrar deneyin.");

  try {
    await supabase.functions.invoke("send-lead-confirmation", {
      body: {
        email: data.email,
        fullName: data.fullName,
        serviceType: data.serviceType,
        projectType: data.projectType,
        city: data.city,
        district: data.district || null,
        propertyType: data.propertyType,
        areaSize: data.areaSize,
        currentCondition: data.currentCondition,
        budget: data.budget,
        timeline: data.timeline,
        scope: data.scope,
        notes: data.notes || null,
        address: data.address || null,
      },
    });
  } catch {
    // Onay e-postası gitmese de talep kaydedildi.
  }

  drafts.delete(leadId);
  return { statusToken: null, session: res.session ?? null, routing: null };
}
