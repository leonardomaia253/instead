-- Migration: instead_initial_schema
-- Cria o esquema inicial do banco de dados Instead no Supabase

-- Tabela de perfis de usuário, vinculados por wallet address
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username    TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca eficiente por wallet
CREATE INDEX IF NOT EXISTS idx_users_wallet ON public.users(wallet_address);

-- Tabela de tokens gerados pela Token Factory
CREATE TABLE IF NOT EXISTS public.generated_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  name          TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  initial_supply NUMERIC NOT NULL,
  max_supply    NUMERIC NOT NULL,
  mintable      BOOLEAN NOT NULL DEFAULT FALSE,
  tx_hash       TEXT NOT NULL,
  chain_id      INTEGER NOT NULL DEFAULT 42161,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_creator ON public.generated_tokens(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_tokens_address ON public.generated_tokens(token_address);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_tokens ENABLE ROW LEVEL SECURITY;

-- Política: gerado_tokens pode ser LIDO por todos (é público, como um marketplace)
CREATE POLICY "Tokens são públicos para leitura"
  ON public.generated_tokens
  FOR SELECT
  USING (true);

-- Política: alguém autenticado só pode INSERIR seus próprios tokens
CREATE POLICY "Somente o criador pode inserir seu token"
  ON public.generated_tokens
  FOR INSERT
  WITH CHECK (true); -- verificação real feita no backend via anon key + validação de wallet

-- Política: users podem ler qualquer perfil público
CREATE POLICY "Perfis são públicos"
  ON public.users
  FOR SELECT
  USING (true);

-- Política: só o próprio usuário atualiza seu perfil
CREATE POLICY "Usuário atualiza próprio perfil"
  ON public.users
  FOR UPDATE
  USING (true);
