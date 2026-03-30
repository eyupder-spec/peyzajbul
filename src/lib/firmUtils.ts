import { getCitySlug } from "./cities";

export function generateFirmSlug(companyName: string, id: string): string {
  const slug = companyName
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/Ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}-${id.slice(0, 8)}`;
}

export function extractFirmIdFromSlug(slug: string): string {
  const parts = slug.split("-");
  return parts[parts.length - 1];
}

export function getSocialUrl(platform: 'instagram' | 'facebook' | 'x' | 'youtube' | 'linkedin', value: string): string {
  if (!value) return "";
  if (value.startsWith('http')) return value;
  
  const baseUrlMap = {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    x: 'https://x.com/',
    youtube: 'https://youtube.com/',
    linkedin: 'https://linkedin.com/in/' // Or /company/ depending on use case, but /in/ is common for individuals
  };

  const username = value.startsWith('@') ? value.slice(1) : value;
  return `${baseUrlMap[platform]}${username}`;
}

export function generateProjectSlug(title: string, id: string): string {
  const slug = title
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/Ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}-${id.slice(0, 8)}`;
}
