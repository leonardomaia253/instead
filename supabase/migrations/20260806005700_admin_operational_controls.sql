CREATE TABLE IF NOT EXISTS public.operational_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  severity TEXT NOT NULL DEFAULT 'warning',
  reason TEXT NOT NULL,
  created_by TEXT,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT operational_incidents_scope_check CHECK (scope IN ('global', 'checkout', 'token_factory', 'assisted_deployments', 'lending', 'staking', 'kyc', 'webhooks')),
  CONSTRAINT operational_incidents_status_check CHECK (status IN ('active', 'resolved')),
  CONSTRAINT operational_incidents_severity_check CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_operational_incidents_status_scope
  ON public.operational_incidents(status, scope, created_at DESC);

ALTER TABLE public.operational_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read operational incidents" ON public.operational_incidents;
CREATE POLICY "Admins read operational incidents"
  ON public.operational_incidents
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages operational incidents" ON public.operational_incidents;
CREATE POLICY "Service role manages operational incidents"
  ON public.operational_incidents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.operational_incidents TO authenticated;
GRANT ALL ON public.operational_incidents TO service_role;

CREATE TABLE IF NOT EXISTS public.webhook_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  related_payment_intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
  related_wallet_address TEXT,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhook_event_logs_provider_check CHECK (provider IN ('stripe', 'pagarme', 'didit', 'telegram', 'internal')),
  CONSTRAINT webhook_event_logs_status_check CHECK (status IN ('received', 'validated', 'processed', 'failed', 'ignored', 'reprocess_requested'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_logs_provider_created
  ON public.webhook_event_logs(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_event_logs_status_created
  ON public.webhook_event_logs(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_event_logs_provider_event_unique
  ON public.webhook_event_logs(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

ALTER TABLE public.webhook_event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read webhook event logs" ON public.webhook_event_logs;
CREATE POLICY "Admins read webhook event logs"
  ON public.webhook_event_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages webhook event logs" ON public.webhook_event_logs;
CREATE POLICY "Service role manages webhook event logs"
  ON public.webhook_event_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.webhook_event_logs TO authenticated;
GRANT ALL ON public.webhook_event_logs TO service_role;
