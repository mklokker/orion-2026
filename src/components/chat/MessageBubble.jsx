import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  CheckCheck, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image as ImageIcon,
  MoreVertical,
  Reply,
  Pencil,
  Trash2,
  Smile
} from "lucide-react";
import { format } from "date-fns";
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

const getFileIcon = (fileType) => {
  if (!fileType) return FileText;
  if (fileType.includes("image")) return ImageIcon;
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) return FileSpreadsheet;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return Presentation;
  return FileText;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MessageBubble({
  message,
  isOwn,
  showAvatar,
  senderAvatar,
  isGroupChat,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onImageClick
}) {
  const [showActions, setShowActions] = React.useState(false);
  
  if (message.is_deleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
        <div className="px-3 py-2 rounded-lg bg-gray-100 text-gray-400 italic text-sm">
          Mensagem excluída
        </div>
      </div>
    );
  }

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const FileIcon = getFileIcon(message.file_type);
  const isImage = message.type === "image" || message.file_type?.includes("image");
  const readStatus = message.read_by?.length > 1 ? "read" : "sent";
  
  // Formata hora no timezone de São Paulo (-3h)
  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      // Usa toLocaleTimeString com timezone de São Paulo
      return date.toLocaleTimeString("pt-BR", { 
        hour: "2-digit", 
        minute: "2-digit",
        timeZone: "America/Sao_Paulo"
      });
    } catch {
      return format(new Date(dateStr), "HH:mm");
    }
  };

  const renderContent = () => {
    // Reply preview
    const replyPreview = message.reply_to_id && (
      <div className={`mb-1 p-2 rounded text-xs border-l-2 ${isOwn ? "bg-green-600/20 border-green-300" : "bg-gray-200 border-gray-400"}`}>
        <span className="font-semibold">{message.reply_to_sender}</span>
        <p className="truncate opacity-80">{message.reply_to_content}</p>
      </div>
    );

    // Image
    if (isImage && message.file_url) {
      return (
        <>
          {replyPreview}
          <img
            src={message.file_url}
            alt="Imagem"
            className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => onImageClick?.(message.file_url)}
          />
          {message.content && <p className="mt-1 text-sm">{message.content}</p>}
        </>
      );
    }

    // File
    if (message.type === "file" && message.file_url) {
      return (
        <>
          {replyPreview}
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? "bg-green-600/20" : "bg-gray-200"}`}
          >
            <div className={`p-2 rounded ${isOwn ? "bg-green-500/30" : "bg-gray-300"}`}>
              <FileIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.file_name || "Arquivo"}</p>
              <p className="text-xs opacity-70">{formatFileSize(message.file_size)}</p>
            </div>
            <Download className="w-5 h-5 opacity-70" />
          </a>
          {message.content && <p className="mt-1 text-sm">{message.content}</p>}
        </>
      );
    }

    // Text with link detection
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.content?.split(urlRegex) || [];
    
    return (
      <>
        {replyPreview}
        <p className="text-sm whitespace-pre-wrap break-words">
          {parts.map((part, i) =>
            urlRegex.test(part) ? (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline hover:text-blue-300"
              >
                {part}
              </a>
            ) : (
              part
            )
          )}
        </p>
      </>
    );
  };

  // Reactions display
  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div 
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for others (always show in direct and group chats) */}
      {!isOwn && (
        <div className="w-10 mr-2 flex-shrink-0">
          {showAvatar && (
            <Avatar className="w-10 h-10">
              <AvatarImage src={senderAvatar} />
              <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
                {getInitials(message.sender_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={`relative max-w-[70%] ${isOwn ? "order-1" : ""}`}>
        {/* Sender name (always show for others) */}
        {!isOwn && showAvatar && (
          <span className="text-sm font-semibold text-blue-600 ml-1 block mb-0.5">{message.sender_name}</span>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-3 py-2 rounded-lg ${
            isOwn
              ? "bg-green-500 text-white rounded-tr-none"
              : "bg-white text-gray-900 rounded-tl-none shadow-sm"
          }`}
        >
          {renderContent()}

          {/* Time and read status */}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "text-green-100" : "text-gray-400"}`}>
            {message.is_edited && <span className="text-xs">editada</span>}
            <span className="text-xs">{formatTime(message.created_date)}</span>
            {isOwn && (
              readStatus === "read" ? (
                <CheckCheck className="w-4 h-4 text-blue-300" />
              ) : (
                <Check className="w-4 h-4" />
              )
            )}
          </div>
        </div>

        {/* Reactions */}
        {hasReactions && (
          <div className={`flex gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReaction?.(message.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 bg-white rounded-full shadow-sm text-sm hover:bg-gray-100"
              >
                {emoji} <span className="text-xs text-gray-500">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"}`}>
            <div className="flex items-center gap-0.5 bg-white rounded-lg shadow-md p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReaction?.(message.id, "👍")}>
                <Smile className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply?.(message)}>
                <Reply className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {isOwn && (
                    <DropdownMenuItem onClick={() => onEdit?.(message)}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                  )}
                  {isOwn && (
                    <DropdownMenuItem onClick={() => onDelete?.(message)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}