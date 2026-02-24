import React, { useState, useEffect } from "react";
import { TeamAlignment } from "@/entities/TeamAlignment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function CreateAlignmentModal({ open, onClose, alignment, categories, users, onSave }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [responsible, setResponsible] = useState("");
  const [alignmentDate, setAlignmentDate] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");

  useEffect(() => {
    if (alignment) {
      setTitle(alignment.title || "");
      setCategory(alignment.category || "");
      setResponsible(alignment.responsible || "");
      setAlignmentDate(alignment.alignment_date || "");
      setDescription(alignment.description || "");
      setPriority(alignment.priority || "media");
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
  };

  const handleSave = async () => {
    if (!title.trim() || !category || !responsible.trim() || !alignmentDate) {
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
        description: description.trim() || null,
        priority,
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
              <Label>Descrição Geral (opcional)</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Descrição geral do alinhamento. Os tópicos específicos podem ser adicionados após criar o alinhamento."
                rows={4}
              />
            </div>

            <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
              💡 Após criar o alinhamento, você poderá adicionar tópicos específicos que podem ser revogados e atualizados ao longo do tempo.
            </p>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : (alignment ? "Salvar" : "Criar Alinhamento")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}