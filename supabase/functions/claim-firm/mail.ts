/**
 * E-mails of the claim flow: the one-time code and the 'Profiliniz sizin' confirmation.
 * Delivery goes through the same Resend client as send-otp. Rendering is pure; every
 * interpolated value is HTML-escaped and the subject is reduced to a single line.
 */

import { BRAND, escapeHtml, toSingleLine } from "../create-lead/html.ts";
import { DEFAULT_FROM, sendEmail, type SendEmailResult } from "../dispatch-lead-notifications/resend.ts";
import type { OtpPurpose } from "./otp.ts";

export interface ClaimMail {
  subject: string;
  html: string;
  text: string;
}

const FONT = "Arial,Helvetica,sans-serif";

function shell(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:0;background:${BRAND.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;font-family:${FONT};">
          <tr>
            <td style="background:${BRAND.forest};padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold;">Peyzajbul</td>
          </tr>
${bodyHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function paragraph(text: string, color: string = BRAND.ink, size = 16): string {
  return `          <tr>
            <td style="padding:20px 24px 4px;color:${color};font-size:${size}px;line-height:1.6;">${escapeHtml(text)}</td>
          </tr>`;
}

const OTP_INTRO: Record<OtpPurpose, (companyName: string) => string> = {
  claim_firm_email: (name) => `${name} profilini sahiplenmek için doğrulama kodunuz aşağıdadır.`,
  claim_whatsapp: (name) => `${name} profil başvurunuzdaki e-posta adresini doğrulamak için kodunuz aşağıdadır.`,
  register: () => "Firma başvurunuzdaki e-posta adresini doğrulamak için kodunuz aşağıdadır.",
  login: () => "Peyzajbul firma girişi için tek kullanımlık kodunuz aşağıdadır.",
};

const OTP_FOOTER = "Kod 10 dakika geçerlidir. Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayın.";

export function renderClaimOtpEmail(args: { purpose: OtpPurpose; code: string; companyName?: string | null }): ClaimMail {
  const name = toSingleLine(args.companyName ?? "") || "Firma";
  const intro = OTP_INTRO[args.purpose](name);
  const safeCode = escapeHtml(args.code);

  const html = shell(
    `Doğrulama kodunuz: ${args.code}`,
    `${paragraph(intro)}
          <tr>
            <td align="center" style="padding:12px 24px 20px;">
              <div style="display:inline-block;background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:8px;padding:16px 28px;font-size:32px;font-weight:bold;letter-spacing:8px;color:${BRAND.forest};">${safeCode}</div>
            </td>
          </tr>
${paragraph(OTP_FOOTER, BRAND.muted, 13)}
          <tr><td style="height:20px;"></td></tr>`,
  );

  return {
    subject: `${args.code} - Peyzajbul doğrulama kodu`,
    html,
    text: `Peyzajbul\n\n${intro}\n\nKodunuz: ${args.code}\n\n${OTP_FOOTER}\n`,
  };
}

const CHECKLIST = [
  "Logonuzu yükleyin",
  "En az 3 fotoğraf ekleyin",
  "Hizmetlerinizi işaretleyin",
  "Ortalama yanıt sürenizi yazın",
] as const;

export interface ApprovedMailArgs {
  companyName: string;
  /** {SITE_URL}/firma/giris */
  loginUrl: string;
  /** 'verified': the owner proved the listed e-mail address; 'approved': an admin approved the request. */
  variant: "verified" | "approved";
  /** Shown only when coins were really granted. */
  creditAmount?: number | null;
}

export function renderClaimApprovedEmail(args: ApprovedMailArgs): ClaimMail {
  const name = toSingleLine(args.companyName) || "Firmanız";
  const heading = args.variant === "approved" ? "Başvurunuz onaylandı" : "Profiliniz sizin";
  const lead = `${name} profilini artık siz yönetiyorsunuz.`;
  const login =
    "Giriş için firma girişi sayfasında e-posta adresinizi yazın; size 6 haneli tek kullanımlık bir kod göndereceğiz. Şifre gerekmez.";
  const credit =
    typeof args.creditAmount === "number" && args.creditAmount > 0
      ? `İlk müşteri talebiniz bizden: hesabınıza ${args.creditAmount} jeton tanımlandı.`
      : null;
  const checklistTitle = "Profilinizi güçlendirmek için dört adım:";
  const button = "Firma girişine git";
  const footer = "Bu e-postayı Peyzajbul'da firma profilinizi sahiplendiğiniz için aldınız.";

  const items = CHECKLIST.map(
    (item) =>
      `<li style="margin:0 0 6px;">${escapeHtml(item)}</li>`,
  ).join("");

  const html = shell(
    lead,
    `          <tr>
            <td style="padding:24px 24px 0;color:${BRAND.forest};font-size:22px;font-weight:bold;">${escapeHtml(heading)}</td>
          </tr>
${paragraph(lead)}
${paragraph(login)}${credit ? `\n${paragraph(credit)}` : ""}
          <tr>
            <td align="center" style="padding:20px 24px 8px;">
              <a href="${escapeHtml(args.loginUrl)}" style="display:inline-block;background:${BRAND.clay};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px;">${escapeHtml(button)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 0;color:${BRAND.ink};font-size:15px;line-height:1.6;">
              ${escapeHtml(checklistTitle)}
              <ul style="margin:8px 0 0;padding-left:20px;">${items}</ul>
            </td>
          </tr>
${paragraph(footer, BRAND.muted, 13)}
          <tr><td style="height:20px;"></td></tr>`,
  );

  const text = [
    "Peyzajbul",
    "",
    heading,
    "",
    lead,
    login,
    ...(credit ? ["", credit] : []),
    "",
    `${button}: ${args.loginUrl}`,
    "",
    checklistTitle,
    ...CHECKLIST.map((item) => `- ${item}`),
    "",
    footer,
    "",
  ].join("\n");

  return { subject: `${heading}: ${name}`, html, text };
}

export interface MailEnv {
  apiKey: string;
  from?: string;
}

export function deliverMail(
  env: MailEnv,
  to: string,
  mail: ClaimMail,
  idempotencyKey: string,
  fetchImpl?: typeof fetch,
): Promise<SendEmailResult> {
  return sendEmail({
    apiKey: env.apiKey,
    from: env.from ?? DEFAULT_FROM,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey,
    fetchImpl,
  });
}
