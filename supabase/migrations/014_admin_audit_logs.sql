-- Migration: 014_admin_audit_logs
-- Tabela para auditoria de ações administrativas, reconciliações manuais e eventos de plataforma.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_wallet TEXT NOT NULL,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read admin audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    USING (
        lower(auth.jwt() ->> 'wallet_address') IN (
            '0x88c426639b7f5733e8b788a1b66eef46639088cb'
        )
    );

CREATE POLICY "service role manages admin audit logs"
    ON public.admin_audit_logs
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_wallet_created
    ON public.admin_audit_logs(admin_wallet, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
    ON public.admin_audit_logs(action);
