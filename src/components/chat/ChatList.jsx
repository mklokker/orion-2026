import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Plus, Users, Check, CheckCheck, Settings, Pin, PinOff, Globe, RefreshCw, FileText, ListChecks } from "lucide-react";

// Inline scroll area to avoid react-router indirect import
const ScrollArea = ({ children, className }) => (
  <div className={`overflow-y-auto ${className || ""}`}>{children}</div>
);
import { useToast } from "@/components/ui/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import PresenceIndicator from "./PresenceIndicator";
import BatchApprovalPanel from "@/components/admin/BatchApprovalPanel";

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
  unreadCounts,
  presenceMap = {},
  onOpenPresenceSettings,
  onPinConversation,
  onRefresh,
  isRefreshing = false
}) {
  const [search, setSearch] = React.useState("");
  const { toast } = useToast();
  
  const MAX_PINNED = 5;
  
  // Contar conversas fixadas pelo usuário atual
  const pinnedCount = conversations.filter(c => 
    c.is_pinned_by?.includes(currentUser?.email)
  ).length;
  
  const handlePinToggle = (e, conv) => {
    e.stopPropagation();
    const isPinned = conv.is_pinned_by?.includes(currentUser?.email);
    
    if (!isPinned && pinnedCount >= MAX_PINNED) {
      toast({
        title: "Limite de conversas fixadas",
        description: `Você só pode fixar até ${MAX_PINNED} conversas. Desafixe uma para fixar outra.`,
        variant: "destructive"
      });
      return;
    }
    
    onPinConversation?.(conv, !isPinned);
  };

  const getConversationDisplay = (conv) => {
    if (conv.type === "self") {
      return {
        name: "Anotações",
        avatar: null,
        isGroup: false,
        isSelf: true,
        otherEmail: null
      };
    }
    if (conv.type === "group") {
      return {
        name: conv.name || "Grupo sem nome",
        avatar: conv.avatar_url,
        isGroup: true,
        isSelf: false,
        otherEmail: null
      };
    }
    // Direct chat - find the other participant
    const otherEmail = conv.participants?.find(p => p !== currentUser?.email);
    const otherUser = users.find(u => u.email === otherEmail);
    return {
      name: otherUser?.display_name || otherUser?.full_name || otherEmail || "Usuário",
      avatar: otherUser?.profile_picture,
      isGroup: false,
      isSelf: false,
      otherEmail
    };
  };

  const filteredConversations = conversations.filter(conv => {
    const display = getConversationDisplay(conv);
    return display.name.toLowerCase().includes(search.toLowerCase());
  });

  // Sort: pinned first, then by last message
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aPinned = a.is_pinned_by?.includes(currentUser?.email) ? 1 : 0;
    const bPinned = b.is_pinned_by?.includes(currentUser?.email) ? 1 : 0;
    
    // Fixadas primeiro
    if (aPinned !== bPinned) return bPinned - aPinned;
    
    // Depois por última mensagem
    const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(a.created_date);
    const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(b.created_date);
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-card overflow-hidden">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-xl font-bold text-foreground">Conversas</h2>
          <div className="flex gap-0.5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRefresh} 
              title="Atualizar conversas"
              disabled={isRefreshing}
              className="h-9 w-9"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onOpenPresenceSettings} title="Status de presença" className="h-9 w-9">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNewChat} title="Nova conversa" className="h-9 w-9">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNewGroup} title="Novo grupo" className="h-9 w-9">
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 rounded-xl h-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 min-h-0">
        {sortedConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedConversations.map(conv => {
              const display = getConversationDisplay(conv);
              const unread = unreadCounts[conv.id] || 0;
              const isSelected = selectedId === conv.id;
              const isTyping = conv.typing_users?.some(e => e !== currentUser?.email);
              const isPinned = conv.is_pinned_by?.includes(currentUser?.email);

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={`flex items-center gap-2.5 md:gap-3 p-2.5 md:p-3 cursor-pointer transition-all rounded-xl group min-h-[60px] ${
                    isSelected 
                      ? "bg-primary/10 ring-2 ring-primary/30" 
                      : "hover:bg-accent active:bg-accent"
                  } ${isPinned && !isSelected ? "bg-amber-500/10" : ""}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-11 h-11 md:w-12 md:h-12">
                      <AvatarImage src={display.avatar} />
                      <AvatarFallback className={`${display.isSelf ? "bg-purple-100 text-purple-700" : display.isGroup ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {display.isSelf ? <FileText className="w-5 h-5" /> : display.isGroup ? <Users className="w-5 h-5" /> : getInitials(display.name)}
                      </AvatarFallback>
                    </Avatar>
                    {!display.isGroup && !display.isSelf && display.otherEmail && (
                      <PresenceIndicator 
                        status={presenceMap[display.otherEmail] || "offline"}
                        size="md"
                        className="absolute bottom-0 right-0"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 min-w-0">
                              {isPinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                              {conv.is_public && <Globe className="w-3 h-3 text-blue-500 shrink-0" />}
                              <span className="font-semibold text-foreground truncate">{display.name}</span>
                            </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                        <button
                          onClick={(e) => handlePinToggle(e, conv)}
                          className={`p-1 rounded-lg hover:bg-accent transition-opacity ${
                            isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                          title={isPinned ? "Desafixar" : "Fixar conversa"}
                        >
                          {isPinned ? (
                            <PinOff className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Pin className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
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