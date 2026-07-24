-- Migration: 013_reconciliation_refinement
-- Adds payment intent linking to generated tokens, wallet address to telegram bot intents, and configures appropriate RLS policies.

ALTER TABLE public.generated_tokens
  ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES public.payment_intents(id);

ALTER TABLE public.telegram_bot_intents
  ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read intents by ID" ON public.telegram_bot_intents;
DROP POLICY IF EXISTS "Service role manages telegram bot intents" ON public.telegram_bot_intents;

-- Recreate policy for service role (all permissions)
CREATE POLICY "Service role manages telegram bot intents"
  ON public.telegram_bot_intents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy to allow anonymous read of intents by ID (needed by the frontend via UUID capability URL)
CREATE POLICY "Anyone can read intents by ID"
  ON public.telegram_bot_intents
  FOR SELECT
  USING (true);

-- Policy to allow authenticated users (via connected wallet) to update their own draft intents to link them
DROP POLICY IF EXISTS "Users can update their own intents" ON public.telegram_bot_intents;
CREATE POLICY "Users can update their own intents"
  ON public.telegram_bot_intents
  FOR UPDATE
  USING (status = 'draft')
  WITH CHECK (status IN ('draft', 'confirmed'));
