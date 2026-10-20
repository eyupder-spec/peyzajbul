import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSpendHandler, type EmailMessage } from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

async function sendEmail(message: EmailMessage): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Peyzajbul <noreply@peyzajbul.com>",
      to: [message.to],
      subject: message.subject,
      html: message.html,
    }),
  });
}

Deno.serve(
  createSpendHandler({
    authClient: createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", clientOptions),
    admin: createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", clientOptions),
    sendEmail,
  }),
);
