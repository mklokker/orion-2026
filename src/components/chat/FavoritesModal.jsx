import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Search, ExternalLink, FileText, Image as ImageIcon, Film, File, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_ICONS = {
  text: null,
  image: ImageIcon,
  gif: Film,
  file: FileText,
};

const TYPE_LABELS = {
  text: "Texto",
  image: "Imagem",
  gif: "GIF",
  file: "Arquivo",
};

function FavoriteItem({ fav, onGoTo, onUnfavorite }) {
  const snap = fav.snapshot || {};
  const Icon = TYPE_ICONS[snap.type] || File;
  const sentAt = snap.sent_at ? new Date(snap.sent_at) : null;
  // Adjust -3h for BR timezone display
  const displayTime = sentAt
    ? format(new Date(sentAt.getTime() - 3 * 60 * 60 * 1000), "dd/MM/yyyy HH:mm")
    : "—";

  return (
    <div className="flex items-start gap-3 px-3 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors group">
      {/* Type Icon */}
      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
        {snap.type === "text" || !snap.type ? (
          <Star className="w-4 h-4 text-amber-500" />
        ) : (
          <Icon className="w-4 h-4 text-amber-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-semibold truncate">{snap.sender_name || "—"}</span>
          {snap.conversation_name && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 truncate max-w-[120px]">
              {snap.conversation_name}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
          {snap.content_preview || "(sem conteúdo)"}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">{displayTime}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 shrink-0 items-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remover favorito"
          onClick={() => onUnfavorite(fav)}
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Ir para mensagem"
          onClick={() => onGoTo(fav)}
        >
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
        </Button>
      </div>
    </div>
  );
}

export default function FavoritesModal({
  open,
  onClose,
  records = [],
  loading = false,
  onGoTo,       // (fav) => void
  onUnfavorite, // (fav) => void
  currentConversationId = null,
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [convFilter, setConvFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return records.filter(fav => {
      const snap = fav.snapshot || {};
      if (typeFilter !== "all" && snap.type !== typeFilter) return false;
      if (convFilter === "current" && fav.conversation_id !== currentConversationId) return false;
      if (!q) return true;
      return (
        snap.content_preview?.toLowerCase().includes(q) ||
        snap.sender_name?.toLowerCase().includes(q) ||
        snap.conversation_name?.toLowerCase().includes(q) ||
        snap.file_name?.toLowerCase().includes(q)
      );
    });
  }, [records, search, typeFilter, convFilter, currentConversationId]);

  const typeFilters = [
    { value: "all", label: "Todas" },
    { value: "text", label: "Texto" },
    { value: "image", label: "Imagem" },
    { value: "file", label: "Arquivo" },
    { value: "gif", label: "GIF" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col mx-auto p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Mensagens Favoritas
            {records.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{records.length}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search + Filters */}
        <div className="px-4 py-3 space-y-2.5 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por conteúdo, remetente ou conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {typeFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  typeFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
            {currentConversationId && (
              <button
                onClick={() => setConvFilter(v => v === "current" ? "all" : "current")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  convFilter === "current"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                Desta conversa
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground px-4">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-sm">
                {records.length === 0 ? "Nenhuma mensagem favoritada ainda" : "Nenhum resultado para esta busca"}
              </p>
              {records.length === 0 && (
                <p className="text-xs mt-1 opacity-70">
                  Clique em ⋯ em qualquer mensagem e selecione "Favoritar"
                </p>
              )}
            </div>
          ) : (
            <div>
              {filtered.map(fav => (
                <FavoriteItem
                  key={fav.id}
                  fav={fav}
                  onGoTo={onGoTo}
                  onUnfavorite={onUnfavorite}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}