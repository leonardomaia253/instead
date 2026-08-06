CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  default_commission_bps INTEGER NOT NULL DEFAULT 2000,
  payout_wallet TEXT,
  payout_method TEXT NOT NULL DEFAULT 'wallet',
  tax_status TEXT NOT NULL DEFAULT 'not_collected',
  kyc_status TEXT NOT NULL DEFAULT 'not_required',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_profiles_wallet_check CHECK (wallet_address ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT affiliate_profiles_referral_code_check CHECK (referral_code ~* '^[a-z0-9][a-z0-9_-]{2,31}$'),
  CONSTRAINT affiliate_profiles_status_check CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  CONSTRAINT affiliate_profiles_commission_check CHECK (default_commission_bps >= 0 AND default_commission_bps <= 5000),
  CONSTRAINT affiliate_profiles_payout_wallet_check CHECK (payout_wallet IS NULL OR payout_wallet ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT affiliate_profiles_tax_status_check CHECK (tax_status IN ('not_collected', 'pending', 'verified', 'rejected')),
  CONSTRAINT affiliate_profiles_kyc_status_check CHECK (kyc_status IN ('not_required', 'pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_status_created
  ON public.affiliate_profiles(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliate_profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  landing_path TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code_created
  ON public.affiliate_clicks(referral_code, created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  payment_intent_id UUID NOT NULL UNIQUE REFERENCES public.payment_intents(id) ON DELETE CASCADE,
  buyer_wallet TEXT,
  product_code TEXT NOT NULL,
  vertical TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_conversions_buyer_wallet_check CHECK (buyer_wallet IS NULL OR buyer_wallet ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT affiliate_conversions_amount_check CHECK (amount_cents > 0),
  CONSTRAINT affiliate_conversions_currency_check CHECK (currency IN ('usd', 'brl')),
  CONSTRAINT affiliate_conversions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'reversed'))
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_affiliate_created
  ON public.affiliate_conversions(affiliate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  conversion_id UUID NOT NULL UNIQUE REFERENCES public.affiliate_conversions(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  commission_bps INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_request_id UUID,
  available_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_commissions_amount_check CHECK (amount_cents >= 0),
  CONSTRAINT affiliate_commissions_currency_check CHECK (currency IN ('usd', 'brl')),
  CONSTRAINT affiliate_commissions_bps_check CHECK (commission_bps >= 0 AND commission_bps <= 5000),
  CONSTRAINT affiliate_commissions_status_check CHECK (status IN ('pending', 'approved', 'available', 'requested', 'paid', 'rejected', 'reversed'))
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_status
  ON public.affiliate_commissions(affiliate_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  payout_wallet TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  tx_hash TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT affiliate_payout_amount_check CHECK (amount_cents > 0),
  CONSTRAINT affiliate_payout_currency_check CHECK (currency IN ('usd', 'brl')),
  CONSTRAINT affiliate_payout_status_check CHECK (status IN ('requested', 'approved', 'paid', 'rejected', 'cancelled')),
  CONSTRAINT affiliate_payout_wallet_check CHECK (payout_wallet IS NULL OR payout_wallet ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT affiliate_payout_tx_check CHECK (tx_hash IS NULL OR tx_hash ~* '^0x[a-f0-9]{64}$')
);

ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates read own profile" ON public.affiliate_profiles
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address'));

CREATE POLICY "Admins read affiliate profiles" ON public.affiliate_profiles
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Service role manages affiliate profiles" ON public.affiliate_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Affiliates read own conversions" ON public.affiliate_conversions
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliate_profiles WHERE lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address')));

CREATE POLICY "Admins read affiliate conversions" ON public.affiliate_conversions
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Service role manages affiliate conversions" ON public.affiliate_conversions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Affiliates read own commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliate_profiles WHERE lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address')));

CREATE POLICY "Admins read affiliate commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Service role manages affiliate commissions" ON public.affiliate_commissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Affiliates read own payout requests" ON public.affiliate_payout_requests
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliate_profiles WHERE lower(wallet_address) = lower(auth.jwt() ->> 'wallet_address')));

CREATE POLICY "Admins read affiliate payout requests" ON public.affiliate_payout_requests
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Service role manages affiliate payout requests" ON public.affiliate_payout_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages affiliate clicks" ON public.affiliate_clicks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON public.affiliate_profiles TO authenticated;
GRANT SELECT ON public.affiliate_conversions TO authenticated;
GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT SELECT ON public.affiliate_payout_requests TO authenticated;
GRANT ALL ON public.affiliate_profiles TO service_role;
GRANT ALL ON public.affiliate_clicks TO service_role;
GRANT ALL ON public.affiliate_conversions TO service_role;
GRANT ALL ON public.affiliate_commissions TO service_role;
GRANT ALL ON public.affiliate_payout_requests TO service_role;
