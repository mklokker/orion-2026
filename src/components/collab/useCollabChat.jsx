/**
 * useCollabChat
 * Hook auto-suficiente para gerenciar o chat de UM projeto de colaboração.
 * Reutiliza o motor de mensagens existente (ChatConversation + ChatMessage)
 * SEM quebrar o chat geral nem a lógica de bubbles (UserPresence bubble_*).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { UserPresence } from "@/entities/UserPresence";
import { getChatMessages } from "@/functions/getChatMessages";
import { markMessagesAsRead } from "@/functions/markMessagesAsRead";
import {
  getCachedMessages, setCachedMessages,
  addCachedMessage, updateCachedMessage,
} from "@/components/chat/chatCache";
import { useToast } from "@/components/ui/use-toast";

const { ChatConversation, ChatMessage } = base44.entities;

export function useCollabChat({ conversationId, currentUser }) {
  const { toast } = useToast();
  const [conversation, setConversation]     = useState(null);
  const [messages, setMessages]             = useState([]);
  const [chatBgPrefs, setChatBgPrefs]       = useState(null);
  const [presenceMap, setPresenceMap]       = useState({});
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore]   = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [taskRequestStatuses]               = useState({});

  const typingTimeoutRef  = useRef(null);
  const convRef           = useRef(null);
  const currentUserRef    = useRef(currentUser);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { convRef.current = conversation; },       [conversation]);

  // ── chatBgPrefs (bubble colors) — lê UserPresence, preserva bubble_* fields ──
  useEffect(() => {
    if (!currentUser?.email) return;
    UserPresence.filter({ user_email: currentUser.email }).then(results => {
      const p = results[0];
      if (!p) return;
      setChatBgPrefs({
        chat_bg_type:  p.chat_bg_type  || "default",
        chat_bg_value: p.chat_bg_value || "",
        chat_bg_opacity: p.chat_bg_opacity ?? 0.15,
        chat_bg_blur:  p.chat_bg_blur  ?? 0,
        chat_bg_dim:   p.chat_bg_dim   ?? true,
        // Bubble colors — MUST be preserved
        bubble_my_bg:            p.bubble_my_bg            || "",
        bubble_my_text_mode:     p.bubble_my_text_mode     || "auto",
        bubble_my_text_color:    p.bubble_my_text_color    || "",
        bubble_other_bg:         p.bubble_other_bg         || "",
        bubble_other_text_mode:  p.bubble_other_text_mode  || "auto",
        bubble_other_text_color: p.bubble_other_text_color || "",
        bubble_meta_color_mode:  p.bubble_meta_color_mode  || "auto",
        bubble_meta_color:       p.bubble_meta_color       || "",
      });
    }).catch(() => {});
  }, [currentUser?.email]);

  // ── Presence map ──
  useEffect(() => {
    UserPresence.list().then(presences => {
      const map = {};
      const now = new Date();
      presences.forEach(p => {
        const lastSeen = p.last_seen ? new Date(p.last_seen) : null;
        const isRecent = lastSeen && (now - lastSeen) < 2 * 60 * 1000;
        if (p.manual_status && p.manual_status !== "auto") {
          map[p.user_email] = p.status || p.manual_status;
        } else {
          map[p.user_email] = isRecent ? "online" : "offline";
        }
      });
      setPresenceMap(map);
    }).catch(() => {});
  }, [conversationId]);

  // ── Load conversation ──
  useEffect(() => {
    if (!conversationId) return;
    ChatConversation.filter({ id: conversationId }).then(r => {
      if (r[0]) setConversation(r[0]);
    }).catch(() => {});
  }, [conversationId]);

  // ── Load messages (cache → server) ──
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      try {
        const cached = await getCachedMessages(conversationId, 80);
        if (cached?.length > 0) setMessages(cached);
        const response = await getChatMessages({ conversation_id: conversationId, limit: 80 });
        const msgs = response?.data?.messages || [];
        setMessages(msgs);
        setHasMoreMessages(response?.data?.has_more || false);
        setCachedMessages(conversationId, msgs);
        markMessagesAsRead({ conversation_id: conversationId }).catch(() => {});
      } catch (e) {
        console.error("[useCollabChat] load messages:", e);
      }
    })();
  }, [conversationId]);

  // ── Real-time: conversation updates ──
  useEffect(() => {
    if (!conversationId) return;
    const unsub = ChatConversation.subscribe((event) => {
      if (event.id !== conversationId && event.data?.id !== conversationId) return;
      if (event.type === "update") {
        setConversation(prev => prev ? { ...prev, ...event.data } : event.data);
      }
    });
    return unsub;
  }, [conversationId]);

  // ── Real-time: messages ──
  useEffect(() => {
    if (!conversationId || !currentUser) return;
    const unsub = ChatMessage.subscribe((event) => {
      if (event.data?.conversation_id !== conversationId) return;
      if (event.type === "create") {
        setMessages(prev => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        addCachedMessage(event.data);
        if (event.data.sender_email !== currentUserRef.current?.email) {
          markMessagesAsRead({ conversation_id: conversationId }).catch(() => {});
        }
      } else if (event.type === "update") {
        setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        updateCachedMessage(event.data);
      } else if (event.type === "delete") {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsub;
  }, [conversationId, currentUser]);

  // ── Handlers ──
  const handleSend = useCallback(async (msgData) => {
    if (!conversationId || !currentUserRef.current) return;
    const user = currentUserRef.current;
    try {
      const newMsg = await ChatMessage.create({
        conversation_id: conversationId,
        sender_email: user.email,
        sender_name: user.display_name || user.full_name,
        ...msgData,
        read_by: [{ email: user.email, read_at: new Date().toISOString() }],
      });
      const now = new Date().toISOString();
      await ChatConversation.update(conversationId, {
        last_message: msgData.type === "text"
          ? msgData.content
          : `📎 ${msgData.file_name || "Arquivo"}`,
        last_message_at: now,
        last_message_by: user.email,
        typing_users: [],
      });
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (e) {
      console.error("[useCollabChat] send:", e);
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    }
  }, [conversationId, toast]);

  const handleTyping = useCallback(async () => {
    if (!conversationId || !currentUserRef.current || !convRef.current) return;
    const user = currentUserRef.current;
    const conv = convRef.current;
    const typing = conv.typing_users || [];
    if (!typing.includes(user.email)) {
      await ChatConversation.update(conversationId, {
        typing_users: [...typing, user.email],
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      const c = convRef.current;
      if (c) {
        await ChatConversation.update(conversationId, {
          typing_users: (c.typing_users || []).filter(e => e !== user.email),
        });
      }
    }, 3000);
  }, [conversationId]);

  const handleEditMessage = useCallback(async (message) => {
    const newContent = prompt("Editar mensagem:", message.content);
    if (newContent && newContent !== message.content) {
      await ChatMessage.update(message.id, { content: newContent, is_edited: true });
    }
  }, []);

  const handleDeleteMessage = useCallback(async (message) => {
    if (!confirm("Excluir esta mensagem?")) return;
    await ChatMessage.update(message.id, { is_deleted: true, content: "" });
  }, []);

  const handleReaction = useCallback(async (messageId, emoji) => {
    const userEmail = currentUserRef.current?.email;
    setMessages(prev => {
      const msg = prev.find(m => m.id === messageId);
      if (!msg) return prev;
      const reactions = { ...(msg.reactions || {}) };
      const usersArr = reactions[emoji] || [];
      if (usersArr.includes(userEmail)) {
        reactions[emoji] = usersArr.filter(e => e !== userEmail);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...usersArr, userEmail];
      }
      ChatMessage.update(messageId, { reactions }).catch(() => {});
      return prev.map(m => m.id === messageId ? { ...m, reactions } : m);
    });
  }, []);

  const handlePinMessage = useCallback(async (message) => {
    const pinned = !message.is_pinned;
    await ChatMessage.update(message.id, {
      is_pinned: pinned,
      pinned_by:  pinned ? currentUserRef.current?.email : null,
      pinned_at:  pinned ? new Date().toISOString() : null,
    });
    toast({ title: pinned ? "Mensagem fixada" : "Mensagem desafixada" });
  }, [toast]);

  const handleStatusTag = useCallback(async (message, tag) => {
    const isRemoving = tag === "none";
    const now = new Date().toISOString();
    await ChatMessage.update(message.id, {
      status_tag:    tag,
      status_tag_by: isRemoving ? null : currentUserRef.current?.email,
      status_tag_at: isRemoving ? null : now,
    });
    setMessages(prev => prev.map(m =>
      m.id === message.id ? { ...m, status_tag: tag } : m
    ));
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages) return;
    setIsLoadingMore(true);
    try {
      const oldest = messages[0];
      if (oldest) {
        const response = await getChatMessages({
          conversation_id: conversationId,
          limit: 50,
          before_date: oldest.created_date,
        });
        const olderMsgs = response?.data?.messages || [];
        if (olderMsgs.length > 0) setMessages(prev => [...olderMsgs, ...prev]);
        setHasMoreMessages(response?.data?.has_more || false);
      }
    } catch (e) {
      console.error("[useCollabChat] loadMore:", e);
    }
    setIsLoadingMore(false);
  }, [conversationId, messages, isLoadingMore, hasMoreMessages]);

  const typingUsers = conversation?.typing_users?.filter(
    e => e !== currentUser?.email
  ) || [];

  return {
    conversation,
    messages,
    chatBgPrefs,
    presenceMap,
    hasMoreMessages,
    isLoadingMore,
    forwardingMessage,
    setForwardingMessage,
    taskRequestStatuses,
    typingUsers,
    handleSend,
    handleTyping,
    handleEditMessage,
    handleDeleteMessage,
    handleReaction,
    handlePinMessage,
    handleStatusTag,
    handleLoadMore,
  };
}