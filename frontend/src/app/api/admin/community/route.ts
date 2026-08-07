import { noStoreJson } from "@/lib/server/responses";
import { requireSameOrigin } from "@/lib/server/csrf";
import { insertAdminAuditLog } from "@/lib/server/adminAudit";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { getAdminWalletSession, verifyAdminWallet } from "@/lib/server/walletAuth";
import { enqueueCommunityAutomation, levelFromXp, referralCodeFromWallet, roleTierFromProfile } from "@/lib/server/community";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "admin:community", 40, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });
  const authError = await verifyAdminWallet(request);
  if (authError) return authError;

  try {
    const supabase = createSupabaseAdminClient();
    const [members, channels, missions, rewards, polls, votes, automations, messageQueue, events] = await Promise.all([
      supabase.from("community_members").select("*").order("xp", { ascending: false }).limit(100),
      supabase.from("community_channels").select("*").order("sort_order", { ascending: true }),
      supabase.from("community_missions").select("*").order("sort_order", { ascending: true }),
      supabase.from("community_rewards").select("*").order("unlock_xp", { ascending: true }),
      supabase.from("community_governance_polls").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("community_governance_votes").select("poll_id,option_text,wallet_address,created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("community_automation_rules").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("community_message_queue").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("community_activity_events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    const voteResults = aggregateVotes(votes.data ?? []);

    return noStoreJson({
      members: members.data ?? [],
      channels: channels.data ?? [],
      missions: missions.data ?? [],
      rewards: rewards.data ?? [],
      polls: polls.data ?? [],
      voteResults,
      automations: automations.data ?? [],
      messageQueue: messageQueue.data ?? [],
      events: events.data ?? [],
      metrics: {
        members: members.data?.length ?? 0,
        connectedDiscord: members.data?.filter((item: any) => item.discord_username).length ?? 0,
        connectedTelegram: members.data?.filter((item: any) => item.telegram_username).length ?? 0,
        multiChannelMembers: members.data?.filter((item: any) => [item.discord_username, item.telegram_username, item.x_username, item.farcaster_username, item.reddit_username, item.youtube_username, item.tiktok_username, item.newsletter_email].filter(Boolean).length >= 3).length ?? 0,
        whales: members.data?.filter((item: any) => item.role_tier === "whale").length ?? 0,
        pendingReviews: events.data?.filter((item: any) => item.status === "pending").length ?? 0,
        queuedMessages: messageQueue.data?.filter((item: any) => item.status === "queued").length ?? 0,
      },
    });
  } catch (error) {
    console.error("Admin community failed", error);
    return noStoreJson({ error: "Community admin unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const limited = rateLimit(request, "admin:community:patch", 30, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  const authError = await verifyAdminWallet(request);
  if (authError) return authError;
  const adminSession = getAdminWalletSession(request);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; eventId?: string; automationRuleId?: string; messageId?: string; pollId?: string; notes?: string };
  try {
    body = await readLimitedJson(request, 4096);
  } catch {
    return noStoreJson({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!["approve_event", "reject_event", "enqueue_automation", "cancel_message", "close_poll", "open_poll"].includes(body.action ?? "")) {
    return noStoreJson({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    if (body.action === "enqueue_automation") {
      if (!body.automationRuleId || !/^[0-9a-fA-F-]{36}$/.test(body.automationRuleId)) {
        return noStoreJson({ error: "Invalid automation rule" }, { status: 400 });
      }
      const result = await enqueueCommunityAutomation({
        ruleId: body.automationRuleId,
        adminWallet: adminSession.wallet_address,
      });
      await insertAdminAuditLog({
        request,
        adminWallet: adminSession.wallet_address,
        action: "community_automation_enqueue",
        targetResource: `community_automation_rules:${body.automationRuleId}`,
        details: result,
      });
      return noStoreJson(result);
    }

    if (body.action === "cancel_message") {
      if (!body.messageId || !/^[0-9a-fA-F-]{36}$/.test(body.messageId)) {
        return noStoreJson({ error: "Invalid message" }, { status: 400 });
      }
      const updatedMessage = await supabase
        .from("community_message_queue")
        .update({
          status: "cancelled",
          error_message: "Cancelled by admin",
          metadata: {
            cancelled_by: adminSession.wallet_address.toLowerCase(),
            cancelled_at: new Date().toISOString(),
            cancel_notes: String(body.notes || "").slice(0, 500),
          },
        })
        .eq("id", body.messageId)
        .in("status", ["queued", "processing"])
        .select("*")
        .maybeSingle();
      if (updatedMessage.error) return noStoreJson({ error: "Could not cancel message" }, { status: 500 });
      if (!updatedMessage.data) return noStoreJson({ error: "Message not cancellable" }, { status: 409 });
      await insertAdminAuditLog({
        request,
        adminWallet: adminSession.wallet_address,
        action: "community_message_cancelled",
        targetResource: `community_message_queue:${body.messageId}`,
        details: updatedMessage.data,
      });
      return noStoreJson({ message: updatedMessage.data });
    }

    if (body.action === "close_poll" || body.action === "open_poll") {
      if (!body.pollId || !/^[0-9a-fA-F-]{36}$/.test(body.pollId)) {
        return noStoreJson({ error: "Invalid poll" }, { status: 400 });
      }
      const nextStatus = body.action === "close_poll" ? "closed" : "open";
      const updatePayload = body.action === "close_poll"
        ? { status: nextStatus, closes_at: new Date().toISOString() }
        : { status: nextStatus };
      const updatedPoll = await supabase
        .from("community_governance_polls")
        .update(updatePayload)
        .eq("id", body.pollId)
        .select("*")
        .maybeSingle();
      if (updatedPoll.error) return noStoreJson({ error: "Could not update poll" }, { status: 500 });
      if (!updatedPoll.data) return noStoreJson({ error: "Poll not found" }, { status: 404 });
      await insertAdminAuditLog({
        request,
        adminWallet: adminSession.wallet_address,
        action: body.action === "close_poll" ? "community_poll_closed" : "community_poll_opened",
        targetResource: `community_governance_polls:${body.pollId}`,
        details: updatedPoll.data,
      });
      return noStoreJson({ poll: updatedPoll.data });
    }

    if (!body.eventId || !/^[0-9a-fA-F-]{36}$/.test(body.eventId)) {
      return noStoreJson({ error: "Invalid event" }, { status: 400 });
    }

    const current = await supabase
      .from("community_activity_events")
      .select("*")
      .eq("id", body.eventId)
      .maybeSingle();
    if (current.error || !current.data) return noStoreJson({ error: "Event not found" }, { status: 404 });
    if (current.data.status !== "pending") return noStoreJson({ error: "Event already reviewed" }, { status: 409 });

    const nextStatus = body.action === "approve_event" ? "approved" : "rejected";
    const metadata = {
      ...(current.data.metadata ?? {}),
      reviewed_by: adminSession.wallet_address.toLowerCase(),
      reviewed_at: new Date().toISOString(),
      review_notes: String(body.notes || "").slice(0, 500),
    };

    const updated = await supabase
      .from("community_activity_events")
      .update({ status: nextStatus, metadata })
      .eq("id", body.eventId)
      .select("*")
      .single();
    if (updated.error) return noStoreJson({ error: "Could not review event" }, { status: 500 });

    if (nextStatus === "approved" && Number(current.data.points ?? 0) > 0) {
      const member = await supabase
        .from("community_members")
        .select("xp,discord_username,telegram_username")
        .eq("wallet_address", current.data.wallet_address)
        .maybeSingle();
      const xp = Number(member.data?.xp ?? 0) + Number(current.data.points ?? 0);
      await supabase.from("community_members").upsert({
        wallet_address: current.data.wallet_address,
        referral_code: referralCodeFromWallet(current.data.wallet_address),
        xp,
        level: levelFromXp(xp),
        role_tier: roleTierFromProfile({
          xp,
          hasDiscord: Boolean(member.data?.discord_username),
          hasTelegram: Boolean(member.data?.telegram_username),
        }),
        updated_at: new Date().toISOString(),
      }, { onConflict: "wallet_address" });
    }

    await insertAdminAuditLog({
      request,
      adminWallet: adminSession.wallet_address,
      action: `community_event_${nextStatus}`,
      targetResource: `community_activity_events:${body.eventId}`,
      details: updated.data,
    });

    return noStoreJson({ event: updated.data });
  } catch (error) {
    console.error("Admin community review failed", error);
    return noStoreJson({ error: "Could not review event" }, { status: 500 });
  }
}

function aggregateVotes(votes: Array<{ poll_id: string; option_text: string }>) {
  const result: Record<string, Record<string, number>> = {};
  for (const vote of votes) {
    if (!result[vote.poll_id]) result[vote.poll_id] = {};
    result[vote.poll_id][vote.option_text] = (result[vote.poll_id][vote.option_text] ?? 0) + 1;
  }
  return result;
}
