import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatConversation } from "@/entities/ChatConversation";
import { ChatMessage } from "@/entities/ChatMessage";
import { ChatTyping } from "@/entities/ChatTyping";
import { User } from "@/entities/User";

const MESSAGES_POLL_INTERVAL = 2000;
const CONVERSATIONS_POLL_INTERVAL = 4000;
const TYPING_POLL_INTERVAL = 2000;
const ONLINE_STATUS_INTERVAL = 30000;

export function useConversations(userEmail) {
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
    refetchInterval: CONVERSATIONS_POLL_INTERVAL
  });
}

export function useMessages(conversationId) {
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
    refetchInterval: MESSAGES_POLL_INTERVAL
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
    refetchInterval: TYPING_POLL_INTERVAL
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