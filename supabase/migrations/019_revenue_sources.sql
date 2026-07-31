-- Migration 019: revenue_sources
-- Canonical source of truth for Instead revenue sources and fiat prices.

CREATE TABLE IF NOT EXISTS public.revenue_sources (
  source_code       TEXT        PRIMARY KEY,
  label             TEXT        NOT NULL,
  vertical          TEXT        NOT NULL CHECK (vertical IN ('token_factory', 'lending', 'services')),
  category          TEXT        NOT NULL CHECK (category IN ('transactional', 'subscription', 'service', 'spread_or_fee', 'b2b')),
  revenue_model     TEXT        NOT NULL,
  billing_interval  TEXT        NOT NULL CHECK (billing_interval IN ('one_time', 'monthly', 'usage', 'per_transaction')),
  status            TEXT        NOT NULL CHECK (status IN ('active', 'ready', 'planned')),
  production_ready  BOOLEAN     NOT NULL DEFAULT FALSE,
  amount_usd_cents  INTEGER     CHECK (amount_usd_cents IS NULL OR amount_usd_cents > 0),
  amount_brl_cents  INTEGER     CHECK (amount_brl_cents IS NULL OR amount_brl_cents > 0),
  take_rate_bps     INTEGER     CHECK (take_rate_bps IS NULL OR (take_rate_bps >= 0 AND take_rate_bps <= 10000)),
  notes             TEXT        NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.revenue_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_sources_select_all" ON public.revenue_sources;
CREATE POLICY "revenue_sources_select_all"
  ON public.revenue_sources
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "revenue_sources_write_service_role" ON public.revenue_sources;
CREATE POLICY "revenue_sources_write_service_role"
  ON public.revenue_sources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.revenue_sources (
  source_code, label, vertical, category, revenue_model, billing_interval, status,
  production_ready, amount_usd_cents, amount_brl_cents, take_rate_bps, notes
)
VALUES
  ('token_deploy_basic', 'Token Deploy Basic', 'token_factory', 'transactional', 'Preco fixo por deploy assistido basico', 'one_time', 'active', TRUE, 1900, 9900, NULL, 'Checkout Stripe/Pagar.me e execucao via factory EVM.'),
  ('token_deploy_premium', 'Token Deploy Premium', 'token_factory', 'service', 'Pacote premium com configuracao, publicacao e validacao', 'one_time', 'active', TRUE, 4900, 19900, NULL, 'Deploy com suporte humano.'),
  ('token_fair_launch_assisted', 'Fair Launch Assistido', 'token_factory', 'service', 'Servico assistido de lancamento e liquidez inicial', 'one_time', 'active', TRUE, 15900, 79900, NULL, 'Preparacao, checklist e acompanhamento de lancamento.'),
  ('lending_borrow_fee', 'Lending Borrow Fee', 'lending', 'spread_or_fee', 'Taxa de conveniencia cobrada no borrow on-chain', 'per_transaction', 'active', TRUE, NULL, NULL, 150, 'Configurado no contrato de lending; 150 bps por borrow.'),
  ('lending_pro_subscription', 'Lending Pro', 'lending', 'subscription', 'Assinatura mensal para alertas, analytics e limites avancados', 'monthly', 'ready', TRUE, 2900, 14900, NULL, 'Camada premium de acompanhamento.'),
  ('liquidation_alerts_premium', 'Alertas Premium de Liquidacao', 'lending', 'subscription', 'Assinatura de alertas multicanal para health factor e risco', 'monthly', 'ready', TRUE, 900, 4900, NULL, 'Aproveita Telegram e monitoramento.'),
  ('deleverage_assisted', 'Deleverage Assistido', 'lending', 'service', 'Servico pontual para reduzir risco de posicao alavancada', 'one_time', 'ready', TRUE, 5900, 74900, NULL, 'Suporte operacional em momentos de stress.'),
  ('leverage_strategy_execution', 'Execucao de Estrategia Alavancada', 'lending', 'service', 'Taxa por execucao guiada de estrategia de lending', 'per_transaction', 'ready', TRUE, 9900, 49900, NULL, 'Rota operacional com suporte.'),
  ('auto_rebalance_protection', 'Protecao Auto-Rebalance', 'lending', 'subscription', 'Assinatura para automacoes de protecao e rebalanceamento', 'monthly', 'ready', TRUE, 7900, 39900, NULL, 'Comeca como alerta/recomendacao e evolui para automacao autorizada.'),
  ('wealth_dashboard_subscription', 'Wealth Dashboard', 'services', 'subscription', 'Assinatura de dashboard patrimonial DeFi/multichain', 'monthly', 'ready', TRUE, 2900, 14900, NULL, 'Leitura consolidada de posicoes, saldos e risco.'),
  ('white_glove_lending', 'White-glove Lending Desk', 'lending', 'service', 'Atendimento premium para estruturacao de credito com colateral', 'one_time', 'ready', TRUE, 29900, 149900, NULL, 'Servico humano para tickets maiores.'),
  ('b2b_lending_widget_api', 'B2B Lending Widget/API', 'services', 'b2b', 'Licenca mensal ou uso para parceiros embedarem lending', 'monthly', 'ready', TRUE, 19900, 99900, NULL, 'Fonte B2B para comunidades, wallets, agencias e fintechs.'),
  ('multi_protocol_routing_fee', 'Taxa de Roteamento Multi-protocolo', 'lending', 'spread_or_fee', 'Fee por roteamento para melhor mercado/protocolo', 'per_transaction', 'ready', TRUE, NULL, NULL, 120, 'Monetiza roteador e curadoria de execucao.'),
  ('risk_shield_membership', 'Risk Shield Membership', 'lending', 'subscription', 'Membro premium com relatorios, limites e playbooks de risco', 'monthly', 'ready', TRUE, 3900, 19900, NULL, 'Analise de risco, alertas e suporte recorrente.')
ON CONFLICT (source_code) DO UPDATE SET
  label = EXCLUDED.label,
  vertical = EXCLUDED.vertical,
  category = EXCLUDED.category,
  revenue_model = EXCLUDED.revenue_model,
  billing_interval = EXCLUDED.billing_interval,
  status = EXCLUDED.status,
  production_ready = EXCLUDED.production_ready,
  amount_usd_cents = EXCLUDED.amount_usd_cents,
  amount_brl_cents = EXCLUDED.amount_brl_cents,
  take_rate_bps = EXCLUDED.take_rate_bps,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO public.platform_prices (product_code, label, amount_usd_cents, amount_brl_cents)
VALUES
  ('lending_pro_subscription', 'Instead Lending Pro', 2900, 14900),
  ('liquidation_alerts_premium', 'Instead Alertas Premium de Liquidacao', 900, 4900),
  ('deleverage_assisted', 'Instead Deleverage Assistido', 5900, 74900),
  ('leverage_strategy_execution', 'Instead Execucao de Estrategia Alavancada', 9900, 49900),
  ('auto_rebalance_protection', 'Instead Protecao Auto-Rebalance', 7900, 39900),
  ('wealth_dashboard_subscription', 'Instead Wealth Dashboard', 2900, 14900),
  ('white_glove_lending', 'Instead White-glove Lending Desk', 29900, 149900),
  ('b2b_lending_widget_api', 'Instead B2B Lending Widget/API', 19900, 99900),
  ('risk_shield_membership', 'Instead Risk Shield Membership', 3900, 19900)
ON CONFLICT (product_code) DO UPDATE SET
  label = EXCLUDED.label,
  amount_usd_cents = EXCLUDED.amount_usd_cents,
  amount_brl_cents = EXCLUDED.amount_brl_cents,
  is_active = TRUE,
  updated_at = NOW();
