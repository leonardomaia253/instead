-- Community growth layer for Discord, Telegram and crypto-native social channels.

CREATE TABLE IF NOT EXISTS public.community_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('discord', 'telegram', 'x', 'farcaster', 'reddit', 'youtube', 'tiktok', 'newsletter')),
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  discord_user_id TEXT,
  discord_username TEXT,
  telegram_user_id TEXT,
  telegram_username TEXT,
  x_username TEXT,
  farcaster_username TEXT,
  reddit_username TEXT,
  youtube_username TEXT,
  tiktok_username TEXT,
  newsletter_email TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  role_tier TEXT NOT NULL DEFAULT 'member' CHECK (role_tier IN ('member', 'builder', 'ambassador', 'holder', 'whale', 'partner')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  channel_kind TEXT NOT NULL CHECK (channel_kind IN ('discord', 'telegram', 'x', 'farcaster', 'reddit', 'youtube', 'tiktok', 'newsletter', 'platform')),
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  requires_review BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  mission_code TEXT,
  channel_kind TEXT NOT NULL,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('badge', 'access', 'nft', 'fee_discount', 'airdrop', 'early_access')),
  unlock_xp INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_governance_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_governance_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.community_governance_polls(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  option_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, wallet_address)
);

CREATE TABLE IF NOT EXISTS public.community_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  target_segment TEXT NOT NULL,
  channel_kind TEXT NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id UUID REFERENCES public.community_automation_rules(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  channel_kind TEXT NOT NULL,
  target_handle TEXT,
  target_user_id TEXT,
  target_segment TEXT NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_activity_wallet_created
  ON public.community_activity_events(wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_members_xp
  ON public.community_members(xp DESC, level DESC);

CREATE INDEX IF NOT EXISTS idx_community_votes_poll
  ON public.community_governance_votes(poll_id, option_text);

CREATE INDEX IF NOT EXISTS idx_community_message_queue_status
  ON public.community_message_queue(status, channel_kind, scheduled_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_message_queue_active_unique
  ON public.community_message_queue(automation_rule_id, wallet_address)
  WHERE status IN ('queued', 'processing');

ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_governance_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_message_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active community channels" ON public.community_channels;
CREATE POLICY "Anyone reads active community channels"
  ON public.community_channels
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Anyone reads active community missions" ON public.community_missions;
CREATE POLICY "Anyone reads active community missions"
  ON public.community_missions
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Service role manages community channels" ON public.community_channels;
CREATE POLICY "Service role manages community channels"
  ON public.community_channels
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages community members" ON public.community_members;
CREATE POLICY "Service role manages community members"
  ON public.community_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages community missions" ON public.community_missions;
CREATE POLICY "Service role manages community missions"
  ON public.community_missions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages community activity" ON public.community_activity_events;
CREATE POLICY "Service role manages community activity"
  ON public.community_activity_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone reads active community rewards" ON public.community_rewards;
CREATE POLICY "Anyone reads active community rewards"
  ON public.community_rewards
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Anyone reads open community polls" ON public.community_governance_polls;
CREATE POLICY "Anyone reads open community polls"
  ON public.community_governance_polls
  FOR SELECT
  USING (status = 'open');

DROP POLICY IF EXISTS "Service role manages community rewards" ON public.community_rewards;
CREATE POLICY "Service role manages community rewards"
  ON public.community_rewards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages community polls" ON public.community_governance_polls;
CREATE POLICY "Service role manages community polls"
  ON public.community_governance_polls
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages community votes" ON public.community_governance_votes;
CREATE POLICY "Service role manages community votes"
  ON public.community_governance_votes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages community automations" ON public.community_automation_rules;
CREATE POLICY "Service role manages community automations"
  ON public.community_automation_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages community message queue" ON public.community_message_queue;
CREATE POLICY "Service role manages community message queue"
  ON public.community_message_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.community_channels (code, name, kind, url, description, sort_order)
VALUES
  ('discord-core', 'Instead Discord', 'discord', 'https://discord.gg/instead', 'Centro operacional da comunidade, suporte, cargos, holders e campanhas.', 10),
  ('telegram-alerts', 'Telegram Alerts', 'telegram', 'https://t.me/insteadfinance', 'Alertas rapidos, onboarding e comunicacao global.', 20),
  ('x-narrative', 'X / Twitter', 'x', 'https://x.com/insteadfinance', 'Narrativas publicas, threads, lancamentos e prova social.', 30),
  ('farcaster-native', 'Farcaster', 'farcaster', 'https://warpcast.com/insteadfinance', 'Canal Web3 nativo para builders e early adopters.', 40),
  ('reddit-research', 'Reddit', 'reddit', 'https://www.reddit.com/r/insteadfinance', 'Discussao analitica, feedback publico e descoberta organica.', 50),
  ('youtube-education', 'YouTube', 'youtube', 'https://youtube.com/@insteadfinance', 'Educacao, tutoriais, demos e updates de produto para topo de funil.', 60),
  ('tiktok-clips', 'TikTok', 'tiktok', 'https://www.tiktok.com/@insteadfinance', 'Clipes curtos, narrativas simples e descoberta para publico novo.', 70),
  ('newsletter-thesis', 'Mirror / Substack', 'newsletter', 'https://insteadfinance.substack.com', 'Teses, updates de transparencia, governanca e conteudo mais serio.', 80)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO public.community_missions (code, title, description, channel_kind, reward_xp, reward_label, requires_review, sort_order)
VALUES
  ('connect-discord', 'Conectar Discord', 'Vincule sua wallet ao Discord para receber cargos, suporte e canais privados.', 'discord', 150, 'Cargo Member', false, 10),
  ('join-telegram', 'Entrar no Telegram', 'Receba alertas de mercado, status de operacoes e atualizacoes do produto.', 'telegram', 100, 'Alertas liberados', false, 20),
  ('share-launch-thread', 'Compartilhar uma thread', 'Publique uma thread sobre seu token, lending ou tese usando Instead.', 'x', 250, 'Boost social', true, 30),
  ('invite-builder', 'Convidar builder', 'Traga um fundador, trader ou builder para a comunidade.', 'platform', 300, 'Referral XP', true, 40),
  ('complete-onboarding', 'Completar onboarding', 'Conecte wallet, escolha canais e configure seu perfil de comunidade.', 'platform', 200, 'Perfil completo', false, 50),
  ('watch-youtube-tutorial', 'Assistir tutorial', 'Veja um tutorial e registre o aprendizado para reduzir friccao no primeiro uso.', 'youtube', 120, 'Educacao', true, 60),
  ('post-tiktok-clip', 'Criar clipe curto', 'Publique um clipe simples explicando um caso de uso ou resultado da plataforma.', 'tiktok', 260, 'Viral loop', true, 70),
  ('read-monthly-thesis', 'Ler tese mensal', 'Acompanhe a tese/update mensal e sinalize feedback para o time.', 'newsletter', 140, 'Governanca informada', false, 80),
  ('vote-governance', 'Votar em governanca', 'Participe de uma enquete de produto, comunidade ou incentivos.', 'platform', 180, 'Voto registrado', false, 90)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  channel_kind = EXCLUDED.channel_kind,
  reward_xp = EXCLUDED.reward_xp,
  reward_label = EXCLUDED.reward_label,
  requires_review = EXCLUDED.requires_review,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO public.community_rewards (code, title, description, reward_type, unlock_xp)
VALUES
  ('badge-verified-member', 'Verified Member', 'Badge para wallet conectada e perfil social criado.', 'badge', 100),
  ('access-holder-room', 'Holder Room', 'Acesso a canais privados e suporte prioritario no Discord.', 'access', 550),
  ('discount-launch-fees', 'Fee Discount', 'Desconto em taxas de lancamento, deploy assistido ou campanhas.', 'fee_discount', 1200),
  ('early-access-beta', 'Early Access', 'Acesso antecipado a features, automacoes e integrações.', 'early_access', 2500),
  ('airdrop-eligibility', 'Airdrop Eligibility', 'Elegibilidade para campanhas futuras baseada em contribuicao.', 'airdrop', 5000)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_type = EXCLUDED.reward_type,
  unlock_xp = EXCLUDED.unlock_xp;

INSERT INTO public.community_governance_polls (title, description, options, closes_at)
VALUES
  ('Proxima prioridade da comunidade', 'Escolha onde a comunidade deve concentrar energia nas proximas semanas.', '["Discord holders", "Telegram alerts", "X threads", "Tutoriais YouTube"]'::jsonb, NOW() + INTERVAL '21 days'),
  ('Recompensa mais valiosa', 'Ajude a calibrar incentivos para reduzir friccao e aumentar contribuicao real.', '["Fee discounts", "Airdrops", "NFT badges", "Acesso antecipado"]'::jsonb, NOW() + INTERVAL '30 days');

INSERT INTO public.community_automation_rules (code, title, trigger_type, target_segment, channel_kind, message_template)
VALUES
  ('welcome-wallet-linked', 'Boas-vindas wallet conectada', 'profile_created', 'new_member', 'discord', 'Bem-vindo. Complete Discord, Telegram e primeira missao para liberar XP inicial.'),
  ('activate-dormant-holder', 'Reativar holder inativo', 'inactive_14d', 'holder_at_risk', 'telegram', 'Seu perfil tem recompensas pendentes. Volte para registrar missao e proteger seu nivel.'),
  ('reward-new-ambassador', 'Promover embaixador', 'level_up', 'ambassador', 'discord', 'Parabens pelo novo nivel. Voce liberou acesso antecipado e missoes de embaixador.'),
  ('governance-reminder', 'Lembrete de governanca', 'poll_open', 'active_member', 'newsletter', 'Nova votacao aberta. Sua opiniao ajuda a definir prioridades da comunidade.')
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  trigger_type = EXCLUDED.trigger_type,
  target_segment = EXCLUDED.target_segment,
  channel_kind = EXCLUDED.channel_kind,
  message_template = EXCLUDED.message_template;
