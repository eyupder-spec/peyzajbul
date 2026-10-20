import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createCoinCheckoutHandler } from "./checkout.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(
  createCoinCheckoutHandler({
    authClient: createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", clientOptions),
    admin: createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", clientOptions),
    stripe: {
      createCustomer: (params) => stripe.customers.create(params),
      createCheckoutSession: (params) => stripe.checkout.sessions.create(params),
    },
    env: (name) => Deno.env.get(name),
  }),
);
