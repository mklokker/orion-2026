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
import { Plus, Trash2, FolderOpen, FileText } from "lucide-react";

const PlanoAcaoCategoria = base44.entities.PlanoAcaoCategoria;
const PlanoAcaoPrograma = base44.entities.PlanoAcaoPrograma;

export default function PlanoAcaoConfigModal({ open, onClose, categories, programs, onUpdate }) {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState({ name: "", description: "", color: "#3B82F6" });
  const [newProgram, setNewProgram] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
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
      toast({ title: "Erro", description: "Erro ao excluir categoria", variant: "destructive" });
    }
  };

  const handleAddProgram = async () => {
    if (!newProgram.name) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await PlanoAcaoPrograma.create(newProgram);
      toast({ title: "Sucesso", description: "Programa/NBR criado" });
      setNewProgram({ name: "", description: "" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao criar programa", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDeleteProgram = async (id) => {
    if (!confirm("Excluir este programa/NBR?")) return;
    try {
      await PlanoAcaoPrograma.delete(id);
      toast({ title: "Sucesso", description: "Programa excluído" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir programa", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Configurações do Plano de Ação</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categories">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">
              <FolderOpen className="w-4 h-4 mr-2" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="programs">
              <FileText className="w-4 h-4 mr-2" />
              Programas/NBRs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Add Category */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-medium">Nova Categoria</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nome *</Label>
                        <Input
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          placeholder="Ex: PROCESSOS INTERNOS"
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
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        placeholder="Descrição opcional"
                      />
                    </div>
                    <Button onClick={handleAddCategory} disabled={loading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>

                {/* Categories List */}
                <div className="space-y-2">
                  {categories.map(cat => (
                    <Card key={cat.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: cat.color || "#3B82F6" }}
                          />
                          <div>
                            <p className="font-medium">{cat.name}</p>
                            {cat.description && (
                              <p className="text-sm text-gray-500">{cat.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nenhuma categoria cadastrada</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="programs">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Add Program */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-medium">Novo Programa/NBR</h4>
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={newProgram.name}
                        onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                        placeholder="Ex: NBR ISO 15906:2021"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newProgram.description}
                        onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                        placeholder="Descrição opcional"
                      />
                    </div>
                    <Button onClick={handleAddProgram} disabled={loading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>

                {/* Programs List */}
                <div className="space-y-2">
                  {programs.map(prog => (
                    <Card key={prog.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{prog.name}</p>
                          {prog.description && (
                            <p className="text-sm text-gray-500">{prog.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteProgram(prog.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {programs.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nenhum programa/NBR cadastrado</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}