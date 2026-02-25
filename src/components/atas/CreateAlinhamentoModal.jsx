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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

const normalizeText = (text) => {
  return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};
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
  const [userSearch, setUserSearch] = useState("");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
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
        onSave(false, form.title, alinhamento.id);
      } else {
        const created = await base44.entities.Alinhamento.create(form);
        toast({ title: "Sucesso", description: "Alinhamento criado!" });
        onSave(true, form.title, created.id);
      }
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
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {form.responsible || "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <div className="p-2 border-b">
                    <div className="flex items-center gap-2 px-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar usuário..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="border-0 p-0 h-8 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {users
                      .filter((u) => {
                        const displayName = u.display_name || u.full_name || u.email || "";
                        const search = userSearch || "";
                        return normalizeText(displayName).includes(normalizeText(search));
                      })
                      .map((user) => {
                        const displayName = user.display_name || user.full_name || user.email;
                        return (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setForm({ ...form, responsible: displayName });
                              setUserPopoverOpen(false);
                              setUserSearch("");
                            }}
                          >
                            {form.responsible === displayName && (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                            <span>{displayName}</span>
                          </div>
                        );
                      })}
                  </div>
                </PopoverContent>
              </Popover>
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