-- Pending operational anomalies may not have an on-chain transaction yet.
-- Keep confirmed operations reconcilable by tx hash, but do not require a fake
-- zero hash for admin follow-up items.
ALTER TABLE public.operation_reconciliation_queue
  ALTER COLUMN tx_hash DROP NOT NULL;

ALTER TABLE public.operation_reconciliation_queue
  ADD CONSTRAINT operation_reconciliation_queue_tx_hash_format_check
  CHECK (tx_hash IS NULL OR tx_hash ~* '^0x[a-f0-9]{64}$');
