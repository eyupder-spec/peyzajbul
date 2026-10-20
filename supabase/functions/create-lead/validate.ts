import { z } from "zod";
import { parseEstimateToken } from "./estimate.ts";
import {
  AREA_SIZES,
  BUDGETS,
  CURRENT_CONDITIONS,
  IRRIGATION_SYSTEMS,
  IRRIGATION_TYPES,
  LEAD_SOURCES,
  MAX_PHOTOS,
  PHOTO_EXTENSIONS,
  PROJECT_TYPES,
  PROPERTY_TYPES,
  SCOPE_VALUES,
  SERVICE_SLUGS,
  TIMELINES,
  TURKISH_CITIES,
  WATER_SOURCES,
  type LeadSource,
  type ServiceSlug,
} from "./labels.ts";
import { normalizeTrMobile } from "./phone.ts";

// Request validation for create-lead. Pure module: no Deno globals.
//
// Request contract (JSON body), field names follow src/lib/leadFormData.ts:
//   projectType, serviceSlug (alias: serviceType), scope[], irrigationType, irrigationSystem,
//   waterSource, city, district, address, propertyType, areaSize, currentCondition, budget,
//   timeline, notes, fullName, phone, email, kvkkAccepted (must be true), consentVersion,
//   photoExts[] (jpg|jpeg|png|webp, at most 5; photoCount is optional and must match),
//   targetFirmId, kaynak (where the form was opened from, one of LEAD_SOURCES), est (token of a saved calculator
//   estimate, exactly 16 letters or digits), attribution{landingPath, referrer, utmSource, utmMedium,
//   utmCampaign, utmTerm, utmContent, gclid, firstTouchAt, sessionId}, turnstileToken, elapsedMs,
//   website (honeypot).
// kaynak and est never fail a request: a value that is not on the allow-list or not exactly a token is
// dropped, because a bad link parameter must not cost the visitor the lead.
// Unknown keys (admin_approved, token_price, price_jeton, assigned_firms, status, lead_score,
// user_id, ...) are not part of the schema and are dropped by the parser.

const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "tempmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
] as const;

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

// deno-lint-ignore no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const HTML_TAGS = /<[^>]*>/g;

/** Strips control characters and HTML; keeps line breaks only when `multiline` is set. */
export function sanitizeText(value: string, multiline = false): string {
  let text = value.normalize("NFC").replace(CONTROL_CHARS, "").replace(HTML_TAGS, "").replace(/[<>]/g, "");
  if (multiline) {
    text = text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }
  return text.trim();
}

const REQUIRED = "Bu alan zorunludur.";
const INVALID = "Geçersiz değer.";
const INVALID_CHOICE = "Geçersiz seçim.";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

function requiredEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values, {
    errorMap: (issue) => ({ message: issue.code === "invalid_type" ? REQUIRED : INVALID_CHOICE }),
  });
}

function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(emptyToUndefined, requiredEnum(values).optional());
}

/** Optional single-line text: sanitised, empty becomes undefined, length limited after sanitising. */
function optionalLine(max: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const text = sanitizeText(value);
      return text === "" ? undefined : text;
    },
    z.string().max(max, `En fazla ${max} karakter olabilir.`).optional(),
  );
}

function optionalMultiline(max: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const text = sanitizeText(value, true);
      return text === "" ? undefined : text;
    },
    z.string().max(max, `En fazla ${max} karakter olabilir.`).optional(),
  );
}

/** Attribution strings are trimmed and cut to 200 characters (never rejected). */
const attributionText = z.preprocess(
  (value) => (typeof value === "string" ? sanitizeText(value).slice(0, 200) : undefined),
  z.string().optional(),
);

const attributionSchema = z.preprocess(
  (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}),
  z.object({
    landingPath: attributionText,
    referrer: attributionText,
    utmSource: attributionText,
    utmMedium: attributionText,
    utmCampaign: attributionText,
    utmTerm: attributionText,
    utmContent: attributionText,
    gclid: attributionText,
    firstTouchAt: attributionText,
    sessionId: attributionText,
  }),
);

const fullNameSchema = z
  .string({ required_error: REQUIRED, invalid_type_error: INVALID })
  .transform((value) => sanitizeText(value))
  .pipe(
    z
      .string()
      .min(3, "Ad soyad en az 3 karakter olmalı.")
      .max(80, "Ad soyad en fazla 80 karakter olabilir.")
      .refine((value) => /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u.test(value), "Ad soyad yalnızca harf içermelidir.")
      .refine(
        (value) => value.split(" ").filter((part) => /\p{L}/u.test(part)).length >= 2,
        "Lütfen ad ve soyadınızı girin.",
      ),
  );

const emailSchema = z
  .string({ required_error: REQUIRED, invalid_type_error: INVALID })
  .trim()
  .toLowerCase()
  .max(254, "E-posta adresi çok uzun.")
  .email("Geçerli bir e-posta adresi girin.")
  .refine((value) => !isDisposableEmail(value), "Geçici e-posta adresleri kabul edilmiyor.");

const phoneSchema = z
  .string({ required_error: REQUIRED, invalid_type_error: INVALID })
  .max(30, "Geçerli bir cep telefonu girin.")
  .transform((raw, ctx) => {
    const normalized = normalizeTrMobile(raw);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Geçerli bir cep telefonu girin (05XX XXX XX XX)." });
      return z.NEVER;
    }
    return normalized;
  });

