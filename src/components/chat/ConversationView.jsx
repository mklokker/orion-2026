import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  MoreVertical, 
  Users, 
  Phone,
  Video,
  Search,
  FolderOpen,
  ArrowDown,
  ListPlus
} from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import PresenceIndicator, { statusConfig } from "./PresenceIndicator";
import TypingIndicator from "./TypingIndicator";
import PinnedMessages from "./PinnedMessages";
import ConversationFilesModal from "./ConversationFilesModal";
import TaskRequestModal from "./TaskRequestModal";
import MessageSearchModal from "./MessageSearchModal";
import ChatBackground from "./ChatBackground";
import StatusTagFilter from "./StatusTagFilter";
import { groupMessagesByDateBR, getDateLabelBR } from "@/components/utils/dateUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function ConversationView({
  conversation,
  messages,
  currentUser,
  users,
  onSend,
  onTyping,
  onBack,
  onOpenSettings,
  onEditMessage,
  onDeleteMessage,
  onReaction,
  onImageClick,
  onPinMessage,
  onStatusTag,
  typingUsers,
  presenceMap = {},
  isAdmin = false,
  onApproveTaskRequest
}) {
  const scrollRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showTaskRequestModal, setShowTaskRequestModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const messageRefs = useRef({});
  const bottomRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef(null);
  
  // Mensagens fixadas
  const pinnedMessages = messages.filter(m => m.is_pinned).sort((a, b) => 
    new Date(b.pinned_at || b.created_date) - new Date(a.pinned_at || a.created_date)
  );
  
  // Scroll para uma mensagem específica
  const scrollToMessage = (messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-amber-100/50");
      setTimeout(() => element.classList.remove("bg-amber-100/50"), 2000);
    }
  };

  // Scroll para o final
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Detectar scroll para mostrar/esconder botão
  const handleScroll = (e) => {
    const target = e.target;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 200;
    setShowScrollButton(!isNearBottom);
  };

  // Auto scroll to bottom - usa um elemento âncora no final
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      // Pequeno delay para garantir que o DOM foi renderizado
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [messages, conversation?.id]);

  // Atalho Ctrl+F para abrir busca
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isGroup = conversation?.type === "group";
  
  const getDisplayInfo = () => {
    if (!conversation) return { name: "Conversa", avatar: null, subtitle: "", otherEmail: null, status: null };
    if (isGroup) {
      return {
        name: conversation.name || "Grupo",
        avatar: conversation.avatar_url,
        subtitle: `${conversation.participants?.length || 0} participantes`,
        otherEmail: null,
        status: null
      };
    }
    const otherEmail = conversation.participants?.find(p => p !== currentUser?.email);
    const otherUser = users.find(u => u.email === otherEmail);
    const status = presenceMap[otherEmail] || "offline";
    const statusLabel = statusConfig[status]?.label || "Offline";
    return {
      name: otherUser?.display_name || otherUser?.full_name || otherEmail || "Usuário",
      avatar: otherUser?.profile_picture,
      subtitle: statusLabel,
      otherEmail,
      status
    };
  };

  const display = getDisplayInfo();

  // Get user avatar
  const getUserAvatar = (email) => {
    const user = users.find(u => u.email === email);
    return user?.profile_picture;
  };

  // Filter messages by status tag
  const filteredMessages = React.useMemo(() => {
    if (statusFilter === "all") return messages || [];
    if (statusFilter === "tagged") return (messages || []).filter(m => m.status_tag && m.status_tag !== "none");
    return (messages || []).filter(m => m.status_tag === statusFilter);
  }, [messages, statusFilter]);

  // Group messages by date em timezone Brasil
  const groupedMessages = groupMessagesByDateBR(filteredMessages);

  const handleSend = async (msgData) => {
    await onSend({
      ...msgData,
      reply_to_id: replyingTo?.id,
      reply_to_content: replyingTo?.content,
      reply_to_sender: replyingTo?.sender_name
    });
    setReplyingTo(null);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-muted/30 w-full min-w-0" style={{ height: '100dvh', overflow: 'hidden' }}>
      {/* Header - sticky no topo, fundo opaco, nunca some */}
      <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-3 bg-card border-b border-border z-30" style={{ flexShrink: 0, position: 'sticky', top: 0 }}>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-10 w-10" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="w-9 h-9 md:w-10 md:h-10 cursor-pointer" onClick={onOpenSettings}>
            <AvatarImage src={display.avatar} />
            <AvatarFallback className={isGroup ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
              {isGroup ? <Users className="w-4 h-4 md:w-5 md:h-5" /> : getInitials(display.name)}
            </AvatarFallback>
          </Avatar>
          {!isGroup && display.status && (
            <PresenceIndicator 
              status={display.status}
              size="md"
              className="absolute bottom-0 right-0"
            />
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenSettings}>
          <h3 className="font-semibold text-foreground truncate text-sm md:text-base">{display.name}</h3>
          <p className={`text-xs truncate ${
            display.status === "online" ? "text-green-600" : 
            display.status === "away" ? "text-yellow-600" : 
            display.status === "dnd" ? "text-red-600" : "text-muted-foreground"
          }`}>
            {display.subtitle}
          </p>
        </div>

        {/* Desktop: show all buttons */}
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowFilesModal(true)} title="Ver arquivos">
            <FolderOpen className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowTaskRequestModal(true)} title="Solicitar Tarefas">
            <ListPlus className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile + Desktop: dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenSettings}>
              Detalhes da conversa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowFilesModal(true)}>
              <FolderOpen className="w-4 h-4 mr-2" /> Ver arquivos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTaskRequestModal(true)}>
              <ListPlus className="w-4 h-4 mr-2" /> Solicitar Tarefas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSearchModal(true)}>
              <Search className="w-4 h-4 mr-2" /> Buscar mensagens
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pinned Messages */}
      <PinnedMessages
        pinnedMessages={pinnedMessages}
        users={users}
        currentUser={currentUser}
        onUnpin={onPinMessage}
        onScrollToMessage={scrollToMessage}
      />

      {/* Status Tag Filter */}
      {conversation && (
        <div className="flex items-center px-2 md:px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <StatusTagFilter value={statusFilter} onChange={setStatusFilter} messages={messages} />
        </div>
      )}

      {/* Messages - área com scroll próprio */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full relative"
        style={{ isolation: "isolate" }}
      >
        {/* Chat background layer */}
        <ChatBackground conversation={conversation} />

        {/* Messages layer */}
        <div className="relative z-[2] px-2 md:px-4 py-2 md:py-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs bg-card/90 text-muted-foreground px-3 py-1 rounded-full shadow-sm border border-border/50">
                {getDateLabelBR(date)}
              </span>
            </div>

            {/* Messages */}
            {msgs.map((msg, idx) => {
              const isOwn = msg.sender_email === currentUser?.email;
              const prevMsg = msgs[idx - 1];
              const showAvatar = isGroup
                ? (!prevMsg || prevMsg.sender_email !== msg.sender_email)
                : (!prevMsg || prevMsg.sender_email !== msg.sender_email);

              return (
                <div
                  key={msg.id}
                  ref={el => messageRefs.current[msg.id] = el}
                  className="transition-colors duration-500 rounded-lg"
                >
                  <MessageBubble
                    message={{...msg, _currentUser: currentUser}}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    senderAvatar={getUserAvatar(msg.sender_email)}
                    isGroupChat={isGroup}
                    onReply={setReplyingTo}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    onReaction={onReaction}
                    onImageClick={onImageClick}
                    onPin={onPinMessage}
                    onStatusTag={onStatusTag}
                    onScrollToMessage={scrollToMessage}
                    isAdmin={isAdmin}
                    onApproveTaskRequest={onApproveTaskRequest}
                    users={users}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers?.length > 0 && (
          <TypingIndicator typingUsers={typingUsers} users={users} />
        )}

        {/* Âncora para scroll automático */}
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Botão scroll para baixo */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 z-50 rounded-full w-10 h-10 bg-card shadow-lg hover:bg-accent border border-border"
          size="icon"
          variant="ghost"
        >
          <ArrowDown className="w-5 h-5 text-foreground" />
        </Button>
      )}

      {/* Input - fixo no rodapé */}
      <ChatInput
        onSend={handleSend}
        onTyping={onTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        participants={conversation?.participants || []}
        allUsers={users}
      />

      {/* Files Modal */}
      <ConversationFilesModal
        open={showFilesModal}
        onClose={() => setShowFilesModal(false)}
        conversation={conversation}
        users={users}
      />

      {/* Task Request Modal */}
      <TaskRequestModal
        open={showTaskRequestModal}
        onClose={() => setShowTaskRequestModal(false)}
        currentUser={currentUser}
        conversationId={conversation?.id}
        onSendMessage={handleSend}
      />

      {/* Message Search Modal */}
      <MessageSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        conversation={conversation}
        onNavigateToMessage={scrollToMessage}
      />
    </div>
  );
}