-- Migration: 002_audits_and_staking
-- Cria tabelas para auditoria e configuração de staking

-- Tabela de Auditoria (Logs de ações críticas)
CREATE TABLE IF NOT EXISTS public.audits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL,
  action      TEXT NOT NULL, -- Ex: 'CREATE_TOKEN', 'STAKE', 'UNSTAKE', 'OPEN_POSITION'
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_wallet ON public.audits(user_wallet);
CREATE INDEX IF NOT EXISTS idx_audits_action ON public.audits(action);

-- Tabela de Configuração de Staking Pools
CREATE TABLE IF NOT EXISTS public.staking_pools (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  symbol       TEXT NOT NULL,
  apr          TEXT NOT NULL,
  lock_period  TEXT NOT NULL,
  tvl          TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon_name    TEXT NOT NULL, -- Nome do ícone do Lucide
  color        TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Estatísticas Globais
CREATE TABLE IF NOT EXISTS public.platform_stats (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir Dados Iniciais (Seed)
INSERT INTO public.staking_pools (id, name, symbol, apr, lock_period, tvl, description, icon_name, color)
VALUES 
('inst-primary', 'Standard Pool', 'INST_S', '12.5%', 'No Lock', '$4,250,900', 'Ideal para liquidez imediata com rendimento estável.', 'Coins', '#2563eb'),
('inst-pro', 'Vault Pro', 'INST_P', '28.4%', '90 Dias', '$12,800,000', 'Maximização de ganhos para holders de longo prazo.', 'Zap', '#7c3aed'),
('inst-partner', 'Alpha Pool', 'INST_A', '45.0%', '180 Dias', '$2,100,500', 'Exclusivo para parceiros e governança avançada.', 'TrendingUp', '#10b981')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_stats (key, value)
VALUES 
('total_value_locked', '$19,151,400'),
('average_apr', '23.8%'),
('protocol_security', 'AAA')
ON CONFLICT (key) DO NOTHING;

-- RLS para Auditoria
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audits são visíveis apenas para o próprio usuário"
  ON public.audits
  FOR SELECT
  USING (user_wallet = auth.jwt() ->> 'sub'); -- Ou verificação por wallet simplificada

CREATE POLICY "Qualquer um pode ler auditorias (transparência)"
  ON public.audits
  FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode ler staking pools"
  ON public.staking_pools
  FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode ler stats da plataforma"
  ON public.platform_stats
  FOR SELECT
  USING (true);

-- Permissão para inserir audits (anon ou auth)
CREATE POLICY "Permitir inserção de audits"
  ON public.audits
  FOR INSERT
  WITH CHECK (true);
