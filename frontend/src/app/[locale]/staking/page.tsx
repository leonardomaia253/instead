"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAccount, useChainId } from "wagmi";
import { 
  Zap, 
  Coins, 
  TrendingUp, 
  Info,
  ChevronRight,
  Loader2
} from "lucide-react";
import { 
  getStakingPools, 
  getPlatformStats, 
  insertAudit, 
  enqueueReconciliation,
  type StakingPool, 
  type PlatformStat 
} from "@/lib/supabase";
import { useInsteadStaking } from "@/hooks/useInsteadStaking";
import { ROICalculator } from "@/components/ROICalculator";
import { useToast } from "@/components/Toast";
import { PlainLanguageGlossary, RiskWarning, SafetyChecklist, SimpleModeNotice } from "@/components/ElderFriendly";
import { MetricCard, MetricGrid, PageHeader, ProductShell } from "@/components/ui/Institutional";

// Mapper para ícones do Lucide baseado no banco de dados
const IconMapper: Record<string, React.ReactNode> = {
  "Coins": <Coins className="w-8 h-8 text-blue-500" />,
  "Zap": <Zap className="w-8 h-8 onboarding-icon" />,
  "TrendingUp": <TrendingUp className="w-8 h-8 text-green-500" />
};

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const toast = useToast();
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [stats, setStats] = useState<PlatformStat[]>([]);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { stake, unstake, claimReward, stakedBalance, pendingReward, isPending: txPending, isConfirmed, txHash, refetch } = useInsteadStaking();

  useEffect(() => {
    async function loadData() {
      try {
        const [poolsData, statsData] = await Promise.all([
          getStakingPools(),
          getPlatformStats()
        ]);
        setPools(poolsData);
        setStats(statsData);
        if (poolsData.length > 0) setSelectedPool(poolsData[1] || poolsData[0]);
      } catch (error) {
        console.error("Erro ao carregar dados de staking:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      setIsSubmitting(false);
      setAmount("");
    }
  }, [isConfirmed, refetch]);

  const handleStake = async () => {
    if (!address || !selectedPool || !amount) return;
    
    setIsSubmitting(true);
    try {
      // Transação real on-chain
      const hash = await stake(amount);
      const operationId = `${address.toLowerCase()}:STAKE:${hash.toLowerCase()}`;
      
      // Auditoria no Supabase
      await insertAudit({
        user_wallet: address,
        action: "STAKE",
        operation_id: operationId,
        tx_hash: hash,
        chain_id: chainId,
        status: "confirmed",
        metadata: {
          pool_id: selectedPool.id,
          pool_name: selectedPool.name,
          amount: amount,
          symbol: "INST",
          tx_hash: hash,
          chain_id: chainId
        }
      });

      await enqueueReconciliation({
        operation_id: operationId,
        user_wallet: address,
        vertical: "staking",
        action: "STAKE",
        tx_hash: hash,
        chain_id: chainId,
        expected_state: {
          pool_id: selectedPool.id,
          amount,
          symbol: "INST",
        },
      });
      
      toast.success(`Solicitação de staking de ${amount} INST enviada com sucesso.`);
    } catch (error: any) {
      console.error("Erro ao realizar stake:", error);
      toast.error(error.message || "Erro ao realizar stake. Verifique a carteira e tente novamente.");
      setIsSubmitting(false);
    }
  };

  const getStat = (key: string) => stats.find(s => s.key === key)?.value || "---";

  if (loading) {
    return (
      <div className="page-loading-state">
        <Loader2 className="w-12 h-12 onboarding-icon animate-spin" />
      </div>
    );
  }

  return (
    <div className="public-page-frame">
      <Navbar />
      
      <ProductShell width="wide" className="staking-shell">
        {/* Hero Section */}
        <PageHeader
          eyebrow="Rendimento on-chain"
          title="Staking com prazo e risco visíveis"
          description="Compare bloqueio, rendimento estimado e liquidez antes de escolher um pool. Nenhuma taxa é tratada como promessa."
        />
        <div className="product-guidance staking-guidance">
          <SimpleModeNotice title="Como o staking funciona">
            Você bloqueia tokens por um período para buscar rendimento. Antes de depositar, confira prazo, taxa de saída e se pode esperar até o fim do bloqueio.
          </SimpleModeNotice>
          <PlainLanguageGlossary
          items={[
            { term: "APR", meaning: "Estimativa anual de rendimento. Pode mudar e nao e promessa de lucro." },
            { term: "Lock", meaning: "Periodo em que o valor fica bloqueado ou tem custo para sair." },
            { term: "TVL", meaning: "Total depositado naquele pool por todos os usuarios." },
          ]}
          />
        </div>

        {/* Stats Grid */}
        <MetricGrid>
          <MetricCard label="Total depositado" value={getStat("total_value_locked")} />
          <MetricCard label="APR médio" value={getStat("average_apr")} />
          <MetricCard label="Segurança do protocolo" value={getStat("protocol_security")} />
        </MetricGrid>

        <div className="staking-workspace">
          {/* Pools Sidebar */}
          <section className="staking-pools">
            <h3 className="workspace-title">Escolha um pool</h3>
            <div className="staking-pool-list">
              {pools.map((pool) => (
                <button className="staking-pool"
                  key={pool.id}
                  onClick={() => setSelectedPool(pool)}
                  style={{
                    "--pool-color": pool.color,
                    borderColor: selectedPool?.id === pool.id ? pool.color : "var(--border)",
                    background: selectedPool?.id === pool.id ? `${pool.color}08` : "var(--bg-card)"
                  } as React.CSSProperties}
                >
                  <div className="staking-pool__identity">
                    <div className="staking-pool__icon">{IconMapper[pool.icon_name] || <Coins className="w-8 h-8" />}</div>
                    <div>
                      <h4>{pool.name}</h4>
                      <p>{pool.description}</p>
                    </div>
                  </div>
                  <div className="staking-pool__metrics">
                    <strong>{pool.apr} APR</strong>
                    <span>TVL: {pool.tvl}</span>
                  </div>
                  <ChevronRight 
                    className={`staking-pool__chevron${selectedPool?.id === pool.id ? " is-selected" : ""}`}
                    size={17}
                  />
                </button>
              ))}
            </div>

            {/* ROI Calculator integrated below pools */}
            {selectedPool && (
              <ROICalculator 
                defaultApr={parseFloat(selectedPool.apr)} 
                tokenSymbol={selectedPool.symbol} 
              />
            )}
          </section>

          {/* Staking Form */}
          {selectedPool && (
            <section className="staking-operation">
              <div className="card staking-card">
                <div className="staking-card__header">
                  <div className="staking-card__icon" style={{ background: selectedPool.color }}>
                    {IconMapper[selectedPool.icon_name]}
                  </div>
                  <div>
                    <h3>Depositar em {selectedPool.name}</h3>
                    <span>Ativo: $INST</span>
                  </div>
                </div>

                <div className="staking-amount">
                  <div className="staking-amount__label">
                    <span>Quantidade</span>
                    <span>Saldo: 0.00 INST</span>
                  </div>
                  <div className="staking-amount__input">
                    <input 
                      type="number" 
                      placeholder="0.0" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button type="button">Máx.</button>
                  </div>
                </div>

                <dl className="staking-summary">
                  <div>
                    <dt>Rendimento estimado</dt>
                    <dd data-tone="positive">+ {(parseFloat(amount || "0") * parseFloat(selectedPool.apr) / 100).toFixed(2)} INST/ano</dd>
                  </div>
                  <div>
                    <dt>Período de lock</dt>
                    <dd>{selectedPool.lock_period}</dd>
                  </div>
                  <div>
                    <dt>Taxa de saída</dt>
                    <dd>0,5%</dd>
                  </div>
                </dl>
                <RiskWarning>
                  Depositar em staking envolve risco de contrato inteligente e variacao do token. Use apenas valores que voce entende e pode manter pelo periodo de lock.
                </RiskWarning>
                <SafetyChecklist
                  items={[
                    "Confira o periodo de lock antes de depositar.",
                    "Veja a taxa de saida antes de sair antecipadamente.",
                    "A carteira sempre pede confirmacao antes da transacao.",
                  ]}
                />

                <button
                  onClick={handleStake}
                  disabled={!isConnected || !amount || isSubmitting}
                  className="btn-primary staking-submit"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aprovar & Depositar"}
                </button>

                {!isConnected && (
                  <p className="staking-card__error">
                    Conecte sua carteira para realizar stake.
                  </p>
                )}

                <p className="staking-card__disclaimer">
                  <Info className="w-3 h-3 inline mr-1" />
                  Ao fazer o staking, você concorda com os riscos de custódia em smart contracts. Todas as ações são auditadas.
                </p>
              </div>
            </section>
          )}
        </div>
      </ProductShell>

      <Footer />
    </div>
  );
}
