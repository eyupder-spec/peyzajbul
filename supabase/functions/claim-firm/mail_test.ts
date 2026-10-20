// How to run: deno test supabase/functions/claim-firm
import { assert, assertFalse, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deliverMail, renderClaimApprovedEmail, renderClaimOtpEmail } from "./mail.ts";

Deno.test("the code e-mail carries the code and the 10 minute validity", () => {
  const mail = renderClaimOtpEmail({ purpose: "claim_firm_email", code: "042913", companyName: "Yeşil Bahçe" });
  assertStringIncludes(mail.subject, "042913");
  assertStringIncludes(mail.html, "042913");
  assertStringIncludes(mail.text, "042913");
  assertStringIncludes(mail.text, "10 dakika");
  assertStringIncludes(mail.text, "Yeşil Bahçe");
});

Deno.test("the code e-mail escapes the company name and keeps the subject on one line", () => {
  const mail = renderClaimOtpEmail({ purpose: "claim_whatsapp", code: "123456", companyName: '<script>alert(1)</script>\r\nBcc: x@y.z' });
  assertFalse(mail.html.includes("<script>"));
  assertStringIncludes(mail.html, "&lt;script&gt;");
  assertFalse(/[\r\n]/.test(mail.subject));
});

Deno.test("the approval e-mail escapes the company name and links to the passwordless login", () => {
  const mail = renderClaimApprovedEmail({
    companyName: 'Ağaç & "Dal" <b>Peyzaj</b>',
    loginUrl: "https://www.peyzajbul.com/firma/giris",
    variant: "approved",
  });
  assertFalse(mail.html.includes("<b>Peyzaj</b>"));
  assertStringIncludes(mail.html, "&lt;b&gt;Peyzaj&lt;/b&gt;");
  assertStringIncludes(mail.html, 'href="https://www.peyzajbul.com/firma/giris"');
  assertStringIncludes(mail.text, "Şifre gerekmez");
  assertStringIncludes(mail.subject, "Başvurunuz onaylandı");
});

Deno.test("the approval e-mail lists the four profile steps", () => {
  const mail = renderClaimApprovedEmail({ companyName: "Firma", loginUrl: "https://www.peyzajbul.com/firma/giris", variant: "verified" });
  for (const item of ["Logonuzu", "3 fotoğraf", "Hizmetlerinizi", "yanıt sürenizi"]) assertStringIncludes(mail.text, item);
  assertStringIncludes(mail.subject, "Profiliniz sizin");
});

Deno.test("the coin line appears only when coins were really granted", () => {
  const base = { companyName: "Firma", loginUrl: "https://www.peyzajbul.com/firma/giris", variant: "verified" as const };
  assertFalse(renderClaimApprovedEmail(base).text.includes("jeton"));
  assertFalse(renderClaimApprovedEmail({ ...base, creditAmount: 0 }).text.includes("jeton"));
  assertFalse(renderClaimApprovedEmail({ ...base, creditAmount: null }).text.includes("jeton"));
  assertStringIncludes(renderClaimApprovedEmail({ ...base, creditAmount: 10 }).text, "hesabınıza 10 jeton tanımlandı");
});

Deno.test("deliverMail posts to Resend with the idempotency key", async () => {
  let request: { url: string; init: RequestInit } | null = null;
  const fetchImpl = ((url: string, init: RequestInit) => {
    request = { url, init };
    return Promise.resolve(new Response(JSON.stringify({ id: "mail_1" }), { status: 200 }));
  }) as unknown as typeof fetch;

  const mail = renderClaimOtpEmail({ purpose: "login", code: "123456" });
  const result = await deliverMail({ apiKey: "re_test" }, "firma@example.com", mail, "claim-otp-1", fetchImpl);

  assert(result.ok);
  assert(request !== null);
  const sent = request as { url: string; init: RequestInit };
  assertStringIncludes(sent.url, "api.resend.com");
  assert((sent.init.headers as Record<string, string>)["Idempotency-Key"] === "claim-otp-1");
});
