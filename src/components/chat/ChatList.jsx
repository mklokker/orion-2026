import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Users, Check, CheckCheck } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const formatMessageTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yy");
};

export default function ChatList({
  conversations,
  users,
  currentUser,
  selectedId,
  onSelect,
  onNewChat,
  onNewGroup,
  unreadCounts
}) {
  const [search, setSearch] = React.useState("");

  const getConversationDisplay = (conv) => {
    if (conv.type === "group") {
      return {
        name: conv.name || "Grupo sem nome",
        avatar: conv.avatar_url,
        isGroup: true
      };
    }
    // Direct chat - find the other participant
    const otherEmail = conv.participants?.find(p => p !== currentUser?.email);
    const otherUser = users.find(u => u.email === otherEmail);
    return {
      name: otherUser?.display_name || otherUser?.full_name || otherEmail || "Usuário",
      avatar: otherUser?.profile_picture,
      isGroup: false
    };
  };

  const filteredConversations = conversations.filter(conv => {
    const display = getConversationDisplay(conv);
    return display.name.toLowerCase().includes(search.toLowerCase());
  });

  // Sort by last message
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(a.created_date);
    const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(b.created_date);
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Conversas</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onNewChat} title="Nova conversa">
              <Plus className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNewGroup} title="Novo grupo">
              <Users className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-100 border-0"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {sortedConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedConversations.map(conv => {
              const display = getConversationDisplay(conv);
              const unread = unreadCounts[conv.id] || 0;
              const isSelected = selectedId === conv.id;
              const isTyping = conv.typing_users?.some(e => e !== currentUser?.email);

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={display.avatar} />
                      <AvatarFallback className={`${display.isGroup ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {display.isGroup ? <Users className="w-5 h-5" /> : getInitials(display.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 truncate">{display.name}</span>
                      <span className="text-xs text-gray-500 ml-2 shrink-0">
                        {formatMessageTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${unread > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                        {isTyping ? (
                          <span className="text-green-600 italic">digitando...</span>
                        ) : (
                          conv.last_message || "Nenhuma mensagem"
                        )}
                      </p>
                      {unread > 0 && (
                        <Badge className="ml-2 bg-green-500 hover:bg-green-500 text-white rounded-full h-5 min-w-[20px] flex items-center justify-center">
                          {unread > 99 ? "99+" : unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}