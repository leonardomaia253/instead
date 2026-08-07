"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Link } from "@/navigation";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Award, BellRing, CheckCircle2, Copy, Hash, MessageCircle, PlaySquare, Radio, Send, ShieldCheck, Sparkles, Trophy, Users, Vote } from "lucide-react";

type Channel = { id: string; code: string; name: string; kind: string; url: string; description: string };
type Mission = { id: string; code: string; title: string; description: string; channel_kind: string; reward_xp: number; reward_label: string; requires_review: boolean };
type Member = {
  wallet_address: string;
  discord_username?: string | null;
  telegram_username?: string | null;
  x_username?: string | null;
  farcaster_username?: string | null;
  reddit_username?: string | null;
  youtube_username?: string | null;
  tiktok_username?: string | null;
  newsletter_email?: string | null;
  referral_code: string;
  xp: number;
  level: number;
  role_tier: string;
};
type Event = { id: string; event_type: string; mission_code?: string | null; channel_kind: string; points: number; status: string; created_at: string };
type Reward = { id: string; code: string; title: string; description: string; reward_type: string; unlock_xp: number };
type Poll = { id: string; title: string; description: string; options: string[]; closes_at?: string | null };
type Automation = { id: string; title: string; trigger_type: string; target_segment: string; channel_kind: string; message_template: string };

const channelIcon: Record<string, React.ReactNode> = {
  discord: <Hash size={18} />,
  telegram: <Send size={18} />,
  x: <Radio size={18} />,
  farcaster: <Users size={18} />,
  reddit: <MessageCircle size={18} />,
  youtube: <PlaySquare size={18} />,
  tiktok: <Sparkles size={18} />,
  newsletter: <BellRing size={18} />,
};

