import { describe, expect, it } from 'vitest';
import { MAX_TRACK_BODY_BYTES, parseTrackBody, trackSchema } from './schema';

const FIRM_ID = '3f2b8c1e-5d4a-4c6b-9a7e-1b2c3d4e5f60';
const BANNER_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

describe('track schema', () => {
  it('accepts a firm event with and without optional fields', () => {
    expect(trackSchema.safeParse({ kind: 'firm', firm_id: FIRM_ID, type: 'profile_view' }).success).toBe(true);
    expect(
      trackSchema.safeParse({
        kind: 'firm',
        firm_id: FIRM_ID,
        type: 'whatsapp_click',
        path: '/firma/ornek-peyzaj',
        utm: { source: 'google', medium: 'organic', campaign: 'yaz' },
      }).success,
    ).toBe(true);
  });

  it('accepts a banner event', () => {
    expect(trackSchema.safeParse({ kind: 'banner', banner_id: BANNER_ID, type: 'view' }).success).toBe(true);
    expect(trackSchema.safeParse({ kind: 'banner', banner_id: BANNER_ID, type: 'click' }).success).toBe(true);
  });

  it('rejects an invalid uuid', () => {
    expect(trackSchema.safeParse({ kind: 'firm', firm_id: 'not-a-uuid', type: 'profile_view' }).success).toBe(false);
    expect(trackSchema.safeParse({ kind: 'banner', banner_id: '123', type: 'view' }).success).toBe(false);
  });

  it('rejects unknown event types and kinds', () => {
    expect(trackSchema.safeParse({ kind: 'firm', firm_id: FIRM_ID, type: 'email_click' }).success).toBe(false);
    expect(trackSchema.safeParse({ kind: 'banner', banner_id: BANNER_ID, type: 'profile_view' }).success).toBe(false);
    expect(trackSchema.safeParse({ kind: 'lead', firm_id: FIRM_ID, type: 'profile_view' }).success).toBe(false);
  });

  it('rejects a path longer than 200 characters and an oversized utm value', () => {
    expect(
      trackSchema.safeParse({ kind: 'firm', firm_id: FIRM_ID, type: 'profile_view', path: '/'.padEnd(201, 'a') }).success,
    ).toBe(false);
    expect(
      trackSchema.safeParse({
        kind: 'firm',
        firm_id: FIRM_ID,
        type: 'profile_view',
        utm: { source: 'x'.repeat(65) },
      }).success,
    ).toBe(false);
  });

  it('rejects extra keys', () => {
    expect(
      trackSchema.safeParse({ kind: 'firm', firm_id: FIRM_ID, type: 'profile_view', ip: '1.2.3.4' }).success,
    ).toBe(false);
    expect(
      trackSchema.safeParse({ kind: 'firm', firm_id: FIRM_ID, type: 'profile_view', utm: { term: 'x' } }).success,
    ).toBe(false);
  });
});

describe('parseTrackBody', () => {
  it('parses a valid JSON body', () => {
    const body = JSON.stringify({ kind: 'firm', firm_id: FIRM_ID, type: 'call_click' });
    expect(parseTrackBody(body)).toEqual({
      success: true,
      data: { kind: 'firm', firm_id: FIRM_ID, type: 'call_click' },
    });
  });

  it('rejects malformed JSON', () => {
    expect(parseTrackBody('{not json').success).toBe(false);
    expect(parseTrackBody('').success).toBe(false);
  });

  it('rejects a body above the size limit even when the payload is otherwise valid', () => {
    const padded = JSON.stringify({
      kind: 'firm',
      firm_id: FIRM_ID,
      type: 'profile_view',
      path: '/a',
    }).padEnd(MAX_TRACK_BODY_BYTES + 1, ' ');
    expect(parseTrackBody(padded).success).toBe(false);
  });
});
