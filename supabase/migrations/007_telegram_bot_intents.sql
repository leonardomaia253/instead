-- Telegram bot intents for assisted conversion flows.

CREATE TABLE IF NOT EXISTS public.telegram_bot_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  username TEXT,
  flow TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  rate_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_bot_intents_user_created
  ON public.telegram_bot_intents(telegram_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_bot_intents_flow_status_created
  ON public.telegram_bot_intents(flow, status, created_at DESC);

ALTER TABLE public.telegram_bot_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages telegram bot intents" ON public.telegram_bot_intents;
CREATE POLICY "Service role manages telegram bot intents"
  ON public.telegram_bot_intents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
