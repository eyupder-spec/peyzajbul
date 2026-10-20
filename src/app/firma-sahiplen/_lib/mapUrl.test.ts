import { describe, expect, it } from 'vitest';
import { MAX_MAP_URL_LENGTH, validateMapUrl } from './mapUrl';

const EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3010.1!2d28.97!3d41.01!2m3!1f0!2f0!3f0';

describe('validateMapUrl: accepted values', () => {
  it.each([
    ['Google embed address', EMBED],
    ['Google Maps place link', 'https://www.google.com/maps/place/Kad%C4%B1k%C3%B6y,+%C4%B0stanbul/@40.99,29.03,14z'],
    ['Google Maps short share link', 'https://maps.app.goo.gl/AbCdEf123456'],
    ['legacy goo.gl link', 'https://goo.gl/maps/AbCdEf123456'],
    ['maps.google.com embed output', 'https://maps.google.com/maps?q=Kad%C4%B1k%C3%B6y&output=embed'],
    ['upper-case scheme', 'HTTPS://www.google.com/maps/embed?pb=abc'],
  ])('accepts %s', (_label, url) => {
    expect(validateMapUrl(url)).toEqual({ ok: true, url });
  });

  it('trims surrounding whitespace and returns the trimmed address', () => {
    expect(validateMapUrl(`  ${EMBED}\n`)).toEqual({ ok: true, url: EMBED });
  });

  it('accepts an address of exactly the maximum length', () => {
    const url = `https://www.google.com/maps/embed?pb=${'a'.repeat(MAX_MAP_URL_LENGTH - 'https://www.google.com/maps/embed?pb='.length)}`;
    expect(url).toHaveLength(MAX_MAP_URL_LENGTH);
    expect(validateMapUrl(url)).toEqual({ ok: true, url });
  });

  it('treats an empty value as clearing the field', () => {
    expect(validateMapUrl('')).toEqual({ ok: true, url: null });
    expect(validateMapUrl(null)).toEqual({ ok: true, url: null });
    expect(validateMapUrl(undefined)).toEqual({ ok: true, url: null });
  });
});

describe('validateMapUrl: rejected values', () => {
  const HTTPS_MESSAGE = 'Harita adresi https:// ile başlamalıdır.';

  it.each([
    ['javascript: scheme', 'javascript:alert(1)'],
    ['javascript: scheme with a https:// tail', 'javascript://www.google.com/%0Aalert(1)'],
    ['upper-case JavaScript: scheme', 'JaVaScRiPt:alert(document.cookie)'],
    ['data: scheme', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['vbscript: scheme', 'vbscript:msgbox(1)'],
    ['file: scheme', 'file:///etc/passwd'],
    ['ftp: scheme', 'ftp://maps.example.com/konum'],
    ['plain http: address', 'http://www.google.com/maps/embed?pb=abc'],
    ['protocol-relative address', '//www.google.com/maps/embed?pb=abc'],
    ['address without a scheme', 'www.google.com/maps/embed?pb=abc'],
    ['https: without slashes', 'https:www.google.com/maps'],
    ['a scheme hidden behind leading characters', 'x https://www.google.com/maps'],
  ])('rejects %s', (_label, url) => {
    const result = validateMapUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe(HTTPS_MESSAGE);
  });

  it('rejects whitespace-only input instead of storing blanks', () => {
    for (const blank of [' ', '   ', '\t', ' \n ']) {
      const result = validateMapUrl(blank);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain('boşluklardan');
    }
  });

  it('rejects an overlong address', () => {
    const url = `${EMBED}${'a'.repeat(MAX_MAP_URL_LENGTH)}`;
    const result = validateMapUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(String(MAX_MAP_URL_LENGTH));

    expect(validateMapUrl(`https://www.google.com/maps/embed?pb=${'a'.repeat(MAX_MAP_URL_LENGTH)}`).ok).toBe(false);
  });

  it('explains a pasted iframe snippet', () => {
    const result = validateMapUrl(`<iframe src="${EMBED}" width="600" height="450"></iframe>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('src=');
  });

  it.each([
    ['embedded spaces', 'https://www.google.com/maps/embed?pb=a b'],
    ['embedded line break', 'https://www.google.com/maps/embed?pb=a\nb'],
    ['no host', 'https://'],
    ['credentials in the address', 'https://user:secret@www.google.com/maps'],
    ['unparseable host', 'https://exa mple.com'],
  ])('rejects %s', (_label, url) => {
    const result = validateMapUrl(url);
    expect(result.ok).toBe(false);
  });
});
