-- Migration: 005_siwe_auth_nonces
-- Nonces de login SIWE para impedir replay de assinaturas.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.siwe_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  domain TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_siwe_nonces_wallet ON public.siwe_nonces(wallet_address);
CREATE INDEX IF NOT EXISTS idx_siwe_nonces_expires ON public.siwe_nonces(expires_at);

ALTER TABLE public.siwe_nonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages siwe nonces" ON public.siwe_nonces;
CREATE POLICY "Service role manages siwe nonces"
  ON public.siwe_nonces
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
