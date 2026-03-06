import React, { useState } from "react";
import { Pin, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Formata hora no timezone de São Paulo (GMT-3)
const formatSaoPauloTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const utcTime = date.getTime();
  const saoPauloOffset = -3 * 60 * 60 * 1000;
  const saoPauloTime = new Date(utcTime + saoPauloOffset + (date.getTimezoneOffset() * 60 * 1000));
  const hours = String(saoPauloTime.getHours()).padStart(2, "0");
  const minutes = String(saoPauloTime.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function PinnedMessages({ 
  pinnedMessages, 
  users, 
  currentUser,
  onUnpin,
  onScrollToMessage 
}) {
  const [expanded, setExpanded] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const getUserAvatar = (email) => {
    const user = users?.find(u => u.email === email);
    return user?.profile_picture;
  };

  // Mostra apenas a primeira mensagem se não expandido
  const displayMessages = expanded ? pinnedMessages : [pinnedMessages[0]];

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            {pinnedMessages.length} mensagem{pinnedMessages.length > 1 ? "ns" : ""} fixada{pinnedMessages.length > 1 ? "s" : ""}
          </span>
        </div>
        {pinnedMessages.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 px-2"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Ver todas
              </>
            )}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className={`divide-y divide-amber-100 ${expanded ? "max-h-48 overflow-y-auto" : ""}`}>
        {displayMessages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-3 px-4 py-2 hover:bg-amber-100/50 cursor-pointer transition-colors"
            onClick={() => onScrollToMessage?.(msg.id)}
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={getUserAvatar(msg.sender_email)} />
              <AvatarFallback className="text-xs bg-amber-200 text-amber-800">
                {getInitials(msg.sender_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-900">{msg.sender_name}</span>
                <span className="text-xs text-amber-600">{formatSaoPauloTime(msg.created_date)}</span>
              </div>
              <p className="text-sm text-amber-800 truncate">{msg.content}</p>
            </div>

            {(currentUser?.role === 'admin' || currentUser?.email === msg.pinned_by) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-600 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin?.(msg);
                }}
                title="Desafixar mensagem"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}