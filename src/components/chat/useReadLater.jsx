import { useState, useCallback, useEffect } from "react";
import { ReadLaterConversation, ReadLaterMessage } from "@/entities";

/**
 * Hook para gerenciar "Ler Depois" de conversas e mensagens
 * Mantém estado local sincronizado com banco de dados
 */
export function useReadLater(userEmail) {
  const [readLaterConversations, setReadLaterConversations] = useState([]);
  const [readLaterMessages, setReadLaterMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (!userEmail) return;
    loadReadLaterData();
  }, [userEmail]);

  const loadReadLaterData = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const [conversations, messages] = await Promise.all([
        ReadLaterConversation.filter({ user_email: userEmail, status: "active" }),
        ReadLaterMessage.filter({ user_email: userEmail, status: "active" }),
      ]);
      setReadLaterConversations(conversations || []);
      setReadLaterMessages(messages || []);
    } catch (error) {
      console.error("[ReadLater] Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // ─────────────────────────────────────────
  // Conversa
  // ─────────────────────────────────────────

  const isConversationReadLater = useCallback((conversationId) => {
    return readLaterConversations.some(r => r.conversation_id === conversationId);
  }, [readLaterConversations]);

  const toggleConversationReadLater = useCallback(async (conversationId) => {
    if (!userEmail) return;

    try {
      const existing = readLaterConversations.find(r => r.conversation_id === conversationId);

      if (existing) {
        // Remove (pode ser delete ou status=done)
        await ReadLaterConversation.delete(existing.id);
        setReadLaterConversations(prev => prev.filter(r => r.id !== existing.id));
      } else {
        // Add
        const newRecord = await ReadLaterConversation.create({
          user_email: userEmail,
          conversation_id: conversationId,
          status: "active",
        });
        setReadLaterConversations(prev => [...prev, newRecord]);
      }
    } catch (error) {
      console.error("[ReadLater] Erro ao alternar conversa:", error);
    }
  }, [userEmail, readLaterConversations]);

  // ─────────────────────────────────────────
  // Mensagem
  // ─────────────────────────────────────────

  const isMessageReadLater = useCallback((messageId) => {
    return readLaterMessages.some(r => r.message_id === messageId);
  }, [readLaterMessages]);

  const toggleMessageReadLater = useCallback(async (messageId, conversationId) => {
    if (!userEmail) return;

    try {
      const existing = readLaterMessages.find(r => r.message_id === messageId);

      if (existing) {
        // Remove
        await ReadLaterMessage.delete(existing.id);
        setReadLaterMessages(prev => prev.filter(r => r.id !== existing.id));
      } else {
        // Add
        const newRecord = await ReadLaterMessage.create({
          user_email: userEmail,
          message_id: messageId,
          conversation_id: conversationId,
          status: "active",
        });
        setReadLaterMessages(prev => [...prev, newRecord]);
      }
    } catch (error) {
      console.error("[ReadLater] Erro ao alternar mensagem:", error);
    }
  }, [userEmail, readLaterMessages]);

  // ─────────────────────────────────────────
  // Mark as done
  // ─────────────────────────────────────────

  const markConversationDone = useCallback(async (conversationId) => {
    try {
      const existing = readLaterConversations.find(r => r.conversation_id === conversationId);
      if (existing) {
        await ReadLaterConversation.update(existing.id, { status: "done" });
        setReadLaterConversations(prev => prev.filter(r => r.id !== existing.id));
      }
    } catch (error) {
      console.error("[ReadLater] Erro ao marcar conversa como feita:", error);
    }
  }, [readLaterConversations]);

  const markMessageDone = useCallback(async (messageId) => {
    try {
      const existing = readLaterMessages.find(r => r.message_id === messageId);
      if (existing) {
        await ReadLaterMessage.update(existing.id, { status: "done" });
        setReadLaterMessages(prev => prev.filter(r => r.id !== existing.id));
      }
    } catch (error) {
      console.error("[ReadLater] Erro ao marcar mensagem como feita:", error);
    }
  }, [readLaterMessages]);

  return {
    readLaterConversations,
    readLaterMessages,
    loading,
    isConversationReadLater,
    toggleConversationReadLater,
    isMessageReadLater,
    toggleMessageReadLater,
    markConversationDone,
    markMessageDone,
    reloadData: loadReadLaterData,
  };
}