const leadInputSchema = z.preprocess(
  (raw) => {
    // The lead form calls its service slug "serviceType"; accept both spellings.
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const body = raw as Record<string, unknown>;
      if (body.serviceSlug === undefined && body.serviceType !== undefined) {
        return { ...body, serviceSlug: body.serviceType };
      }
    }
    return raw;
  },
  z
    .object({
      projectType: requiredEnum(PROJECT_TYPES),
      serviceSlug: requiredEnum(SERVICE_SLUGS),
      scope: z.preprocess(
        (value) => (value === undefined || value === null ? [] : value),
        z.array(z.string().max(60), { invalid_type_error: INVALID }).max(12, INVALID),
      ),
      irrigationType: optionalEnum(IRRIGATION_TYPES),
      irrigationSystem: optionalEnum(IRRIGATION_SYSTEMS),
      waterSource: optionalEnum(WATER_SOURCES),
      city: requiredEnum(TURKISH_CITIES),
      district: optionalLine(80),
      address: optionalLine(200),
      propertyType: optionalEnum(PROPERTY_TYPES),
      areaSize: requiredEnum(AREA_SIZES),
      currentCondition: optionalEnum(CURRENT_CONDITIONS),
      budget: requiredEnum(BUDGETS),
      timeline: requiredEnum(TIMELINES),
      notes: optionalMultiline(1000),
      fullName: fullNameSchema,
      phone: phoneSchema,
      email: emailSchema,
      kvkkAccepted: z.literal(true, {
        errorMap: () => ({ message: "KVKK aydınlatma metnini onaylamanız gerekir." }),
      }),
      consentVersion: optionalLine(20),
      photoCount: z.preprocess(emptyToUndefined, z.number().int().min(0).max(MAX_PHOTOS).optional()),
      photoExts: z.preprocess(
        emptyToUndefined,
        z.array(z.enum(PHOTO_EXTENSIONS, { errorMap: () => ({ message: INVALID_CHOICE }) })).max(MAX_PHOTOS).optional(),
      ),
      targetFirmId: z.preprocess(emptyToUndefined, z.string().uuid(INVALID).optional()),
      kaynak: z.preprocess(
        (value) => (typeof value === "string" && (LEAD_SOURCES as readonly string[]).includes(value) ? value : undefined),
        z.enum(LEAD_SOURCES).optional(),
      ),
      est: z.preprocess((value) => parseEstimateToken(value), z.string().optional()),
      attribution: attributionSchema,
      turnstileToken: z.preprocess(
        (value) => (typeof value === "string" ? value : undefined),
        z.string().max(2048).optional(),
      ),
      website: z.preprocess((value) => (typeof value === "string" ? value : undefined), z.string().max(500).optional()),
      elapsedMs: z.preprocess(
        (value) => (typeof value === "number" && Number.isFinite(value) ? value : undefined),
        z.number().optional(),
      ),
    })
    .superRefine((input, ctx) => {
      const allowedScope = SCOPE_VALUES[input.serviceSlug as ServiceSlug] ?? [];
      const unknownScope = input.scope.some((value) => !allowedScope.includes(value));
      if (unknownScope) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scope"], message: INVALID_CHOICE });
      }
      if (input.photoExts !== undefined && input.photoCount !== undefined && input.photoExts.length !== input.photoCount) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["photoCount"], message: INVALID });
      }
    }),
);

export interface LeadInput {
  projectType: (typeof PROJECT_TYPES)[number];
  serviceSlug: ServiceSlug;
  /** Deduplicated, validated against the service. */
  scope: string[];
  irrigationType?: string;
  irrigationSystem?: string;
  waterSource?: string;
  city: string;
  district?: string;
  address?: string;
  propertyType?: string;
  areaSize: string;
  currentCondition?: string;
  budget: string;
  timeline: string;
  notes?: string;
  fullName: string;
  /** 05XXXXXXXXX */
  phone: string;
  /** lower case */
  email: string;
  kvkkAccepted: true;
  consentVersion?: string;
  /** One extension per photo the client will upload. */
  photoExts: string[];
  targetFirmId?: string;
  /** Where the form was opened from; absent for a missing or unknown `kaynak`. */
  source?: LeadSource;
  /** Lower-case token of the saved calculator estimate; absent unless `est` was exactly a token. */
  estimateToken?: string;
  attribution: {
    landingPath?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    gclid?: string;
    firstTouchAt?: string;
    sessionId?: string;
  };
  turnstileToken?: string;
  website?: string;
  elapsedMs?: number;
}

export type ParseResult =
  | { success: true; data: LeadInput; honeypot: boolean }
  | { success: false; fieldErrors: Record<string, string[]> };

/** True when the hidden "website" field was filled in (bots do that, people never see it). */
export function isHoneypotTripped(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const value = (raw as Record<string, unknown>).website;
  return typeof value === "string" && value.trim() !== "";
}

export function parseLeadInput(raw: unknown): ParseResult {
  const result = leadInputSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  const parsed = result.data as unknown as Omit<LeadInput, "photoExts" | "source" | "estimateToken"> & {
    photoExts?: string[];
    photoCount?: number;
    kaynak?: LeadSource;
    est?: string;
  };
  const { photoCount, kaynak, est, ...rest } = parsed;
  const photoExts = parsed.photoExts ?? Array.from({ length: photoCount ?? 0 }, () => "jpg");

  return {
    success: true,
    honeypot: isHoneypotTripped(raw),
    data: {
      ...rest,
      scope: [...new Set(parsed.scope)],
      photoExts,
      ...(kaynak ? { source: kaynak } : {}),
      ...(est ? { estimateToken: est } : {}),
    },
  };
}
