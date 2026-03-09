import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Check, X } from "lucide-react";
import { createReminder, updateReminderStatus } from "@/components/collab/collabService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_STYLE = {
  ativo:     "bg-blue-100 text-blue-700 border-0",
  concluido: "bg-green-100 text-green-700 border-0",
  cancelado: "bg-gray-100 text-gray-500 border-0",
};

export default function ProjectReminders({
  projectId, reminders, currentUser, users, canEdit, onReload,
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ title: "", description: "", remind_at: "" });
  const [saving, setSaving] = useState(false);

  const getName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.display_name || u?.full_name || email;
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.remind_at) return;
    setSaving(true);
    await createReminder(projectId, {
      title:       form.title.trim(),
      description: form.description.trim(),
      remind_at:   new Date(form.remind_at).toISOString(),
      assigned_to: currentUser.email,
    }, currentUser.email);
    setForm({ title: "", description: "", remind_at: "" });
    setAdding(false);
    await onReload();
    setSaving(false);
  };

  const handleStatus = async (id, status) => {
    await updateReminderStatus(id, status);
    onReload();
  };

  const active = reminders.filter(r => r.status === "ativo");
  const done   = reminders.filter(r => r.status !== "ativo");

  return (
    <div className="space-y-4">
      {canEdit && (
        <Button variant="outline" size="sm" onClick={() => setAdding(!adding)} className="w-full">
          <Plus className="w-4 h-4 mr-1" /> Novo lembrete
        </Button>
      )}

      {adding && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-card shadow-sm">
          <Input
            placeholder="Título do lembrete *"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="h-9"
            autoFocus
          />
          <Textarea
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            className="resize-none"
          />
          <Input
            type="datetime-local"
            value={form.remind_at}
            onChange={e => setForm(p => ({ ...p, remind_at: e.target.value }))}
            className="h-9"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.remind_at}
              className="flex-1"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {reminders.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum lembrete cadastrado.
        </p>
      )}

      {/* Active reminders */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(r => (
            <div
              key={r.id}
              className="flex gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <Bell className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.title}</p>
                {r.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                )}
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {format(new Date(r.remind_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {r.assigned_to && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    → {getName(r.assigned_to)}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleStatus(r.id, "concluido")}
                    className="p-1.5 hover:text-green-600 transition-colors"
                    title="Concluir"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleStatus(r.id, "cancelado")}
                    className="p-1.5 hover:text-destructive transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Done/cancelled */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Concluídos / Cancelados</p>
          {done.map(r => (
            <div
              key={r.id}
              className="flex gap-3 p-2.5 rounded-xl border border-border opacity-60"
            >
              <Bell className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground line-through">{r.title}</p>
                <Badge className={`text-xs mt-1 ${STATUS_STYLE[r.status]}`}>{r.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}