import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  MoreVertical, 
  Users, 
  Phone,
  Video,
  Search
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import PresenceIndicator, { statusConfig } from "./PresenceIndicator";
import TypingIndicator from "./TypingIndicator";
import PinnedMessages from "./PinnedMessages";
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
  typingUsers,
  presenceMap = {}
}) {
  const scrollRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const messageRefs = useRef({});
  const bottomRef = useRef(null);
  
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

  // Auto scroll to bottom - usa um elemento âncora no final
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      // Pequeno delay para garantir que o DOM foi renderizado
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [messages, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  const isGroup = conversation.type === "group";
  
  const getDisplayInfo = () => {
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

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = format(new Date(msg.created_date), "yyyy-MM-dd");
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const handleSend = async (msgData) => {
    await onSend({
      ...msgData,
      reply_to_id: replyingTo?.id,
      reply_to_content: replyingTo?.content,
      reply_to_sender: replyingTo?.sender_name
    });
    setReplyingTo(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#e5ddd5]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-gray-100 border-b">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative">
          <Avatar className="w-10 h-10 cursor-pointer" onClick={onOpenSettings}>
            <AvatarImage src={display.avatar} />
            <AvatarFallback className={isGroup ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
              {isGroup ? <Users className="w-5 h-5" /> : getInitials(display.name)}
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
          <h3 className="font-semibold text-gray-900 truncate">{display.name}</h3>
          <p className={`text-xs truncate ${
            display.status === "online" ? "text-green-600" : 
            display.status === "away" ? "text-yellow-600" : 
            display.status === "dnd" ? "text-red-600" : "text-gray-500"
          }`}>
            {display.subtitle}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenSettings}>
              Detalhes da conversa
            </DropdownMenuItem>
            <DropdownMenuItem>
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs bg-white/80 text-gray-600 px-3 py-1 rounded-full shadow-sm">
                {isSameDay(new Date(date), new Date())
                  ? "Hoje"
                  : format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            {/* Messages */}
            {msgs.map((msg, idx) => {
              const isOwn = msg.sender_email === currentUser?.email;
              const prevMsg = msgs[idx - 1];
              const showAvatar = !prevMsg || prevMsg.sender_email !== msg.sender_email;

              return (
                <div 
                  key={msg.id} 
                  ref={el => messageRefs.current[msg.id] = el}
                  className="transition-colors duration-500 rounded-lg"
                >
                  <MessageBubble
                    message={msg}
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
                  />
                </div>
              );
            })}
          </div>
        ))}
        
        {/* Typing Indicator - Proeminente */}
        {typingUsers?.length > 0 && (
          <TypingIndicator typingUsers={typingUsers} users={users} />
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTyping={onTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}