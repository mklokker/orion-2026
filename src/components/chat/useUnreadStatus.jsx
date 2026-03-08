import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook para gerenciar status "não lido" de conversas
 * Permite marcar/desmarcar uma conversa como não lida manualmente
 * Dados persistem em localStorage (por user_email)
 */
export function useUnreadStatus(userEmail) {
  const [unreadManual, setUnreadManual] = useState({});
  const storageKey = `orion_manual_unread_${userEmail}`;

  // Carregar do localStorage ao montar
  useEffect(() => {
    if (!userEmail) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setUnreadManual(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erro ao carregar unread status:", e);
    }
  }, [userEmail, storageKey]);

  // Alternar status não lido
  const toggleUnreadStatus = useCallback((conversationId) => {
    setUnreadManual(prev => {
      const next = { ...prev };
      if (next[conversationId]) {
        delete next[conversationId];
      } else {
        next[conversationId] = true;
      }
      // Persistir
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error("Erro ao salvar unread status:", e);
      }
      return next;
    });
  }, [storageKey]);

  // Verificar se conversa está marcada como não lida
  const isManualUnread = useCallback((conversationId) => {
    return !!unreadManual[conversationId];
  }, [unreadManual]);

  return {
    unreadManual,
    toggleUnreadStatus,
    isManualUnread,
  };
}