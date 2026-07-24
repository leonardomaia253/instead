-- Migration 015: platform_prices
-- Tabela de preços configuráveis pelo admin sem redeploy de código.
-- Fonte única da verdade para todos os produtos fiat da plataforma.

CREATE TABLE IF NOT EXISTS public.platform_prices (
  product_code     TEXT        PRIMARY KEY,
  label            TEXT        NOT NULL,
  amount_usd_cents INTEGER     NOT NULL CHECK (amount_usd_cents > 0),
  amount_brl_cents INTEGER     NOT NULL CHECK (amount_brl_cents > 0),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       TEXT        -- wallet address do admin que fez o update
);

-- RLS obrigatório
ALTER TABLE public.platform_prices ENABLE ROW LEVEL SECURITY;

-- Leitura pública (server-side usa service_role que bypassa RLS)
CREATE POLICY "platform_prices_select_all"
  ON public.platform_prices
  FOR SELECT
  USING (true);

-- Escrita exclusiva para service_role
CREATE POLICY "platform_prices_write_service_role"
  ON public.platform_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed inicial — espelha exatamente o objeto TOKEN_FACTORY_PRODUCTS de payments.ts
INSERT INTO public.platform_prices (product_code, label, amount_usd_cents, amount_brl_cents)
VALUES
  ('token_deploy_basic',         'Instead Token Deploy Basic',         9900,  49900),
  ('token_deploy_premium',       'Instead Token Deploy Premium',      29900, 149900),
  ('token_fair_launch_assisted', 'Instead Fair Launch Assistido',     49900, 249900)
ON CONFLICT (product_code) DO NOTHING;
