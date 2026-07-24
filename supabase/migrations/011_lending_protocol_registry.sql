-- Lending protocol registry for multi-protocol routing.

CREATE TABLE IF NOT EXISTS public.lending_protocol_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id TEXT NOT NULL,
  protocol_name TEXT NOT NULL,
  runtime TEXT NOT NULL,
  adapter_kind TEXT NOT NULL,
  chain_id INTEGER,
  adapter_address TEXT,
  market_address TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'research',
  production_ready BOOLEAN NOT NULL DEFAULT FALSE,
  risk_tier TEXT NOT NULL DEFAULT 'high',
  docs_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (runtime IN ('evm', 'solana', 'evm_special')),
  CHECK (status IN ('active', 'planned', 'blocked', 'research')),
  CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
  UNIQUE(protocol_id, chain_id, adapter_address, market_address)
);

CREATE INDEX IF NOT EXISTS idx_lending_protocol_routes_status
  ON public.lending_protocol_routes(status, production_ready);

CREATE INDEX IF NOT EXISTS idx_lending_protocol_routes_protocol_chain
  ON public.lending_protocol_routes(protocol_id, chain_id);

ALTER TABLE public.lending_protocol_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read lending protocol routes" ON public.lending_protocol_routes;
CREATE POLICY "Admins read lending protocol routes"
  ON public.lending_protocol_routes
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::BOOLEAN IS TRUE);

DROP POLICY IF EXISTS "Service role manages lending protocol routes" ON public.lending_protocol_routes;
CREATE POLICY "Service role manages lending protocol routes"
  ON public.lending_protocol_routes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
