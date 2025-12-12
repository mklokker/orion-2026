import React, { useState } from "react";
import { 
  MoreVertical, Reply, Trash2, Edit2, Smile, 
  Check, CheckCheck, FileText, Download, Play, Pause, ExternalLink, Pin, Users
} from "lucide-react";
import { Link } from "react-router-dom";
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
import ImageViewerModal from "./ImageViewerModal";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "✅", "🎉", "👏", "🙏", "💯"];

// Função para gerar cor consistente baseada no nome
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "text-red-600", "text-orange-600", "text-amber-600", 
    "text-green-600", "text-emerald-600", "text-teal-600", 
    "text-cyan-600", "text-blue-600", "text-indigo-600", 
    "text-violet-600", "text-purple-600", "text-fuchsia-600", 
    "text-pink-600", "text-rose-600"
  ];
  return colors[Math.abs(hash) % colors.length];
};

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
  onPin,
  readStatus,
  allParticipants = []
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showReadBy, setShowReadBy] = useState(false);

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

  // Calculate read status details
  const readByUsers = allParticipants.filter(p => 
    message.read_by?.includes(p.email) && p.email !== message.sender_email
  );
  const unreadUsers = allParticipants.filter(p => 
    !message.read_by?.includes(p.email) && p.email !== message.sender_email
  );

  return (
    <div className={`flex gap-3 mb-4 group ${isOwn ? "justify-end" : "justify-start"}`}>
      {/* Avatar dos Outros (Esquerda) */}
      {!isOwn && (
        <Avatar className="w-12 h-12 border-2 border-white shadow-sm mt-1 flex-shrink-0">
          <AvatarImage src={sender?.profile_picture} />
          <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-bold">
            {getInitials(sender?.display_name || message.sender_name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        
        {/* Pinned Indicator */}
        {message.is_pinned && (
          <div className="flex items-center gap-1 text-xs text-amber-600 font-medium mb-1">
            <Pin className="w-3 h-3" />
            <span>Mensagem Fixada</span>
          </div>
        )}
        
        {/* Reply Context */}
        {message.reply_to_content && (
          <div className={`text-xs mb-1 p-2 rounded-lg border-l-4 border-blue-500 bg-gray-50 opacity-90 w-full cursor-pointer hover:opacity-100 transition-opacity shadow-sm`}>
            <p className="font-bold text-blue-600">{message.reply_to_content.sender_name}</p>
            <p className="truncate text-gray-600">{message.reply_to_content.message}</p>
          </div>
        )}

        <div className="relative">
          {/* Message Bubble */}
          <div
            className={`rounded-xl px-4 py-2 shadow-sm relative border ${
              isOwn
                ? "bg-[#d9fdd3] border-[#d9fdd3] text-gray-900 rounded-tr-none" // WhatsApp-like Green for Own
                : "bg-white border-gray-100 text-gray-900 rounded-tl-none" // White for others
            }`}
          >
            {/* Sender Name inside bubble for others, or colored above */}
            {!isOwn && (
              <p className={`text-sm font-bold mb-1 ${stringToColor(sender?.display_name || message.sender_name)}`}>
                {sender?.display_name || message.sender_name}
              </p>
            )}

            {/* Media Content */}
            {message.message_type === 'image' && (
              <>
                <div 
                  className="mb-2 rounded-lg overflow-hidden max-w-sm border border-black/5 cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm"
                  onClick={() => setShowImageModal(true)}
                >
                  <img 
                    src={message.attachment_url} 
                    alt="Attached image" 
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
                <ImageViewerModal 
                  isOpen={showImageModal}
                  onClose={() => setShowImageModal(false)}
                  imageUrl={message.attachment_url}
                  altText="Imagem enviada"
                />
              </>
            )}
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

            {message.message_type === 'document' && (
              <Link 
                to="/Acervo" // Ideally pass ID if Acervo handled query param
                className={`block mb-2 p-3 rounded-lg border transition-colors group/doc ${
                  isOwn ? "bg-[#c6e9c1] border-[#b5dab0] hover:bg-[#b5dab0]" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{message.attachment_name || "Documento"}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      Documento Colaborativo
                      <ExternalLink className="w-3 h-3" />
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Text Content */}
            {message.message && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.message}
                {message.is_edited && <span className="text-[10px] opacity-60 ml-1">(editada)</span>}
              </p>
            )}

            {/* Link Preview */}
            {message.link_preview && (
              <a
                href={message.link_preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block mt-2 rounded-lg border overflow-hidden hover:opacity-90 transition-opacity ${
                  isOwn ? "border-[#b5dab0]" : "border-gray-200"
                }`}
              >
                {message.link_preview.image && (
                  <img 
                    src={message.link_preview.image} 
                    alt={message.link_preview.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className={`p-3 ${isOwn ? "bg-[#c6e9c1]" : "bg-gray-50"}`}>
                  {message.link_preview.site_name && (
                    <p className="text-xs text-gray-500 mb-1">{message.link_preview.site_name}</p>
                  )}
                  {message.link_preview.title && (
                    <p className="font-medium text-sm text-gray-900 line-clamp-1">
                      {message.link_preview.title}
                    </p>
                  )}
                  {message.link_preview.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {message.link_preview.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir link</span>
                  </div>
                </div>
              </a>
            )}

            {/* File Attachment */}
            {(message.message_type === 'file' || (message.attachment_url && message.message_type === 'text')) && (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg mt-2 transition-colors border ${
                  isOwn ? "bg-[#c6e9c1] border-[#b5dab0] hover:bg-[#b5dab0]" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="bg-white/60 p-2 rounded-full">
                  <FileText className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0 text-gray-800">
                  <p className="text-sm font-medium truncate max-w-[180px]">
                    {message.attachment_name || "Arquivo"}
                  </p>
                  <p className="text-xs opacity-70">Clique para baixar</p>
                </div>
                <Download className="w-4 h-4 text-gray-500" />
              </a>
            )}

            {/* Metadata: Time & Status */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[11px] text-gray-500">{formatTime(message.created_date)}</span>
              {isOwn && readByUsers.length > 0 && (
                <button
                  onClick={() => setShowReadBy(!showReadBy)}
                  className="ml-0.5 hover:scale-110 transition-transform cursor-pointer"
                  title={`Visto por ${readByUsers.length} pessoa(s)`}
                >
                  {readStatus.isReadByAll ? (
                    <CheckCheck className="w-4 h-4 text-blue-500" />
                  ) : readStatus.isRead ? (
                    <CheckCheck className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Check className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}
              {isOwn && readByUsers.length === 0 && (
                <Check className="w-4 h-4 text-gray-400" />
              )}
            </div>

            {/* Read By Details Popup */}
            {showReadBy && isOwn && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border p-3 min-w-[200px] z-50 animate-in fade-in zoom-in duration-200">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Status de Leitura
                </div>
                {readByUsers.length > 0 && (
                  <div className="space-y-1 mb-2">
                    <p className="text-xs text-gray-500 font-medium">Visto por:</p>
                    {readByUsers.map(user => (
                      <div key={user.email} className="flex items-center gap-2 text-xs">
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                        <span className="text-gray-700">{user.display_name || user.full_name || user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                {unreadUsers.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs text-gray-500 font-medium">Não visualizaram:</p>
                    {unreadUsers.map(user => (
                      <div key={user.email} className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">{user.display_name || user.full_name || user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reactions Display */}
          {groupedReactions.length > 0 && (
            <div className={`absolute -bottom-3 ${isOwn ? "right-0" : "left-0"} flex gap-1 flex-wrap max-w-[300px]`}>
              {groupedReactions.map((r, idx) => {
                const userNames = r.users.map(email => {
                  const user = allParticipants.find(p => p.email === email);
                  return user?.display_name || user?.full_name || email.split('@')[0];
                }).join(', ');
                
                return (
                  <button
                    key={idx}
                    onClick={() => onReact(message, r.emoji)}
                    className="bg-white border shadow-sm rounded-full px-2 py-0.5 text-sm flex items-center gap-1 hover:scale-110 transition-transform cursor-pointer"
                    title={userNames}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-medium text-gray-600 text-xs">{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions Menu (Hover) */}
          <div className={`absolute top-0 ${isOwn ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm border">
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="w-4 h-4 mr-2" /> Responder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); setShowReactions(true); }}>
                  <Smile className="w-4 h-4 mr-2" /> Reagir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPin?.(message)}>
                  <Pin className="w-4 h-4 mr-2" /> 
                  {message.is_pinned ? 'Desafixar' : 'Fixar mensagem'}
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
            <div 
              className="absolute -top-12 z-50 bg-white shadow-xl rounded-2xl border-2 p-2 flex gap-1 animate-in fade-in zoom-in duration-200" 
              onMouseLeave={() => setShowReactions(false)}
            >
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  className="hover:bg-gray-100 hover:scale-125 p-1.5 rounded-full transition-all text-xl"
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

      {/* Avatar Próprio (Direita) - Nova adição */}
      {isOwn && (
        <Avatar className="w-12 h-12 border-2 border-white shadow-sm mt-1 flex-shrink-0">
          <AvatarImage src={sender?.profile_picture} />
          <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold">
            {getInitials(sender?.display_name || message.sender_name)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}