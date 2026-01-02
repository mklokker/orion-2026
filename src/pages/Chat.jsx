import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatConversation } from "@/entities/ChatConversation";
import { ChatMessage } from "@/entities/ChatMessage";
import { User } from "@/entities/User";
import ChatList from "@/components/chat/ChatList";
import ConversationView from "@/components/chat/ConversationView";
import NewChatModal from "@/components/chat/NewChatModal";
import GroupSettingsModal from "@/components/chat/GroupSettingsModal";
import ImageViewer from "@/components/chat/ImageViewer";
import { useToast } from "@/components/ui/use-toast";

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
  
  const pollingRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    }
    return () => stopPolling();
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
      const [userData, usersData] = await Promise.all([
        User.me(),
        User.list()
      ]);
      setCurrentUser(userData);
      setUsers(usersData);
      await loadConversations(userData.email);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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

  const startPolling = () => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      if (currentUser) {
        // Reload conversations list (skip unread count to avoid rate limit)
        await loadConversations(currentUser.email, true);
        
        // Reload messages for selected conversation
        if (selectedConversation?.id) {
          await loadMessages(selectedConversation.id);
          
          // Also reload the conversation object to get updated typing_users
          try {
            const updatedConvs = await ChatConversation.filter({ id: selectedConversation.id });
            if (updatedConvs.length > 0) {
              setSelectedConversation(updatedConvs[0]);
            }
          } catch (e) {
            // Ignore rate limit errors
          }
        }
      }
    }, 2500); // 2.5 seconds for balance between speed and rate limit
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
    </div>
  );
}