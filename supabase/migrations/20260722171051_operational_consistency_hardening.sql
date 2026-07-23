-- Operational consistency hardening for autonomous prime-broker flows.
-- The goal is to make off-chain state idempotent, owner-scoped and reconcilable
-- against transaction hashes emitted by the on-chain broker contracts.

ALTER TABLE public.generated_tokens
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.generated_tokens
SET tx_hash = lower(tx_hash)
WHERE tx_hash <> lower(tx_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_tokens_tx_hash_chain_unique
  ON public.generated_tokens(tx_hash, chain_id);

ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS operation_id TEXT,
  ADD COLUMN IF NOT EXISTS tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

UPDATE public.audits
SET
  tx_hash = COALESCE(tx_hash, metadata ->> 'tx_hash'),
  chain_id = COALESCE(
    chain_id,
    CASE
      WHEN (metadata ->> 'chain_id') ~ '^[0-9]+$' THEN (metadata ->> 'chain_id')::INTEGER
      ELSE NULL
    END
  ),
  operation_id = COALESCE(
    operation_id,
    lower(user_wallet) || ':' || action || ':' || COALESCE(metadata ->> 'tx_hash', id::TEXT)
  )
WHERE operation_id IS NULL;

ALTER TABLE public.audits
  ALTER COLUMN operation_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audits_operation_id_unique
  ON public.audits(operation_id);

CREATE INDEX IF NOT EXISTS idx_audits_tx_hash
  ON public.audits(lower(tx_hash))
  WHERE tx_hash IS NOT NULL;

ALTER TABLE public.lending_positions
  ADD COLUMN IF NOT EXISTS last_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS operation_status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS position_version BIGINT NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lending_positions_last_tx_hash_unique
  ON public.lending_positions(lower(last_tx_hash))
  WHERE last_tx_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.operation_reconciliation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id TEXT NOT NULL UNIQUE,
  user_wallet TEXT NOT NULL,
  vertical TEXT NOT NULL,
  action TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  expected_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (vertical IN ('lending', 'token_factory', 'staking')),
  CHECK (status IN ('pending', 'confirmed', 'mismatch', 'failed', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_operation_reconciliation_queue_status_next
  ON public.operation_reconciliation_queue(status, next_check_at);

ALTER TABLE public.operation_reconciliation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their reconciliation operations" ON public.operation_reconciliation_queue;
CREATE POLICY "Users read their reconciliation operations"
  ON public.operation_reconciliation_queue
  FOR SELECT
  TO authenticated
  USING (lower(user_wallet) = lower(auth.jwt() ->> 'wallet_address'));

DROP POLICY IF EXISTS "Users insert their reconciliation operations" ON public.operation_reconciliation_queue;
CREATE POLICY "Users insert their reconciliation operations"
  ON public.operation_reconciliation_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(user_wallet) = lower(auth.jwt() ->> 'wallet_address'));

DROP POLICY IF EXISTS "Service role manages reconciliation operations" ON public.operation_reconciliation_queue;
CREATE POLICY "Service role manages reconciliation operations"
  ON public.operation_reconciliation_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção de audits" ON public.audits;
DROP POLICY IF EXISTS "Permitir inserÃ§Ã£o de audits" ON public.audits;
CREATE POLICY "Usuarios inserem suas proprias auditorias"
  ON public.audits
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(user_wallet) = lower(auth.jwt() ->> 'wallet_address'));

DROP POLICY IF EXISTS "Permitir update de posições" ON public.lending_positions;
DROP POLICY IF EXISTS "Permitir update de posiÃ§Ãµes" ON public.lending_positions;
DROP POLICY IF EXISTS "Permitir update de posiÃƒÂ§ÃƒÂµes" ON public.lending_positions;
CREATE POLICY "Usuarios atualizam suas proprias posicoes"
  ON public.lending_positions
  FOR UPDATE
  TO authenticated
  USING (lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address'))
  WITH CHECK (lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address'));

DROP POLICY IF EXISTS "Service role reads observability" ON public.observability_events;
CREATE POLICY "Service role reads observability"
  ON public.observability_events
  FOR SELECT
  TO service_role
  USING (true);
