import { BRAND, escapeHtml } from "../create-lead/html.ts";

// One-time code mail. Pure module.

export interface OtpEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderOtpEmail(code: string): OtpEmail {
  const safeCode = escapeHtml(code);
  const subject = `${code} - Peyzajbul doğrulama kodu`;
  const lead = "Doğrulama kodunuz 10 dakika geçerlidir. Bu işlemi siz yapmadıysanız bu e-postayı dikkate almayın.";

  const html = `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:0;background:${BRAND.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Doğrulama kodunuz: ${safeCode}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td style="background:${BRAND.forest};padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold;">Peyzajbul</td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;color:${BRAND.ink};font-size:16px;line-height:1.6;">
              Teklif talebinizi tamamlamak için aşağıdaki kodu girin.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 24px 20px;">
              <div style="display:inline-block;background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:8px;padding:16px 28px;font-size:32px;font-weight:bold;letter-spacing:8px;color:${BRAND.forest};">${safeCode}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 28px;color:${BRAND.muted};font-size:13px;line-height:1.6;">${escapeHtml(lead)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Peyzajbul\n\nTeklif talebinizi tamamlamak için doğrulama kodunuz: ${code}\n\n${lead}\n`;

  return { subject, html, text };
}
