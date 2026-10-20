/// <reference lib="deno.ns" />

/**
 * Sends a new-lead notification to a firm's Telegram chat.
 *
 * Auth: internal callers only (requireServiceSecret). Legitimate callers are
 * the database trigger notify_firms_on_new_lead (through
 * invoke_internal_function) and the lead notification dispatcher.
 *
 * Secrets: TELEGRAM_BOT_TOKEN, INTERNAL_FUNCTION_SECRET.
 * The chat_id must be stored in firms.telegram_chat_id, so even a leaked
 * internal secret cannot turn the bot into a message relay.
 */

import { adminClient, HttpError, requireServiceSecret } from "../_shared/auth.ts";
import { readJson, serveSecure } from "../_shared/http.ts";
import { clampText, escapeHtml, isTelegramChatId } from "../_shared/security.ts";

const FIELD_MAX = 120;

function field(value: unknown, fallback = "-"): string {
  return escapeHtml(clampText(value, FIELD_MAX)) || fallback;
}

serveSecure(async (req) => {
  requireServiceSecret(req);

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const body = await readJson(req);
  const chatId = typeof body.chat_id === "number" ? String(body.chat_id) : body.chat_id;
  if (!isTelegramChatId(chatId)) throw new HttpError(400, "Geçersiz sohbet kimliği.");

  const admin = adminClient();
  const { data: firms, error } = await admin
    .from("firms")
    .select("telegram_chat_id")
    .ilike("telegram_chat_id", `%${chatId}%`)
    .limit(20);
  if (error) throw error;
  const isKnownChat = (firms ?? []).some((firm) =>
    String(firm.telegram_chat_id ?? "").split(/[^\d-]+/).includes(chatId)
  );
  if (!isKnownChat) throw new HttpError(403, "Bilinmeyen sohbet kimliği.");

  const rawScore = Number(body.lead_score);
  const leadScore = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, Math.round(rawScore))) : 0;
  const scoreEmoji = leadScore >= 70 ? "🔥" : leadScore >= 50 ? "⚡" : "📋";
  const district = clampText(body.district, FIELD_MAX);
  const districtText = district ? ` / ${escapeHtml(district)}` : "";
  const area = field(body.area_size, "") || field(body.project_size);

  const message = [
    `${scoreEmoji} <b>Yeni Müşteri Adayı!</b>`,
    "",
    `🏢 <b>${field(body.firm_name)}</b> için yeni bir talep geldi:`,
    "",
    `📌 <b>Hizmet:</b> ${field(body.service_type)}`,
    `📍 <b>Konum:</b> ${field(body.city)}${districtText}`,
    `💰 <b>Bütçe:</b> ${field(body.budget)}`,
    `📐 <b>Alan:</b> ${area} m²`,
    `⏰ <b>Zaman:</b> ${field(body.timeline)}`,
    `📊 <b>Aday Skoru:</b> ${leadScore}/100`,
    "",
    "👉 Detayları görmek ve iletişim bilgilerini açmak için panele giriş yapın:",
    "🔗 https://www.peyzajbul.com/firma/giris",
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    // The error text of a failed fetch contains the request URL, and with it the bot token.
    console.error("[notify-telegram] Telegram request failed before a response was received.");
    throw new HttpError(502, "Telegram bildirimi gönderilemedi.");
  }

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    console.error(`[notify-telegram] Telegram API error [${response.status}]: ${details?.description ?? "unknown"}`);
    throw new HttpError(502, "Telegram bildirimi gönderilemedi.");
  }

  return { success: true };
});
