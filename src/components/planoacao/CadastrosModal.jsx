import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, FolderOpen, BarChart3, Target } from "lucide-react";

const PlanoAcaoCategoria = base44.entities.PlanoAcaoCategoria;
const PlanoAcaoIndicador = base44.entities.PlanoAcaoIndicador;
const PlanoAcaoObjetivo = base44.entities.PlanoAcaoObjetivo;

export default function CadastrosModal({ open, onClose, categories, indicators, objectives, onUpdate }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [newCategory, setNewCategory] = useState({ name: "", description: "", color: "#3B82F6" });
  const [newIndicator, setNewIndicator] = useState({ name: "", description: "" });
  const [newObjective, setNewObjective] = useState({ name: "", description: "" });

  // CATEGORIA
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({ title: "Erro", description: "Nome da categoria é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await PlanoAcaoCategoria.create(newCategory);
      toast({ title: "Sucesso", description: "Categoria criada" });
      setNewCategory({ name: "", description: "", color: "#3B82F6" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao criar categoria", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Excluir esta categoria?")) return;
    try {
      await PlanoAcaoCategoria.delete(id);
      toast({ title: "Sucesso", description: "Categoria excluída" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    }
  };

  // INDICADOR
  const handleAddIndicator = async () => {
    if (!newIndicator.name.trim()) {
      toast({ title: "Erro", description: "Nome do indicador é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await PlanoAcaoIndicador.create(newIndicator);
      toast({ title: "Sucesso", description: "Indicador criado" });
      setNewIndicator({ name: "", description: "" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao criar indicador", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDeleteIndicator = async (id) => {
    if (!confirm("Excluir este indicador?")) return;
    try {
      await PlanoAcaoIndicador.delete(id);
      toast({ title: "Sucesso", description: "Indicador excluído" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    }
  };

  // OBJETIVO
  const handleAddObjective = async () => {
    if (!newObjective.name.trim()) {
      toast({ title: "Erro", description: "Nome do objetivo é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await PlanoAcaoObjetivo.create(newObjective);
      toast({ title: "Sucesso", description: "Objetivo criado" });
      setNewObjective({ name: "", description: "" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao criar objetivo", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDeleteObjective = async (id) => {
    if (!confirm("Excluir este objetivo?")) return;
    try {
      await PlanoAcaoObjetivo.delete(id);
      toast({ title: "Sucesso", description: "Objetivo excluído" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Cadastros do Plano de Ação</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categories">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">
              <FolderOpen className="w-4 h-4 mr-2" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="indicators">
              <BarChart3 className="w-4 h-4 mr-2" />
              Indicadores
            </TabsTrigger>
            <TabsTrigger value="objectives">
              <Target className="w-4 h-4 mr-2" />
              Objetivos
            </TabsTrigger>
          </TabsList>

          {/* CATEGORIAS */}
          <TabsContent value="categories">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-medium">Nova Categoria/Fundamento</h4>
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="Ex: APRENDIZAGEM E CONHECIMENTO"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        placeholder="Descrição opcional"
                      />
                    </div>
                    <div>
                      <Label>Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={newCategory.color}
                          onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                          className="w-12 h-9 p-1"
                        />
                        <Input
                          value={newCategory.color}
                          onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddCategory} disabled={loading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {categories.map(cat => (
                    <Card key={cat.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color || "#3B82F6" }} />
                          <div>
                            <p className="font-medium">{cat.name}</p>
                            {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {categories.length === 0 && <p className="text-center text-gray-500 py-4">Nenhuma categoria cadastrada</p>}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* INDICADORES */}
          <TabsContent value="indicators">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-medium">Novo Indicador</h4>
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={newIndicator.name}
                        onChange={(e) => setNewIndicator({ ...newIndicator, name: e.target.value })}
                        placeholder="Ex: Taxa de conclusão de tarefas"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newIndicator.description}
                        onChange={(e) => setNewIndicator({ ...newIndicator, description: e.target.value })}
                        placeholder="Descrição opcional"
                      />
                    </div>
                    <Button onClick={handleAddIndicator} disabled={loading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {indicators.map(ind => (
                    <Card key={ind.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{ind.name}</p>
                          {ind.description && <p className="text-sm text-gray-500">{ind.description}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteIndicator(ind.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {indicators.length === 0 && <p className="text-center text-gray-500 py-4">Nenhum indicador cadastrado</p>}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* OBJETIVOS */}
          <TabsContent value="objectives">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-medium">Novo Objetivo Estratégico</h4>
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={newObjective.name}
                        onChange={(e) => setNewObjective({ ...newObjective, name: e.target.value })}
                        placeholder="Ex: Ampliar a satisfação dos colaboradores"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newObjective.description}
                        onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })}
                        placeholder="Descrição opcional"
                      />
                    </div>
                    <Button onClick={handleAddObjective} disabled={loading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {objectives.map(obj => (
                    <Card key={obj.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{obj.name}</p>
                          {obj.description && <p className="text-sm text-gray-500">{obj.description}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteObjective(obj.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {objectives.length === 0 && <p className="text-center text-gray-500 py-4">Nenhum objetivo cadastrado</p>}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}