export default function CommunityPage() {
  const { address, isConnected } = useAccount();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [leaderboard, setLeaderboard] = useState<Member[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ discordUsername: "", telegramUsername: "", xUsername: "", farcasterUsername: "", redditUsername: "", youtubeUsername: "", tiktokUsername: "", newsletterEmail: "", referredBy: "" });
  const wallet = address?.toLowerCase();

  useEffect(() => {
    const url = wallet ? `/api/community/me?wallet=${encodeURIComponent(wallet)}` : "/api/community/me";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setChannels(data.channels ?? []);
        setMissions(data.missions ?? []);
        setLeaderboard(data.leaderboard ?? []);
        setRewards(data.rewards ?? []);
        setPolls(data.polls ?? []);
        setAutomations(data.automations ?? []);
        setMember(data.member ?? null);
        setEvents(data.events ?? []);
        if (data.member) {
          setForm({
            discordUsername: data.member.discord_username ?? "",
            telegramUsername: data.member.telegram_username ?? "",
            xUsername: data.member.x_username ?? "",
            farcasterUsername: data.member.farcaster_username ?? "",
            redditUsername: data.member.reddit_username ?? "",
            youtubeUsername: data.member.youtube_username ?? "",
            tiktokUsername: data.member.tiktok_username ?? "",
            newsletterEmail: data.member.newsletter_email ?? "",
            referredBy: data.member.referred_by ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [wallet]);

  const completed = useMemo(() => new Set(events.filter((event) => event.status === "approved").map((event) => event.mission_code)), [events]);
  const nextLevelXp = Math.max(200, (member?.level ?? 1) * 550);
  const progress = Math.min(100, Math.round(((member?.xp ?? 0) / nextLevelXp) * 100));
  const connectedCount = ["discord_username", "telegram_username", "x_username", "farcaster_username", "reddit_username", "youtube_username", "tiktok_username", "newsletter_email"].filter((key) => Boolean((member as any)?.[key])).length;
  const suggestedChannel = connectedCount < 2 ? "Discord + Telegram" : connectedCount < 5 ? "X, Farcaster e YouTube" : "Governanca e embaixadores";

  async function saveProfile() {
    if (!wallet) return;
    setSaving(true);
    const response = await fetch("/api/community/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, ...form }),
    });
    const data = await response.json();
    if (data.member) setMember(data.member);
    setSaving(false);
  }

  async function claimMission(mission: Mission) {
    if (!wallet) return;
    await fetch("/api/community/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        missionCode: mission.code,
        channelKind: mission.channel_kind,
        eventType: "mission_claimed",
        points: mission.reward_xp,
        status: mission.requires_review ? "pending" : "approved",
        metadata: { source: "community_page" },
      }),
    });
    const data = await fetch(`/api/community/me?wallet=${encodeURIComponent(wallet)}`).then((res) => res.json());
    setMember(data.member ?? null);
    setEvents(data.events ?? []);
    setLeaderboard(data.leaderboard ?? []);
  }

  async function voteOnPoll(poll: Poll, optionText: string) {
    if (!wallet) return;
    await fetch("/api/community/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, pollId: poll.id, optionText }),
    });
    const data = await fetch(`/api/community/me?wallet=${encodeURIComponent(wallet)}`).then((res) => res.json());
    setMember(data.member ?? null);
    setEvents(data.events ?? []);
    setLeaderboard(data.leaderboard ?? []);
  }

  return (
    <main className="community-shell">
      <section className="community-hero">
        <div className="container community-hero__inner">
          <div>
            <Link href="/" className="community-back">Inicio</Link>
            <span className="community-kicker">Community Growth OS</span>
            <h1>Comunidade acoplada ao produto, nao perdida fora dele.</h1>
              <p>Discord, Telegram, X, Farcaster, Reddit, YouTube, TikTok e newsletter viram uma camada operacional: cargos, XP, missoes, rewards, governanca, CRM e campanhas com menos friccao.</p>
            <div className="community-actions">
              <WalletConnectButton />
              <a href={channels.find((channel) => channel.kind === "discord")?.url ?? "#"} target="_blank" rel="noreferrer" className="btn-outline">
                Abrir Discord
              </a>
            </div>
          </div>
          <div className="community-command">
            <div>
              <span>XP</span>
              <strong>{member?.xp ?? 0}</strong>
            </div>
            <div>
              <span>Nivel</span>
              <strong>{member?.level ?? 1}</strong>
            </div>
            <div>
              <span>Cargo</span>
              <strong>{member?.role_tier ?? "member"}</strong>
            </div>
            <div>
              <span>Proximo canal</span>
              <strong>{suggestedChannel}</strong>
            </div>
            <div className="community-progress"><i style={{ width: `${progress}%` }} /></div>
            <small>{wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Conecte sua wallet para ativar seu perfil"}</small>
          </div>
        </div>
      </section>

      <section className="container community-grid">
        <div className="community-panel community-panel--wide">
          <div className="community-panel__title">
            <ShieldCheck size={22} />
            <div>
              <h2>Onboarding social</h2>
              <p>Vincule seus canais para liberar cargos, canais privados e automacoes de comunidade.</p>
            </div>
          </div>
          {isConnected ? (
            <div className="community-form">
              {[
                ["discordUsername", "Discord", "usuario#0000 ou handle"],
                ["telegramUsername", "Telegram", "seu usuario"],
                ["xUsername", "X / Twitter", "handle publico"],
                ["farcasterUsername", "Farcaster", "warpcast handle"],
                ["redditUsername", "Reddit", "username"],
                ["youtubeUsername", "YouTube", "canal ou @handle"],
                ["tiktokUsername", "TikTok", "@handle"],
                ["newsletterEmail", "Mirror/Substack", "email para updates"],
                ["referredBy", "Codigo de convite", "INST-00000000"],
              ].map(([key, label, placeholder]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input value={(form as any)[key]} placeholder={placeholder} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} />
                </label>
              ))}
              <button className="community-save" onClick={saveProfile} disabled={saving}>{saving ? "Salvando..." : "Salvar perfil"}</button>
            </div>
          ) : (
            <div className="community-empty">Conecte sua wallet para criar um perfil de comunidade e receber XP.</div>
          )}
        </div>

        <div className="community-panel">
          <div className="community-panel__title">
            <Award size={22} />
            <div>
              <h2>Referral</h2>
              <p>Use seu codigo em campanhas, embaixadores e convites.</p>
            </div>
          </div>
          <div className="community-referral">
            <strong>{member?.referral_code ?? "INST-WALLET"}</strong>
            <button onClick={() => member?.referral_code && navigator.clipboard?.writeText(member.referral_code)} title="Copiar codigo">
              <Copy size={16} />
            </button>
          </div>
        </div>

        <div className="community-panel">
          <div className="community-panel__title">
            <Trophy size={22} />
            <div>
              <h2>Ranking</h2>
              <p>Top membros por contribuicao.</p>
            </div>
          </div>
          <div className="community-list">
            {leaderboard.map((item, index) => (
              <div key={item.wallet_address}>
                <span>#{index + 1}</span>
                <strong>{item.discord_username || item.telegram_username || `${item.wallet_address.slice(0, 6)}...${item.wallet_address.slice(-4)}`}</strong>
                <em>{item.xp} XP</em>
              </div>
            ))}
            {!leaderboard.length && <small>{loading ? "Carregando..." : "Sem membros ainda."}</small>}
          </div>
        </div>
      </section>

      <section className="container community-grid community-grid--bottom">
        <div className="community-panel">
          <h2>Canais vivos</h2>
          <div className="community-channel-list">
            {channels.map((channel) => (
              <a key={channel.id} href={channel.url} target="_blank" rel="noreferrer">
                <span>{channelIcon[channel.kind] ?? <Radio size={18} />}</span>
                <strong>{channel.name}</strong>
                <small>{channel.description}</small>
              </a>
            ))}
          </div>
        </div>

        <div className="community-panel community-panel--wide">
          <h2>Missoes de tracao</h2>
          <div className="community-missions">
            {missions.map((mission) => {
              const isDone = completed.has(mission.code);
              return (
                <div key={mission.id}>
                  <span>{isDone ? <CheckCircle2 size={18} /> : channelIcon[mission.channel_kind] ?? <Radio size={18} />}</span>
                  <strong>{mission.title}</strong>
                  <p>{mission.description}</p>
                  <em>{mission.reward_xp} XP · {mission.reward_label}{mission.requires_review ? " · revisao" : ""}</em>
                  <button disabled={!wallet || isDone} onClick={() => claimMission(mission)}>{isDone ? "Concluida" : "Registrar"}</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container community-growth-stack">
        <div className="community-panel">
          <h2>Recompensas</h2>
          <div className="community-rewards">
            {rewards.map((reward) => {
              const unlocked = (member?.xp ?? 0) >= reward.unlock_xp;
              return (
                <div key={reward.id} data-unlocked={unlocked}>
                  <Award size={18} />
                  <strong>{reward.title}</strong>
                  <p>{reward.description}</p>
                  <em>{unlocked ? "Desbloqueado" : `${reward.unlock_xp} XP`}</em>
                </div>
              );
            })}
          </div>
        </div>

        <div className="community-panel">
          <h2>Governanca</h2>
          <div className="community-polls">
            {polls.map((poll) => (
              <div key={poll.id}>
                <Vote size={18} />
                <strong>{poll.title}</strong>
                <p>{poll.description}</p>
                <div>
                  {(Array.isArray(poll.options) ? poll.options : []).map((option) => (
                    <button key={option} disabled={!wallet} onClick={() => voteOnPoll(poll, option)}>{option}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="community-panel">
          <h2>Automacao e CRM</h2>
          <div className="community-automations">
            {automations.map((rule) => (
              <div key={rule.id}>
                <BellRing size={18} />
                <strong>{rule.title}</strong>
                <p>{rule.message_template}</p>
                <em>{rule.trigger_type} · {rule.target_segment} · {rule.channel_kind}</em>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
