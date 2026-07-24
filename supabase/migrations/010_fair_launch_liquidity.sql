-- On-chain fair launch liquidity metadata.

ALTER TABLE public.generated_tokens
  ADD COLUMN IF NOT EXISTS liquidity_eth NUMERIC,
  ADD COLUMN IF NOT EXISTS lp_recipient TEXT,
  ADD COLUMN IF NOT EXISTS lp_lock_status TEXT NOT NULL DEFAULT 'creator_received';

ALTER TABLE public.generated_tokens
  DROP CONSTRAINT IF EXISTS generated_tokens_lp_lock_status_check,
  ADD CONSTRAINT generated_tokens_lp_lock_status_check
    CHECK (lp_lock_status IN ('creator_received', 'burned', 'locked', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_generated_tokens_lp_recipient
  ON public.generated_tokens(lower(lp_recipient))
  WHERE lp_recipient IS NOT NULL;
