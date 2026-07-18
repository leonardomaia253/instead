-- Migration: 006_observability_events
-- Eventos leves de observabilidade para Web Vitals, erros de cliente e operacao.

CREATE TABLE IF NOT EXISTS public.observability_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  route TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observability_events_type_created
  ON public.observability_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_observability_events_severity_created
  ON public.observability_events(severity, created_at DESC);

ALTER TABLE public.observability_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public observability inserts" ON public.observability_events;
CREATE POLICY "Allow public observability inserts"
  ON public.observability_events
  FOR INSERT
  WITH CHECK (
    event_type IN ('web_vital', 'client_error', 'app_event')
    AND severity IN ('debug', 'info', 'warn', 'error', 'fatal')
  );

DROP POLICY IF EXISTS "Service role reads observability" ON public.observability_events;
CREATE POLICY "Service role reads observability"
  ON public.observability_events
  FOR SELECT
  USING (auth.role() = 'service_role');
