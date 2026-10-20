-- Add premium feature columns to firms table
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS trust_badges    jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS faq_items       jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS before_after    jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS portfolio_items jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS response_time   text,
  ADD COLUMN IF NOT EXISTS avg_rating      numeric(3,1),
  ADD COLUMN IF NOT EXISTS review_count    integer DEFAULT 0;
