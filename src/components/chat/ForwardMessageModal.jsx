import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, Forward, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export default function ForwardMessageModal({
  open,
  onClose,
  message,
  conversations,
  users,
  currentUser,
  onForward,
  isBatch = false,
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);

  // Resolve display name for a conversation
  const getConvDisplay = (conv) => {
    if (conv.type === "group") {
      return { name: conv.name || "Grupo", avatar: conv.avatar_url, isGroup: true };
    }
    if (conv.type === "self") {
      return { name: "Minhas Anotações", avatar: null, isSelf: true };
    }
    const otherEmail = conv.participants?.find((p) => p !== currentUser?.email);
    const otherUser = users.find((u) => u.email === otherEmail);
    return {
      name: otherUser?.display_name || otherUser?.full_name || otherEmail || "Usuário",
      avatar: otherUser?.profile_picture,
      isGroup: false,
    };
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return conversations.filter((c) => {
      const d = getConvDisplay(c);
      return !q || d.name.toLowerCase().includes(q);
    });
  }, [conversations, search, users, currentUser]);

  const handleForward = async () => {
    if (!selected || !message) return;
    setSending(true);
    await onForward(message, selected);
    setSending(false);
    setSelected(null);
    setSearch("");
    onClose();
  };

  const handleClose = () => {
    setSelected(null);
    setSearch("");
    onClose();
  };

  // Preview do conteúdo encaminhado
  const contentPreview = () => {
    if (message?.type === "image") return "📷 Imagem";
    if (message?.type === "gif") return "🎞 GIF";
    if (message?.type === "file") return `📎 ${message.file_name || "Arquivo"}`;
    return message?.content || "";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Forward className="w-4 h-4 text-primary" />
            {isBatch && Array.isArray(message)
              ? `Encaminhar ${message.length} mensagem${message.length !== 1 ? "s" : ""}`
              : "Encaminhar mensagem"}
          </DialogTitle>
        </DialogHeader>

        {/* Preview da mensagem a encaminhar */}
        {message && (
          <div className="mx-4 mb-3 p-3 rounded-lg bg-muted border border-border/50 text-sm">
            {isBatch && Array.isArray(message) ? (
              <p className="text-xs text-muted-foreground">
                {message.length} mensagem{message.length !== 1 ? "s" : ""} selecionada{message.length !== 1 ? "s" : ""}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-0.5 font-medium">
                  De: {message?.forwarded_from_sender_name || message?.sender_name}
                </p>
                <p className="truncate text-foreground">{contentPreview()}</p>
              </>
            )}
          </div>
        )}

        {/* Busca */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de conversas */}
        <div className="overflow-y-auto max-h-[50vh] px-2 pb-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhuma conversa encontrada
            </p>
          )}
          {filtered.map((conv) => {
            const d = getConvDisplay(conv);
            const isSelected = selected?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-accent"
                }`}
              >
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={d.avatar} />
                  <AvatarFallback className={d.isGroup ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                    {d.isGroup ? <Users className="w-4 h-4" /> : d.isSelf ? <MessageSquare className="w-4 h-4" /> : getInitials(d.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  {d.isGroup && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.participants?.length || 0} participantes
                    </p>
                  )}
                </div>
                {isSelected && (
                  <Badge variant="default" className="shrink-0 text-xs">Selecionado</Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleForward}
            disabled={!selected || sending}
            className="flex-1 gap-2"
          >
            <Forward className="w-4 h-4" />
            {sending ? "Encaminhando..." : "Encaminhar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}