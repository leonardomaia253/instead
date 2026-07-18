-- Migration: 004_production_rls_hardening
-- Fecha leitura pública de dados operacionais sensíveis.

DROP POLICY IF EXISTS "Qualquer um pode ler auditorias (transparência)" ON public.audits;
DROP POLICY IF EXISTS "Qualquer um pode ler auditorias (transparÃªncia)" ON public.audits;
DROP POLICY IF EXISTS "Posições são públicas para leitura" ON public.lending_positions;
DROP POLICY IF EXISTS "PosiÃ§Ãµes sÃ£o pÃºblicas para leitura" ON public.lending_positions;

CREATE POLICY "Usuarios leem suas proprias auditorias"
  ON public.audits
  FOR SELECT
  USING (lower(user_wallet) = lower(auth.jwt() ->> 'wallet_address'));

CREATE POLICY "Usuarios leem suas proprias posicoes"
  ON public.lending_positions
  FOR SELECT
  USING (lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address'));

DROP POLICY IF EXISTS "Permitir upsert de posições" ON public.lending_positions;
DROP POLICY IF EXISTS "Permitir upsert de posiÃ§Ãµes" ON public.lending_positions;

CREATE POLICY "Usuarios inserem suas proprias posicoes"
  ON public.lending_positions
  FOR INSERT
  WITH CHECK (lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address'));
