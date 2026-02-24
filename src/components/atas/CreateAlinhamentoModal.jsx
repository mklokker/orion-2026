import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function CreateAlinhamentoModal({
  open,
  onClose,
  onSave,
  alinhamento,
  categorias,
  users,
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "",
    responsible: "",
    alignment_date: "",
    description: "",
    priority: "media",
    status: "publicado",
  });

  useEffect(() => {
    if (alinhamento) {
      setForm({
        title: alinhamento.title || "",
        category: alinhamento.category || "",
        responsible: alinhamento.responsible || "",
        alignment_date: alinhamento.alignment_date || "",
        description: alinhamento.description || "",
        priority: alinhamento.priority || "media",
        status: alinhamento.status || "publicado",
      });
    } else {
      setForm({
        title: "",
        category: "",
        responsible: "",
        alignment_date: "",
        description: "",
        priority: "media",
        status: "publicado",
      });
    }
  }, [alinhamento, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.responsible || !form.alignment_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (alinhamento) {
        await base44.entities.Alinhamento.update(alinhamento.id, form);
        toast({ title: "Sucesso", description: "Alinhamento atualizado!" });
      } else {
        await base44.entities.Alinhamento.create(form);
        toast({ title: "Sucesso", description: "Alinhamento criado!" });
      }
      onSave();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o alinhamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {alinhamento ? "Editar Alinhamento" : "Novo Alinhamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título do alinhamento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável *</Label>
              <Select
                value={form.responsible}
                onValueChange={(v) => setForm({ ...form, responsible: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.full_name || user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.alignment_date}
                onChange={(e) => setForm({ ...form, alignment_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição do alinhamento"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}