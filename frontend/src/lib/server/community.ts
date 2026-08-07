import { createSupabaseAdminClient } from "./supabaseAdmin";

export type CommunityProfileInput = {
  wallet: string;
  discordUsername?: string;
  telegramUsername?: string;
  xUsername?: string;
  farcasterUsername?: string;
  redditUsername?: string;
  youtubeUsername?: string;
  tiktokUsername?: string;
  newsletterEmail?: string;
  referredBy?: string;
};

export function normalizeWallet(wallet: string) {
  return wallet.trim().toLowerCase();
}

export function levelFromXp(xp: number) {
  if (xp >= 5000) return 6;
  if (xp >= 2500) return 5;
  if (xp >= 1200) return 4;
  if (xp >= 550) return 3;
  if (xp >= 200) return 2;
  return 1;
}

export function roleTierFromProfile(input: { xp: number; hasDiscord?: boolean; hasTelegram?: boolean }) {
  if (input.xp >= 5000) return "whale";
  if (input.xp >= 2500) return "ambassador";
  if (input.xp >= 1200) return "builder";
  if (input.hasDiscord && input.hasTelegram) return "holder";
  return "member";
}

export function referralCodeFromWallet(wallet: string) {
  return `INST-${normalizeWallet(wallet).replace(/^0x/, "").slice(0, 8).toUpperCase()}`;
}

