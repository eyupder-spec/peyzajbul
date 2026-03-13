-- Migration to add Stripe subscription columns to firms table
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_plan      text; -- 'monthly', 'yearly'

-- Indexing for faster lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_firms_stripe_customer_id ON public.firms(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_firms_stripe_subscription_id ON public.firms(stripe_subscription_id);
