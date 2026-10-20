/// <reference lib="deno.ns" />

/**
 * Sends a push notification to the Peyzajbul mobile app through Expo.
 *
 * Auth: internal callers only (requireServiceSecret), for example database
 * triggers and the lead notification dispatcher.
 * Secrets: INTERNAL_FUNCTION_SECRET.
 */

import { HttpError, requireServiceSecret } from "../_shared/auth.ts";
import { readJson, serveSecure } from "../_shared/http.ts";
import { clampText, isExpoPushToken } from "../_shared/security.ts";

const NOTIFICATION_TYPES = ["lead_new", "low_balance", "lead_approved", "custom"];
const MAX_DATA_BYTES = 1024;
const APP_LINK_PREFIX = "peyzajbul://";

function parseData(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Geçersiz bildirim verisi.");
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_DATA_BYTES) {
    throw new HttpError(400, "Bildirim verisi çok büyük.");
  }
  const data = value as Record<string, unknown>;
  if ("url" in data && !(typeof data.url === "string" && data.url.startsWith(APP_LINK_PREFIX))) {
    throw new HttpError(400, "Geçersiz bildirim bağlantısı.");
  }
  return data;
}

serveSecure(async (req) => {
  requireServiceSecret(req);

  const payload = await readJson(req);

  if (!isExpoPushToken(payload.expo_push_token)) {
    throw new HttpError(400, "Geçersiz bildirim anahtarı.");
  }
  const type = payload.type === undefined ? "custom" : payload.type;
  if (typeof type !== "string" || !NOTIFICATION_TYPES.includes(type)) {
    throw new HttpError(400, "Geçersiz bildirim türü.");
  }

  let messageTitle = clampText(payload.title, 100);
  let messageBody = clampText(payload.body, 300);
  let messageData = parseData(payload.data);

  // Varsayılan tipler için otomatik mesaj oluşturma (başlık verilmediyse)
  if (type === "lead_new" && !messageTitle) {
    const leadScore = Number(payload.lead_score);
    const scoreEmoji = leadScore >= 70 ? "🔥" : leadScore >= 50 ? "⚡" : "📋";
    const city = clampText(payload.city, 80);
    const district = clampText(payload.district, 80);
    const districtText = district ? ` / ${district}` : "";
    messageTitle = `${scoreEmoji} Yeni İş Fırsatı!`;
    messageBody = `${city}${districtText} bölgesinde yeni bir ${clampText(payload.service_type, 80)} talebi sizin için eşleşti. Hemen inceleyin!`;
    messageData = { ...messageData, url: `${APP_LINK_PREFIX}leadler` };
  } else if (type === "low_balance" && !messageTitle) {
    messageTitle = "⚠️ Düşük Bakiye Uyarısı";
    messageBody = "Jeton bakiyeniz azaldı. Yeni iş tekliflerini kaçırmamak için bakiye yükleyebilirsiniz.";
    messageData = { ...messageData, url: `${APP_LINK_PREFIX}profile` };
  } else if (type === "lead_approved" && !messageTitle) {
    messageTitle = "✅ Teklif Talebiniz Onaylandı";
    messageBody = "Talebiniz onaylandı ve bölgenizdeki uygun firmalarla paylaşıldı.";
    messageData = { ...messageData, url: `${APP_LINK_PREFIX}taleplerim` };
  }

  const message = {
    to: payload.expo_push_token,
    sound: "default",
    title: messageTitle || "Peyzajbul Bildirimi",
    body: messageBody || "Yeni bir güncelleme var.",
    data: messageData,
  };

  let response: Response;
  try {
    response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error("[notify-expo-push] Expo request failed:", err);
    throw new HttpError(502, "Bildirim gönderilemedi.");
  }

  const resultData = await response.json().catch(() => null);
  if (!response.ok) {
    console.error(`[notify-expo-push] Expo API error [${response.status}]`);
    throw new HttpError(502, "Bildirim gönderilemedi.");
  }

  return { success: true, resultData };
});
