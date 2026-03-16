"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Brain, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AIAssistantProps {
  type: "lending" | "token";
  contextData: any;
}

export const AIAssistant = ({ type, contextData }: AIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tips, setTips] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTips = async () => {
    setLoading(true);
    try {
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
      setTips("Erro ao conectar com o assistente. Verifique se a GEMINI_API_KEY está configurada.");
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
    <div style={{ position: "fixed", bottom: 30, right: 30, zIndex: 1000 }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass-morphism"
            style={{
              width: 320,
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
              border: "1px solid rgba(124,58,237,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ 
                  background: "var(--accent-grad)", 
                  padding: 6, 
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Brain size={18} color="white" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.02em" }}>
                  {type === "lending" ? "LENDING ADVISOR" : "TOKEN ARCHITECT"}
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: 4, cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ 
              minHeight: 80, 
              fontSize: 13, 
              lineHeight: 1.6, 
              color: "var(--text-primary)",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 0" }}>
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    style={{ color: "var(--accent-1)" }}
                  >
                    <Sparkles size={24} />
                  </motion.div>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Sintonizando Inteligência...</span>
                </div>
              ) : (
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {tips || "Olá! Deseja dicas personalizadas para sua estratégia?"}
                </div>
              )}
            </div>

            <button 
              onClick={fetchTips} 
              disabled={loading}
              className="btn-primary" 
              style={{ width: "100%", fontSize: 12, padding: "10px 0", borderRadius: 10 }}
            >
              {tips ? "Recalcular Sugestões" : "Obter Dicas"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: "var(--accent-grad)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
        }}
      >
        {isOpen ? <MessageCircle size={24} /> : <Brain size={24} />}
      </motion.button>
    </div>
  );
};
