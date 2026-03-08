import { getCitySlug } from "./cities";

export function generateFirmSlug(companyName: string, id: string): string {
  const slug = companyName
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
