"use client";

import { useEffect, useState } from "react";
import { Award, BellRing, Hash, Send, Trophy, Users, Vote } from "lucide-react";

type Row = Record<string, any>;

export default function AdminCommunityPage() {
  const [data, setData] = useState<{ members: Row[]; channels: Row[]; missions: Row[]; rewards: Row[]; polls: Row[]; voteResults: Record<string, Record<string, number>>; automations: Row[]; messageQueue: Row[]; events: Row[]; metrics: Row } | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [enqueueing, setEnqueueing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [updatingPoll, setUpdatingPoll] = useState<string | null>(null);

  useEffect(() => {
    loadCommunity();
  }, []);

  const metrics = data?.metrics ?? {};

  async function loadCommunity() {
    fetch("/api/admin/community")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ members: [], channels: [], missions: [], rewards: [], polls: [], voteResults: {}, automations: [], messageQueue: [], events: [], metrics: {} }));
  }

  async function reviewEvent(eventId: string, action: "approve_event" | "reject_event") {
    setReviewing(eventId);
    await fetch("/api/admin/community", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, eventId }),
    });
    await loadCommunity();
    setReviewing(null);
  }

  async function enqueueAutomation(automationRuleId: string) {
    setEnqueueing(automationRuleId);
    await fetch("/api/admin/community", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enqueue_automation", automationRuleId }),
    });
    await loadCommunity();
    setEnqueueing(null);
  }

  async function cancelMessage(messageId: string) {
    setCancelling(messageId);
    await fetch("/api/admin/community", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel_message", messageId }),
    });
    await loadCommunity();
    setCancelling(null);
  }

  async function setPollStatus(pollId: string, action: "close_poll" | "open_poll") {
    setUpdatingPoll(pollId);
    await fetch("/api/admin/community", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, pollId }),
    });
    await loadCommunity();
    setUpdatingPoll(null);
  }

  return (
    <div style={{ padding: 32, display: "grid", gap: 24 }}>
      <header>
        <span style={eyebrow}>COMMUNITY OPS</span>
        <h1 style={title}>Gerenciamento de comunidade</h1>
        <p style={muted}>Discord, Telegram, canais cripto, missoes, XP, referrals e revisoes manuais em um so cockpit.</p>
      </header>

      <section style={metricGrid}>
        <Metric icon={<Users size={20} />} label="Membros" value={metrics.members ?? 0} />
        <Metric icon={<Hash size={20} />} label="Discord conectado" value={metrics.connectedDiscord ?? 0} />
        <Metric icon={<Send size={20} />} label="Telegram conectado" value={metrics.connectedTelegram ?? 0} />
        <Metric icon={<Users size={20} />} label="Multi-canal" value={metrics.multiChannelMembers ?? 0} />
        <Metric icon={<Trophy size={20} />} label="Whales/alta tracao" value={metrics.whales ?? 0} />
        <Metric icon={<Award size={20} />} label="Revisoes pendentes" value={metrics.pendingReviews ?? 0} />
        <Metric icon={<BellRing size={20} />} label="Mensagens na fila" value={metrics.queuedMessages ?? 0} />
      </section>

      <section style={grid}>
        <Panel title="Top membros">
          {(data?.members ?? []).slice(0, 12).map((member, index) => (
            <Line key={member.id} left={`#${index + 1} ${member.discord_username || member.telegram_username || shortWallet(member.wallet_address)}`} right={`${member.xp} XP`} sub={`${member.role_tier} · nivel ${member.level}`} />
          ))}
        </Panel>

        <Panel title="Canais">
          {(data?.channels ?? []).map((channel) => (
            <Line key={channel.id} left={channel.name} right={channel.status} sub={`${channel.kind} · ${channel.url}`} />
          ))}
        </Panel>

        <Panel title="Missoes">
          {(data?.missions ?? []).map((mission) => (
            <Line key={mission.id} left={mission.title} right={`${mission.reward_xp} XP`} sub={`${mission.channel_kind} · ${mission.requires_review ? "revisao manual" : "auto"}`} />
          ))}
        </Panel>

        <Panel title="Recompensas">
          {(data?.rewards ?? []).map((reward) => (
            <Line key={reward.id} left={reward.title} right={`${reward.unlock_xp} XP`} sub={`${reward.reward_type} · ${reward.description}`} />
          ))}
        </Panel>

        <Panel title="Governanca">
          {(data?.polls ?? []).map((poll) => (
            <ActionLine
              key={poll.id}
              left={poll.title}
              right={poll.status}
              sub={`${poll.description} · ${formatVoteResults(data?.voteResults?.[poll.id])}`}
              actionLabel={updatingPoll === poll.id ? "Atualizando..." : poll.status === "open" ? "Fechar" : "Reabrir"}
              disabled={updatingPoll === poll.id || !["open", "closed"].includes(poll.status)}
              onAction={() => setPollStatus(poll.id, poll.status === "open" ? "close_poll" : "open_poll")}
            />
          ))}
        </Panel>

        <Panel title="Automacoes CRM">
          {(data?.automations ?? []).map((rule) => (
            <ActionLine
              key={rule.id}
              left={rule.title}
              right={rule.status}
              sub={`${rule.trigger_type} · ${rule.target_segment} · ${rule.channel_kind}`}
              actionLabel={enqueueing === rule.id ? "Gerando..." : "Enfileirar"}
              disabled={enqueueing === rule.id || rule.status !== "active"}
              onAction={() => enqueueAutomation(rule.id)}
            />
          ))}
        </Panel>

        <Panel title="Fila de mensagens">
          {(data?.messageQueue ?? []).slice(0, 16).map((item) => (
            <QueueLine
              key={item.id}
              item={item}
              disabled={cancelling === item.id}
              onCancel={() => cancelMessage(item.id)}
            />
          ))}
        </Panel>

        <Panel title="Atividade recente">
          {(data?.events ?? []).slice(0, 16).map((event) => (
            <ReviewLine
              key={event.id}
              event={event}
              disabled={reviewing === event.id}
              onApprove={() => reviewEvent(event.id, "approve_event")}
              onReject={() => reviewEvent(event.id, "reject_event")}
            />
          ))}
        </Panel>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={metricCard}>
      <span style={{ color: "var(--accent-1)" }}>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={panel}>
      <h2 style={panelTitle}><Trophy size={18} /> {title}</h2>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Line({ left, right, sub }: { left: string; right: string; sub: string }) {
  return (
    <div style={line}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block", overflowWrap: "anywhere" }}>{left}</strong>
        <small style={muted}>{sub}</small>
      </div>
      <span style={{ color: "var(--accent-1)", fontWeight: 800, whiteSpace: "nowrap" }}>{right}</span>
    </div>
  );
}

function ActionLine({ left, right, sub, actionLabel, disabled, onAction }: { left: string; right: string; sub: string; actionLabel: string; disabled: boolean; onAction: () => void }) {
  return (
    <div style={line}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block", overflowWrap: "anywhere" }}>{left}</strong>
        <small style={muted}>{sub}</small>
      </div>
      <span style={reviewActions}>
        <span style={{ color: "var(--accent-1)", fontWeight: 800, whiteSpace: "nowrap" }}>{right}</span>
        <button onClick={onAction} disabled={disabled} style={approveButton}>{actionLabel}</button>
      </span>
    </div>
  );
}

function QueueLine({ item, disabled, onCancel }: { item: Row; disabled: boolean; onCancel: () => void }) {
  const canCancel = ["queued", "processing"].includes(item.status);
  return (
    <div style={line}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block", overflowWrap: "anywhere" }}>{`${item.channel_kind} · ${shortWallet(item.wallet_address)}`}</strong>
        <small style={muted}>{`${item.target_segment} · ${item.message_template}`}</small>
      </div>
      {canCancel ? (
        <span style={reviewActions}>
          <span style={{ color: "var(--accent-1)", fontWeight: 800, whiteSpace: "nowrap" }}>{item.status}</span>
          <button onClick={onCancel} disabled={disabled} style={rejectButton}>{disabled ? "Cancelando..." : "Cancelar"}</button>
        </span>
      ) : (
        <span style={{ color: "var(--accent-1)", fontWeight: 800, whiteSpace: "nowrap" }}>{item.status}</span>
      )}
    </div>
  );
}

function ReviewLine({ event, disabled, onApprove, onReject }: { event: Row; disabled: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div style={line}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block", overflowWrap: "anywhere" }}>{event.event_type}</strong>
        <small style={muted}>{`${shortWallet(event.wallet_address)} · ${event.channel_kind} · ${event.points} XP · ${event.status}`}</small>
      </div>
      {event.status === "pending" ? (
        <span style={reviewActions}>
          <button onClick={onApprove} disabled={disabled} style={approveButton}>Aprovar</button>
          <button onClick={onReject} disabled={disabled} style={rejectButton}>Rejeitar</button>
        </span>
      ) : (
        <span style={{ color: "var(--accent-1)", fontWeight: 800, whiteSpace: "nowrap" }}>{event.status}</span>
      )}
    </div>
  );
}

function shortWallet(wallet: string) {
  return wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "sem wallet";
}

function formatVoteResults(results?: Record<string, number>) {
  if (!results || Object.keys(results).length === 0) return "sem votos";
  return Object.entries(results)
    .sort((a, b) => b[1] - a[1])
    .map(([option, count]) => `${option}: ${count}`)
    .join(" | ");
}

const eyebrow = { color: "var(--accent-1)", fontFamily: "monospace", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em" };
const title = { marginTop: 10, fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, lineHeight: 1 };
const muted = { color: "var(--text-muted)", lineHeight: 1.55 };
const metricGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 };
const metricCard = { border: "1px solid var(--border)", background: "var(--bg-card)", padding: 18, display: "grid", gap: 8 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 16 };
const panel = { border: "1px solid var(--border)", background: "var(--bg-card)", padding: 20, minWidth: 0 };
const panelTitle = { display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase" as const };
const line = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" };
const reviewActions = { display: "flex", gap: 8, flexWrap: "wrap" as const, justifyContent: "flex-end" };
const approveButton = { border: "1px solid var(--accent-1)", background: "var(--accent-1)", color: "#050604", padding: "7px 9px", fontWeight: 800, cursor: "pointer" };
const rejectButton = { border: "1px solid var(--red)", background: "transparent", color: "var(--red)", padding: "7px 9px", fontWeight: 800, cursor: "pointer" };
