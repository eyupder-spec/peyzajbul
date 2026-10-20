// Minimal Resend client. Pure module: fetch is injectable, no Deno globals.
// Also used by send-otp for the one-time code mail.

export const RESEND_ENDPOINT = "https://api.resend.com/emails";
export const DEFAULT_FROM = "Peyzajbul <noreply@peyzajbul.com>";
const TIMEOUT_MS = 10_000;

export interface SendEmailInput {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Resend de-duplicates requests that carry the same key for 24 hours. */
  idempotencyKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; status: number; error: string };

/** Provider error text for the notification log: status plus Resend's message, never the payload. */
function describeError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message) return `resend ${status}: ${message}`.slice(0, 500);
  }
  return `resend ${status}`;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = input;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
      signal: controller.signal,
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // empty or non-JSON body
    }

    if (!response.ok) return { ok: false, status: response.status, error: describeError(response.status, body) };

    const id = body && typeof body === "object" ? (body as { id?: unknown }).id : null;
    return { ok: true, id: typeof id === "string" ? id : null };
  } catch {
    return { ok: false, status: 0, error: "resend unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
