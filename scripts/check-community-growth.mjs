import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function read(path) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) {
    failures.push(`${path} is missing`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) failures.push(label);
}

const migration = read("supabase/migrations/20260806233000_community_growth_layer.sql");
const envExample = read(".env.production.example");
const communityPage = read("frontend/src/app/[locale]/community/page.tsx");
const adminPage = read("frontend/src/app/[locale]/admin/community/page.tsx");
const communityApi = read("frontend/src/app/api/community/me/route.ts");
const eventApi = read("frontend/src/app/api/community/event/route.ts");
const voteApi = read("frontend/src/app/api/community/vote/route.ts");
const queueApi = read("frontend/src/app/api/community/queue/route.ts");
const discordApi = read("frontend/src/app/api/discord/webhook/route.ts");
const adminApi = read("frontend/src/app/api/admin/community/route.ts");
const communityLib = read("frontend/src/lib/server/community.ts");
const navbar = read("frontend/src/components/Navbar.tsx");
const adminLayout = read("frontend/src/app/[locale]/admin/layout.tsx");
const docs = read("DOCS.md");
const runbook = read("RUNBOOK.md");

for (const table of [
  "community_channels",
  "community_members",
  "community_missions",
  "community_activity_events",
  "community_rewards",
  "community_governance_polls",
  "community_governance_votes",
  "community_automation_rules",
  "community_message_queue",
]) {
  requireIncludes(migration, `public.${table}`, `Migration must define ${table}`);
  requireIncludes(migration, `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`, `${table} must enable RLS`);
}

for (const channel of ["discord", "telegram", "x", "farcaster", "reddit", "youtube", "tiktok", "newsletter"]) {
  requireIncludes(migration, channel, `Migration must seed/support ${channel}`);
}

for (const token of [
  "DISCORD_WEBHOOK_SECRET",
  "COMMUNITY_QUEUE_SECRET",
  "COMMUNITY_DISCORD_INVITE_URL",
  "COMMUNITY_TELEGRAM_URL",
  "COMMUNITY_X_URL",
  "COMMUNITY_FARCASTER_URL",
  "COMMUNITY_REDDIT_URL",
  "COMMUNITY_YOUTUBE_URL",
  "COMMUNITY_TIKTOK_URL",
  "COMMUNITY_NEWSLETTER_URL",
]) {
  requireIncludes(envExample, token, `.env.production.example must document ${token}`);
}

requireIncludes(communityPage, "voteOnPoll", "Community page must support governance voting");
requireIncludes(communityPage, "claimMission", "Community page must support mission registration");
requireIncludes(communityPage, "Recompensas", "Community page must surface rewards");
requireIncludes(communityPage, "Automacao e CRM", "Community page must surface CRM automation");
requireIncludes(navbar, 'href: "/community"', "Main navbar must link to community page");

requireIncludes(adminLayout, 'href={`${adminBase}/community`}', "Admin sidebar must link to community cockpit");
requireIncludes(adminPage, "reviewEvent", "Admin community page must review pending events");
requireIncludes(adminPage, "enqueueAutomation", "Admin community page must enqueue CRM automation");
requireIncludes(adminPage, "cancelMessage", "Admin community page must cancel queued CRM messages");
requireIncludes(adminPage, "setPollStatus", "Admin community page must open and close governance polls");
requireIncludes(adminPage, "QueueLine", "Admin community page must render cancellable queue rows");
requireIncludes(adminPage, "formatVoteResults", "Admin community page must display vote results");
requireIncludes(adminPage, "Fila de mensagens", "Admin community page must show message queue");

requireIncludes(communityApi, "upsertCommunityProfile", "Community profile API must persist profiles");
requireIncludes(eventApi, "recordCommunityEvent", "Community event API must record missions/events");
requireIncludes(voteApi, "recordGovernanceVote", "Community vote API must record governance votes");
requireIncludes(queueApi, "COMMUNITY_QUEUE_SECRET", "Community queue API must require worker secret");
requireIncludes(queueApi, 'body.action === "claim"', "Community queue API must support claim");
requireIncludes(queueApi, 'body.action === "mark"', "Community queue API must support mark");
requireIncludes(discordApi, "DISCORD_WEBHOOK_SECRET", "Discord webhook must require configured secret when present");
requireIncludes(adminApi, "verifyAdminWallet", "Admin community API must verify admin wallet");
requireIncludes(adminApi, "requireSameOrigin", "Admin community mutations must require same-origin");
requireIncludes(adminApi, "insertAdminAuditLog", "Admin community actions must audit changes");
requireIncludes(adminApi, "enqueueCommunityAutomation", "Admin community API must enqueue automation");
requireIncludes(adminApi, "cancel_message", "Admin community API must cancel queued messages");
requireIncludes(adminApi, "community_message_cancelled", "Admin community cancellation must write audit logs");
requireIncludes(adminApi, "close_poll", "Admin community API must close governance polls");
requireIncludes(adminApi, "open_poll", "Admin community API must reopen governance polls");
requireIncludes(adminApi, "community_poll_closed", "Admin community poll close must write audit logs");
requireIncludes(adminApi, "community_poll_opened", "Admin community poll reopen must write audit logs");
requireIncludes(communityLib, "targetHandleForChannel", "Community automation must resolve per-channel target handles");
requireIncludes(communityLib, "targetUserIdForChannel", "Community automation must resolve per-channel target ids");
requireIncludes(communityLib, "recordGovernanceVote", "Community lib must implement governance vote persistence");
requireIncludes(communityLib, "recordCommunityEvent", "Community lib must implement event persistence");
requireIncludes(migration, "idx_community_message_queue_active_unique", "Community message queue must prevent duplicate active messages per rule/wallet");
requireIncludes(communityLib, "alreadyQueued", "Community automation enqueue must skip already queued/processing recipients");
requireIncludes(communityLib, "skipped", "Community automation enqueue must report skipped duplicate recipients");

requireIncludes(docs, "Comunidade como produto", "DOCS.md must document community product layer");
requireIncludes(docs, "/api/community/queue", "DOCS.md must document community queue endpoint");
requireIncludes(runbook, "Community growth operations", "RUNBOOK.md must include community operations");
requireIncludes(runbook, "x-instead-community-secret", "RUNBOOK.md must document queue worker secret header");
requireIncludes(runbook, "x-instead-discord-secret", "RUNBOOK.md must document Discord webhook secret header");

if (migration.includes("auth.role()")) failures.push("Community migration must not use deprecated auth.role()");
if (queueApi.includes("NEXT_PUBLIC") || discordApi.includes("NEXT_PUBLIC")) failures.push("Community secrets must not use NEXT_PUBLIC env vars");
for (const fakeSocialUrl of [
  "discord.gg/instead",
  "t.me/insteadfinance",
  "x.com/insteadfinance",
  "warpcast.com/insteadfinance",
  "reddit.com/r/insteadfinance",
  "youtube.com/@insteadfinance",
  "tiktok.com/@insteadfinance",
  "insteadfinance.substack.com",
]) {
  if (migration.includes(fakeSocialUrl)) failures.push(`Community seed must not hardcode unverified external social URL: ${fakeSocialUrl}`);
}

if (failures.length > 0) {
  console.error("Community growth checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Community growth checks passed.");
