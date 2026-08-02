-- Instead OS intent plans: persisted output from the intent/risk/route engine.

CREATE TABLE IF NOT EXISTS public.os_intent_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT,
  input TEXT NOT NULL,
  kind TEXT NOT NULL,
  risk TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  recommended_route TEXT NOT NULL,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_intent_plans_kind_check CHECK (kind IN ('create_token', 'borrow', 'protect_position', 'launch', 'monitor')),
  CONSTRAINT os_intent_plans_risk_check CHECK (risk IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT os_intent_plans_status_check CHECK (status IN ('draft', 'reviewed', 'queued', 'executed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_os_intent_plans_wallet_created
  ON public.os_intent_plans(lower(wallet_address), created_at DESC)
  WHERE wallet_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_os_intent_plans_kind_risk
  ON public.os_intent_plans(kind, risk, created_at DESC);

ALTER TABLE public.os_intent_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own os intent plans" ON public.os_intent_plans;
CREATE POLICY "Users read own os intent plans"
  ON public.os_intent_plans
  FOR SELECT
  TO authenticated
  USING (
    wallet_address IS NOT NULL
    AND lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address')
  );

DROP POLICY IF EXISTS "Service role manages os intent plans" ON public.os_intent_plans;
CREATE POLICY "Service role manages os intent plans"
  ON public.os_intent_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
