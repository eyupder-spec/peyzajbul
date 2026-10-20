import type Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.peyzajbul.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type PlanKind = "coin_pack" | "pro_sub";

export interface PricingPlan {
  id: string;
  kind: PlanKind;
  name: string;
  coins: number | null;
  billing_interval: "month" | "year" | null;
  unit_amount_minor: number;
  currency: string;
  stripe_price_id: string | null;
}

export interface CheckoutFirm {
  id: string;
  company_name: string | null;
  email: string | null;
  stripe_customer_id: string | null;
}

export interface CheckoutUser {
  id: string;
  email: string | null;
}

// Stripe SDK'sinin kullandigimiz iki cagrisi; testlerde sahtesi verilir
export interface StripeLike {
  createCustomer(params: Stripe.CustomerCreateParams): Promise<{ id: string }>;
  createCheckoutSession(params: Stripe.Checkout.SessionCreateParams): Promise<{ url: string | null }>;
}

export interface CheckoutDeps {
  authClient: Pick<SupabaseClient, "auth">;
  admin: SupabaseClient;
  stripe: StripeLike;
  env: (name: string) => string | undefined;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// Is mantigi hatalari HTTP 200 + {error, code} doner: arayuz yalnizca data.error'i okur
export function businessError(error: string, code: string): Response {
  return json({ error, code }, 200);
}

export async function requireUser(req: Request, authClient: Pick<SupabaseClient, "auth">): Promise<CheckoutUser | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

// Yonlendirme adresi YALNIZCA sunucu ortamindan gelir (SITE_URL, https). Istemcinin
// Origin basligi asla kullanilmaz. Gecersiz/eksik ise null: oturum olusturulmaz.
export function getSiteUrl(env: (name: string) => string | undefined): string | null {
  const raw = env("SITE_URL")?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export async function loadPlan(admin: SupabaseClient, id: string, kind: PlanKind): Promise<PricingPlan | null> {
  if (!id) return null;

  const { data, error } = await admin
    .from("pricing_plans")
    .select("id, kind, name, coins, billing_interval, unit_amount_minor, currency, stripe_price_id")
    .eq("id", id)
    .eq("kind", kind)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(`pricing_plans lookup failed: ${error.message}`);
  return (data as PricingPlan | null) ?? null;
}

// Kullanicinin tam olarak tek firmasi olmali (ice aktarilan firmalar ayni admin
// kullanicisini paylasabilir; belirsiz firmaya odeme alinmaz).
export async function loadSingleFirm(admin: SupabaseClient, userId: string): Promise<CheckoutFirm | null> {
  const { data, error } = await admin
    .from("firms")
    .select("id, company_name, email, stripe_customer_id")
    .eq("user_id", userId)
    .limit(2);

  if (error) throw new Error(`firms lookup failed: ${error.message}`);
  const rows = (data ?? []) as CheckoutFirm[];
  return rows.length === 1 ? rows[0] : null;
}

async function createCustomer(
  admin: SupabaseClient,
  stripe: StripeLike,
  firm: CheckoutFirm,
  user: CheckoutUser,
): Promise<string> {
  const customer = await stripe.createCustomer({
    email: firm.email ?? user.email ?? undefined,
    name: firm.company_name ?? undefined,
    metadata: { firm_id: firm.id, supabase_user_id: user.id },
  });

  const { error } = await admin.from("firms").update({ stripe_customer_id: customer.id }).eq("id", firm.id);
  if (error) throw new Error(`stripe_customer_id could not be saved: ${error.message}`);

  return customer.id;
}

export async function getOrCreateCustomer(
  admin: SupabaseClient,
  stripe: StripeLike,
  firm: CheckoutFirm,
  user: CheckoutUser,
): Promise<string> {
  if (firm.stripe_customer_id) return firm.stripe_customer_id;
  return await createCustomer(admin, stripe, firm, user);
}

// Stripe "No such customer" doner: kayitli musteri bu hesapta/modda yok (test -> canli
// gecis, hesap degisikligi veya silinmis musteri).
export function isMissingCustomerError(error: unknown): boolean {
  const { code, param, message } = (error ?? {}) as { code?: unknown; param?: unknown; message?: unknown };
  return code === "resource_missing" && (param === "customer" || /no such customer/i.test(String(message ?? "")));
}

// Kayitli musteri Stripe'ta yoksa yeni musteri olusturulur, firms.stripe_customer_id
// uzerine yazilir ve oturum bir kez daha denenir; aksi halde firma bir daha odeme yapamaz.
export async function createSessionForFirm(
  admin: SupabaseClient,
  stripe: StripeLike,
  firm: CheckoutFirm,
  user: CheckoutUser,
  buildSession: (customerId: string) => Stripe.Checkout.SessionCreateParams,
): Promise<{ url: string | null }> {
  const customerId = await getOrCreateCustomer(admin, stripe, firm, user);

  try {
    return await stripe.createCheckoutSession(buildSession(customerId));
  } catch (error) {
    if (!firm.stripe_customer_id || !isMissingCustomerError(error)) throw error;

    const freshCustomerId = await createCustomer(admin, stripe, firm, user);
    return await stripe.createCheckoutSession(buildSession(freshCustomerId));
  }
}

export function createCoinCheckoutHandler(deps: CheckoutDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const user = await requireUser(req, deps.authClient);
      if (!user) return json({ error: "Oturum gerekli" }, 401);

      const siteUrl = getSiteUrl(deps.env);
      if (!siteUrl) {
        console.error("[create-coin-checkout] SITE_URL is missing or not https");
        return json({ error: "Ödeme sistemi yapılandırılmamış", code: "site_url_missing" }, 500);
      }

      let packageId = "";
      try {
        const body = await req.json();
        if (typeof body?.package_id === "string") packageId = body.package_id;
      } catch {
        // govde okunamadi: paket bulunamadi olarak ele alinir
      }

      const plan = await loadPlan(deps.admin, packageId, "coin_pack");
      if (!plan || !plan.coins || plan.coins <= 0) {
        return businessError("Paket bulunamadı veya şu an satışta değil", "plan_unavailable");
      }

      const firm = await loadSingleFirm(deps.admin, user.id);
      if (!firm) {
        return businessError("Önce firma hesabınızı tamamlayın", "firm_required");
      }

      const session = await createSessionForFirm(deps.admin, deps.stripe, firm, user, (customerId) => ({
        mode: "payment",
        customer: customerId,
        locale: "tr",
        client_reference_id: firm.id,
        line_items: [
          plan.stripe_price_id
            ? { price: plan.stripe_price_id, quantity: 1 }
            : {
              price_data: {
                currency: plan.currency,
                unit_amount: plan.unit_amount_minor,
                product_data: { name: `${plan.name} - ${plan.coins} jeton` },
              },
              quantity: 1,
            },
        ],
        metadata: {
          kind: "coin_pack",
          firm_id: firm.id,
          firm_user_id: user.id,
          package_id: plan.id,
          plan_id: plan.id,
          coins: String(plan.coins),
        },
        payment_intent_data: {
          metadata: { kind: "coin_pack", firm_id: firm.id, plan_id: plan.id },
        },
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        customer_update: { name: "auto", address: "auto" },
        success_url: `${siteUrl}/firma/jeton?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/firma/jeton`,
      }));

      if (!session.url) throw new Error("Stripe session has no url");
      return json({ url: session.url }, 200);
    } catch (error) {
      console.error("[create-coin-checkout] failed:", error instanceof Error ? error.message : String(error));
      return json({ error: "Ödeme başlatılamadı, lütfen tekrar deneyin" }, 500);
    }
  };
}
