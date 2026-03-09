/**
 * ProjectChatPanel
 * Painel de chat auto-suficiente para um projeto de colaboração.
 * Reutiliza ConversationView existente SEM alterar nada do chat geral.
 * Bubbles preservadas via useCollabChat → chatBgPrefs → useBubbleColors.
 */
import React, { useState } from "react";
import ConversationView from "@/components/chat/ConversationView";
import ImageViewer from "@/components/chat/ImageViewer";
import ForwardMessageModal from "@/components/chat/ForwardMessageModal";
import { useCollabChat } from "./useCollabChat";
import { base44 } from "@/api/base44Client";

const { ChatMessage, ChatConversation } = base44.entities;

export default function ProjectChatPanel({ conversationId, currentUser, users, isAdmin }) {
  const [viewingImage, setViewingImage] = useState(null);

  const {
    conversation, messages, chatBgPrefs, presenceMap,
    hasMoreMessages, isLoadingMore,
    forwardingMessage, setForwardingMessage,
    taskRequestStatuses, typingUsers,
    handleSend, handleTyping,
    handleEditMessage, handleDeleteMessage,
    handleReaction, handlePinMessage,
    handleStatusTag, handleLoadMore,
  } = useCollabChat({ conversationId, currentUser, users });

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Carregando chat do projeto...
      </div>
    );
  }

  const handleForward = async (msg, target) => {
    if (!currentUser) return;
    await ChatMessage.create({
      conversation_id: target.id,
      sender_email: currentUser.email,
      sender_name: currentUser.display_name || currentUser.full_name,
      type: msg.type,
      content: msg.content || "",
      file_url: msg.file_url || undefined,
      file_name: msg.file_name || undefined,
      file_type: msg.file_type || undefined,
      forwarded_from_message_id: msg.id,
      forwarded_from_sender_email: msg.sender_email,
      forwarded_from_sender_name: msg.sender_name,
      read_by: [{ email: currentUser.email, read_at: new Date().toISOString() }],
    });
    const now = new Date().toISOString();
    await ChatConversation.update(target.id, {
      last_message: `↪ ${msg.type === "text" ? msg.content : "📎 Arquivo"}`,
      last_message_at: now,
      last_message_by: currentUser.email,
    });
    setForwardingMessage(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConversationView
        conversation={conversation}
        messages={messages}
        currentUser={currentUser}
        users={users}
        onSend={handleSend}
        onTyping={handleTyping}
        onBack={() => {}}
        onOpenSettings={() => {}}
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
        onApproveTaskRequest={() => {}}
        chatBgPrefs={chatBgPrefs}
        onLoadMore={handleLoadMore}
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
        autoFocusTrigger={conversationId}
        conversations={conversation ? [conversation] : []}
        taskRequestStatuses={taskRequestStatuses}
        departments={[]}
        onGoToFavorite={() => {}}
        onShowReactions={() => {}}
      />

      <ImageViewer
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage}
      />

      {forwardingMessage && (
        <ForwardMessageModal
          open={!!forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          message={forwardingMessage}
          conversations={conversation ? [conversation] : []}
          users={users}
          currentUser={currentUser}
          onForward={handleForward}
        />
      )}
    </div>
  );
}