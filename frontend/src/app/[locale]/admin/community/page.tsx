"use client";

import { useEffect, useState } from "react";
import { AdminMetrics, AdminMetric, AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

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
    <AdminPage
      eyebrow="Community ops"
      title="Gerenciamento de comunidade"
      description="Discord, Telegram, canais, missões, XP, indicações e revisões manuais em uma única superfície operacional."
    >

      <AdminMetrics>
        <AdminMetric label="Membros" value={metrics.members ?? 0} />
        <AdminMetric label="Discord conectado" value={metrics.connectedDiscord ?? 0} />
        <AdminMetric label="Telegram conectado" value={metrics.connectedTelegram ?? 0} />
        <AdminMetric label="Multicanal" value={metrics.multiChannelMembers ?? 0} />
        <AdminMetric label="Alta tração" value={metrics.whales ?? 0} />
        <AdminMetric label="Revisões pendentes" value={metrics.pendingReviews ?? 0} />
        <AdminMetric label="Mensagens na fila" value={metrics.queuedMessages ?? 0} />
      </AdminMetrics>

      <section className="admin-community-grid">
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
    </AdminPage>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AdminSection title={title}>
      <div className="admin-community-list">{children}</div>
    </AdminSection>
  );
}

function Line({ left, right, sub }: { left: string; right: string; sub: string }) {
  return (
    <div className="admin-community-row">
      <div className="admin-community-row__body">
        <strong>{left}</strong>
        <small>{sub}</small>
      </div>
      <AdminStatus tone={statusTone(right)}>{right}</AdminStatus>
    </div>
  );
}

function ActionLine({ left, right, sub, actionLabel, disabled, onAction }: { left: string; right: string; sub: string; actionLabel: string; disabled: boolean; onAction: () => void }) {
  return (
    <div className="admin-community-row">
      <div className="admin-community-row__body">
        <strong>{left}</strong>
        <small>{sub}</small>
      </div>
      <span className="admin-community-row__actions">
        <AdminStatus tone={statusTone(right)}>{right}</AdminStatus>
        <button className="admin-action" onClick={onAction} disabled={disabled}>{actionLabel}</button>
      </span>
    </div>
  );
}

function QueueLine({ item, disabled, onCancel }: { item: Row; disabled: boolean; onCancel: () => void }) {
  const canCancel = ["queued", "processing"].includes(item.status);
  return (
    <div className="admin-community-row">
      <div className="admin-community-row__body">
        <strong>{`${item.channel_kind} · ${shortWallet(item.wallet_address)}`}</strong>
        <small>{`${item.target_segment} · ${item.message_template}`}</small>
      </div>
      {canCancel ? (
        <span className="admin-community-row__actions">
          <AdminStatus tone={statusTone(item.status)}>{item.status}</AdminStatus>
          <button className="admin-action admin-action--danger" onClick={onCancel} disabled={disabled}>{disabled ? "Cancelando..." : "Cancelar"}</button>
        </span>
      ) : (
        <AdminStatus tone={statusTone(item.status)}>{item.status}</AdminStatus>
      )}
    </div>
  );
}

function ReviewLine({ event, disabled, onApprove, onReject }: { event: Row; disabled: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="admin-community-row">
      <div className="admin-community-row__body">
        <strong>{event.event_type}</strong>
        <small>{`${shortWallet(event.wallet_address)} · ${event.channel_kind} · ${event.points} XP · ${event.status}`}</small>
      </div>
      {event.status === "pending" ? (
        <span className="admin-community-row__actions">
          <button className="admin-action" onClick={onApprove} disabled={disabled}>Aprovar</button>
          <button className="admin-action admin-action--danger" onClick={onReject} disabled={disabled}>Rejeitar</button>
        </span>
      ) : (
        <AdminStatus tone={statusTone(event.status)}>{event.status}</AdminStatus>
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

function statusTone(status: string): "neutral" | "positive" | "warning" | "critical" {
  const value = status.toLowerCase();
  if (["active", "approved", "sent", "open", "completed"].includes(value)) return "positive";
  if (["pending", "queued", "processing"].includes(value)) return "warning";
  if (["rejected", "failed", "cancelled", "closed"].includes(value)) return "critical";
  return "neutral";
}
