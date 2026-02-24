import React, { useState, useEffect } from "react";
import { TeamAlignment } from "@/entities/TeamAlignment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { X, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function CreateAlignmentModal({ open, onClose, alignment, categories, users, onSave }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [responsible, setResponsible] = useState("");
  const [alignmentDate, setAlignmentDate] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [targetAudience, setTargetAudience] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (alignment) {
      setTitle(alignment.title || "");
      setCategory(alignment.category || "");
      setResponsible(alignment.responsible || "");
      setAlignmentDate(alignment.alignment_date || "");
      setDescription(alignment.description || "");
      setPriority(alignment.priority || "media");
      setTargetAudience(alignment.target_audience || []);
    } else {
      resetForm();
    }
  }, [alignment, open]);

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setResponsible("");
    setAlignmentDate(new Date().toISOString().split('T')[0]);
    setDescription("");
    setPriority("media");
    setTargetAudience([]);
    setSelectAll(false);
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setTargetAudience(users.map(u => u.email));
    } else {
      setTargetAudience([]);
    }
  };

  const handleToggleUser = (email) => {
    if (targetAudience.includes(email)) {
      setTargetAudience(targetAudience.filter(e => e !== email));
      setSelectAll(false);
    } else {
      const newAudience = [...targetAudience, email];
      setTargetAudience(newAudience);
      if (newAudience.length === users.length) {
        setSelectAll(true);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !category || !responsible.trim() || !alignmentDate || !description.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        category,
        responsible: responsible.trim(),
        alignment_date: alignmentDate,
        description: description.trim(),
        priority,
        target_audience: targetAudience,
        status: "publicado",
        acknowledged_by: alignment?.acknowledged_by || []
      };

      if (alignment) {
        await TeamAlignment.update(alignment.id, data);
        toast({ title: "Alinhamento atualizado com sucesso!" });
      } else {
        await TeamAlignment.create(data);
        toast({ title: "Alinhamento criado com sucesso!" });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar alinhamento:", error);
      toast({ title: "Erro ao salvar alinhamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{alignment ? "Editar Alinhamento" : "Novo Alinhamento"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do alinhamento" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
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

              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nome do responsável" />
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={alignmentDate} onChange={(e) => setAlignmentDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição/Conteúdo *</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Descreva o conteúdo do alinhamento..."
                rows={8}
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Público-Alvo (opcional)
              </Label>
              <p className="text-xs text-gray-500">Selecione os usuários que devem receber este alinhamento. Se nenhum for selecionado, será visível para todos.</p>
              
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox id="select_all" checked={selectAll} onCheckedChange={handleSelectAll} />
                <label htmlFor="select_all" className="text-sm font-medium">Selecionar todos</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={user.id} 
                      checked={targetAudience.includes(user.email)} 
                      onCheckedChange={() => handleToggleUser(user.email)} 
                    />
                    <label htmlFor={user.id} className="text-sm truncate">
                      {user.display_name || user.full_name || user.email}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : (alignment ? "Salvar" : "Publicar Alinhamento")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}