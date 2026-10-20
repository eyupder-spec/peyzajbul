import { supabase } from "@/lib/supabase/client";

/**
 * Browser side of the claim-firm Edge Function (supabase/functions/claim-firm/index.ts).
 * Every answer is {ok:true,...} or {ok:false,error,message,...}; a network failure becomes the same error shape,
 * so the screens only ever deal with one result type.
 */

export interface ClaimErrorBody {
  ok: false;
  error: string;
  /** Turkish text meant for the user. */
  message: string;
  retry_after?: number;
  attempts_left?: number;
  /** phone_exists: the listing that already carries this phone number. */
  firm_id?: string;
  fields?: string[];
}

export type ClaimResult<T extends object = object> = (T & { ok: true }) | ClaimErrorBody;

export interface SendOtpOk {
  expires_in: number;
  resend_after: number;
  target_hint?: string | null;
}

export interface CreditInfo {
  granted: boolean;
  amount: number;
  reason?: string;
}

export interface FirmEmailVerified {
  status: "approved";
  token_hash: string | null;
  email: string;
  credit: CreditInfo;
}

export interface WhatsAppPending {
  status: "pending";
  token_hash: string | null;
  whatsapp_code: string;
  wa_url: string | null;
}

export interface RegisterPending {
  status: "pending";
  token_hash: string | null;
}

export type FirmStatus = "approved" | "pending" | "none";

export interface LoginVerified {
  firm_status: FirmStatus;
  token_hash?: string | null;
}

const NETWORK_ERROR: ClaimErrorBody = {
  ok: false,
  error: "network",
  message: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
};

function isClaimErrorBody(value: unknown): value is ClaimErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { error?: unknown }).error === "string" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

/** supabase-js hands a failed call over as an error whose `context` is the Response; the body holds the Turkish message. */
async function readErrorBody(error: unknown): Promise<ClaimErrorBody | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof (context as { json?: unknown }).json !== "function") return null;
  try {
    const body: unknown = await (context as { json: () => Promise<unknown> }).json();
    return isClaimErrorBody(body) ? body : null;
  } catch {
    return null;
  }
}

export async function callClaimFirm<T extends object = object>(body: Record<string, unknown>): Promise<ClaimResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke("claim-firm", { body });
    if (error) return (await readErrorBody(error)) ?? NETWORK_ERROR;
    if (data && typeof data === "object" && (data as { ok?: unknown }).ok === true) return data as ClaimResult<T>;
    return isClaimErrorBody(data) ? data : NETWORK_ERROR;
  } catch {
    return NETWORK_ERROR;
  }
}

export function isClaimError<T extends object>(result: ClaimResult<T>): result is ClaimErrorBody {
  return result.ok === false;
}

/** Turns the token_hash of a verified code into a browser session. Returns false when no session could be started. */
export async function startSession(tokenHash: string | null | undefined): Promise<boolean> {
  if (!tokenHash) return false;
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  return !error;
}
