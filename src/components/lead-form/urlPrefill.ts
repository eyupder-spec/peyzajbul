import { DISTRICTS_BY_CITY } from "../../lib/districts";
import {
  parseEstimateToken,
  resolveLeadSource,
  sanitizeLeadInput,
  type LeadFormData,
  type LeadSource,
} from "../../lib/leadFormData";

/**
 * Deep-link pre-fill of the lead form: hero search, service pages and the cost calculator (the contract of the
 * calculator links is documented at the top of src/components/calculator/prefill.ts). Pure module, no React and
 * no window access, so it can be tested without a browser. Every value is an allow-list lookup or a bounded
 * plain string: whatever a link supplies that does not fit is dropped, never trusted.
 */

/** The calculator writes at most this many characters into `not`. */
export const MAX_PREFILL_NOTE_LENGTH = 300;
const MAX_PREFILL_SCOPE_ITEMS = 12;
const HTML_TAGS = /<[^>]*>/g;

export interface LeadUrlPrefill {
  fields: Partial<LeadFormData>;
  /** `kaynak` resolved against the allow-list; null when absent or unknown. */
  source: LeadSource | null;
  /** `est`: token of the saved calculator estimate, null unless it has exactly the token format. */
  estimateToken: string | null;
}

/** Sanitised pre-fill; a district is only kept when it belongs to the selected city. */
export function resolvePrefill(input: Partial<LeadFormData>): Partial<LeadFormData> {
  const clean = sanitizeLeadInput(input);
  if (clean.district && !DISTRICTS_BY_CITY[clean.city ?? ""]?.includes(clean.district)) delete clean.district;
  return clean;
}

/** Control characters (line breaks included) become spaces. */
function withoutControlCharacters(value: string): string {
  return Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127 ? " " : char;
  }).join("");
}

function cleanNote(value: string | null): string {
  const note = withoutControlCharacters((value ?? "").replace(HTML_TAGS, "")).replace(/[<>]/g, " ").replace(/\s+/g, " ").trim();
  return note.length <= MAX_PREFILL_NOTE_LENGTH ? note : "";
}

/**
 * Where the form was opened from: the link's `kaynak` wins because it says where the visitor really came from (a
 * calculator link lands on /teklif-al, whose page-level source is only the generic "teklif_al"), then the source the
 * hosting component passed, then a guess from the path.
 */
export function resolveFormSource(fromUrl: LeadSource | null, fromProp: LeadSource | undefined, infer: () => LeadSource): LeadSource {
  return fromUrl ?? fromProp ?? infer();
}

/**
 * hizmet -> serviceType, alan -> areaSize, butce -> budget, il -> city, ilce -> district, kapsam (comma separated)
 * -> scope, sulama -> irrigationSystem, not -> notes, kaynak -> source, est -> estimateToken.
 */
export function parseLeadPrefill(search: string | URLSearchParams): LeadUrlPrefill {
  const query = typeof search === "string" ? new URLSearchParams(search) : search;
  const read = (key: string): string => query.get(key)?.trim() ?? "";

  const raw: Partial<LeadFormData> = {};
  const service = read("hizmet");
  if (service) raw.serviceType = service;
  const city = read("il");
  if (city) raw.city = city;
  const district = read("ilce");
  if (district) raw.district = district;
  const areaSize = read("alan");
  if (areaSize) raw.areaSize = areaSize;
  const budget = read("butce");
  if (budget) raw.budget = budget;
  const scope = read("kapsam")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_PREFILL_SCOPE_ITEMS);
  if (scope.length > 0) raw.scope = scope;
  const irrigationSystem = read("sulama");
  if (irrigationSystem) raw.irrigationSystem = irrigationSystem;
  const notes = cleanNote(query.get("not"));
  if (notes) raw.notes = notes;

  return {
    fields: resolvePrefill(raw),
    source: resolveLeadSource(query.get("kaynak")),
    estimateToken: parseEstimateToken(query.get("est")),
  };
}
