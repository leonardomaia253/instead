-- Lending automation engine: alerts, recommendations, B2B usage and scheduled runner.
-- The engine never moves user funds autonomously; it prepares/scores actions and waits for user signature or operator execution.

CREATE TABLE IF NOT EXISTS public.lending_alert_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT        NOT NULL,
  position_id     UUID,
  chain_id        INTEGER,
  severity        TEXT        NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  channel         TEXT        NOT NULL DEFAULT 'telegram' CHECK (channel IN ('telegram', 'email', 'webhook', 'dashboard')),
  status          TEXT        NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'skipped', 'failed')),
  health_factor   NUMERIC,
  message         TEXT        NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lending_alert_events_wallet_created
  ON public.lending_alert_events(lower(wallet_address), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lending_alert_events_status
  ON public.lending_alert_events(status, severity);

ALTER TABLE public.lending_alert_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own lending alert events" ON public.lending_alert_events;
CREATE POLICY "Users read own lending alert events"
  ON public.lending_alert_events
  FOR SELECT
  TO authenticated
  USING (lower(wallet_address) = lower((auth.jwt() ->> 'wallet_address')));

DROP POLICY IF EXISTS "Admins read lending alert events" ON public.lending_alert_events;
CREATE POLICY "Admins read lending alert events"
  ON public.lending_alert_events
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages lending alert events" ON public.lending_alert_events;
CREATE POLICY "Service role manages lending alert events"
  ON public.lending_alert_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.lending_risk_preferences (
  wallet_address          TEXT        PRIMARY KEY,
  telegram_chat_id        TEXT,
  free_alert_threshold    NUMERIC     NOT NULL DEFAULT 1.20,
  premium_alert_threshold NUMERIC     NOT NULL DEFAULT 1.50,
  auto_intents_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  preferred_channels      TEXT[]      NOT NULL DEFAULT ARRAY['dashboard','telegram'],
  metadata                JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lending_risk_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own lending risk preferences" ON public.lending_risk_preferences;
CREATE POLICY "Users read own lending risk preferences"
  ON public.lending_risk_preferences
  FOR SELECT
  TO authenticated
  USING (lower(wallet_address) = lower((auth.jwt() ->> 'wallet_address')));

DROP POLICY IF EXISTS "Service role manages lending risk preferences" ON public.lending_risk_preferences;
CREATE POLICY "Service role manages lending risk preferences"
  ON public.lending_risk_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.b2b_widget_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        REFERENCES public.b2b_widget_clients(id),
  domain          TEXT        NOT NULL,
  event_type      TEXT        NOT NULL CHECK (event_type IN ('config_view', 'lead_created', 'checkout_click', 'intent_created')),
  wallet_address  TEXT,
  source_code     TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_widget_events_client_created
  ON public.b2b_widget_events(client_id, created_at DESC);

ALTER TABLE public.b2b_widget_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read b2b widget events" ON public.b2b_widget_events;
CREATE POLICY "Admins read b2b widget events"
  ON public.b2b_widget_events
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages b2b widget events" ON public.b2b_widget_events;
CREATE POLICY "Service role manages b2b widget events"
  ON public.b2b_widget_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Schedule the Edge Function if pg_cron + pg_net are enabled in the project.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'instead-lending-automation') THEN
      PERFORM cron.unschedule('instead-lending-automation');
    END IF;
    PERFORM cron.schedule(
      'instead-lending-automation',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/lending-automation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-automation-secret', current_setting('app.settings.lending_automation_secret', true)
        ),
        body := jsonb_build_object('source', 'pg_cron')
      );
      $cron$
    );
  END IF;
END $$;