export async function getCommunityOverview(wallet?: string) {
  const supabase = createSupabaseAdminClient();
  const normalizedWallet = wallet ? normalizeWallet(wallet) : "";

  const [channels, missions, leaderboard, rewards, polls, automations, member, events] = await Promise.all([
    supabase.from("community_channels").select("*").eq("status", "active").order("sort_order", { ascending: true }),
    supabase.from("community_missions").select("*").eq("status", "active").order("sort_order", { ascending: true }),
    supabase.from("community_members").select("wallet_address, discord_username, telegram_username, xp, level, role_tier").order("xp", { ascending: false }).limit(12),
    supabase.from("community_rewards").select("*").eq("status", "active").order("unlock_xp", { ascending: true }),
    supabase.from("community_governance_polls").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(5),
    supabase.from("community_automation_rules").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(8),
    normalizedWallet
      ? supabase
          .from("community_members")
          .select("wallet_address,discord_username,telegram_username,x_username,farcaster_username,reddit_username,youtube_username,tiktok_username,referral_code,referred_by,xp,level,role_tier,onboarding_completed,last_seen_at,created_at,updated_at")
          .eq("wallet_address", normalizedWallet)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    normalizedWallet
      ? supabase.from("community_activity_events").select("*").eq("wallet_address", normalizedWallet).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  return {
    channels: channels.data ?? [],
    missions: missions.data ?? [],
    leaderboard: leaderboard.data ?? [],
    rewards: rewards.data ?? [],
    polls: polls.data ?? [],
    automations: automations.data ?? [],
    member: member.data ?? null,
    events: events.data ?? [],
  };
}

export async function upsertCommunityProfile(input: CommunityProfileInput) {
  const supabase = createSupabaseAdminClient();
  const wallet = normalizeWallet(input.wallet);
  const existing = await supabase.from("community_members").select("*").eq("wallet_address", wallet).maybeSingle();
  const currentXp = Number(existing.data?.xp ?? 0);
  const connectedDiscord = Boolean(input.discordUsername || existing.data?.discord_username);
  const connectedTelegram = Boolean(input.telegramUsername || existing.data?.telegram_username);
  const onboardingCompleted = connectedDiscord || connectedTelegram || Boolean(input.xUsername || input.farcasterUsername || input.redditUsername || input.youtubeUsername || input.tiktokUsername || input.newsletterEmail);
  const bonusXp = existing.data ? 0 : 100;
  const xp = currentXp + bonusXp;
  const level = levelFromXp(xp);
  const roleTier = roleTierFromProfile({ xp, hasDiscord: connectedDiscord, hasTelegram: connectedTelegram });

  const payload = {
    wallet_address: wallet,
    discord_username: input.discordUsername || existing.data?.discord_username || null,
    telegram_username: input.telegramUsername || existing.data?.telegram_username || null,
    x_username: input.xUsername || existing.data?.x_username || null,
    farcaster_username: input.farcasterUsername || existing.data?.farcaster_username || null,
    reddit_username: input.redditUsername || existing.data?.reddit_username || null,
    youtube_username: input.youtubeUsername || existing.data?.youtube_username || null,
    tiktok_username: input.tiktokUsername || existing.data?.tiktok_username || null,
    newsletter_email: input.newsletterEmail || existing.data?.newsletter_email || null,
    referral_code: existing.data?.referral_code || referralCodeFromWallet(wallet),
    referred_by: input.referredBy || existing.data?.referred_by || null,
    onboarding_completed: onboardingCompleted,
    xp,
    level,
    role_tier: roleTier,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("community_members")
    .upsert(payload, { onConflict: "wallet_address" })
    .select("*")
    .single();

  if (error) throw error;

  if (bonusXp > 0) {
    await supabase.from("community_activity_events").insert({
      wallet_address: wallet,
      mission_code: "complete-onboarding",
      channel_kind: "platform",
      event_type: "profile_created",
      points: bonusXp,
      metadata: { source: "community_page" },
    });
  }

  return data;
}

export async function recordCommunityEvent(input: {
  wallet: string;
  missionCode?: string;
  channelKind: string;
  eventType: string;
  points?: number;
  metadata?: Record<string, unknown>;
  status?: "pending" | "approved" | "rejected";
}) {
  const supabase = createSupabaseAdminClient();
  const wallet = normalizeWallet(input.wallet);
  const points = Number(input.points ?? 0);
  const status = input.status ?? "approved";

  if (input.missionCode) {
    const existingEvent = await supabase
      .from("community_activity_events")
      .select("id,status")
      .eq("wallet_address", wallet)
      .eq("mission_code", input.missionCode)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existingEvent.data) return;
  }

  const { error } = await supabase.from("community_activity_events").insert({
    wallet_address: wallet,
    mission_code: input.missionCode ?? null,
    channel_kind: input.channelKind,
    event_type: input.eventType,
    points,
    status,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;

  if (status === "approved" && points > 0) {
    const existing = await supabase.from("community_members").select("xp, discord_username, telegram_username").eq("wallet_address", wallet).maybeSingle();
    const xp = Number(existing.data?.xp ?? 0) + points;
    await supabase
      .from("community_members")
      .upsert({
        wallet_address: wallet,
        referral_code: referralCodeFromWallet(wallet),
        xp,
        level: levelFromXp(xp),
        role_tier: roleTierFromProfile({ xp, hasDiscord: Boolean(existing.data?.discord_username), hasTelegram: Boolean(existing.data?.telegram_username) }),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "wallet_address" });
  }
}

export async function recordGovernanceVote(input: { wallet: string; pollId: string; optionText: string }) {
  const supabase = createSupabaseAdminClient();
  const wallet = normalizeWallet(input.wallet);
  const optionText = input.optionText.trim().slice(0, 120);
  if (!optionText) throw new Error("Missing option");

  const poll = await supabase
    .from("community_governance_polls")
    .select("id,options,status")
    .eq("id", input.pollId)
    .eq("status", "open")
    .maybeSingle();
  if (!poll.data) throw new Error("Poll not found");

  const options = Array.isArray(poll.data.options) ? poll.data.options.map(String) : [];
  if (!options.includes(optionText)) throw new Error("Invalid option");

  const { error } = await supabase
    .from("community_governance_votes")
    .upsert({
      poll_id: input.pollId,
      wallet_address: wallet,
      option_text: optionText,
      created_at: new Date().toISOString(),
    }, { onConflict: "poll_id,wallet_address" });
  if (error) throw error;

  await recordCommunityEvent({
    wallet,
    missionCode: "vote-governance",
    channelKind: "platform",
    eventType: "governance_vote",
    points: 180,
    metadata: { pollId: input.pollId, optionText },
  });
}

export async function enqueueCommunityAutomation(input: { ruleId: string; adminWallet: string }) {
  const supabase = createSupabaseAdminClient();
  const rule = await supabase
    .from("community_automation_rules")
    .select("*")
    .eq("id", input.ruleId)
    .eq("status", "active")
    .maybeSingle();
  if (!rule.data) throw new Error("Automation rule not found");

  const members = (await selectSegmentMembers(rule.data.target_segment))
    .filter((member) => targetHandleForChannel(rule.data.channel_kind, member) || targetUserIdForChannel(rule.data.channel_kind, member));
  if (members.length === 0) return { queued: 0 };

  const existing = await supabase
    .from("community_message_queue")
    .select("wallet_address")
    .eq("automation_rule_id", rule.data.id)
    .in("status", ["queued", "processing"]);
  if (existing.error) throw existing.error;
  const alreadyQueued = new Set((existing.data ?? []).map((item) => item.wallet_address));
  const eligibleMembers = members.filter((member) => !alreadyQueued.has(member.wallet_address));
  if (eligibleMembers.length === 0) return { queued: 0, skipped: members.length };

  const now = new Date().toISOString();
  const rows = eligibleMembers.map((member) => ({
    automation_rule_id: rule.data.id,
    wallet_address: member.wallet_address,
    channel_kind: rule.data.channel_kind,
    target_handle: targetHandleForChannel(rule.data.channel_kind, member),
    target_user_id: targetUserIdForChannel(rule.data.channel_kind, member),
    target_segment: rule.data.target_segment,
    message_template: personalizeMessage(rule.data.message_template, member),
    status: "queued",
    scheduled_at: now,
    metadata: {
      trigger_type: rule.data.trigger_type,
      enqueued_by: input.adminWallet.toLowerCase(),
      role_tier: member.role_tier,
      xp: member.xp,
    },
  }));

  const { error } = await supabase.from("community_message_queue").insert(rows);
  if (error) throw error;
  return { queued: rows.length, skipped: members.length - rows.length };
}

async function selectSegmentMembers(segment: string) {
  const supabase = createSupabaseAdminClient();
  const base = supabase
    .from("community_members")
    .select("wallet_address,discord_user_id,discord_username,telegram_user_id,telegram_username,x_username,farcaster_username,reddit_username,youtube_username,tiktok_username,newsletter_email,xp,level,role_tier,last_seen_at,created_at")
    .limit(250);

  if (segment === "new_member") return (await base.eq("level", 1).order("created_at", { ascending: false })).data ?? [];
  if (segment === "holder_at_risk") {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    return (await base.in("role_tier", ["holder", "builder", "ambassador", "whale"]).lt("last_seen_at", cutoff)).data ?? [];
  }
  if (segment === "ambassador") return (await base.in("role_tier", ["ambassador", "whale"]).order("xp", { ascending: false })).data ?? [];
  if (segment === "active_member") {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return (await base.gte("last_seen_at", cutoff).order("xp", { ascending: false })).data ?? [];
  }
  return (await base.order("xp", { ascending: false })).data ?? [];
}

function personalizeMessage(template: string, member: { wallet_address: string; xp?: number; level?: number; role_tier?: string }) {
  return template
    .replaceAll("{{wallet}}", `${member.wallet_address.slice(0, 6)}...${member.wallet_address.slice(-4)}`)
    .replaceAll("{{xp}}", String(member.xp ?? 0))
    .replaceAll("{{level}}", String(member.level ?? 1))
    .replaceAll("{{role}}", member.role_tier ?? "member");
}

function targetHandleForChannel(channelKind: string, member: Record<string, any>) {
  if (channelKind === "discord") return member.discord_username ?? null;
  if (channelKind === "telegram") return member.telegram_username ?? null;
  if (channelKind === "x") return member.x_username ?? null;
  if (channelKind === "farcaster") return member.farcaster_username ?? null;
  if (channelKind === "reddit") return member.reddit_username ?? null;
  if (channelKind === "youtube") return member.youtube_username ?? null;
  if (channelKind === "tiktok") return member.tiktok_username ?? null;
  if (channelKind === "newsletter") return member.newsletter_email ?? null;
  return null;
}

function targetUserIdForChannel(channelKind: string, member: Record<string, any>) {
  if (channelKind === "discord") return member.discord_user_id ?? null;
  if (channelKind === "telegram") return member.telegram_user_id ?? null;
  return null;
}
