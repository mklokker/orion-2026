import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatConversation } from "@/entities/ChatConversation";
import { ChatMessage } from "@/entities/ChatMessage";
import { ChatTyping } from "@/entities/ChatTyping";
import { User } from "@/entities/User";
import { useState, useEffect } from "react";

// Polling inteligente baseado na visibilidade da página
const getPollingIntervals = () => {
  const isHidden = typeof document !== 'undefined' && document.hidden;
  return {
    messages: isHidden ? 5000 : 1500,      // 5s background, 1.5s ativo
    conversations: isHidden ? 8000 : 3000,  // 8s background, 3s ativo
    typing: isHidden ? 5000 : 2000,         // 5s background, 2s ativo
    unread: isHidden ? 8000 : 3000,         // 8s background, 3s ativo
    onlineStatus: 30000                     // sempre 30s
  };
};

// Hook para detectar visibilidade da página
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

// Hook para atualizar o título da página com contador de mensagens
export function useDocumentTitleBadge(unreadCount) {
  useEffect(() => {
    const originalTitle = "Orion";
    
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [unreadCount]);
}

export function useConversations(userEmail) {
  const isVisible = usePageVisibility();
  const intervals = getPollingIntervals();

  return useQuery({
    queryKey: ['conversations', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      try {
        const allConversations = await ChatConversation.list("-last_message_date");
        return allConversations.filter(conv => {
          if (conv.conversation_type === "group" && conv.is_public) return true;
          if (conv.conversation_type === "department") return true;
          return conv.participants?.includes(userEmail);
        });
      } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }
    },
    enabled: !!userEmail,
    refetchInterval: intervals.conversations
  });
}

export function useMessages(conversationId) {
  const isVisible = usePageVisibility();
  const intervals = getPollingIntervals();

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      try {
        return await ChatMessage.filter(
          { conversation_id: conversationId },
          "created_date"
        );
      } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
    },
    enabled: !!conversationId,
    refetchInterval: intervals.messages
  });
}

export function useTypingStatus(conversationId, userEmail) {
  const queryClient = useQueryClient();

  // Mutation to set typing status
  const setTypingMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !userEmail) return;
      
      // Check if there is a recent typing record (debounce)
      // For simplicity, we just create/update a record. 
      // Since we don't have "upsert" easily without ID, we might just create and let a cleanup job handle old ones, 
      // OR check if one exists for this user/convo in the last few seconds.
      // BETTER: Just update a "Typing" record if we can find it, or create.
      
      const now = new Date().toISOString();
      
      // Find existing typing record for this user in this conversation
      // This search might be heavy if table grows. 
      // Optimization: Client assumes it's fine.
      
      const existing = await ChatTyping.filter({
        conversation_id: conversationId,
        user_email: userEmail
      });

      if (existing && existing.length > 0) {
        await ChatTyping.update(existing[0].id, { last_typed: now });
      } else {
        await ChatTyping.create({
          conversation_id: conversationId,
          user_email: userEmail,
          last_typed: now
        });
      }
    }
  });

  const intervals = getPollingIntervals();

  // Query to get who is typing
  const { data: typingUsers = [] } = useQuery({
    queryKey: ['typing', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      // Fetch typing records for this conversation
      const records = await ChatTyping.filter({ conversation_id: conversationId });
      
      // Filter for recent (last 5 seconds)
      const now = new Date();
      const recent = records.filter(r => {
        if (r.user_email === userEmail) return false; // Exclude self
        const typedDate = new Date(r.last_typed);
        return (now - typedDate) < 5000;
      });
      
      return recent.map(r => r.user_email);
    },
    enabled: !!conversationId,
    refetchInterval: intervals.typing
  });

  return {
    setTyping: setTypingMutation.mutate,
    typingUsers
  };
}

export function useOnlineStatusUpdater(userEmail) {
  useQuery({
    queryKey: ['onlineStatusUpdate', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      try {
        const { base44 } = await import("@/api/base44Client");
        await base44.auth.updateMe({
          last_seen: new Date().toISOString(),
          is_online: true
        });
        return true;
      } catch (e) {
        return false;
      }
    },
    enabled: !!userEmail,
    refetchInterval: ONLINE_STATUS_INTERVAL
  });
}

export function useUnreadChatCounts(userEmail) {
  const isVisible = usePageVisibility();
  const intervals = getPollingIntervals();

  return useQuery({
    queryKey: ['unreadChatCounts', userEmail],
    queryFn: async () => {
      if (!userEmail) return { totalUnread: 0, unreadByConversation: {}, latestMessageDate: null };
      try {
        const { base44 } = await import("@/api/base44Client");
        const response = await base44.functions.invoke('getChatUnreadCounts');
        return response.data;
      } catch (error) {
        console.error("Error fetching unread counts:", error);
        return { totalUnread: 0, unreadByConversation: {}, latestMessageDate: null };
      }
    },
    enabled: !!userEmail,
    refetchInterval: intervals.unread
  });
}