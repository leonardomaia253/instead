-- Migration 019: revenue_sources
-- Fonte unica da verdade para contabilizar e auditar todas as fontes de receita da Instead.

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
  ('token_deploy_basic', 'Token Deploy Basic', 'token_factory', 'transactional', 'Preço fixo por deploy assistido básico', 'one_time', 'active', TRUE, 9900, 49900, NULL, 'Checkout Stripe/Pagar.me e execução via factory EVM.'),
  ('token_deploy_premium', 'Token Deploy Premium', 'token_factory', 'service', 'Pacote premium com configuração, publicação e validação', 'one_time', 'active', TRUE, 29900, 149900, NULL, 'Deploy com suporte humano.'),
  ('token_fair_launch_assisted', 'Fair Launch Assistido', 'token_factory', 'service', 'Serviço assistido de lançamento e liquidez inicial', 'one_time', 'active', TRUE, 49900, 249900, NULL, 'Preparação, checklist e acompanhamento de lançamento.'),
  ('lending_borrow_fee', 'Lending Borrow Fee', 'lending', 'spread_or_fee', 'Taxa de conveniência cobrada no borrow on-chain', 'per_transaction', 'active', TRUE, NULL, NULL, 50, 'Configurado no contrato de lending; 50 bps por borrow.'),
  ('lending_pro_subscription', 'Lending Pro', 'lending', 'subscription', 'Assinatura mensal para alertas, analytics e limites avançados', 'monthly', 'ready', TRUE, 4900, 24900, NULL, 'Camada premium de acompanhamento.'),
  ('liquidation_alerts_premium', 'Alertas Premium de Liquidação', 'lending', 'subscription', 'Assinatura de alertas multicanal para health factor e risco', 'monthly', 'ready', TRUE, 1900, 9900, NULL, 'Aproveita Telegram e monitoramento.'),
  ('deleverage_assisted', 'Deleverage Assistido', 'lending', 'service', 'Serviço pontual para reduzir risco de posição alavancada', 'one_time', 'ready', TRUE, 14900, 74900, NULL, 'Suporte operacional em momentos de stress.'),
  ('leverage_strategy_execution', 'Execução de Estratégia Alavancada', 'lending', 'service', 'Taxa por execução guiada de estratégia de lending', 'per_transaction', 'ready', TRUE, 9900, 49900, NULL, 'Rota operacional com suporte.'),
  ('auto_rebalance_protection', 'Proteção Auto-Rebalance', 'lending', 'subscription', 'Assinatura para automações de proteção e rebalanceamento', 'monthly', 'ready', TRUE, 7900, 39900, NULL, 'Começa como alerta/recomendação e evolui para automação autorizada.'),
  ('wealth_dashboard_subscription', 'Wealth Dashboard', 'services', 'subscription', 'Assinatura de dashboard patrimonial DeFi/multichain', 'monthly', 'ready', TRUE, 4900, 24900, NULL, 'Leitura consolidada de posições, saldos e risco.'),
  ('white_glove_lending', 'White-glove Lending Desk', 'lending', 'service', 'Atendimento premium para estruturação de crédito com colateral', 'one_time', 'ready', TRUE, 99900, 499900, NULL, 'Serviço humano para tickets maiores.'),
  ('b2b_lending_widget_api', 'B2B Lending Widget/API', 'services', 'b2b', 'Licença mensal ou uso para parceiros embedarem lending', 'monthly', 'ready', TRUE, 49900, 249900, NULL, 'Fonte B2B para comunidades, wallets, agências e fintechs.'),
  ('multi_protocol_routing_fee', 'Taxa de Roteamento Multi-protocolo', 'lending', 'spread_or_fee', 'Fee por roteamento para melhor mercado/protocolo', 'per_transaction', 'ready', TRUE, NULL, NULL, 20, 'Monetiza roteador e curadoria de execução.'),
  ('risk_shield_membership', 'Risk Shield Membership', 'lending', 'subscription', 'Membro premium com relatórios, limites e playbooks de risco', 'monthly', 'ready', TRUE, 9900, 49900, NULL, 'Análise de risco, alertas e suporte recorrente.')
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
  ('lending_pro_subscription', 'Instead Lending Pro', 4900, 24900),
  ('liquidation_alerts_premium', 'Instead Alertas Premium de Liquidação', 1900, 9900),
  ('deleverage_assisted', 'Instead Deleverage Assistido', 14900, 74900),
  ('leverage_strategy_execution', 'Instead Execução de Estratégia Alavancada', 9900, 49900),
  ('auto_rebalance_protection', 'Instead Proteção Auto-Rebalance', 7900, 39900),
  ('wealth_dashboard_subscription', 'Instead Wealth Dashboard', 4900, 24900),
  ('white_glove_lending', 'Instead White-glove Lending Desk', 99900, 499900),
  ('b2b_lending_widget_api', 'Instead B2B Lending Widget/API', 49900, 249900),
  ('risk_shield_membership', 'Instead Risk Shield Membership', 9900, 49900)
ON CONFLICT (product_code) DO UPDATE SET
  label = EXCLUDED.label,
  amount_usd_cents = EXCLUDED.amount_usd_cents,
  amount_brl_cents = EXCLUDED.amount_brl_cents,
  is_active = TRUE,
  updated_at = NOW();
