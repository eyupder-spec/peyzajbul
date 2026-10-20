/// <reference lib="deno.ns" />

/**
 * Sends a WhatsApp text through a self-hosted WAHA instance.
 *
 * Auth: internal callers only (requireServiceSecret). The legacy database
 * triggers (20260313030000_whatsapp_notifications.sql) authenticate with the
 * service-role key, which requireServiceSecret also accepts.
 *
 * Secrets: INTERNAL_FUNCTION_SECRET. Optional: WAHA_API_URL (without it the
 * function answers 200 {success:false} so triggers never fail), WAHA_API_KEY
 * (sent as X-Api-Key), WAHA_SESSION (default "default"; a session in the
 * request body is ignored).
 *
 * At most 3 messages per phone number and day (public.edge_rate_limit_hit).
 */

import { adminClient, HttpError, rateLimit, requireServiceSecret } from "../_shared/auth.ts";
import { readJson, serveSecure } from "../_shared/http.ts";
import { clampText, normalizeTrMobile } from "../_shared/security.ts";

serveSecure(async (req) => {
  requireServiceSecret(req);

  const wahaApiUrl = Deno.env.get("WAHA_API_URL");
  if (!wahaApiUrl) {
    console.warn("WAHA_API_URL is not configured. Messages will not be sent.");
    // Returning 200 keeps database triggers from failing while WAHA is not configured.
    return { success: false, error: "WAHA not configured" };
  }

  const body = await readJson(req);
  const phone = normalizeTrMobile(body.phone);
  if (!phone) throw new HttpError(400, "Geçerli bir cep telefonu numarası gerekli.");
  const message = clampText(body.message, 1000);
  if (!message) throw new HttpError(400, "Mesaj gerekli.");

  await rateLimit(adminClient(), `wa:${phone}`, 3, 86400);

  const session = Deno.env.get("WAHA_SESSION") ?? "default";
  const apiKey = Deno.env.get("WAHA_API_KEY");

  console.log(`Sending WhatsApp message to ***${phone.slice(-4)} via ${session} session...`);

  let response: Response;
  try {
    response = await fetch(`${wahaApiUrl.replace(/\/+$/, "")}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
      body: JSON.stringify({ chatId: `${phone}@c.us`, text: message, session }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error("WhatsApp Notification Error:", err instanceof Error ? err.message : "request failed");
    throw new HttpError(502, "WhatsApp mesajı gönderilemedi.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error(`WhatsApp Notification Error: WAHA API responded with ${response.status}`);
    throw new HttpError(502, "WhatsApp mesajı gönderilemedi.");
  }

  return { success: true, data };
});
