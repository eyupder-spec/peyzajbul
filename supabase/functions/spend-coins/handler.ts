import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.23.8";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.peyzajbul.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// purchase_lead RPC hata kodlari (20261020120100_money_rpcs.sql) -> kullaniciya Turkce mesaj
export const RPC_ERROR_MESSAGES: Record<string, string> = {
  sold_out: "Bu müşteri adayı satış limitine ulaştı (Maksimum 3 firma satın alabilir).",
  already_purchased: "Bu lead zaten satın alınmış",
  insufficient_balance: "Yetersiz jeton bakiyesi",
  firm_not_found: "Firma bulunamadı veya henüz onaylanmadı",
  lead_unavailable: "Bu müşteri adayı şu anda satın alınamaz",
};

const spendSchema = z.object({
  lead_id: z.string().uuid("Geçersiz lead_id formatı"),
});

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface SpendDeps {
  authClient: Pick<SupabaseClient, "auth">;
  admin: SupabaseClient;
  sendEmail: (message: EmailMessage) => Promise<void>;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Sunucu loglarinda kullanici/kayit kimlikleri gorunmesin
function redact(text: string): string {
  return text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "***");
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
}

export function buildLeadEmail(
  lead: { full_name?: string | null; service_type?: string | null; city?: string | null },
  companyName: string | null,
): { subject: string; html: string } {
  return {
    subject: "Talebinizle İlgileniliyor! - Peyzajbul",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
        <h1 style="color:#1a1a1a;font-size:22px;margin-bottom:8px;">Harika Haber! 🎉</h1>
        <p style="color:#333;font-size:15px;line-height:1.6;">
          Sayın <strong>${escapeHtml(lead.full_name)}</strong>,
        </p>
        <p style="color:#333;font-size:15px;line-height:1.6;">
          <strong>${escapeHtml(companyName || "Bir firma")}</strong> talebinizi aldı ve talebinizle ilgilenmek üzere sizinle iletişime geçebilir.
        </p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:4px 0;color:#555;font-size:14px;">📋 Hizmet: <strong>${escapeHtml(lead.service_type)}</strong></p>
          <p style="margin:4px 0;color:#555;font-size:14px;">📍 Şehir: <strong>${escapeHtml(lead.city)}</strong></p>
        </div>
        <p style="color:#999;font-size:12px;">Bu e-posta Peyzajbul tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    `,
  };
}

export function createSpendHandler(deps: SpendDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!token) return json({ error: "Oturum gerekli" }, 401);

      const { data: userData, error: userError } = await deps.authClient.auth.getUser(token);
      const user = userData?.user;
      if (userError || !user) return json({ error: "Oturum gerekli" }, 401);

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Geçersiz istek" }, 400);
      }
      const parsed = spendSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Geçersiz lead_id formatı" }, 400);
      const { lead_id } = parsed.data;

      const { data: purchase, error: rpcError } = await deps.admin.rpc("purchase_lead", {
        p_uid: user.id,
        p_lead: lead_id,
      });

      if (rpcError) {
        const code = String(rpcError.message ?? "").trim();
        const message = RPC_ERROR_MESSAGES[code];
        if (message) {
          return json({ success: false, error: message, code }, 200);
        }
        console.error("[spend-coins] purchase_lead failed:", rpcError.code, redact(code));
        return json({ error: "İşlem tamamlanamadı, lütfen tekrar deneyin" }, 500);
      }

      // Lead sahibine bilgilendirme e-postasi (engellemeyen)
      try {
        const { data: lead } = await deps.admin
          .from("leads")
          .select("email, full_name, service_type, city")
          .eq("id", lead_id)
          .maybeSingle();

        if (lead?.email) {
          const mail = buildLeadEmail(lead, purchase?.company_name ?? null);
          await deps.sendEmail({ to: lead.email, ...mail });
        }
      } catch (emailErr) {
        console.error("[spend-coins] lead notification email failed:", redact(String(emailErr)));
      }

      return json({ success: true, new_balance: purchase?.new_balance }, 200);
    } catch (error) {
      console.error("[spend-coins] unexpected error:", redact(String(error)));
      return json({ error: "İşlem tamamlanamadı, lütfen tekrar deneyin" }, 500);
    }
  };
}
