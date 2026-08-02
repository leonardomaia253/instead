# Instead OS implementation tracker

Objective: implement the 100 visionary improvements one by one without diluting the existing static web app, Android package, token factory, lending, staking, dashboard, simulator, compliance, payments, Telegram, and admin surfaces.

Current foundation delivered in this increment:

- Canonical roadmap of 100 improvements: `frontend/src/lib/visionRoadmap.ts`.
- Intent/risk/route engine foundation: `frontend/src/lib/intentEngine.ts`.
- Persistable intent-plan API with CSRF/rate-limit/session checks: `frontend/src/app/api/os/intents/route.ts`.
- Supabase schema for OS intent plans: `supabase/migrations/20260801232000_os_intent_plans.sql`.
- Product surface for the roadmap and intent console: `frontend/src/app/[locale]/os`.
- Token Factory intelligence foundation for items 11-17: `frontend/src/lib/tokenIntelligence.ts`.
- Token Factory final review now renders tokenomics, risk findings, trust score, mitigation checklist, and public parameter summary: `frontend/src/app/[locale]/factory/page.tsx`.
- Navigation, footer, and sitemap entry for `/os`.
- Mobile/responsive hardening remains in `frontend/src/app/globals.css`.
- Android TWA package generation and Google Play draft/internal publishing pipeline remain in `mobile/android` and `scripts`.

Implementation sequence:

1. Intent Engine: convert the current client-side plan builder into a persisted intent model with API endpoints, audit trail, and user confirmation.
2. Lending Router: connect route recommendations to live protocol registry, risk metrics, fees, liquidity, and health-factor simulation.
3. Token Factory Intelligence: add tokenomics, vesting, dangerous-parameter checks, and docs generation to the existing factory wizard.
4. Launchpad Layer: add fair-launch pages, transparency dashboards, holder analytics, and verification badges.
5. Protection Layer: add liquidation shield, alert rules, deleverage/repay preparation, and premium automation state.
6. Vault Layer: model ERC-4626 vault strategies, performance, drawdown, stress tests, and stablecoin conservative routes.
7. Wallet UX: add action previews, permission boundaries, batch signing preparation, and passkey/account-abstraction research gates.
8. Mobile: evolve the existing Android TWA and PWA setup toward push/deep-link/offline-read-only flows, then iOS/Apple Wallet surfaces.
9. Institutional: add team permissions, immutable logs, PDF exports, risk committee dashboard, and compliance workflows.
10. Platform/Security: add public APIs, SDK contracts, widgets, partner portal, observability center, status page, bug bounty, and circuit-breaker controls.

Verification rules:

- Every improvement must have a visible artifact: route, component, API, contract, script, migration, test, or documentation linked to code.
- Every user-facing feature must be mobile-safe before it is counted as implemented.
- Features that move funds must include simulation, explicit confirmation, audit logging, and failure handling.
- Security/compliance features are not counted as complete until backed by tests or operational evidence.
