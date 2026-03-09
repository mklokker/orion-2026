import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, Plus } from "lucide-react";
import { createStatusUpdate } from "@/components/collab/collabService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProjectStatusUpdates({
  projectId, updates, currentUser, users, summaryRequired, onReload,
}) {
  const [content, setContent] = useState("");
  const [adding, setAdding]   = useState(false);
  const [saving, setSaving]   = useState(false);

  const getName   = (email) => {
    const u = users.find(u => u.email === email);
    return u?.display_name || u?.full_name || email;
  };
  const getAvatar = (email) => users.find(u => u.email === email)?.profile_picture;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await createStatusUpdate(projectId, content, currentUser.email);
    setContent("");
    setAdding(false);
    await onReload();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {summaryRequired && updates.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Este projeto requer atualizações de status. Adicione um resumo de andamento.
          </p>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setAdding(!adding)}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-1" />
        Nova atualização
      </Button>

      {adding && (
        <div className="space-y-2">
          <Textarea
            placeholder="Descreva o andamento do projeto..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving || !content.trim()}
              className="flex-1"
            >
              {saving ? "Salvando..." : "Publicar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {updates.map(upd => (
          <div key={upd.id} className="flex gap-3">
            <Avatar className="w-7 h-7 shrink-0 mt-0.5">
              <AvatarImage src={getAvatar(upd.author_email)} />
              <AvatarFallback className="text-xs">{getName(upd.author_email)?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium">{getName(upd.author_email)}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(upd.created_date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {upd.content}
              </p>
            </div>
          </div>
        ))}
        {updates.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma atualização publicada.
          </p>
        )}
      </div>
    </div>
  );
}