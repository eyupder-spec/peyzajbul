import { z } from 'zod';

/** İstek gövdesi üst sınırı (bayt). Sayaç çağrıları küçüktür; fazlası reddedilir. */
export const MAX_TRACK_BODY_BYTES = 2048;

export const FIRM_EVENT_TYPES = [
  'profile_view',
  'call_click',
  'whatsapp_click',
  'quote_click',
  'website_click',
] as const;

export const BANNER_EVENT_TYPES = ['view', 'click'] as const;

export type FirmEventType = (typeof FIRM_EVENT_TYPES)[number];
export type BannerEventType = (typeof BANNER_EVENT_TYPES)[number];

const utmSchema = z
  .object({
    source: z.string().max(64).optional(),
    medium: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
  })
  .strict();

const firmEventSchema = z
  .object({
    kind: z.literal('firm'),
    firm_id: z.string().uuid(),
    type: z.enum(FIRM_EVENT_TYPES),
    path: z.string().max(200).optional(),
    utm: utmSchema.optional(),
  })
  .strict();

const bannerEventSchema = z
  .object({
    kind: z.literal('banner'),
    banner_id: z.string().uuid(),
    type: z.enum(BANNER_EVENT_TYPES),
  })
  .strict();

export const trackSchema = z.discriminatedUnion('kind', [firmEventSchema, bannerEventSchema]);

export type TrackPayload = z.infer<typeof trackSchema>;

export type ParsedTrackBody = { success: true; data: TrackPayload } | { success: false };

/** Ham gövdeyi boyut, JSON ve şema denetiminden geçirir. */
export function parseTrackBody(raw: string): ParsedTrackBody {
  if (new TextEncoder().encode(raw).length > MAX_TRACK_BODY_BYTES) return { success: false };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { success: false };
  }

  const result = trackSchema.safeParse(json);
  return result.success ? { success: true, data: result.data } : { success: false };
}
