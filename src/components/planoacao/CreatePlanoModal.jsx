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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Search } from "lucide-react";

const PlanoAcao = base44.entities.PlanoAcao;

export default function CreatePlanoModal({ open, onClose, onSave, plano, categories, indicators, objectives, atas, users, programs }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [ataSearch, setAtaSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    responsible: "",
    start_date: new Date().toISOString().split("T")[0],
    due_date: "",
    indicator_id: "",
    objective_id: "",
    resources: 0,
    programs: [],
    programs_outros: "",
    type: "operacional",
    ata_id: "",
    status: "em_andamento",
  });

  useEffect(() => {
    if (plano) {
      setForm({
        title: plano.title || "",
        category_id: plano.category_id || "",
        responsible: plano.responsible || "",
        start_date: plano.start_date || new Date().toISOString().split("T")[0],
        due_date: plano.due_date || "",
        indicator_id: plano.indicator_id || "",
        objective_id: plano.objective_id || "",
        resources: plano.resources || 0,
        programs: plano.programs || [],
        programs_outros: plano.programs_outros || "",
        type: plano.type || "operacional",
        ata_id: plano.ata_id || "",
        status: plano.status || "em_andamento",
      });
    } else {
      setForm({
        title: "",
        category_id: "",
        responsible: "",
        start_date: new Date().toISOString().split("T")[0],
        due_date: "",
        indicator_id: "",
        objective_id: "",
        resources: 0,
        programs: [],
        programs_outros: "",
        type: "operacional",
        ata_id: "",
        status: "em_andamento",
      });
    }
    setUserSearch("");
    setAtaSearch("");
  }, [plano, open]);

  const handleSubmit = async () => {
    if (!form.title || !form.responsible || !form.due_date) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios (Plano de Ação, Responsável e Até Quando)", variant: "destructive" });
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

  const filteredAtas = atas.filter(ata => {
    return ata.title?.toLowerCase().includes(ataSearch.toLowerCase());
  });

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email || "";
  };

  const getAtaTitle = (id) => {
    const ata = atas.find(a => a.id === id);
    return ata?.title || "";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{plano ? "Editar Plano de Ação" : "Novo Plano de Ação"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            {/* Plano de Ação */}
            <div>
              <Label>Plano de Ação *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título do plano de ação"
              />
            </div>

            {/* Categoria/Fundamento */}
            <div>
              <Label>Categoria/Fundamento</Label>
              <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Nenhum --</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Nenhuma categoria cadastrada. Acesse "Cadastros" para criar.</p>
              )}
            </div>

            {/* Responsável */}
            <div>
              <Label>Responsável *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <Input
                  placeholder="Buscar usuário..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
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
                <p className="text-xs text-indigo-600 mt-1">Selecionado: {getUserName(form.responsible)}</p>
              )}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Criação</Label>
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

            {/* Indicador */}
            <div>
              <Label>Indicador</Label>
              <Select value={form.indicator_id || "none"} onValueChange={(v) => setForm({ ...form, indicator_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Nenhum --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Nenhum --</SelectItem>
                  {indicators.map(ind => (
                    <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {indicators.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Nenhum indicador cadastrado. Acesse "Cadastros" para criar.</p>
              )}
            </div>

            {/* Objetivo Estratégico */}
            <div>
              <Label>Objetivo Estratégico</Label>
              <Select value={form.objective_id || "none"} onValueChange={(v) => setForm({ ...form, objective_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Nenhum --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Nenhum --</SelectItem>
                  {objectives.map(obj => (
                    <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {objectives.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Nenhum objetivo cadastrado. Acesse "Cadastros" para criar.</p>
              )}
            </div>

            {/* Recursos */}
            <div>
              <Label>Recurso (R$)</Label>
              <Input
                type="number"
                value={form.resources}
                onChange={(e) => setForm({ ...form, resources: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.01}
              />
            </div>

            {/* Programas e NBRs */}
            <div>
              <Label>Programas e NBRs</Label>
              {programs.length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">Nenhum programa cadastrado. Acesse "Cadastros" para criar.</p>
              ) : (
                <div className="mt-2 p-3 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto space-y-2">
                  {programs.map(program => {
                    const isSelected = form.programs.includes(program.name);
                    return (
                      <div
                        key={program.id}
                        onClick={() => toggleProgram(program.name)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-sm ${isSelected ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                          {program.name}
                        </span>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => toggleProgram(program.name)}
                          className={isSelected ? 'data-[state=checked]:bg-green-500' : ''}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-2">
                <Label className="text-sm">Outros:</Label>
                <Input
                  value={form.programs_outros}
                  onChange={(e) => setForm({ ...form, programs_outros: e.target.value })}
                  placeholder="Outros programas..."
                />
              </div>
            </div>

            {/* Tipo */}
            <div>
              <Label>Tipo</Label>
              <RadioGroup
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="estrategico" id="tipo-est" />
                  <Label htmlFor="tipo-est" className="font-normal cursor-pointer">Estratégico</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="operacional" id="tipo-op" />
                  <Label htmlFor="tipo-op" className="font-normal cursor-pointer">Operacional</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tatico" id="tipo-tat" />
                  <Label htmlFor="tipo-tat" className="font-normal cursor-pointer">Tático</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Anexar Ata de Reunião */}
            <div>
              <Label>Anexar uma Ata de Reunião</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <Input
                  placeholder="Buscar ata..."
                  value={ataSearch}
                  onChange={(e) => setAtaSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-32 overflow-y-auto border rounded-md">
                <div
                  onClick={() => setForm({ ...form, ata_id: "" })}
                  className={`p-2 cursor-pointer hover:bg-gray-100 text-sm ${
                    !form.ata_id ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
                  }`}
                >
                  -- Nenhum --
                </div>
                {filteredAtas.length === 0 ? (
                  <p className="p-2 text-sm text-gray-500">Nenhuma ata encontrada</p>
                ) : (
                  filteredAtas.map(ata => (
                    <div
                      key={ata.id}
                      onClick={() => setForm({ ...form, ata_id: ata.id })}
                      className={`p-2 cursor-pointer hover:bg-gray-100 text-sm ${
                        form.ata_id === ata.id ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
                      }`}
                    >
                      {ata.title}
                    </div>
                  ))
                )}
              </div>
              {form.ata_id && (
                <p className="text-xs text-indigo-600 mt-1">Selecionada: {getAtaTitle(form.ata_id)}</p>
              )}
            </div>

            {/* Status (apenas na edição) */}
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
            {loading ? "Salvando..." : plano ? "Atualizar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}