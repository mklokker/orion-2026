import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Search } from "lucide-react";

const PlanoAcaoItem = base44.entities.PlanoAcaoItem;

export default function PlanoAcaoItemModal({ open, onClose, onSave, planoId, item, users }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [whoSearch, setWhoSearch] = useState("");
  const [delegateSearch, setDelegateSearch] = useState("");

  const [form, setForm] = useState({
    what: "",
    how: "",
    where: "",
    who: "",
    delegate: "",
    level: "recomendar",
    due_date: "",
    materials: "",
    status: "pendente",
    order: 0,
  });

  useEffect(() => {
    if (item) {
      setForm({
        what: item.what || "",
        how: item.how || "",
        where: item.where || "",
        who: item.who || "",
        delegate: item.delegate || "",
        level: item.level || "recomendar",
        due_date: item.due_date || "",
        materials: item.materials || "",
        status: item.status || "pendente",
        order: item.order || 0,
      });
    } else {
      setForm({
        what: "",
        how: "",
        where: "",
        who: "",
        delegate: "",
        level: "recomendar",
        due_date: "",
        materials: "",
        status: "pendente",
        order: 0,
      });
    }
    setWhoSearch("");
    setDelegateSearch("");
  }, [item, open]);

  const handleSubmit = async () => {
    if (!form.what || !form.who || !form.due_date) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (item) {
        await PlanoAcaoItem.update(item.id, form);
        toast({ title: "Sucesso", description: "Ação atualizada" });
      } else {
        await PlanoAcaoItem.create({ ...form, plano_id: planoId });
        toast({ title: "Sucesso", description: "Ação criada" });
      }
      onSave();
      onClose();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar ação", variant: "destructive" });
    }
    setLoading(false);
  };

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email;
  };

  const filterUsers = (search) => {
    return users.filter(user => {
      const name = user.display_name || user.full_name || user.email;
      return name.toLowerCase().includes(search.toLowerCase());
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Ação" : "Nova Ação"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div>
              <Label>O que fazer? *</Label>
              <Textarea
                value={form.what}
                onChange={(e) => setForm({ ...form, what: e.target.value })}
                placeholder="Descreva a ação a ser realizada"
                rows={2}
              />
            </div>

            <div>
              <Label>Como?</Label>
              <Textarea
                value={form.how}
                onChange={(e) => setForm({ ...form, how: e.target.value })}
                placeholder="Como será executada esta ação"
                rows={2}
              />
            </div>

            <div>
              <Label>Onde?</Label>
              <Input
                value={form.where}
                onChange={(e) => setForm({ ...form, where: e.target.value })}
                placeholder="Local de execução"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quem? *</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar..."
                      value={whoSearch}
                      onChange={(e) => setWhoSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={form.who} onValueChange={(v) => setForm({ ...form, who: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione">
                        {form.who && getUserName(form.who)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {filterUsers(whoSearch).map(user => (
                        <SelectItem key={user.email} value={user.email}>
                          {user.display_name || user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Delegado</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar..."
                      value={delegateSearch}
                      onChange={(e) => setDelegateSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={form.delegate || "none"} onValueChange={(v) => setForm({ ...form, delegate: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione">
                        {form.delegate ? getUserName(form.delegate) : "Nenhum"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {filterUsers(delegateSearch).map(user => (
                        <SelectItem key={user.email} value={user.email}>
                          {user.display_name || user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nível</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="determinar">Determinar</SelectItem>
                    <SelectItem value="recomendar">Recomendar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quando? *</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Materiais?</Label>
              <Input
                value={form.materials}
                onChange={(e) => setForm({ ...form, materials: e.target.value })}
                placeholder="Materiais necessários"
              />
            </div>

            <div>
              <Label>Status/Acompanhamento</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="atrasada">Atrasada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : item ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}