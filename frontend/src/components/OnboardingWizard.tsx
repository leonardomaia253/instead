"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  X,
  Lock,
  Wallet,
  TrendingUp,
  Gavel
} from "lucide-react";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tokenName: string;
  tokenSymbol: string;
}

const steps = [
  {
    title: "Parabéns, Guru!",
    description: "Seu token acaba de nascer na blockchain. Este é o primeiro passo de uma jornada épica.",
    icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
    color: "var(--green)",
    content: (name: string, symbol: string) => (
      <div className="space-y-4">
        <p className="text-gray-300">
          O token <strong className="text-white">{name} (${symbol})</strong> foi implantado com sucesso. 
          Como criador, você agora possui uma responsabilidade monumental sobre este contrato inteligente.
        </p>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400 mt-1" />
          <p className="text-sm text-blue-200">
            A <strong>Instead</strong> está aqui para ser seu braço direito na gestão e utilidade deste ativo.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Cuidados Essenciais",
    description: "Gerenciar um token exige disciplina. Não ignore estes pontos críticos.",
    icon: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
    color: "#f59e0b",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <Lock className="w-5 h-5 text-yellow-400 mt-1" />
          <div>
            <h4 className="font-bold text-white text-sm">Segurança de Chaves</h4>
            <p className="text-xs text-gray-400">Sua carteira de deployer é a única com poderes administrativos. Nunca compartilhe a seed phrase.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <Wallet className="w-5 h-5 text-yellow-400 mt-1" />
          <div>
            <h4 className="font-bold text-white text-sm">Liquidez Inicial</h4>
            <p className="text-xs text-gray-400">Sem liquidez (ex: Uniswap), seu token não tem valor de mercado. Planeje o aporte inicial com cautela.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <ShieldCheck className="w-5 h-5 text-yellow-400 mt-1" />
          <div>
            <h4 className="font-bold text-white text-sm">Verificação do Contrato</h4>
            <p className="text-xs text-gray-400">Verifique o código no Explorer para ganhar confiança dos investidores.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Sua Responsabilidade",
    description: "Como emissor, você é o guardião da confiança da sua comunidade.",
    icon: <Gavel className="w-12 h-12 text-red-500" />,
    color: "#ef4444",
    content: () => (
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          A criação de tokens é uma ferramenta poderosa. Práticas mal-intencionadas como <em>rugpulls</em> ou taxas abusivas 
          prejudicam todo o ecossistema.
        </p>
        <ul className="text-xs space-y-2 text-gray-400">
          <li className="flex items-center gap-2">• Mantenha transparência total com seus holders.</li>
          <li className="flex items-center gap-2">• Siga as regulamentações locais do seu território.</li>
          <li className="flex items-center gap-2">• Use os fundos da treasury apenas para o desenvolvimento do projeto.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Empréstimos & Alavancagem",
    description: "O próximo passo para o sucesso do seu token é a utilidade.",
    icon: <Coins className="w-12 h-12 text-purple-500" />,
    color: "var(--accent-1)",
    content: () => (
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Sabia que você pode usar o {`Instead Lending`} para permitir que holders usem seu token como colateral?
        </p>
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <h4 className="font-bold text-purple-300 text-sm mb-2">Vantagens de Integrar ao Lending:</h4>
          <ul className="text-xs space-y-1 text-purple-200">
            <li>✓ Reduz pressão de venda (holders pegam empréstimo em vez de vender).</li>
            <li>✓ Cria demanda orgânica pelo token.</li>
            <li>✓ Gera utilidade financeira real desde o dia 1.</li>
          </ul>
        </div>
        <button className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 transition-colors font-bold text-sm">
          Explorar Protocolo de Empréstimo
        </button>
      </div>
    ),
  },
];

export function OnboardingWizard({ isOpen, onClose, tokenName, tokenSymbol }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e1628] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header Accent */}
          <div 
            className="h-2 w-full transition-colors duration-500" 
            style={{ background: step.color }}
          />

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <motion.div
                key={currentStep}
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                className="mb-4"
              >
                {step.icon}
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2 font-space">{step.title}</h2>
              <p className="text-gray-400 text-sm max-w-sm">{step.description}</p>
            </div>

            <motion.div
              key={`content-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="min-h-[220px]"
            >
              {step.content(tokenName, tokenSymbol)}
            </motion.div>

            {/* Footer Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? "w-8 bg-purple-500" : "w-2 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button 
                    onClick={prev}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    Anterior
                  </button>
                )}
                <button 
                  onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 rounded-xl text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                >
                  {currentStep === steps.length - 1 ? "Entendido!" : "Próximo"}
                  {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
