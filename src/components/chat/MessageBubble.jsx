import React, { useState } from "react";
import { 
  MoreVertical, Reply, Trash2, Edit2, Smile, 
  Check, CheckCheck, FileText, Download, Play, Pause 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100/20 p-2 rounded-lg min-w-[200px]">
      <Button variant="ghost" size="icon" onClick={togglePlay} className="h-8 w-8 rounded-full">
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 h-1 bg-gray-300 rounded-full overflow-hidden">
        {/* Simple progress bar visualization */}
        <div className={`h-full bg-current transition-all duration-200 ${isPlaying ? 'w-full animate-pulse' : 'w-0'}`} />
      </div>
      <audio 
        ref={audioRef} 
        src={src} 
        onEnded={() => setIsPlaying(false)} 
        className="hidden" 
      />
    </div>
  );
};

export default function MessageBubble({ 
  message, 
  isOwn, 
  sender, 
  onReply, 
  onReact, 
  onDelete, 
  onEdit,
  readStatus 
}) {
  const [showReactions, setShowReactions] = useState(false);

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
          {message.message}
        </span>
      </div>
    );
  }

  if (message.is_deleted_for_all) {
    return (
      <div className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
        <div className="bg-gray-100 border px-4 py-2 rounded-2xl italic text-gray-500 text-sm">
          🚫 Mensagem apagada
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), "HH:mm", { locale: ptBR });
    } catch { return ""; }
  };

  // Group reactions by emoji
  const groupedReactions = Object.entries(message.reactions || {}).reduce((acc, [emoji, users]) => {
    if (users && users.length > 0) acc.push({ emoji, count: users.length, users });
    return acc;
  }, []);

  return (
    <div className={`flex gap-3 mb-4 group ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && (
        <Avatar className="w-8 h-8 border-2 border-gray-200 mt-1">
          <AvatarImage src={sender?.profile_picture} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
            {getInitials(sender?.display_name || message.sender_name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender Name (Group Chat) */}
        {!isOwn && (
          <span className="text-xs text-gray-500 ml-1 mb-1">
            {sender?.display_name || message.sender_name}
          </span>
        )}

        {/* Reply Context */}
        {message.reply_to_content && (
          <div className={`text-xs mb-1 p-2 rounded-lg border-l-4 border-blue-500 bg-gray-50 opacity-80 w-full cursor-pointer hover:opacity-100 transition-opacity`}>
            <p className="font-bold text-blue-600">{message.reply_to_content.sender_name}</p>
            <p className="truncate">{message.reply_to_content.message}</p>
          </div>
        )}

        <div className="relative">
          {/* Message Content */}
          <div
            className={`rounded-2xl px-4 py-2 shadow-sm relative ${
              isOwn
                ? "bg-blue-600 text-white rounded-tr-none"
                : "bg-white border rounded-tl-none"
            }`}
          >
            {/* Media Content */}
            {message.message_type === 'image' && (
              <div className="mb-2 rounded-lg overflow-hidden max-w-sm">
                <img 
                  src={message.attachment_url} 
                  alt="Attached image" 
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {message.message_type === 'audio' && (
              <div className="mb-2">
                <AudioPlayer src={message.attachment_url} />
              </div>
            )}

            {/* Text Content */}
            {message.message && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.message}
                {message.is_edited && <span className="text-[10px] opacity-60 ml-1">(editada)</span>}
              </p>
            )}

            {/* File Attachment */}
            {(message.message_type === 'file' || (message.attachment_url && message.message_type === 'text')) && (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-2 rounded-lg mt-2 transition-colors ${
                  isOwn ? "bg-blue-700/50 hover:bg-blue-700" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <div className="bg-white/20 p-2 rounded">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate max-w-[150px]">
                    {message.attachment_name || "Arquivo"}
                  </p>
                  <p className="text-xs opacity-70">Clique para baixar</p>
                </div>
                <Download className="w-4 h-4 opacity-70" />
              </a>
            )}

            {/* Metadata: Time & Status */}
            <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
              <span className="text-[10px]">{formatTime(message.created_date)}</span>
              {isOwn && (
                <>
                  {readStatus.isReadByAll ? (
                    <CheckCheck className="w-3 h-3 text-blue-200" />
                  ) : readStatus.isRead ? (
                    <CheckCheck className="w-3 h-3 text-blue-300/70" /> // Delivered/Partially read
                  ) : (
                    <Check className="w-3 h-3 text-blue-300/70" /> // Sent
                  )}
                </>
              )}
            </div>
          </div>

          {/* Reactions Display */}
          {groupedReactions.length > 0 && (
            <div className={`absolute -bottom-3 ${isOwn ? "right-0" : "left-0"} flex gap-1`}>
              {groupedReactions.map((r, idx) => (
                <div key={idx} className="bg-white border shadow-sm rounded-full px-1.5 py-0.5 text-xs flex items-center gap-1 scale-90 hover:scale-100 transition-transform cursor-pointer" title={r.users.join(', ')}>
                  <span>{r.emoji}</span>
                  <span className="font-medium text-gray-600">{r.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions Menu (Hover) */}
          <div className={`absolute top-0 ${isOwn ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-gray-100 hover:bg-gray-200 shadow-sm">
                  <MoreVertical className="w-3 h-3 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="w-4 h-4 mr-2" /> Responder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); setShowReactions(true); }}>
                  <Smile className="w-4 h-4 mr-2" /> Reagir
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                      <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(message, false)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Apagar para mim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(message, true)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Apagar para todos
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Quick Reaction Popover */}
          {showReactions && (
            <div className="absolute -top-10 z-50 bg-white shadow-lg rounded-full border p-1 flex gap-1 animate-in fade-in zoom-in duration-200" onMouseLeave={() => setShowReactions(false)}>
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  className="hover:bg-gray-100 p-1 rounded-full transition-colors text-lg"
                  onClick={() => {
                    onReact(message, emoji);
                    setShowReactions(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}