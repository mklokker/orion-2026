import { useCallback } from "react";
import { useReadLater } from "./useReadLater";

/**
 * Hook que integra "Ler Depois" com a interface do Chat
 * Fornece métodos para os componentes chamarem
 */
export function useReadLaterIntegration(userEmail) {
  const readLaterHook = useReadLater(userEmail);

  // Para MessageBubble
  const handleMessageReadLater = useCallback((message) => {
    readLaterHook.toggleMessageReadLater(message.id, message.conversation_id);
  }, [readLaterHook]);

  // Para ChatList (conversa)
  const handleConversationReadLater = useCallback((conversationId) => {
    readLaterHook.toggleConversationReadLater(conversationId);
  }, [readLaterHook]);

  // Filtrar conversas por "Ler Depois"
  const filterConversationsByReadLater = useCallback((conversations) => {
    return conversations.filter(c =>
      readLaterHook.readLaterConversations.some(r => r.conversation_id === c.id)
    );
  }, [readLaterHook.readLaterConversations]);

  return {
    ...readLaterHook,
    handleMessageReadLater,
    handleConversationReadLater,
    filterConversationsByReadLater,
  };
}