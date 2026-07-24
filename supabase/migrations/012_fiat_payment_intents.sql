-- Migration: 012_fiat_payment_intents
-- Registra pagamentos fiat para verticais comerciais sem expor dados sensiveis de cartao.

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  provider_checkout_url TEXT,
  vertical TEXT NOT NULL,
  product_code TEXT NOT NULL,
  wallet_address TEXT,
  email TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_intents_provider_check CHECK (provider IN ('stripe', 'pagarme')),
  CONSTRAINT payment_intents_vertical_check CHECK (vertical IN ('token_factory', 'lending', 'staking', 'services')),
  CONSTRAINT payment_intents_status_check CHECK (status IN ('created', 'pending', 'paid', 'failed', 'canceled', 'refunded')),
  CONSTRAINT payment_intents_amount_check CHECK (amount_cents > 0),
  CONSTRAINT payment_intents_currency_check CHECK (currency IN ('usd', 'brl'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_provider_reference_unique
  ON public.payment_intents(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_wallet_created
  ON public.payment_intents(lower(wallet_address), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status_created
  ON public.payment_intents(status, created_at DESC);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own payment intents"
  ON public.payment_intents
  FOR SELECT
  USING (
    wallet_address IS NOT NULL
    AND lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address')
  );

CREATE POLICY "Admins read payment intents"
  ON public.payment_intents
  FOR SELECT
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Service role manages payment intents"
  ON public.payment_intents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
