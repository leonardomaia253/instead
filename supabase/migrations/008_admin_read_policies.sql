-- Admin read policies for operational dashboards.
-- The SIWE Edge Function issues JWTs with is_admin=true only for approved wallets.

DROP POLICY IF EXISTS "Admins read lending positions" ON public.lending_positions;
CREATE POLICY "Admins read lending positions"
  ON public.lending_positions
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::BOOLEAN IS TRUE);

DROP POLICY IF EXISTS "Admins read audits" ON public.audits;
CREATE POLICY "Admins read audits"
  ON public.audits
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::BOOLEAN IS TRUE);

DROP POLICY IF EXISTS "Admins read reconciliation operations" ON public.operation_reconciliation_queue;
CREATE POLICY "Admins read reconciliation operations"
  ON public.operation_reconciliation_queue
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::BOOLEAN IS TRUE);

DROP POLICY IF EXISTS "Admins read observability events" ON public.observability_events;
CREATE POLICY "Admins read observability events"
  ON public.observability_events
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::BOOLEAN IS TRUE);
