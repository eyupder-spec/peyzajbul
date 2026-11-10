import { supabase } from "@/lib/supabase/client";
import type { LeadFormData } from "@/lib/leadFormData";
import { preparePhoto } from "./photos";
import {
  LeadApiError,
  mapLeadStatus,
  parseCreateLeadResponse,
  parseResendResponse,
  parseVerifyResponse,
  readFunctionError,
  recoverStoredLead,
  buildCreateLeadBody,
  verifyDestination,
  type CreateLeadContext,
  type CreateLeadResult,
  type SignedUpload,
  type VerifyResult,
} from "./leadApiCore";
import type { LeadStatusDTO } from "./leadStatus";
import { legacyPhotosDeferred, isBackendMissing, isLegacyLeadId, legacyCreateLead, legacyResendOtp, legacyVerifyOtp } from "./legacyBackend";

export { LeadApiError, buildCreateLeadBody } from "./leadApiCore";
export type { CreateLeadContext, CreateLeadResult, LeadVerification, SignedUpload, VerifyResult } from "./leadApiCore";

/**
 * The only module of the lead form that talks to Supabase for leads. The browser never writes to `leads`:
 * the create-lead edge function validates, stores and sends the first code; the status page reads through an RPC.
 */

const PHOTO_BUCKET = "lead-photos";

type RpcResponse = { data: unknown; error: { message: string; code?: string } | null };
// The generated database types do not know the new RPCs yet; one local cast keeps `any` out of the components.
const callRpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<RpcResponse>;

async function invoke(name: string, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw await readFunctionError(error);
  return data;
}

export async function createLead(data: LeadFormData, ctx: CreateLeadContext): Promise<CreateLeadResult> {
  const destinationMasked = verifyDestination(data);
  try {
    const { data: response, error: invokeError } = await supabase.functions.invoke("create-lead", { body: buildCreateLeadBody(data, ctx) });
    if (invokeError) {
      // Yeni arka uç (create-lead) henüz yayında değilse eski çalışan akışa düş.
      if (isBackendMissing(invokeError)) return await legacyCreateLead(data, ctx, destinationMasked);
      throw await readFunctionError(invokeError);
    }
    return parseCreateLeadResponse(response, destinationMasked);
  } catch (error) {
    if (error instanceof LeadApiError) {
      // Stored but the first code was not delivered: continue to the code screen, where "resend" works.
      const stored = recoverStoredLead(error, destinationMasked);
      if (stored) return stored;
      throw error;
    }
    throw new LeadApiError("unknown", "Beklenmeyen bir hata oluştu.");
  }
}

export async function resendOtp(args: { leadId: string }): Promise<{ resendAfterSec: number }> {
  if (isLegacyLeadId(args.leadId)) return legacyResendOtp(args.leadId);
  return parseResendResponse(await invoke("send-otp", { leadId: args.leadId }));
}

export async function verifyOtp(args: { leadId: string; code: string }): Promise<VerifyResult> {
  if (isLegacyLeadId(args.leadId)) return legacyVerifyOtp(args.leadId, args.code);
  const response = await invoke("verify-otp", { leadId: args.leadId, code: args.code });
  return parseVerifyResponse(response);
}

/** Signs the homeowner in with the session verify-otp minted. A failure is harmless: the lead is verified regardless. */
export async function applyLeadSession(session: NonNullable<VerifyResult["session"]>): Promise<void> {
  try {
    await supabase.auth.setSession(session);
  } catch {
    // No session: the status page works through the token.
  }
}

/**
 * Uploads photos to the signed URLs create-lead issued (one per announced photo, in order), after re-encoding
 * them without metadata. Returns how many uploads failed; never throws, because photos are optional.
 */
export async function uploadLeadPhotos(files: File[], uploads: SignedUpload[]): Promise<number> {
  // Yedek akışta fotoğraflar doğrulama sırasında yüklenir (imzalı adres yok).
  if (uploads.length === 0 && files.length > 0 && legacyPhotosDeferred()) return 0;
  const results = await Promise.allSettled(
    files.map(async (file, index) => {
      const target = uploads[index];
      if (!target) throw new Error("upload_url_missing");
      const blob = await preparePhoto(file);
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .uploadToSignedUrl(target.path, target.token, blob, { contentType: "image/jpeg" });
      if (error) throw error;
    }),
  );
  return results.filter((result) => result.status === "rejected").length;
}

/** Status of a lead for its owner. `not_found` means a wrong token; `unknown` means the backend is unavailable. */
export async function getLeadStatus(leadId: string, token: string): Promise<LeadStatusDTO> {
  let response: RpcResponse;
  try {
    response = await callRpc("get_lead_status", { p_token: token });
  } catch {
    throw new LeadApiError("network", "Bağlantı hatası.");
  }
  if (response.error) throw new LeadApiError("unknown", "Durum bilgisi alınamadı.");
  if (response.data === null || response.data === undefined) throw new LeadApiError("not_found", "Talep bulunamadı.");
  const dto = mapLeadStatus(leadId, response.data);
  if (!dto) throw new LeadApiError("unknown", "Durum bilgisi alınamadı.");
  return dto;
}
