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
  Smile,
  Pin,
  ListChecks,
  CheckCircle2,
  CircleCheck,
  FileCheck,
  XCircle,
  Forward
} from "lucide-react";
import StatusTagBadge from "./StatusTagBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import LinkPreview from "./LinkPreview";
import ReadReceipt from "./ReadReceipt";
import ReadReceiptBadge from "./ReadReceiptBadge";
import MentionRenderer from "./MentionRenderer";

// GIF inline com fallback e responsividade mobile
function GifMessage({ src, isOwn }) {
  const [failed, setFailed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  if (failed) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-sm underline ${isOwn ? "text-primary-foreground/90" : "text-primary"}`}
      >
        🎞 Abrir GIF
      </a>
    );
  }

  return (
    <div
      className="max-w-full overflow-hidden rounded-lg cursor-pointer"
      onClick={() => setExpanded(e => !e)}
      title={expanded ? "Clique para reduzir" : "Clique para expandir"}
    >
      <img
        src={src}
        alt="GIF"
        loading="lazy"
        onError={() => setFailed(true)}
        className="block rounded-lg object-contain w-auto"
        style={{
          maxWidth: "100%",
          maxHeight: expanded ? "480px" : "240px",
          transition: "max-height 0.2s ease"
        }}
      />
    </div>
  );
}

// Lista de emojis para reações rápidas
const REACTION_EMOJIS = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "👏", 
  "💯", "🙏", "🤔", "👀", "✅", "❌", "⭐", "💪", "🤝", "😍"
];

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
  onImageClick,
  onPin,
  onScrollToMessage,
  onApproveTaskRequest,
  onStatusTag,
  onForward,
  isAdmin = false,
  users = []
}) {
  const [showActions, setShowActions] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  
  // Mantém ações visíveis enquanto menu ou emoji estiver aberto
  const keepActionsVisible = menuOpen || emojiOpen;

  // Detecta se a mensagem contém uma solicitação de tarefas
  const extractTaskRequestId = (content) => {
    if (!content) return null;
    const match = content.match(/`ID: ([a-zA-Z0-9_-]+)`/);
    return match ? match[1] : null;
  };

  const taskRequestId = extractTaskRequestId(message.content);
  const isTaskRequest = message.content?.includes("📝 **Solicitação de Criação de Tarefas/Serviços**");
  
  if (message.is_deleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
        <div className="px-3 py-2 rounded-lg bg-muted text-muted-foreground italic text-sm">
          Mensagem excluída
        </div>
      </div>
    );
  }

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const FileIcon = getFileIcon(message.file_type);
  const isImage = message.type === "image" || message.file_type?.includes("image");
  
  // Formata hora subtraindo 3 horas do horário atual
  const formatTimeMinusThreeHours = (dateStr) => {
    if (!dateStr) return "";
    
    const date = new Date(dateStr);
    // Subtrai 3 horas (em milissegundos)
    const adjustedDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    const hours = String(adjustedDate.getHours()).padStart(2, "0");
    const minutes = String(adjustedDate.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  
  // Detecta URLs no texto
  const extractUrls = (text) => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  
  const urls = message.type === "text" ? extractUrls(message.content) : [];

  const renderContent = () => {
    // Forward header — exibido acima do conteúdo quando mensagem foi encaminhada
    const forwardHeader = message.forwarded_from_message_id && (
      <div className={`mb-2 flex items-start gap-2 p-2 rounded-lg text-xs border-l-2 ${isOwn ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-muted border-primary/40"}`}>
        <Forward className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
        <div className="min-w-0">
          <p className="font-semibold text-xs opacity-80">Encaminhada</p>
          <p className="truncate opacity-70">
            De: <span className="font-medium">{message.forwarded_from_sender_name || message.forwarded_from_sender_email}</span>
          </p>
          {message.forwarded_from_conversation_name && (
            <p className="truncate opacity-60">
              Em: {message.forwarded_from_conversation_name}
            </p>
          )}
        </div>
      </div>
    );

    // Reply preview - clicável para scroll até a mensagem original
    const replyPreview = message.reply_to_id && (
      <div 
        className={`mb-1 p-2 rounded text-xs border-l-2 cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-muted border-muted-foreground/40"}`}
        onClick={() => onScrollToMessage?.(message.reply_to_id)}
      >
        <span className="font-semibold">{message.reply_to_sender}</span>
        <p className="truncate opacity-80">{message.reply_to_content}</p>
      </div>
    );

    // GIF (Giphy)
    if (message.type === "gif" && (message.gif_url || message.content)) {
      const gifSrc = message.gif_url || message.content;
      return (
        <>
          {forwardHeader}
          {replyPreview}
          <GifMessage src={gifSrc} isOwn={isOwn} />
        </>
      );
    }

    // Image
    if (isImage && message.file_url) {
      return (
        <>
          {forwardHeader}
          {replyPreview}
          <img
            src={message.file_url}
            alt="Imagem"
            className="max-w-full w-full rounded-lg cursor-pointer hover:opacity-90 block"
            style={{ maxWidth: '100%' }}
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
          {forwardHeader}
          {replyPreview}
          <div className="flex flex-col gap-2">
            <a
              href={message.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 p-2 rounded-lg min-w-0 overflow-hidden transition-opacity hover:opacity-90 ${isOwn ? "bg-primary-foreground/10" : "bg-muted"}`}
            >
              <div className={`p-2 rounded shrink-0 ${isOwn ? "bg-primary-foreground/20" : "bg-muted-foreground/20"}`}>
                <FileIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium truncate">{message.file_name || "Arquivo"}</p>
                <p className="text-xs opacity-70">{formatFileSize(message.file_size)}</p>
              </div>
              <Download className="w-5 h-5 opacity-70" />
            </a>
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        </>
      );
    }

    // Text with link detection
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.content?.split(urlRegex) || [];
    
    return (
      <>
        {forwardHeader}
        {replyPreview}
        <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          {message.mentions && message.mentions.length > 0 ? (
            <MentionRenderer
              content={message.content}
              mentions={message.mentions}
              users={users}
            />
          ) : (
            parts.map((part, i) =>
              urlRegex.test(part) ? (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline hover:opacity-80 ${isOwn ? "text-primary-foreground/90" : "text-primary"}`}
                >
                  {part}
                </a>
              ) : (
                part
              )
            )
          )}
        </p>
        {/* Link preview para o primeiro link */}
        {urls.length > 0 && <LinkPreview url={urls[0]} isOwn={isOwn} />}
        
        {/* Botão de aprovar para admins em solicitações de tarefas */}
        {isTaskRequest && isAdmin && !isOwn && taskRequestId && (
          <Button
            onClick={() => onApproveTaskRequest?.(taskRequestId)}
            className="mt-3 w-full gap-2"
            size="sm"
          >
            <ListChecks className="w-4 h-4" />
            Revisar Solicitação
          </Button>
        )}
      </>
    );
  };

  // Reactions display
  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div 
      className={`flex w-full min-w-0 ${isOwn ? "justify-end" : "justify-start"} mb-3 group px-1`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !keepActionsVisible && setShowActions(false)}
    >
      {/* Avatar for others */}
      {!isOwn && (
        <div className="w-8 md:w-12 mr-1 md:mr-3 flex-shrink-0 self-end">
          {(isGroupChat || showAvatar) && (
            <Avatar className="w-8 h-8 md:w-12 md:h-12 border-2 border-white shadow-md">
              <AvatarImage src={senderAvatar} />
              <AvatarFallback className="text-xs md:text-base font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {getInitials(message.sender_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={`relative min-w-0 max-w-[75%] md:max-w-[70%] ${isOwn ? "order-1" : ""}`}>
        {/* Sender name with badge style - em grupos sempre mostra, em 1:1 só quando muda */}
        {!isOwn && (isGroupChat || showAvatar) && (
          <div className="mb-1">
            <span className="inline-block text-sm font-bold text-primary-foreground bg-primary px-3 py-1 rounded-full shadow-sm">
              {message.sender_name}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-3 md:px-4 py-2 md:py-3 rounded-2xl min-w-0 overflow-hidden ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card text-card-foreground rounded-tl-sm shadow-md border border-border/50"
          }`}
        >
          {renderContent()}

          {/* Status tag badge */}
          {message.status_tag && message.status_tag !== "none" && (
            <div className="mt-1.5">
              <StatusTagBadge
                tag={message.status_tag}
                tagBy={message.status_tag_by}
                tagAt={message.status_tag_at}
                users={users}
              />
            </div>
          )}

          {/* Time and read status */}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {message.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
            {message.is_edited && <span className="text-xs">editada</span>}
            <span className="text-xs">{formatTimeMinusThreeHours(message.created_date)}</span>
          </div>

          {/* Read receipts (only for own messages) */}
          {isOwn && (
            <div className="flex items-center justify-end gap-2 mt-1">
              <ReadReceipt 
                message={message}
                currentUser={message._currentUser}
                users={users}
                isGroup={isGroupChat}
              />
              {isGroupChat && <ReadReceiptBadge message={message} users={users} isGroup={true} />}
            </div>
          )}
        </div>

        {/* Reactions */}
        {hasReactions && (
          <div className={`flex gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReaction?.(message.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 bg-card rounded-full shadow-sm text-sm hover:bg-accent border border-border/50"
              >
                {emoji} <span className="text-xs text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {(showActions || keepActionsVisible) && (
          <div className={`absolute top-0 z-50 ${isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"}`}>
            <div className="flex items-center gap-0.5 bg-card rounded-lg shadow-md p-0.5 border border-border/50">
              {/* Emoji Picker para Reações */}
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Smile className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 z-50" side="top">
                  <div className="grid grid-cols-5 gap-1">
                    {REACTION_EMOJIS.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onReaction?.(message.id, emoji);
                          setEmojiOpen(false);
                        }}
                        className="text-xl hover:bg-gray-100 rounded p-1 w-8 h-8 flex items-center justify-center transition-transform hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply?.(message)}>
                <Reply className="w-4 h-4" />
              </Button>
              
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50">
                  <DropdownMenuItem onClick={() => { onPin?.(message); setMenuOpen(false); }}>
                    <Pin className="w-4 h-4 mr-2" /> 
                    {message.is_pinned ? "Desafixar" : "Fixar mensagem"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { onReply?.(message); setMenuOpen(false); }}>
                    <Reply className="w-4 h-4 mr-2" /> Responder
                  </DropdownMenuItem>
                  {message.type !== "system" && (
                    <>
                      {message.status_tag !== "feito" && (
                        <DropdownMenuItem onClick={() => { onStatusTag?.(message, "feito"); setMenuOpen(false); }}>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" /> Marcar como Feito
                        </DropdownMenuItem>
                      )}
                      {message.status_tag !== "realizado" && (
                        <DropdownMenuItem onClick={() => { onStatusTag?.(message, "realizado"); setMenuOpen(false); }}>
                          <CircleCheck className="w-4 h-4 mr-2 text-green-600" /> Marcar como Realizado
                        </DropdownMenuItem>
                      )}
                      {message.status_tag !== "conciliado" && (
                        <DropdownMenuItem onClick={() => { onStatusTag?.(message, "conciliado"); setMenuOpen(false); }}>
                          <FileCheck className="w-4 h-4 mr-2 text-amber-600" /> Marcar como Conciliado
                        </DropdownMenuItem>
                      )}
                      {message.status_tag && message.status_tag !== "none" && (
                        <DropdownMenuItem onClick={() => { onStatusTag?.(message, "none"); setMenuOpen(false); }}>
                          <XCircle className="w-4 h-4 mr-2 text-muted-foreground" /> Remover marcação
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {isOwn && (
                    <DropdownMenuItem onClick={() => { onEdit?.(message); setMenuOpen(false); }}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                  )}
                  {isOwn && (
                    <DropdownMenuItem onClick={() => { onDelete?.(message); setMenuOpen(false); }} className="text-red-600">
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