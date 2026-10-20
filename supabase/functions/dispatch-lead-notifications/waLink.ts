import { toWhatsAppNumber } from "../create-lead/phone.ts";

// WhatsApp click-to-chat links (no paid WhatsApp API). Nothing is sent automatically: the operator
// taps a wa.me link and WhatsApp opens with the message ready. Pure module.

export interface AlertLead {
  service_type: string;
  city: string;
  district?: string | null;
}

function placeOf(lead: Pick<AlertLead, "city" | "district">): string {
  return lead.district ? `${lead.district}, ${lead.city}` : lead.city;
}

/**
 * Alert for a firm a lead was routed to. Contains no homeowner data.
 * Keep the wording identical to buildFirmAlertMessage in src/lib/leadRouting.ts (templates.test.ts compares them).
 */
export function buildFirmAlertMessage(lead: AlertLead, panelUrl: string): string {
  return `Merhaba, Peyzajbul üzerinden ${placeOf(lead)} için yeni bir ${lead.service_type} talebi size iletildi. Detayları panelden görebilirsiniz: ${panelUrl}`;
}

/** Outreach to an unclaimed listing in a city where a lead found no firm. Sent only on operator click. */
export function buildClaimOutreachMessage(lead: AlertLead, claimUrl: string): string {
  return `Merhaba, Peyzajbul’da ${placeOf(lead)} için ${lead.service_type} talebi var. Firma profilinizi sahiplenerek talebe teklif verebilirsiniz: ${claimUrl}`;
}

/** https://wa.me/905XXXXXXXXX?text=... or null when the phone is not a Turkish mobile number. */
export function buildWaMeUrl(rawPhone: string | null | undefined, message: string): string | null {
  const number = toWhatsAppNumber(rawPhone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
