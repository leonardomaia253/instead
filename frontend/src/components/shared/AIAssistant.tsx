"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, MessageCircle } from "lucide-react";
import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

interface AIAssistantProps {
  type: "lending" | "token";
  contextData: any;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ type, contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tips, setTips] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTips = async () => {
    setLoading(true);
    try {
      assertSupabaseConfigured();
      const { data, error } = await supabase.functions.invoke(
        type === "lending" ? "lending-ai" : "token-ai",
        {
          body: contextData,
        }
      );
      if (error) throw error;
      setTips(data.tips);
    } catch (err) {
      console.error("AI Error:", err);
      setTips("Não foi possível conectar ao assistente no momento. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !tips && !loading) {
      fetchTips();
    }
  }, [isOpen]);

  // Optional: Auto-refresh tips when context changes significantly
  // But to avoid too many API calls, we keep it manual or triggered by a specific button.

  return (
    <div className="ai-assistant">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="context-assistant__panel"
          >
            <div className="context-assistant__header">
              <div className="context-assistant__identity">
                <span className="context-assistant__eyebrow">Análise contextual</span>
                <span className="context-assistant__title">
                  {type === "lending" ? "Leitura da posição" : "Revisão da emissão"}
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="context-assistant__close"
                aria-label="Fechar análise"
              >
                <X size={16} />
              </button>
            </div>

            <div className="context-assistant__content">
              {loading ? (
                <div className="context-assistant__loading">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <RefreshCw size={20} />
                  </motion.div>
                  <span>Analisando os parâmetros...</span>
                </div>
              ) : (
                <div className="context-assistant__text">
                  {tips || "Gere uma leitura dos parâmetros atuais antes de continuar."}
                </div>
              )}
            </div>

            <button 
              onClick={fetchTips} 
              disabled={loading}
              className="btn-primary context-assistant__refresh"
            >
              {tips ? "Atualizar análise" : "Gerar análise"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ y: 0 }}
        onClick={() => setIsOpen(!isOpen)}
        className="context-assistant__trigger"
      >
        <MessageCircle size={17} />
        <span>{isOpen ? "Fechar análise" : "Analisar parâmetros"}</span>
      </motion.button>
    </div>
  );
};
