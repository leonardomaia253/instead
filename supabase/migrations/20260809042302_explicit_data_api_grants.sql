-- Supabase Data API hardening.
-- New public tables are no longer automatically reachable by anon/authenticated/service_role.
-- Keep table exposure explicit and let RLS policies continue to enforce row-level access.

GRANT SELECT ON TABLE
  public.generated_tokens,
  public.staking_pools,
  public.platform_stats,
  public.platform_prices,
  public.revenue_sources,
  public.community_channels,
  public.community_missions,
  public.community_rewards,
  public.community_governance_polls,
  public.telegram_bot_intents
TO anon;

GRANT SELECT ON TABLE
  public.generated_tokens,
  public.staking_pools,
  public.platform_stats,
  public.platform_prices,
  public.revenue_sources,
  public.community_channels,
  public.community_missions,
  public.community_rewards,
  public.community_governance_polls,
  public.telegram_bot_intents
TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.users,
  public.generated_tokens,
  public.audits,
  public.lending_positions,
  public.operation_reconciliation_queue
TO authenticated;

GRANT INSERT ON TABLE
  public.observability_events
TO anon, authenticated;

GRANT UPDATE ON TABLE
  public.telegram_bot_intents
TO authenticated;

GRANT SELECT ON TABLE
  public.affiliate_profiles,
  public.affiliate_conversions,
  public.affiliate_commissions,
  public.affiliate_payout_requests,
  public.assisted_token_deployments,
  public.compliance_verifications,
  public.lending_alert_events,
  public.lending_automation_intents,
  public.lending_risk_preferences,
  public.operational_incidents,
  public.payment_intents,
  public.user_revenue_entitlements,
  public.webhook_event_logs
TO authenticated;

GRANT ALL ON TABLE
  public.admin_audit_logs,
  public.affiliate_clicks,
  public.affiliate_profiles,
  public.affiliate_conversions,
  public.affiliate_commissions,
  public.affiliate_payout_requests,
  public.assisted_token_deployments,
  public.audits,
  public.b2b_widget_clients,
  public.b2b_widget_events,
  public.community_activity_events,
  public.community_automation_rules,
  public.community_channels,
  public.community_governance_polls,
  public.community_governance_votes,
  public.community_members,
  public.community_message_queue,
  public.community_missions,
  public.community_rewards,
  public.compliance_verifications,
  public.generated_tokens,
  public.lending_alert_events,
  public.lending_automation_intents,
  public.lending_positions,
  public.lending_protocol_routes,
  public.lending_risk_preferences,
  public.observability_events,
  public.operation_reconciliation_queue,
  public.operational_incidents,
  public.os_intent_plans,
  public.payment_intents,
  public.platform_prices,
  public.platform_stats,
  public.revenue_sources,
  public.siwe_nonces,
  public.staking_pools,
  public.telegram_bot_intents,
  public.telegram_sessions,
  public.telegram_wallet_links,
  public.user_revenue_entitlements,
  public.users,
  public.webhook_event_logs
TO service_role;
