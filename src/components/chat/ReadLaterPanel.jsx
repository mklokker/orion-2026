import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bookmark, MessageSquare, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Painel "Minhas Leituras Pendentes" com conversas e mensagens marcadas
 */
export default function ReadLaterPanel({
  open,
  onClose,
  readLaterConversations = [],
  readLaterMessages = [],
  conversations = [],
  messages = [],
  onConversationClick,
  onMessageClick,
  onMarkConversationDone,
  onMarkMessageDone,
  onRemoveConversation,
  onRemoveMessage,
}) {
  const [activeTab, setActiveTab] = useState("conversations"); // "conversations" | "messages"
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Helper para encontrar conversa/mensagem
  const getConversationData = (convId) => conversations.find(c => c.id === convId);
  const getMessageData = (msgId) => messages.find(m => m.id === msgId);

  // Helper para exibir nome de conversa
  const getConversationDisplay = (conv) => {
    if (conv?.group_name) return conv.group_name;
    if (conv?.participants) {
      const names = conv.participants.map(p => p.display_name || p.full_name || p.email).join(", ");
      return names.substring(0, 50);
    }
    return "Conversa desconhecida";
  };

  // Toggle checkbox
  const toggleSelected = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (activeTab === "conversations") {
      const allIds = new Set(readLaterConversations.map(r => r.id));
      setSelectedIds(selectedIds.size === allIds.size ? new Set() : allIds);
    } else {
      const allIds = new Set(readLaterMessages.map(r => r.id));
      setSelectedIds(selectedIds.size === allIds.size ? new Set() : allIds);
    }
  };

  // Ações em lote
  const handleBulkMarkDone = async () => {
    if (activeTab === "conversations") {
      for (const id of selectedIds) {
        const record = readLaterConversations.find(r => r.id === id);
        if (record) await onMarkConversationDone(record.conversation_id);
      }
    } else {
      for (const id of selectedIds) {
        const record = readLaterMessages.find(r => r.id === id);
        if (record) await onMarkMessageDone(record.message_id);
      }
    }
    setSelectedIds(new Set());
  };

  const handleBulkRemove = async () => {
    if (activeTab === "conversations") {
      for (const id of selectedIds) {
        const record = readLaterConversations.find(r => r.id === id);
        if (record) await onRemoveConversation(record.conversation_id);
      }
    } else {
      for (const id of selectedIds) {
        const record = readLaterMessages.find(r => r.id === id);
        if (record) await onRemoveMessage(record.message_id);
      }
    }
    setSelectedIds(new Set());
  };

  // ─────────────────────────────────────────
  // Render conversas
  // ─────────────────────────────────────────
  const renderConversations = () => {
    if (readLaterConversations.length === 0) {
      return (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">Nenhuma conversa marcada para ler depois</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <AnimatePresence>
          {readLaterConversations.map((record) => {
            const conv = getConversationData(record.conversation_id);
            if (!conv) return null;

            const isSelected = selectedIds.has(record.id);

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelected(record.id)}
                      className="mt-1"
                    />

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        onConversationClick(record.conversation_id);
                        onClose();
                      }}
                    >
                      <p className="font-medium text-sm truncate">
                        {getConversationDisplay(conv)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.created_at), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onMarkConversationDone(record.conversation_id)}
                        title="Marcar como lido"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onRemoveConversation(record.conversation_id)}
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  // ─────────────────────────────────────────
  // Render mensagens
  // ─────────────────────────────────────────
  const renderMessages = () => {
    if (readLaterMessages.length === 0) {
      return (
        <div className="text-center py-12">
          <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">Nenhuma mensagem marcada para ler depois</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <AnimatePresence>
          {readLaterMessages.map((record) => {
            const msg = getMessageData(record.message_id);
            const conv = getConversationData(record.conversation_id);
            if (!msg || !conv) {
              console.warn(`ReadLaterPanel: mensagem ${record.message_id} ou conversa ${record.conversation_id} não encontrada`);
              return null;
            }

            const isSelected = selectedIds.has(record.id);
            const preview = (msg.content || msg.text || "")?.substring(0, 80) || "(mensagem sem texto)";

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelected(record.id)}
                      className="mt-1"
                    />

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        onMessageClick(record.conversation_id, record.message_id);
                        onClose();
                      }}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {getConversationDisplay(conv)}
                      </p>
                      <p className="text-sm truncate">{preview}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(record.created_at), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onMarkMessageDone(record.message_id)}
                        title="Marcar como lido"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onRemoveMessage(record.message_id)}
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  const activeItems = activeTab === "conversations" ? readLaterConversations : readLaterMessages;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Minhas Leituras Pendentes
          </DialogTitle>
        </DialogHeader>

        {/* Abas */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => { setActiveTab("conversations"); setSelectedIds(new Set()); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "conversations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Conversas
            {readLaterConversations.length > 0 && (
              <Badge variant="secondary" className="ml-2">{readLaterConversations.length}</Badge>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("messages"); setSelectedIds(new Set()); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "messages"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensagens
            {readLaterMessages.length > 0 && (
              <Badge variant="secondary" className="ml-2">{readLaterMessages.length}</Badge>
            )}
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === "conversations" ? renderConversations() : renderMessages()}
        </div>

        {/* Ações em lote */}
        {activeItems.length > 0 && selectedIds.size > 0 && (
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <button
              onClick={selectAll}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedIds.size === activeItems.length
                ? "Desselecionar tudo"
                : "Selecionar tudo"}
            </button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkMarkDone}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Marcar como lido ({selectedIds.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRemove}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remover ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}