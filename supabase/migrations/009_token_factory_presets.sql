-- Token factory competitive presets and advanced launch metadata.

ALTER TABLE public.generated_tokens
  ADD COLUMN IF NOT EXISTS token_template TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS launch_mode TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS taxable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tax_bps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS burn_tax BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_wallet_bps INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.generated_tokens
  DROP CONSTRAINT IF EXISTS generated_tokens_token_template_check,
  ADD CONSTRAINT generated_tokens_token_template_check
    CHECK (token_template IN ('standard', 'ultimate', 'fair_launch', 'deflationary', 'superchain'));

ALTER TABLE public.generated_tokens
  DROP CONSTRAINT IF EXISTS generated_tokens_launch_mode_check,
  ADD CONSTRAINT generated_tokens_launch_mode_check
    CHECK (launch_mode IN ('standard', 'fair_launch', 'assisted', 'superchain'));

ALTER TABLE public.generated_tokens
  DROP CONSTRAINT IF EXISTS generated_tokens_tax_bps_check,
  ADD CONSTRAINT generated_tokens_tax_bps_check
    CHECK (tax_bps >= 0 AND tax_bps <= 2500);

ALTER TABLE public.generated_tokens
  DROP CONSTRAINT IF EXISTS generated_tokens_max_wallet_bps_check,
  ADD CONSTRAINT generated_tokens_max_wallet_bps_check
    CHECK (max_wallet_bps >= 0 AND max_wallet_bps <= 10000);

CREATE INDEX IF NOT EXISTS idx_generated_tokens_template_created
  ON public.generated_tokens(token_template, created_at DESC);
