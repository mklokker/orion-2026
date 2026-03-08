import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Bookmark,
  Pin,
  PinOff,
  Trash2,
  Copy,
  Archive,
  Eye,
  EyeOff,
} from "lucide-react";

/**
 * Menu de contexto da conversa na lista
 * Intégra ações como fixar, arquivar, e NOVO: "Ler depois"
 */
export function ConversationContextMenu({
  conversation,
  isPinned = false,
  isReadLater = false,
  isManualUnread = false,
  currentUser,
  onPin,
  onArchive,
  onDelete,
  onReadLater,
  onMarkUnread,
  onCopy,
  trigger = null,
}) {
  const handleCopyId = () => {
    navigator.clipboard.writeText(conversation.id);
    onCopy?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Menu"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Pin / Unpin */}
        {onPin && (
          <>
            <DropdownMenuItem onClick={() => onPin(!isPinned)}>
              {isPinned ? (
                <>
                  <PinOff className="w-4 h-4 mr-2" />
                  Desafixar
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 mr-2" />
                  Fixar no topo
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Read Later */}
        {onReadLater && (
          <DropdownMenuItem onClick={() => onReadLater()}>
            <Bookmark className={`w-4 h-4 mr-2 ${isReadLater ? "fill-current" : ""}`} />
            {isReadLater ? "Remover de ler depois" : "Ler depois"}
          </DropdownMenuItem>
        )}

        {/* Mark as Unread */}
        {onMarkUnread && (
          <DropdownMenuItem onClick={() => onMarkUnread()}>
            {isManualUnread ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Marcar como lido
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Marcar como não lido
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Archive */}
        {onArchive && (
          <DropdownMenuItem onClick={() => onArchive()}>
            <Archive className="w-4 h-4 mr-2" />
            Arquivar
          </DropdownMenuItem>
        )}

        {/* Delete */}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Deletar
            </DropdownMenuItem>
          </>
        )}

        {/* Copy ID (utility) */}
        {onCopy && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyId} className="text-xs text-muted-foreground">
              <Copy className="w-4 h-4 mr-2" />
              Copiar ID
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}