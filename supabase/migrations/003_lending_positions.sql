-- Migration: 003_lending_positions
-- Cria tabela para rastrear posições de lending dos usuários

CREATE TABLE IF NOT EXISTS public.lending_positions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address    TEXT NOT NULL,
  collateral_asset  TEXT NOT NULL,
  borrow_asset      TEXT NOT NULL,
  collateral_amount NUMERIC NOT NULL DEFAULT 0,
  borrowed_amount   NUMERIC NOT NULL DEFAULT 0,
  health_factor     NUMERIC NOT NULL DEFAULT 999,
  chain_id          INTEGER NOT NULL,
  is_liquidatable   BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_address, borrow_asset, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_lending_wallet ON public.lending_positions(wallet_address);

ALTER TABLE public.lending_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posições são públicas para leitura"
  ON public.lending_positions
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir upsert de posições"
  ON public.lending_positions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir update de posições"
  ON public.lending_positions
  FOR UPDATE
  USING (wallet_address = (auth.jwt() ->> 'wallet_address'));
