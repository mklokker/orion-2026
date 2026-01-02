import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatConversation } from "@/entities/ChatConversation";
import { ChatMessage } from "@/entities/ChatMessage";
import { UserPresence } from "@/entities/UserPresence";
import { User } from "@/entities/User";
import { getPublicUsers } from "@/functions/getPublicUsers";
import ChatList from "@/components/chat/ChatList";
import ConversationView from "@/components/chat/ConversationView";
import NewChatModal from "@/components/chat/NewChatModal";
import GroupSettingsModal from "@/components/chat/GroupSettingsModal";
import ImageViewer from "@/components/chat/ImageViewer";
import PresenceSettings from "@/components/chat/PresenceSettings";
import AudioPermissionBanner from "@/components/chat/AudioPermissionBanner";
import { useToast } from "@/components/ui/use-toast";
import { playNotificationSound, unlockAudio, isAudioUnlocked } from "@/components/chat/NotificationSounds";

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
  
  const pollingRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const presenceIntervalRef = useRef(null);
  const lastMessageCountRef = useRef({});
  const notifiedMessagesRef = useRef(new Set());
  const lastNotificationTimeRef = useRef({}); // cooldown per conversation

  // Load initial data
  useEffect(() => {
    loadInitialData();
    
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Polling for real-time updates
  useEffect(() => {
    if (currentUser) {
      startPolling();
      updateMyPresence();
      loadPresenceData();
      
      // Update presence every 30 seconds
      presenceIntervalRef.current = setInterval(() => {
        updateMyPresence();
        loadPresenceData();
      }, 30000);
    }
    return () => {
      stopPolling();
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [currentUser]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  const loadInitialData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);
      
      // Use backend function to get users (works for all roles)
      try {
        const response = await getPublicUsers();
        if (response?.data?.users) {
          setUsers(response.data.users);
        }
      } catch (usersError) {
        console.error("Erro ao carregar usuários via função:", usersError);
        // Fallback: try direct list (works only for admins)
        try {
          const usersData = await User.list();
          setUsers(usersData);
        } catch (e) {
          // If user is not admin, they can only see themselves
          setUsers([userData]);
        }
      }
      
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
        // Check if user was seen recently (within 2 minutes) or has manual status
        const lastSeen = p.last_seen ? new Date(p.last_seen) : null;
        const isRecent = lastSeen && (now - lastSeen) < 2 * 60 * 1000;
        
        if (p.manual_status && p.manual_status !== "auto") {
          map[p.user_email] = p.status || p.manual_status;
        } else if (isRecent) {
          map[p.user_email] = "online";
        } else {
          map[p.user_email] = "offline";
        }
        
        // Store my presence
        if (p.user_email === currentUser?.email) {
          setMyPresence(p);
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
        
        await UserPresence.update(presence.id, {
          status: newStatus,
          last_seen: new Date().toISOString()
        });
        setMyPresence({ ...presence, status: newStatus, last_seen: new Date().toISOString() });
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
      const allConvs = await ChatConversation.list("-last_message_at");
      const myConvs = allConvs.filter(c => c.participants?.includes(userEmail));
      setConversations(myConvs);
      
      // Calculate unread counts only on initial load to avoid rate limit
      if (!skipUnreadCount) {
        const counts = {};
        for (const conv of myConvs.slice(0, 10)) { // Limit to 10 to avoid rate limit
          try {
            const msgs = await ChatMessage.filter({ conversation_id: conv.id });
            const unread = msgs.filter(m => 
              m.sender_email !== userEmail && 
              !m.read_by?.includes(userEmail)
            ).length;
            if (unread > 0) counts[conv.id] = unread;
          } catch (e) {
            // Skip on rate limit
            if (e?.response?.status === 429) break;
          }
        }
        setUnreadCounts(counts);
      }
    } catch (error) {
      if (error?.response?.status !== 429) {
        console.error("Erro ao carregar conversas:", error);
      }
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const msgs = await ChatMessage.filter({ conversation_id: conversationId }, "created_date");
      setMessages(msgs);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
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

  const checkForNewMessages = async () => {
    if (!currentUser) return;
    
    try {
      // Only check the selected conversation to minimize API calls
      if (!selectedConversation) return;
      
      const msgs = await ChatMessage.filter({ conversation_id: selectedConversation.id });
      const newMsgs = msgs.filter(m => 
        m.sender_email !== currentUser.email && 
        !m.read_by?.includes(currentUser.email) &&
        !notifiedMessagesRef.current.has(m.id)
      );
      
      for (const msg of newMsgs) {
        // Mark as notified
        notifiedMessagesRef.current.add(msg.id);
        
        // Check notification preferences (default to true if no presence)
        const isGroup = selectedConversation.type === "group";
        const isMention = msg.content?.includes(`@${currentUser.full_name}`) || 
                         msg.content?.includes(`@${currentUser.email}`);
        
        let shouldNotify = false;
        
        if (isMention && myPresence?.notify_mentions !== false) {
          shouldNotify = true;
        } else if (isGroup && myPresence?.notify_group_messages !== false) {
          shouldNotify = true;
        } else if (!isGroup && myPresence?.notify_new_messages !== false) {
          shouldNotify = true;
        }
        
        if (shouldNotify) {
          console.log("[Chat] Nova mensagem detectada de:", msg.sender_email);
          const senderName = msg.sender_name || msg.sender_email;
          const title = isGroup ? `${senderName} em ${selectedConversation.name || "Grupo"}` : senderName;
          const body = msg.type === "text" ? msg.content : "📎 Enviou um arquivo";
          sendNotification(title, body, msg.sender_email, selectedConversation.id);
        }
      }
    } catch (e) {
      // Ignore rate limit errors
    }
  };

  const startPolling = () => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      if (currentUser) {
        // Only reload messages for selected conversation (minimal API calls)
        if (selectedConversation?.id) {
          await loadMessages(selectedConversation.id);
          await checkForNewMessages();
        }
        
        // Reload conversations list less frequently (every other poll)
        if (Math.random() < 0.3) {
          await loadConversations(currentUser.email, true);
        }
      }
    }, 4000); // 4 seconds to reduce rate limit issues
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      const msgs = await ChatMessage.filter({ conversation_id: conversationId });
      const unreadMsgs = msgs.filter(m => 
        m.sender_email !== currentUser?.email && 
        !m.read_by?.includes(currentUser?.email)
      );
      
      for (const msg of unreadMsgs) {
        await ChatMessage.update(msg.id, {
          read_by: [...(msg.read_by || []), currentUser.email]
        });
      }
      
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    if (isMobileView) setShowConversation(true);
  };

  const handleSendMessage = async (msgData) => {
    if (!selectedConversation || !currentUser) return;

    try {
      const newMsg = await ChatMessage.create({
        conversation_id: selectedConversation.id,
        sender_email: currentUser.email,
        sender_name: currentUser.display_name || currentUser.full_name,
        ...msgData,
        read_by: [currentUser.email]
      });

      // Update conversation
      await ChatConversation.update(selectedConversation.id, {
        last_message: msgData.type === "text" ? msgData.content : `📎 ${msgData.file_name || "Arquivo"}`,
        last_message_at: new Date().toISOString(),
        last_message_by: currentUser.email,
        typing_users: []
      });

      setMessages(prev => [...prev, newMsg]);
      loadConversations(currentUser.email);
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    }
  };

  const handleTyping = useCallback(async () => {
    if (!selectedConversation || !currentUser) return;

    try {
      const conv = await ChatConversation.filter({ id: selectedConversation.id });
      if (conv.length === 0) return;
      
      const current = conv[0];
      const typingUsers = current.typing_users || [];
      
      if (!typingUsers.includes(currentUser.email)) {
        await ChatConversation.update(selectedConversation.id, {
          typing_users: [...typingUsers, currentUser.email]
        });
      }

      // Clear typing after 3 seconds
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        const conv2 = await ChatConversation.filter({ id: selectedConversation.id });
        if (conv2.length > 0) {
          await ChatConversation.update(selectedConversation.id, {
            typing_users: (conv2[0].typing_users || []).filter(e => e !== currentUser.email)
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

      await loadConversations(currentUser.email);
      handleSelectConversation(newConv);
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
    }
  };

  const handleCreateGroup = async (name, participantEmails) => {
    try {
      const newConv = await ChatConversation.create({
        type: "group",
        name,
        participants: [currentUser.email, ...participantEmails],
        admins: [currentUser.email]
      });

      // System message
      await ChatMessage.create({
        conversation_id: newConv.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: `${currentUser.full_name} criou o grupo "${name}"`,
        type: "system"
      });

      await loadConversations(currentUser.email);
      handleSelectConversation(newConv);
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
    }
  };

  const handleUpdateConversation = async (updates) => {
    if (!selectedConversation) return;
    try {
      await ChatConversation.update(selectedConversation.id, updates);
      await loadConversations(currentUser.email);
      const updated = await ChatConversation.filter({ id: selectedConversation.id });
      if (updated.length > 0) setSelectedConversation(updated[0]);
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
        type: "system"
      });

      setSelectedConversation(null);
      setShowSettings(false);
      await loadConversations(currentUser.email);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedConversation) return;
    try {
      // Delete all messages
      const msgs = await ChatMessage.filter({ conversation_id: selectedConversation.id });
      for (const msg of msgs) {
        await ChatMessage.delete(msg.id);
      }
      // Delete conversation
      await ChatConversation.delete(selectedConversation.id);
      
      setSelectedConversation(null);
      setShowSettings(false);
      await loadConversations(currentUser.email);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleEditMessage = async (message) => {
    const newContent = prompt("Editar mensagem:", message.content);
    if (newContent && newContent !== message.content) {
      try {
        await ChatMessage.update(message.id, { content: newContent, is_edited: true });
        await loadMessages(selectedConversation.id);
      } catch (error) {
        console.error("Erro ao editar:", error);
      }
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!confirm("Excluir esta mensagem?")) return;
    try {
      await ChatMessage.update(message.id, { is_deleted: true, content: "" });
      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      const reactions = msg.reactions || {};
      const users = reactions[emoji] || [];
      
      if (users.includes(currentUser.email)) {
        reactions[emoji] = users.filter(e => e !== currentUser.email);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...users, currentUser.email];
      }

      await ChatMessage.update(messageId, { reactions });
      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  // Get typing users for current conversation
  const typingUsers = selectedConversation?.typing_users?.filter(e => e !== currentUser?.email) || [];

  // Get participants info
  const conversationUsers = selectedConversation
    ? users.filter(u => selectedConversation.participants?.includes(u.email))
    : [];

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen flex bg-gray-100">
      {/* Sidebar - Chat List */}
      <div className={`${isMobileView && showConversation ? "hidden" : "flex"} w-full md:w-[350px] lg:w-[400px] border-r flex-col`}>
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
        />
      </div>

      {/* Main - Conversation View */}
      <div className={`${isMobileView && !showConversation ? "hidden" : "flex"} flex-1 flex-col`}>
        <ConversationView
          conversation={selectedConversation}
          messages={messages}
          currentUser={currentUser}
          users={users}
          onSend={handleSendMessage}
          onTyping={handleTyping}
          onBack={() => setShowConversation(false)}
          onOpenSettings={() => setShowSettings(true)}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReaction={handleReaction}
          onImageClick={setViewingImage}
          typingUsers={typingUsers}
          presenceMap={presenceMap}
        />
      </div>

      {/* Modals */}
      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        users={users}
        currentUser={currentUser}
        onCreateDirect={handleCreateDirect}
        onCreateGroup={handleCreateGroup}
        isGroupMode={isGroupMode}
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
          loadPresenceData();
          updateMyPresence();
        }}
      />

      {/* Banner para solicitar permissão de áudio */}
      <AudioPermissionBanner />
    </div>
  );
}