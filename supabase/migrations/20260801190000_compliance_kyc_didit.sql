-- Compliance verification sessions for progressive KYC/KYB.

CREATE TABLE IF NOT EXISTS public.compliance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL DEFAULT 'wallet',
  subject_id TEXT NOT NULL,
  wallet_address TEXT,
  email TEXT,
  provider TEXT NOT NULL DEFAULT 'didit',
  verification_kind TEXT NOT NULL DEFAULT 'kyc',
  provider_session_id TEXT,
  provider_session_number INTEGER,
  provider_url TEXT,
  workflow_id TEXT,
  workflow_version INTEGER,
  vendor_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  consented_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT compliance_verifications_provider_check CHECK (provider IN ('didit')),
  CONSTRAINT compliance_verifications_kind_check CHECK (verification_kind IN ('kyc', 'kyb')),
  CONSTRAINT compliance_verifications_status_check CHECK (
    status IN ('not_started', 'in_progress', 'awaiting_user', 'resubmitted', 'in_review', 'approved', 'declined', 'expired', 'abandoned', 'kyc_expired')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_verifications_provider_session
  ON public.compliance_verifications(provider, provider_session_id)
  WHERE provider_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_verifications_subject
  ON public.compliance_verifications(subject_type, lower(subject_id), status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_verifications_wallet
  ON public.compliance_verifications(lower(wallet_address), status, created_at DESC)
  WHERE wallet_address IS NOT NULL;

ALTER TABLE public.compliance_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own compliance verifications" ON public.compliance_verifications;
CREATE POLICY "Users read own compliance verifications"
  ON public.compliance_verifications
  FOR SELECT
  TO authenticated
  USING (
    wallet_address IS NOT NULL
    AND lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address')
  );

DROP POLICY IF EXISTS "Admins read compliance verifications" ON public.compliance_verifications;
CREATE POLICY "Admins read compliance verifications"
  ON public.compliance_verifications
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "Service role manages compliance verifications" ON public.compliance_verifications;
CREATE POLICY "Service role manages compliance verifications"
  ON public.compliance_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
