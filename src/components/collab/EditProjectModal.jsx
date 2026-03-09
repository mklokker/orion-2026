import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X } from "lucide-react";
import { updateProject } from "@/components/collab/collabService";

export default function EditProjectModal({ open, onClose, project, users, onUpdated }) {
  const [form, setForm] = useState({});
  const [responsibleSearch, setResponsibleSearch] = useState("");
  const [selectedResponsible, setSelectedResponsible] = useState(null);
  const [loading, setLoading] = useState(false);

  const getName = (u) => u?.display_name || u?.full_name || u?.email || "";

  useEffect(() => {
    if (project && open) {
      setForm({
        title:             project.title || "",
        description:       project.description || "",
        priority:          project.priority || "media",
        status:            project.status || "ativo",
        start_date:        project.start_date || "",
        due_date:          project.due_date || "",
        responsible_email: project.responsible_email || "",
        is_private:        project.is_private ?? true,
        color_tag:         project.color_tag || "#4338CA",
        summary_required:  project.summary_required ?? false,
      });
      if (project.responsible_email) {
        const u = users.find(u => u.email === project.responsible_email);
        setSelectedResponsible(u || null);
      } else {
        setSelectedResponsible(null);
      }
      setResponsibleSearch("");
    }
  }, [project, open, users]);

  const filteredUsers = users.filter(u =>
    getName(u).toLowerCase().includes(responsibleSearch.toLowerCase())
  );

  const selectResponsible = (u) => {
    setSelectedResponsible(u);
    setForm(p => ({ ...p, responsible_email: u.email }));
    setResponsibleSearch("");
  };
  const clearResponsible = () => {
    setSelectedResponsible(null);
    setForm(p => ({ ...p, responsible_email: "" }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await updateProject(project.id, form);
      onUpdated();
      onClose();
    } catch (e) {
      console.error("EditProjectModal:", e);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              placeholder="Nome do projeto"
              value={form.title || ""}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Objetivo do projeto (opcional)"
              value={form.description || ""}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.start_date || ""}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.due_date || ""}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="h-9"
              />
            </div>
          </div>

          {/* Responsible */}
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            {selectedResponsible ? (
              <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/50">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={selectedResponsible.profile_picture} />
                  <AvatarFallback className="text-xs">{getName(selectedResponsible)[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1 truncate">{getName(selectedResponsible)}</span>
                <button onClick={clearResponsible} className="p-0.5 hover:text-destructive transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar responsável..."
                  value={responsibleSearch}
                  onChange={e => setResponsibleSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            )}
            {!selectedResponsible && responsibleSearch && (
              <div className="border border-border rounded-lg max-h-36 overflow-y-auto">
                {filteredUsers.slice(0, 8).map(u => (
                  <button
                    key={u.email}
                    onClick={() => selectResponsible(u)}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent text-sm text-left min-h-[40px]"
                  >
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarImage src={u.profile_picture} />
                      <AvatarFallback className="text-xs">{getName(u)[0]}</AvatarFallback>
                    </Avatar>
                    {getName(u)}
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3">Nenhum usuário encontrado.</p>
                )}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Projeto privado</p>
                <p className="text-xs text-muted-foreground">Apenas participantes podem ver</p>
              </div>
              <Switch
                checked={!!form.is_private}
                onCheckedChange={v => setForm(p => ({ ...p, is_private: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Resumo obrigatório</p>
                <p className="text-xs text-muted-foreground">Requer atualizações periódicas</p>
              </div>
              <Switch
                checked={!!form.summary_required}
                onCheckedChange={v => setForm(p => ({ ...p, summary_required: v }))}
              />
            </div>
          </div>

          {/* Color */}
          <div className="flex items-center gap-3">
            <Label>Cor</Label>
            <input
              type="color"
              value={form.color_tag || "#4338CA"}
              onChange={e => setForm(p => ({ ...p, color_tag: e.target.value }))}
              className="w-10 h-8 rounded cursor-pointer border border-border"
            />
            <span className="text-sm text-muted-foreground">{form.color_tag}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
          <Button variant="outline" onClick={onClose} className="sm:w-auto w-full">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.title?.trim()}
            className="sm:w-auto w-full"
          >
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}