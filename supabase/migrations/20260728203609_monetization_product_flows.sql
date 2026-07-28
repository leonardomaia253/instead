-- Productization layer for Instead monetization SKUs.
-- Turns revenue catalog entries into user/admin-trackable product flows.

CREATE TABLE IF NOT EXISTS public.user_revenue_entitlements (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address    TEXT        NOT NULL,
  source_code       TEXT        NOT NULL REFERENCES public.revenue_sources(source_code),
  status            TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  payment_intent_id UUID        REFERENCES public.payment_intents(id),
  metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_revenue_entitlements_wallet_source_unique UNIQUE (wallet_address, source_code)
);

CREATE INDEX IF NOT EXISTS idx_user_revenue_entitlements_wallet
  ON public.user_revenue_entitlements(lower(wallet_address), status);

ALTER TABLE public.user_revenue_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own revenue entitlements" ON public.user_revenue_entitlements;
CREATE POLICY "Users read own revenue entitlements"
  ON public.user_revenue_entitlements
  FOR SELECT
  TO authenticated
  USING (lower(wallet_address) = lower((auth.jwt() ->> 'wallet_address')));

DROP POLICY IF EXISTS "Admins read revenue entitlements" ON public.user_revenue_entitlements;
CREATE POLICY "Admins read revenue entitlements"
  ON public.user_revenue_entitlements
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages revenue entitlements" ON public.user_revenue_entitlements;
CREATE POLICY "Service role manages revenue entitlements"
  ON public.user_revenue_entitlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.lending_automation_intents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT        NOT NULL,
  source_code     TEXT        NOT NULL REFERENCES public.revenue_sources(source_code),
  chain_id        INTEGER     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'awaiting_payment', 'paid', 'queued', 'signed', 'executed', 'cancelled', 'failed')),
  risk_threshold  NUMERIC,
  payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  recommendation  TEXT,
  payment_intent_id UUID      REFERENCES public.payment_intents(id),
  tx_hash         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lending_automation_intents_wallet_status
  ON public.lending_automation_intents(lower(wallet_address), status);

ALTER TABLE public.lending_automation_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own lending automation intents" ON public.lending_automation_intents;
CREATE POLICY "Users read own lending automation intents"
  ON public.lending_automation_intents
  FOR SELECT
  TO authenticated
  USING (lower(wallet_address) = lower((auth.jwt() ->> 'wallet_address')));

DROP POLICY IF EXISTS "Admins read lending automation intents" ON public.lending_automation_intents;
CREATE POLICY "Admins read lending automation intents"
  ON public.lending_automation_intents
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages lending automation intents" ON public.lending_automation_intents;
CREATE POLICY "Service role manages lending automation intents"
  ON public.lending_automation_intents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.b2b_widget_clients (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  domain          TEXT        NOT NULL,
  contact_email   TEXT,
  api_key_hash    TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  revenue_share_bps INTEGER   NOT NULL DEFAULT 2000 CHECK (revenue_share_bps >= 0 AND revenue_share_bps <= 10000),
  monthly_fee_usd_cents INTEGER NOT NULL DEFAULT 49900 CHECK (monthly_fee_usd_cents >= 0),
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT b2b_widget_clients_domain_unique UNIQUE (domain)
);

ALTER TABLE public.b2b_widget_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read b2b widget clients" ON public.b2b_widget_clients;
CREATE POLICY "Admins read b2b widget clients"
  ON public.b2b_widget_clients
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages b2b widget clients" ON public.b2b_widget_clients;
CREATE POLICY "Service role manages b2b widget clients"
  ON public.b2b_widget_clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
