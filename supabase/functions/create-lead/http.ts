import { corsHeaders } from "./cors.ts";
import { readEnv, type EnvReader } from "./env.ts";

// Error contract shared by create-lead, send-otp, verify-otp and dispatch-lead-notifications:
//   { ok: false, code, message (Turkish), fieldErrors?, retryAfterSeconds? }
// 500 responses never carry err.message or a stack; logs carry the function name, the code and a
// lead id only, never an email address or phone number.

export const MAX_BODY_BYTES = 32 * 1024;

export const ERRORS = {
  BAD_REQUEST: { status: 400, message: "Geçersiz istek." },
  VALIDATION_FAILED: { status: 422, message: "Formda eksik veya hatalı alanlar var." },
  CAPTCHA_FAILED: {
    status: 403,
    message: "Güvenlik doğrulaması başarısız. Lütfen sayfayı yenileyip tekrar deneyin.",
  },
  UNAUTHORIZED: { status: 401, message: "Yetkisiz istek." },
  INVALID_CODE: { status: 400, message: "Kod geçersiz. Yeni kod isteyin." },
  CODE_EXPIRED: { status: 410, message: "Kodun süresi doldu. Yeni kod isteyin." },
  LOCKED: { status: 429, message: "Çok fazla hatalı deneme. Yeni kod isteyin." },
  NOT_FOUND: { status: 404, message: "Talep bulunamadı." },
  METHOD_NOT_ALLOWED: { status: 405, message: "Bu istek türüne izin verilmiyor." },
  ALREADY_VERIFIED: { status: 409, message: "Bu talep için doğrulama artık gerekmiyor." },
  PAYLOAD_TOO_LARGE: { status: 413, message: "İstek çok büyük." },
  RATE_LIMITED: {
    status: 429,
    message: "Çok fazla deneme yaptınız. Lütfen biraz sonra tekrar deneyin.",
  },
  EMAIL_SEND_FAILED: {
    status: 502,
    message:
      'Talebiniz kaydedildi ancak doğrulama kodu gönderilemedi. Birkaç dakika sonra "Kodu tekrar gönder"i deneyin.',
  },
  INTERNAL: { status: 500, message: "Beklenmeyen bir hata oluştu." },
} as const;

export type KnownErrorCode = keyof typeof ERRORS;

export interface ErrorExtras {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  retryAfterSeconds?: number;
  status?: number;
  [key: string]: unknown;
}

export function jsonResponse(
  req: Request,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
  env: EnvReader = readEnv,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

/** Error response in the shared contract. `extras.message` / `extras.status` override the defaults. */
export function errorResponse(
  req: Request,
  code: string,
  extras: ErrorExtras = {},
  env: EnvReader = readEnv,
): Response {
  const known = ERRORS[code as KnownErrorCode];
  const { message, status, ...rest } = extras;
  const resolvedStatus = status ?? known?.status ?? 500;
  const headers: Record<string, string> = {};
  if (typeof extras.retryAfterSeconds === "number") {
    headers["Retry-After"] = String(Math.max(1, Math.ceil(extras.retryAfterSeconds)));
  }
  return jsonResponse(
    req,
    resolvedStatus,
    { ok: false, code, message: message ?? known?.message ?? ERRORS.INTERNAL.message, ...rest },
    headers,
    env,
  );
}

export type BodyResult =
  | { ok: true; body: unknown }
  | { ok: false; code: "PAYLOAD_TOO_LARGE" | "BAD_REQUEST" };

/** Reads a JSON body of at most MAX_BODY_BYTES. */
export async function readJsonBody(req: Request, maxBytes = MAX_BODY_BYTES): Promise<BodyResult> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, code: "PAYLOAD_TOO_LARGE" };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, code: "BAD_REQUEST" };
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, code: "PAYLOAD_TOO_LARGE" };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, code: "BAD_REQUEST" };
  }
}

/** Structured log line: function, code and an optional lead id. Never personal data. */
export function logEvent(fn: string, code: string, leadId?: string): void {
  console.log(JSON.stringify({ fn, code, ...(leadId ? { leadId } : {}) }));
}
