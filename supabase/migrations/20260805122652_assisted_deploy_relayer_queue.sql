CREATE TABLE IF NOT EXISTS public.assisted_token_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  factory_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  initial_supply NUMERIC NOT NULL,
  max_supply NUMERIC NOT NULL,
  mintable BOOLEAN NOT NULL DEFAULT false,
  taxable BOOLEAN NOT NULL DEFAULT false,
  tax_bps INTEGER NOT NULL DEFAULT 0,
  has_blacklist BOOLEAN NOT NULL DEFAULT false,
  burn_tax BOOLEAN NOT NULL DEFAULT false,
  max_wallet_bps INTEGER NOT NULL DEFAULT 0,
  relayer_wallet TEXT,
  tx_hash TEXT,
  token_address TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assisted_token_deployments_status_check CHECK (status IN ('queued', 'executing', 'confirmed', 'failed', 'cancelled')),
  CONSTRAINT assisted_token_deployments_wallet_check CHECK (wallet_address ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT assisted_token_deployments_factory_check CHECK (factory_address ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT assisted_token_deployments_tx_check CHECK (tx_hash IS NULL OR tx_hash ~* '^0x[a-f0-9]{64}$'),
  CONSTRAINT assisted_token_deployments_token_check CHECK (token_address IS NULL OR token_address ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT assisted_token_deployments_supply_check CHECK (initial_supply > 0 AND max_supply >= initial_supply),
  CONSTRAINT assisted_token_deployments_tax_check CHECK (tax_bps >= 0 AND tax_bps <= 2500),
  CONSTRAINT assisted_token_deployments_max_wallet_check CHECK (max_wallet_bps >= 0 AND max_wallet_bps <= 10000)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assisted_token_deployments_payment
  ON public.assisted_token_deployments(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_assisted_token_deployments_worker
  ON public.assisted_token_deployments(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_assisted_token_deployments_wallet
  ON public.assisted_token_deployments(lower(wallet_address), created_at DESC);

ALTER TABLE public.assisted_token_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own assisted token deployments" ON public.assisted_token_deployments;
CREATE POLICY "Users read own assisted token deployments"
  ON public.assisted_token_deployments
  FOR SELECT
  TO authenticated
  USING (lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address'));

DROP POLICY IF EXISTS "Admins read assisted token deployments" ON public.assisted_token_deployments;
CREATE POLICY "Admins read assisted token deployments"
  ON public.assisted_token_deployments
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages assisted token deployments" ON public.assisted_token_deployments;
CREATE POLICY "Service role manages assisted token deployments"
  ON public.assisted_token_deployments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.assisted_token_deployments TO authenticated;
GRANT ALL ON public.assisted_token_deployments TO service_role;
