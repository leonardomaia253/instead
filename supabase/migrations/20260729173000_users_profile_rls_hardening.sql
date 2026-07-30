-- Harden user profile visibility.
-- Public reads leaked admin flags once is_admin was added; users are now visible
-- only to the matching authenticated user or platform admins.

DROP POLICY IF EXISTS "Perfis são públicos" ON public.users;
DROP POLICY IF EXISTS "Perfis sÃ£o pÃºblicos" ON public.users;

DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address')
  );

DROP POLICY IF EXISTS "Admins read user profiles" ON public.users;
CREATE POLICY "Admins read user profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);
