-- Links a Telegram user ID to an EVM wallet address.
-- One active link per user (upsert on conflict).

CREATE TABLE IF NOT EXISTS public.telegram_wallet_links (
  telegram_user_id TEXT PRIMARY KEY,
  wallet_address   TEXT NOT NULL,
  username         TEXT,
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_wallet_links_address
  ON public.telegram_wallet_links(wallet_address);

ALTER TABLE public.telegram_wallet_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages telegram wallet links" ON public.telegram_wallet_links;
CREATE POLICY "Service role manages telegram wallet links"
  ON public.telegram_wallet_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
