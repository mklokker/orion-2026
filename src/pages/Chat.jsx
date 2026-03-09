import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatConversation } from "@/entities/ChatConversation";
import { ChatMessage } from "@/entities/ChatMessage";
import { UserPresence } from "@/entities/UserPresence";
import { User } from "@/entities/User";
import { getPublicUsers } from "@/functions/getPublicUsers";
import { getChatConversations } from "@/functions/getChatConversations";
import { getChatMessages } from "@/functions/getChatMessages";
import { deleteGroup } from "@/functions/deleteGroup";
import { getUnreadCounts } from "@/functions/getUnreadCounts";
import { markMessagesAsRead } from "@/functions/markMessagesAsRead";
import ChatList from "@/components/chat/ChatList";
import ConversationView from "@/components/chat/ConversationView";
import NewChatModal from "@/components/chat/NewChatModal";
import GroupSettingsModal from "@/components/chat/GroupSettingsModal";
import ImageViewer from "@/components/chat/ImageViewer";
import PresenceSettings from "@/components/chat/PresenceSettings";
import AudioPermissionBanner from "@/components/chat/AudioPermissionBanner";
import TaskRequestApprovalModal from "@/components/chat/TaskRequestApprovalModal";
import ForwardMessageModal from "@/components/chat/ForwardMessageModal";
import MessageReactionsModal from "@/components/chat/MessageReactionsModal";
import { useToast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/components/chat/NotificationSounds";
import { Department } from "@/entities/Department";
import { TaskRequest } from "@/entities/TaskRequest";
import { invalidateTaskRequestCache } from "@/components/chat/useTaskRequestStatus";
import { setGlobalUnread } from "@/components/chat/useChatNotifications";
import { base44 } from "@/api/base44Client";
import {
  getCachedConversations, setCachedConversations, updateCachedConversation, removeCachedConversation,
  getCachedMessages, setCachedMessages, addCachedMessage, updateCachedMessage,
  getCachedUsers, setCachedUsers,
  getMeta, setMeta,
} from "@/components/chat/chatCache";

export default function Chat() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showNewChat, setShowNewChat] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showConversation, setShowConversation] = useState(false);
  const [presenceMap, setPresenceMap] = useState({});
  const [myPresence, setMyPresence] = useState(null);
  const [showPresenceSettings, setShowPresenceSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTaskApprovalModal, setShowTaskApprovalModal] = useState(false);
  const [selectedTaskRequestId, setSelectedTaskRequestId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [chatBgPrefs, setChatBgPrefs] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [taskRequestStatuses, setTaskRequestStatuses] = useState({}); // { [requestId]: "pending"|"approved"|"rejected" }
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [selectedMessageForReactions, setSelectedMessageForReactions] = useState(null);

  const typingTimeoutRef = useRef(null);
  const notifiedMessagesRef = useRef(new Set());
  const lastNotificationTimeRef = useRef({});
  const selectedConversationRef = useRef(null);
  const currentUserRef = useRef(null);
  const myPresenceRef = useRef(null);
  const conversationsRef = useRef([]);

  // Keep refs in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    myPresenceRef.current = myPresence;
  }, [myPresence]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Real-time subscriptions for conversations
  useEffect(() => {
    if (!currentUser) return;

    updateMyPresence();
    loadPresenceData();

    // Presence updates every 30 seconds
    const presenceInterval = setInterval(() => {
      updateMyPresence();
      loadPresenceData();
    }, 30000);

    // Subscribe to conversation changes (real-time)
    const unsubscribeConversations = ChatConversation.subscribe((event) => {
      const user = currentUserRef.current;
      if (!user) return;

      if (event.type === 'create') {
        // Only add if user is a participant
        if (event.data.participants?.includes(user.email)) {
          setConversations(prev => {
            if (prev.some(c => c.id === event.data.id)) return prev;
            return [event.data, ...prev];
          });
          updateCachedConversation(event.data);
        }
      } else if (event.type === 'update') {
        // Only process updates for conversations the user is part of
        const existsLocally = conversationsRef.current.some(c => c.id === event.id);
        if (!existsLocally) return;

        // If user was removed from participants, remove the conversation locally
        if (event.data.participants && !event.data.participants.includes(user.email)) {
          setConversations(prev => prev.filter(c => c.id !== event.id));
          if (selectedConversationRef.current?.id === event.id) {
            setSelectedConversation(null);
          }
          removeCachedConversation(event.id);
          return;
        }

        setConversations(prev => prev.map(c => c.id === event.id ? { ...c, ...event.data } : c));
        // Update selected conversation if it's the one being updated
        if (selectedConversationRef.current?.id === event.id) {
          setSelectedConversation(prev => ({ ...prev, ...event.data }));
        }
        updateCachedConversation({ id: event.id, ...event.data });
      } else if (event.type === 'delete') {
        setConversations(prev => prev.filter(c => c.id !== event.id));
        if (selectedConversationRef.current?.id === event.id) {
          setSelectedConversation(null);
        }
        removeCachedConversation(event.id);
      }
    });

    return () => {
      clearInterval(presenceInterval);
      unsubscribeConversations();
    };
  }, [currentUser]);

  // Real-time subscriptions for messages
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to message changes (real-time)
    const unsubscribeMessages = ChatMessage.subscribe((event) => {
      const user = currentUserRef.current;
      const selectedConv = selectedConversationRef.current;
      const presence = myPresenceRef.current;
      const allConversations = conversationsRef.current;
      if (!user) return;

      const msgConversationId = event.data?.conversation_id;
      if (!msgConversationId) return;

      // SECURITY: Only process messages for conversations the user is a participant of
      const belongsToConv = allConversations.find(c => c.id === msgConversationId);
      if (!belongsToConv) {
        // Not a conversation this user is part of — ignore completely
        console.warn(`[Chat] SECURITY: Ignored message event for unknown conversation ${msgConversationId}`);
        return;
      }
      // Double-check: explicit participant validation
      if (!belongsToConv.participants?.includes(user.email)) {
        console.warn(`[Chat] SECURITY: Ignored message event - user ${user.email} not in participants of ${msgConversationId}`);
        return;
      }

      if (event.type === 'create') {
        // Cache the new message (only for our conversations)
        addCachedMessage(event.data);
        
        // If message is for the selected conversation, add it
        if (selectedConv && msgConversationId === selectedConv.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === event.data.id)) return prev;
            return [...prev, event.data];
          });
          // Mark as read immediately if from someone else (via server to avoid rate limits)
          if (event.data.sender_email !== user.email) {
            const readByArray = event.data.read_by || [];
            const notReadYet = !readByArray.some(r => r.email === user.email);
            if (notReadYet) {
              markMessagesAsRead({ conversation_id: msgConversationId }).catch(() => {});
            }
          }
        } else {
           // Message is for another conversation - update unread count
           const readByArray = event.data.read_by || [];
           const isUnread = event.data.sender_email !== user.email && 
                           !readByArray.some(r => r.email === user.email);
           if (isUnread) {
             setUnreadCounts(prev => ({
               ...prev,
               [msgConversationId]: (prev[msgConversationId] || 0) + 1
             }));

            // Send notification if not already notified
            if (!notifiedMessagesRef.current.has(event.data.id)) {
              notifiedMessagesRef.current.add(event.data.id);
              
              if (belongsToConv.type !== "self") {
                const isGroup = belongsToConv.type === "group";
                const isMention = event.data.content?.includes(`@${user.full_name}`) ||
                                  event.data.content?.includes(`@${user.email}`);

                let shouldNotify = false;
                if (isMention && presence?.notify_mentions !== false) shouldNotify = true;
                else if (isGroup && presence?.notify_group_messages !== false) shouldNotify = true;
                else if (!isGroup && presence?.notify_new_messages !== false) shouldNotify = true;

                if (shouldNotify) {
                  const senderName = event.data.sender_name || event.data.sender_email;
                  const title = isGroup ? `${senderName} em ${belongsToConv.name || "Grupo"}` : senderName;
                  const body = event.data.type === "text" ? event.data.content : "📎 Enviou um arquivo";
                  sendNotification(title, body, event.data.sender_email, belongsToConv.id);
                }
              }
            }
          }
        }
      } else if (event.type === 'update') {
        if (selectedConv && msgConversationId === selectedConv.id) {
          setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        }
        updateCachedMessage(event.data);
      } else if (event.type === 'delete') {
        if (selectedConv && msgConversationId === selectedConv.id) {
          setMessages(prev => prev.filter(m => m.id !== event.id));
        }
      }
    });

    return () => {
      unsubscribeMessages();
    };
  }, [currentUser]);

  // Load messages when conversation changes + reset global unread for this conv
  useEffect(() => {
    if (selectedConversation?.id) {
      const convId = selectedConversation.id;
      
      // Zero unread immediately (optimistic)
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[convId];
        return updated;
      });
      
      // Load messages (cache first, then server) — no blank screen
      loadMessages(convId).then(() => {
        markAsRead(convId);
      });
    }
  }, [selectedConversation?.id]);

  // Keep global unread badge in sync with local unreadCounts (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
      setGlobalUnread(total);
    }, 50);
    return () => clearTimeout(timer);
  }, [unreadCounts]);

  const loadInitialData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      // ── Phase 1: Load from IndexedDB cache (instant) ──
      const [cachedConvs, cachedUsrs, cachedUnread] = await Promise.all([
        getCachedConversations(),
        getCachedUsers(),
        getMeta("unreadCounts"),
      ]);

      if (cachedConvs) setConversations(cachedConvs);
      if (cachedUsrs) setUsers(cachedUsrs);
      if (cachedUnread) setUnreadCounts(cachedUnread);

      // ── Phase 2: Sync from server in background ──
      // Fire all server calls in parallel for speed
      const [, usersResult, deptsResult] = await Promise.allSettled([
        base44.functions.invoke('ensureSelfConversation').catch(() => {}),
        getPublicUsers().then(r => r?.data?.users).catch(async () => {
          try { return await User.list(); } catch { return [userData]; }
        }),
        Department.list().catch(() => []),
      ]);

      // Apply fresh users
      const freshUsers = usersResult.status === "fulfilled" && usersResult.value
        ? usersResult.value : (cachedUsrs || [userData]);
      setUsers(freshUsers);
      setCachedUsers(freshUsers); // persist to cache

      // Apply departments
      if (deptsResult.status === "fulfilled") setDepartments(deptsResult.value || []);

      // Load conversations + unread from server
      await loadConversations(userData.email);
      await loadPresenceData();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const loadPresenceData = async () => {
    try {
      const presences = await UserPresence.list();
      const map = {};
      const now = new Date();
      
      presences.forEach(p => {
        const lastSeen = p.last_seen ? new Date(p.last_seen) : null;
        const isRecent = lastSeen && (now - lastSeen) < 2 * 60 * 1000;

        if (p.manual_status && p.manual_status !== "auto") {
          map[p.user_email] = p.status || p.manual_status;
        } else if (isRecent) {
          map[p.user_email] = "online";
        } else {
          map[p.user_email] = "offline";
        }

        // Store my presence + all appearance/bg prefs (including bubble colors)
        if (p.user_email === currentUser?.email) {
          setMyPresence(p);
          setChatBgPrefs({
            chat_bg_type: p.chat_bg_type || "default",
            chat_bg_value: p.chat_bg_value || "",
            chat_bg_opacity: p.chat_bg_opacity ?? 0.15,
            chat_bg_blur: p.chat_bg_blur ?? 0,
            chat_bg_dim: p.chat_bg_dim ?? true,
            // Preserve bubble colors
            bubble_my_bg: p.bubble_my_bg || "",
            bubble_my_text_mode: p.bubble_my_text_mode || "auto",
            bubble_my_text_color: p.bubble_my_text_color || "",
            bubble_other_bg: p.bubble_other_bg || "",
            bubble_other_text_mode: p.bubble_other_text_mode || "auto",
            bubble_other_text_color: p.bubble_other_text_color || "",
            bubble_meta_color_mode: p.bubble_meta_color_mode || "auto",
            bubble_meta_color: p.bubble_meta_color || "",
          });
        }
      });
      
      setPresenceMap(map);
    } catch (error) {
      console.error("Erro ao carregar presença:", error);
    }
  };

  const updateMyPresence = async () => {
    if (!currentUser) return;
    try {
      const existing = await UserPresence.filter({ user_email: currentUser.email });

      if (existing.length > 0) {
        const presence = existing[0];
        const newStatus = presence.manual_status && presence.manual_status !== "auto" 
          ? presence.manual_status 
          : "online";

        // Preserve bubble/bg preferences when updating (don't overwrite with defaults)
        const updateData = {
          status: newStatus,
          last_seen: new Date().toISOString()
        };

        await UserPresence.update(presence.id, updateData);
        // Merge update with existing data to preserve bubble colors and background settings
        setMyPresence(prev => prev ? { ...prev, ...updateData } : { ...presence, ...updateData });
      } else {
        const newPresence = await UserPresence.create({
          user_email: currentUser.email,
          status: "online",
          manual_status: "auto",
          last_seen: new Date().toISOString()
        });
        setMyPresence(newPresence);
      }
    } catch (error) {
      console.error("Erro ao atualizar presença:", error);
    }
  };

  const loadConversations = async (userEmail, skipUnreadCount = false) => {
    try {
      // Use backend function to get conversations (works for all users)
      const response = await getChatConversations();
      const myConvs = response?.data?.conversations || [];
      setConversations(myConvs);
      setCachedConversations(myConvs); // persist to IndexedDB
      
      // Use backend function for unread counts (server-side, no rate limits, all conversations)
      if (!skipUnreadCount) {
        try {
          const unreadResponse = await getUnreadCounts();
          const counts = unreadResponse?.data?.counts || {};
          setUnreadCounts(counts);
          setMeta("unreadCounts", counts); // persist to IndexedDB
        } catch (e) {
          console.error("Erro ao carregar contadores de não lidas:", e);
        }
      }
    } catch (error) {
      if (error?.response?.status !== 429) {
        console.error("Erro ao carregar conversas:", error);
      }
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      // Phase 1: Show cached messages instantly
      const cached = await getCachedMessages(conversationId, 80);
      if (cached && cached.length > 0) {
        setMessages(cached);
      }

      // Phase 2: Load from server (last 80 messages for speed)
      const response = await getChatMessages({ conversation_id: conversationId, limit: 80 });
      const msgs = response?.data?.messages || [];
      const serverHasMore = response?.data?.has_more || false;
      setMessages(msgs);
      setHasMoreMessages(serverHasMore);

      // Persist to IndexedDB
      setCachedMessages(conversationId, msgs);

      // Fetch TaskRequest statuses for any request messages
      fetchTaskRequestStatuses(msgs);

      return msgs;
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      return [];
    }
  };

  const fetchTaskRequestStatuses = async (msgs) => {
    // Collect all task_request_ids from messages (structured field first, then content parse)
    const idRegex = /`ID:\s*([a-zA-Z0-9_-]+)`/g;
    const ids = new Set();
    for (const m of msgs) {
      if (m.task_request_id) {
        ids.add(m.task_request_id);
      } else if (m.content?.includes("📝 **Solicitação de Criação de Tarefas/Serviços**")) {
        let match;
        idRegex.lastIndex = 0;
        while ((match = idRegex.exec(m.content)) !== null) ids.add(match[1]);
      }
    }
    if (ids.size === 0) return;
    try {
      const allRequests = await TaskRequest.list();
      const map = {};
      allRequests.forEach(req => {
        if (ids.has(req.id)) {
          map[req.id] = req.status;
          // Also pre-populate the hook cache
          invalidateTaskRequestCache(req.id, req.status);
        }
      });
      // For any ids not found in DB, mark as "pending" so button shows
      ids.forEach(id => {
        if (!(id in map)) {
          map[id] = "pending";
          invalidateTaskRequestCache(id, "pending");
        }
      });
      setTaskRequestStatuses(prev => ({ ...prev, ...map }));
    } catch (_) {}
  };

  const sendNotification = (title, body, senderEmail, conversationId) => {
    // Don't notify if user is in DND mode
    if (myPresence?.status === "dnd" || myPresence?.manual_status === "dnd") return;
    
    // Check if muted temporarily
    if (myPresence?.mute_until) {
      const muteEnd = new Date(myPresence.mute_until);
      if (new Date() < muteEnd) return;
    }
    
    // Check cooldown per conversation
    const cooldownSeconds = myPresence?.notification_cooldown_seconds || 30;
    if (cooldownSeconds > 0 && conversationId) {
      const lastTime = lastNotificationTimeRef.current[conversationId];
      const now = Date.now();
      if (lastTime && (now - lastTime) < cooldownSeconds * 1000) {
        return; // Still in cooldown
      }
      lastNotificationTimeRef.current[conversationId] = now;
    }
    
    // Play sound - always play unless explicitly disabled
    const soundType = myPresence?.notification_sound || "default";
    if (soundType !== "none") {
      console.log("[Chat] Tocando som de notificação:", soundType);
      playNotificationSound(soundType);
    }
    
    // Send push notification if enabled
    if (myPresence?.push_enabled && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: `chat-${conversationId}`,
          renotify: true
        });
      } catch (e) {
        console.log("Erro ao enviar notificação:", e);
      }
    }
  };

  const markAsRead = async (conversationId) => {
    if (!currentUser) return;
    
    // Zero counter immediately (optimistic UI)
    setUnreadCounts(prev => {
      const updated = { ...prev };
      delete updated[conversationId];
      return updated;
    });

    // Update local messages state immediately (optimistic)
    const now = new Date().toISOString();
    setMessages(prev => prev.map(m => {
      if (m.sender_email !== currentUser.email && !(m.read_by || []).some(r => r && r.email === currentUser.email)) {
        return { ...m, read_by: [...(m.read_by || []), { email: currentUser.email, read_at: now }] };
      }
      return m;
    }));

    // Use backend function to mark as read (server-side, no rate limits)
    try {
      const response = await markMessagesAsRead({ conversation_id: conversationId });
      console.log(`[markAsRead] Server marked ${response?.data?.marked || 0} messages as read`);
    } catch (error) {
      console.error("Erro ao marcar como lido no servidor:", error);
    }
  };

  const handleSelectConversation = (conv) => {
    // Avoid re-selecting the same conversation
    if (selectedConversation?.id === conv.id) {
      if (isMobileView) setShowConversation(true);
      return;
    }
    // Zero counter immediately (optimistic UI update)
    setUnreadCounts(prev => {
      const updated = { ...prev };
      delete updated[conv.id];
      return updated;
    });
    // Recalculate global unread
    setUnreadCounts(prev => {
      const total = Object.values(prev).reduce((a, b) => a + b, 0);
      setGlobalUnread(total);
      return prev;
    });
    // Always use the freshest object from the conversations list to preserve all fields (theme_* etc)
    const fresh = conversationsRef.current.find(c => c.id === conv.id) || conv;
    setSelectedConversation(fresh);
    if (isMobileView) setShowConversation(true);
  };

  const handleLoadMore = async () => {
    if (!selectedConversation || isLoadingMore || !hasMoreMessages) return;
    setIsLoadingMore(true);
    try {
      const oldest = messages[0];
      if (!oldest) return;
      const response = await getChatMessages({
        conversation_id: selectedConversation.id,
        limit: 50,
        before_date: oldest.created_date,
      });
      const olderMsgs = response?.data?.messages || [];
      const moreAvailable = response?.data?.has_more || false;
      if (olderMsgs.length > 0) {
        setMessages(prev => [...olderMsgs, ...prev]);
        // Also cache them
        for (const m of olderMsgs) addCachedMessage(m);
      }
      setHasMoreMessages(moreAvailable);
    } catch (e) {
      console.error("Erro ao carregar mensagens anteriores:", e);
    }
    setIsLoadingMore(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reload conversations and unread counts from server
      await loadConversations(currentUser.email, false);
      if (selectedConversation?.id) {
        await loadMessages(selectedConversation.id);
        markAsRead(selectedConversation.id);
      }
      toast({
        title: "Atualizado",
        description: "Conversas e mensagens atualizadas"
      });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
    setIsRefreshing(false);
  };

  const handleSendMessage = async (msgData) => {
    if (!selectedConversation || !currentUser) return;

    try {
      const newMsg = await ChatMessage.create({
         conversation_id: selectedConversation.id,
         sender_email: currentUser.email,
         sender_name: currentUser.display_name || currentUser.full_name,
         ...msgData,
         read_by: [{ email: currentUser.email, read_at: new Date().toISOString() }]
       });

      // Update conversation with new timestamp
      const now = new Date().toISOString();
      await ChatConversation.update(selectedConversation.id, {
        last_message: msgData.type === "text" ? msgData.content : `📎 ${msgData.file_name || "Arquivo"}`,
        last_message_at: now,
        last_message_by: currentUser.email,
        typing_users: []
      });

      // Local state updates are now handled by real-time subscriptions
      // But we do optimistic update for instant UI feedback
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    }
  };

  const handleTyping = useCallback(async () => {
    if (!selectedConversation || !currentUser) return;

    try {
      const typingUsers = selectedConversation.typing_users || [];
      
      if (!typingUsers.includes(currentUser.email)) {
        await ChatConversation.update(selectedConversation.id, {
          typing_users: [...typingUsers, currentUser.email]
        });
      }

      // Clear typing after 3 seconds
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        const selectedConv = selectedConversationRef.current;
        if (selectedConv) {
          await ChatConversation.update(selectedConv.id, {
            typing_users: (selectedConv.typing_users || []).filter(e => e !== currentUser.email)
          });
        }
      }, 3000);
    } catch (error) {
      console.error("Erro ao atualizar typing:", error);
    }
  }, [selectedConversation, currentUser]);

  const handleCreateDirect = async (otherUser) => {
    try {
      // Check if conversation already exists
      const existing = conversations.find(c => 
        c.type === "direct" &&
        c.participants?.includes(currentUser.email) &&
        c.participants?.includes(otherUser.email)
      );
      
      if (existing) {
        handleSelectConversation(existing);
        return;
      }

      const newConv = await ChatConversation.create({
        type: "direct",
        participants: [currentUser.email, otherUser.email]
      });

      // Real-time subscription will auto-add to conversations
      handleSelectConversation(newConv);
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
    }
  };

  const handleCreateGroup = async (name, participantEmails, adminOnlyPosting = false) => {
    try {
      const newConv = await ChatConversation.create({
        type: "group",
        name,
        participants: [currentUser.email, ...participantEmails],
        admins: [currentUser.email],
        admin_only_posting: adminOnlyPosting
      });

      // System message
      await ChatMessage.create({
        conversation_id: newConv.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: `${currentUser.full_name} criou o grupo "${name}"`,
        type: "system",
        read_by: [{ email: currentUser.email, read_at: new Date().toISOString() }]
      });

      // Real-time subscription will auto-add to conversations
      handleSelectConversation(newConv);
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
    }
  };

  const handleUpdateConversation = async (updates) => {
    if (!selectedConversation) return;
    try {
      await ChatConversation.update(selectedConversation.id, updates);
      // Real-time subscription will update the conversation
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation) return;
    try {
      const newParticipants = selectedConversation.participants.filter(p => p !== currentUser.email);
      await ChatConversation.update(selectedConversation.id, { participants: newParticipants });
      
      await ChatMessage.create({
        conversation_id: selectedConversation.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: `${currentUser.full_name} saiu do grupo`,
        type: "system",
        read_by: [{ email: currentUser.email, read_at: new Date().toISOString() }]
      });

      setSelectedConversation(null);
      setShowSettings(false);
      // Real-time subscription will handle removal
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedConversation) return;
    const isGroup = selectedConversation.type === "group";
    try {
      await deleteGroup({ conversation_id: selectedConversation.id });
      setSelectedConversation(null);
      setShowSettings(false);
      setShowConversation(false);
      setMessages([]);
      // Remove from local conversations list immediately
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      toast({
        title: isGroup ? "Grupo excluído" : "Conversa excluída",
        description: isGroup ? "O grupo foi excluído com sucesso" : "A conversa foi excluída com sucesso"
      });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: isGroup ? "Erro ao excluir grupo" : "Erro ao excluir conversa",
        description: "Não foi possível excluir",
        variant: "destructive"
      });
    }
  };

  const handleEditMessage = async (message) => {
    const newContent = prompt("Editar mensagem:", message.content);
    if (newContent && newContent !== message.content) {
      try {
        await ChatMessage.update(message.id, { content: newContent, is_edited: true });
        // Real-time subscription will update messages
      } catch (error) {
        console.error("Erro ao editar:", error);
      }
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!confirm("Excluir esta mensagem?")) return;
    try {
      await ChatMessage.update(message.id, { is_deleted: true, content: "" });
      
      // Update conversation preview if this was the last message
      if (selectedConversation && selectedConversation.last_message) {
        // Find the last non-deleted message
        const nonDeletedMessages = messages.filter(m => !m.is_deleted && m.id !== message.id);
        const lastMsg = nonDeletedMessages.length > 0 
          ? nonDeletedMessages[nonDeletedMessages.length - 1] 
          : null;
        
        if (lastMsg) {
          await ChatConversation.update(selectedConversation.id, {
            last_message: lastMsg.type === "text" ? lastMsg.content : `📎 ${lastMsg.file_name || "Arquivo"}`,
            last_message_at: lastMsg.created_date,
            last_message_by: lastMsg.sender_email
          });
        } else {
          await ChatConversation.update(selectedConversation.id, {
            last_message: "",
            last_message_at: null,
            last_message_by: null
          });
        }
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      const reactions = { ...(msg.reactions || {}) };
      const users = reactions[emoji] || [];
      
      if (users.includes(currentUser.email)) {
        reactions[emoji] = users.filter(e => e !== currentUser.email);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...users, currentUser.email];
      }

      await ChatMessage.update(messageId, { reactions });
      // Real-time subscription will update messages
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  const handlePinMessage = async (message) => {
    try {
      const newPinnedState = !message.is_pinned;
      await ChatMessage.update(message.id, {
        is_pinned: newPinnedState,
        pinned_by: newPinnedState ? currentUser.email : null,
        pinned_at: newPinnedState ? new Date().toISOString() : null
      });
      toast({
        title: newPinnedState ? "Mensagem fixada" : "Mensagem desafixada",
        description: newPinnedState 
          ? "A mensagem foi fixada no topo da conversa" 
          : "A mensagem foi removida das fixadas"
      });
    } catch (error) {
      console.error("Erro ao fixar:", error);
      toast({ title: "Erro ao fixar mensagem", variant: "destructive" });
    }
  };

  const handleStatusTag = async (message, tag) => {
    if (!currentUser) return;
    try {
      const isRemoving = tag === "none";
      const now = new Date().toISOString();

      await ChatMessage.update(message.id, {
        status_tag: tag,
        status_tag_by: isRemoving ? null : currentUser.email,
        status_tag_at: isRemoving ? null : now,
      });

      // Optimistic local update
      setMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, status_tag: tag, status_tag_by: isRemoving ? null : currentUser.email, status_tag_at: isRemoving ? null : now } : m
      ));

      const tagLabels = { feito: "Feito", realizado: "Realizado", conciliado: "Conciliado" };

      if (!isRemoving) {
        toast({ title: `✅ Marcado como ${tagLabels[tag]}` });

        // Send system message about the status change
        const userName = currentUser.display_name || currentUser.full_name;
        await ChatMessage.create({
          conversation_id: message.conversation_id,
          sender_email: currentUser.email,
          sender_name: userName,
          content: `✅ ${userName} marcou uma mensagem como ${tagLabels[tag]}`,
          type: "system",
          read_by: [{ email: currentUser.email, read_at: now }]
        });

        // Notify the message author if it's not the current user
        if (message.sender_email !== currentUser.email) {
          try {
            const { Notification: NotificationEntity } = await import("@/entities/Notification");
            await NotificationEntity.create({
              user_email: message.sender_email,
              title: `Mensagem marcada como ${tagLabels[tag]}`,
              message: `${userName} marcou sua mensagem como ${tagLabels[tag]}`,
              type: "interaction",
              action_by: currentUser.email,
              action_by_name: userName,
            });
          } catch (e) {
            console.error("Erro ao notificar autor:", e);
          }
        }
      } else {
        toast({ title: "Marcação removida" });
      }
    } catch (error) {
      console.error("Erro ao marcar status:", error);
      toast({ title: "Erro ao marcar status", variant: "destructive" });
    }
  };

  const handlePinConversation = async (conversation, shouldPin) => {
    try {
      const currentPinnedBy = conversation.is_pinned_by || [];
      
      let newPinnedBy;
      if (shouldPin) {
        newPinnedBy = [...currentPinnedBy, currentUser.email];
      } else {
        newPinnedBy = currentPinnedBy.filter(e => e !== currentUser.email);
      }
      
      await ChatConversation.update(conversation.id, {
        is_pinned_by: newPinnedBy
      });
      // Real-time subscription will update the conversation
      
      toast({
        title: shouldPin ? "Conversa fixada" : "Conversa desafixada",
        description: shouldPin 
          ? "A conversa aparecerá no topo da lista" 
          : "A conversa voltou à ordem normal"
      });
    } catch (error) {
      console.error("Erro ao fixar conversa:", error);
      toast({ title: "Erro ao fixar conversa", variant: "destructive" });
    }
  };

  // Get typing users for current conversation
  const typingUsers = selectedConversation?.typing_users?.filter(e => e !== currentUser?.email) || [];

  // Get participants info
  const conversationUsers = selectedConversation
    ? users.filter(u => selectedConversation.participants?.includes(u.email))
    : [];

  const isAdmin = currentUser?.role === "admin";

  const handleApproveTaskRequest = (requestId) => {
    setSelectedTaskRequestId(requestId);
    setShowTaskApprovalModal(true);
  };

  const handleShowReactions = (message) => {
    setSelectedMessageForReactions(message);
    setShowReactionsModal(true);
  };

  const handleGoToFavorite = useCallback(async (fav) => {
    // Find target conversation
    const targetConv = conversations.find(c => c.id === fav.conversation_id);
    if (!targetConv) return;

    // Switch to that conversation
    handleSelectConversation(targetConv);

    // Wait for messages to load, then scroll to message
    // We poll until the message appears in the DOM (up to 3s)
    const messageId = fav.message_id;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.querySelector(`[data-msgid="${messageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("bg-amber-100/50", "dark:bg-amber-900/30");
        setTimeout(() => el.classList.remove("bg-amber-100/50", "dark:bg-amber-900/30"), 2500);
        return;
      }
      attempts++;
      if (attempts < 15) setTimeout(tryScroll, 200);
    };
    setTimeout(tryScroll, 400);
  }, [conversations]);

  // Resolve conversation display name for forwarding metadata
  const getConvName = (conv) => {
    if (!conv) return "";
    if (conv.type === "group") return conv.name || "Grupo";
    if (conv.type === "self") return "Minhas Anotações";
    const otherEmail = conv.participants?.find((p) => p !== currentUser?.email);
    const otherUser = users.find((u) => u.email === otherEmail);
    return otherUser?.display_name || otherUser?.full_name || otherEmail || "Conversa";
  };

  const handleForwardMessage = async (message, targetConversation) => {
    if (!currentUser) return;
    try {
      // Origin conversation name (from currently selected)
      const originConvName = getConvName(
        conversations.find(c => c.id === message.conversation_id) || selectedConversation
      );

      // Build forward payload — preserves type and media fields
      const forwardPayload = {
        conversation_id: targetConversation.id,
        sender_email: currentUser.email,
        sender_name: currentUser.display_name || currentUser.full_name,
        type: message.type,
        content: message.content || "",
        // Preserve file/image/gif fields
        file_url: message.file_url || undefined,
        file_name: message.file_name || undefined,
        file_type: message.file_type || undefined,
        file_size: message.file_size || undefined,
        gif_url: message.gif_url || undefined,
        // Forward metadata
        forwarded_from_message_id: message.forwarded_from_message_id || message.id,
        forwarded_from_conversation_id: message.forwarded_from_conversation_id || message.conversation_id,
        forwarded_from_sender_email: message.forwarded_from_sender_email || message.sender_email,
        forwarded_from_sender_name: message.forwarded_from_sender_name || message.sender_name,
        forwarded_from_created_at: message.forwarded_from_created_at || message.created_date,
        forwarded_from_conversation_name: message.forwarded_from_conversation_name || originConvName,
        read_by: [{ email: currentUser.email, read_at: new Date().toISOString() }],
      };

      // Remove undefined keys
      Object.keys(forwardPayload).forEach(k => forwardPayload[k] === undefined && delete forwardPayload[k]);

      await ChatMessage.create(forwardPayload);

      // Update target conversation last_message
      const now = new Date().toISOString();
      const preview = message.type === "text"
        ? `↪ ${message.content}`
        : `↪ ${message.type === "image" ? "📷 Imagem" : message.type === "gif" ? "🎞 GIF" : `📎 ${message.file_name || "Arquivo"}`}`;
      await ChatConversation.update(targetConversation.id, {
        last_message: preview,
        last_message_at: now,
        last_message_by: currentUser.email,
      });

      toast({ title: "✅ Mensagem encaminhada!" });
    } catch (error) {
      console.error("Erro ao encaminhar:", error);
      toast({ title: "Erro ao encaminhar", variant: "destructive" });
    }
  };

  // Mobile: mostrar lista ou conversa (nunca os dois)
  // Desktop: split view lado a lado
  const showList = !isMobileView || !showConversation;
  const showDetail = !isMobileView || showConversation;

  const handleBack = () => {
    setShowConversation(false);
    setSelectedConversation(null);
  };

  // ESC key: deselect conversation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedConversation) {
        setSelectedConversation(null);
        setShowConversation(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedConversation]);

  return (
    <div className="relative flex bg-background overflow-hidden" style={{ height: '100dvh' }}>
      {/* Desktop: padding e gap normais */}
      <div className="hidden md:flex w-full h-full p-3 gap-3">
        {/* Lista - Desktop */}
        <div className="w-[350px] lg:w-[400px] flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden shrink-0">
          <ChatList
            conversations={conversations}
            users={users}
            currentUser={currentUser}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            onNewChat={() => { setIsGroupMode(false); setShowNewChat(true); }}
            onNewGroup={() => { setIsGroupMode(true); setShowNewChat(true); }}
            unreadCounts={unreadCounts}
            presenceMap={presenceMap}
            onOpenPresenceSettings={() => setShowPresenceSettings(true)}
            onPinConversation={handlePinConversation}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            departments={departments}
          />
        </div>
        {/* Conversa - Desktop */}
        <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden min-w-0">
          <ConversationView
            key={selectedConversation?.id}
            conversation={selectedConversation}
            messages={messages}
            currentUser={currentUser}
            users={users}
            onSend={handleSendMessage}
            onTyping={handleTyping}
            onBack={handleBack}
            onOpenSettings={() => setShowSettings(true)}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReaction={handleReaction}
            onImageClick={setViewingImage}
            onPinMessage={handlePinMessage}
            onStatusTag={handleStatusTag}
            onForward={setForwardingMessage}
            typingUsers={typingUsers}
            presenceMap={presenceMap}
            isAdmin={isAdmin}
            onApproveTaskRequest={handleApproveTaskRequest}
            chatBgPrefs={chatBgPrefs}
            onLoadMore={handleLoadMore}
            hasMoreMessages={hasMoreMessages}
            isLoadingMore={isLoadingMore}
            autoFocusTrigger={selectedConversation?.id}
            conversations={conversations}
            taskRequestStatuses={taskRequestStatuses}
            departments={departments}
            onGoToFavorite={handleGoToFavorite}
            onShowReactions={handleShowReactions}
          />
        </div>
      </div>

      {/* Mobile: Master/Detail - apenas uma tela por vez */}
      <div className="flex md:hidden w-full h-full relative overflow-hidden">
        {/* Lista - Mobile (visível quando não há conversa selecionada) */}
        <div
          className={`absolute inset-0 flex flex-col bg-card transition-transform duration-300 ${
            showConversation ? "-translate-x-full" : "translate-x-0"
          }`}
        >
          <ChatList
            conversations={conversations}
            users={users}
            currentUser={currentUser}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            onNewChat={() => { setIsGroupMode(false); setShowNewChat(true); }}
            onNewGroup={() => { setIsGroupMode(true); setShowNewChat(true); }}
            unreadCounts={unreadCounts}
            presenceMap={presenceMap}
            onOpenPresenceSettings={() => setShowPresenceSettings(true)}
            onPinConversation={handlePinConversation}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            departments={departments}
          />
        </div>

        {/* Conversa - Mobile (visível quando há conversa selecionada) */}
         <div
           className={`absolute inset-0 flex flex-col bg-card transition-transform duration-300 ${
             showConversation ? "translate-x-0" : "translate-x-full"
           }`}
         >
           <ConversationView
             key={selectedConversation?.id}
             conversation={selectedConversation}
             messages={messages}
             currentUser={currentUser}
             users={users}
             onSend={handleSendMessage}
             onTyping={handleTyping}
             onBack={handleBack}
             onOpenSettings={() => setShowSettings(true)}
             onEditMessage={handleEditMessage}
             onDeleteMessage={handleDeleteMessage}
             onReaction={handleReaction}
             onImageClick={setViewingImage}
             onPinMessage={handlePinMessage}
             onStatusTag={handleStatusTag}
             onForward={setForwardingMessage}
             typingUsers={typingUsers}
             presenceMap={presenceMap}
             isAdmin={isAdmin}
             onApproveTaskRequest={handleApproveTaskRequest}
             chatBgPrefs={chatBgPrefs}
             myPresence={myPresence}
             onLoadMore={handleLoadMore}
             hasMoreMessages={hasMoreMessages}
             isLoadingMore={isLoadingMore}
             autoFocusTrigger={selectedConversation?.id}
             conversations={conversations}
             taskRequestStatuses={taskRequestStatuses}
             departments={departments}
             onGoToFavorite={handleGoToFavorite}
             onShowReactions={handleShowReactions}
           />
        </div>
      </div>

      {/* Modals - fora dos containers mobile/desktop */}
      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        users={users}
        currentUser={currentUser}
        onCreateDirect={handleCreateDirect}
        onCreateGroup={handleCreateGroup}
        isGroupMode={isGroupMode}
        isAdmin={isAdmin}
      />

      <GroupSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        conversation={selectedConversation}
        users={conversationUsers}
        currentUser={currentUser}
        allUsers={users}
        onUpdate={handleUpdateConversation}
        onLeave={handleLeaveGroup}
        onDelete={handleDeleteGroup}
      />

      <ImageViewer
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage}
      />

      <PresenceSettings
        open={showPresenceSettings}
        onClose={() => setShowPresenceSettings(false)}
        currentUser={currentUser}
        presence={myPresence}
        onUpdate={() => {
          // Reload presence data to pick up any changes
          loadPresenceData();
        }}
        onBgUpdate={(bgData) => {
          setChatBgPrefs(prev => ({ ...prev, ...bgData }));
        }}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        open={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        message={forwardingMessage}
        conversations={conversations}
        users={users}
        currentUser={currentUser}
        onForward={handleForwardMessage}
      />

      {/* Banner para solicitar permissão de áudio */}
      <AudioPermissionBanner />

      {/* Task Request Approval Modal */}
      <TaskRequestApprovalModal
        open={showTaskApprovalModal}
        onClose={() => {
          setShowTaskApprovalModal(false);
          setSelectedTaskRequestId(null);
        }}
        requestId={selectedTaskRequestId}
        currentUser={currentUser}
        departments={departments}
        onApproved={(request, newStatus) => {
          // Update global cache + local state so button hides immediately
          if (selectedTaskRequestId) {
            invalidateTaskRequestCache(selectedTaskRequestId, newStatus);
            setTaskRequestStatuses(prev => ({ ...prev, [selectedTaskRequestId]: newStatus }));
          }
        }}
      />

      {/* Message Reactions Modal */}
      <MessageReactionsModal
        open={showReactionsModal}
        onClose={() => {
          setShowReactionsModal(false);
          setSelectedMessageForReactions(null);
        }}
        reactions={selectedMessageForReactions?.reactions}
        users={users}
      />
    </div>
  );
}