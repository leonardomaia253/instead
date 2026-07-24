-- Stores per-user wizard session state for the Telegram bot.
-- One active session per user at a time.

CREATE TABLE IF NOT EXISTS public.telegram_sessions (
  telegram_user_id TEXT PRIMARY KEY,
  chat_id           TEXT NOT NULL,
  flow              TEXT,           -- 'token' | 'lending' | null
  step              INTEGER NOT NULL DEFAULT 0,
  data              JSONB NOT NULL DEFAULT '{}',
  locale            TEXT NOT NULL DEFAULT 'en',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_sessions_updated
  ON public.telegram_sessions(updated_at DESC);

ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages telegram sessions" ON public.telegram_sessions;
CREATE POLICY "Service role manages telegram sessions"
  ON public.telegram_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
