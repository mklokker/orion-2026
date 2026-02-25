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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Search } from "lucide-react";

const PlanoAcao = base44.entities.PlanoAcao;

export default function CreatePlanoModal({ open, onClose, onSave, plano, categories, programs, users }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    objective: "",
    responsible: "",
    category: "",
    type: "operacional",
    start_date: new Date().toISOString().split("T")[0],
    due_date: "",
    resources: 0,
    programs: [],
    meeting_reference: "",
    status: "em_andamento",
  });

  useEffect(() => {
    if (plano) {
      setForm({
        title: plano.title || "",
        objective: plano.objective || "",
        responsible: plano.responsible || "",
        category: plano.category || "",
        type: plano.type || "operacional",
        start_date: plano.start_date || new Date().toISOString().split("T")[0],
        due_date: plano.due_date || "",
        resources: plano.resources || 0,
        programs: plano.programs || [],
        meeting_reference: plano.meeting_reference || "",
        status: plano.status || "em_andamento",
      });
    } else {
      setForm({
        title: "",
        objective: "",
        responsible: "",
        category: "",
        type: "operacional",
        start_date: new Date().toISOString().split("T")[0],
        due_date: "",
        resources: 0,
        programs: [],
        meeting_reference: "",
        status: "em_andamento",
      });
    }
  }, [plano, open]);

  const handleSubmit = async () => {
    if (!form.title || !form.objective || !form.responsible || !form.due_date) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (plano) {
        await PlanoAcao.update(plano.id, form);
        toast({ title: "Sucesso", description: "Plano atualizado com sucesso" });
      } else {
        await PlanoAcao.create(form);
        toast({ title: "Sucesso", description: "Plano criado com sucesso" });
      }
      onSave();
      onClose();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar plano", variant: "destructive" });
    }
    setLoading(false);
  };

  const toggleProgram = (programName) => {
    setForm(prev => ({
      ...prev,
      programs: prev.programs.includes(programName)
        ? prev.programs.filter(p => p !== programName)
        : [...prev.programs, programName]
    }));
  };

  const filteredUsers = users.filter(user => {
    const name = user.display_name || user.full_name || user.email;
    return name.toLowerCase().includes(userSearch.toLowerCase());
  });

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{plano ? "Editar Plano de Ação" : "Novo Plano de Ação"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Ações necessárias para a conclusão do cadastro de indicadores"
              />
            </div>

            <div>
              <Label>Objetivo Estratégico *</Label>
              <Textarea
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                placeholder="Ex: Conclusão do cadastro de indicadores até Julho/2025"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsável *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 mb-2"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {filteredUsers.length === 0 ? (
                    <p className="p-2 text-sm text-gray-500">Nenhum usuário encontrado</p>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.email}
                        onClick={() => setForm({ ...form, responsible: user.email })}
                        className={`p-2 cursor-pointer hover:bg-gray-100 text-sm ${
                          form.responsible === user.email ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
                        }`}
                      >
                        {user.display_name || user.full_name || user.email}
                      </div>
                    ))
                  )}
                </div>
                {form.responsible && (
                  <p className="text-xs text-indigo-600 mt-1">
                    Selecionado: {getUserName(form.responsible)}
                  </p>
                )}
              </div>

              <div>
                <Label>Categoria/Fundamento</Label>
                <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Selecione --</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nenhuma categoria cadastrada. Acesse Configurações para criar.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estrategico">Estratégico</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="tatico">Tático</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Recursos (R$)</Label>
                <Input
                  type="number"
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Criação *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Até Quando *</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Programas e NBRs</Label>
              {programs.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 mt-2 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                  {programs.map(program => (
                    <div key={program.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`program-${program.id}`}
                        checked={form.programs.includes(program.name)}
                        onCheckedChange={() => toggleProgram(program.name)}
                      />
                      <Label htmlFor={`program-${program.id}`} className="text-sm cursor-pointer">
                        {program.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600 mt-1">
                  Nenhum programa/NBR cadastrado. Acesse Configurações para criar.
                </p>
              )}
            </div>

            <div>
              <Label>Memória de Reunião (Referência)</Label>
              <Input
                value={form.meeting_reference}
                onChange={(e) => setForm({ ...form, meeting_reference: e.target.value })}
                placeholder="Ex: Reunião Geral pesquisa de clima 02/2023"
              />
            </div>

            {plano && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : plano ? "Atualizar" : "Criar Plano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}