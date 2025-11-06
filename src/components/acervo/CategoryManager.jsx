import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DocumentCategory } from "@/entities/DocumentCategory";

const PRESET_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export default function CategoryManager({ open, onClose, categories, onUpdate }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [editingCategory, setEditingCategory] = useState(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingCategory) {
        await DocumentCategory.update(editingCategory.id, {
          name: name.trim(),
          description: description.trim(),
          color: selectedColor
        });
        toast({
          title: "Sucesso!",
          description: "Categoria atualizada com sucesso.",
        });
      } else {
        await DocumentCategory.create({
          name: name.trim(),
          description: description.trim(),
          color: selectedColor
        });
        toast({
          title: "Sucesso!",
          description: "Categoria criada com sucesso.",
        });
      }

      setName("");
      setDescription("");
      setSelectedColor(PRESET_COLORS[0]);
      setEditingCategory(null);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar categoria.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setSelectedColor(category.color || PRESET_COLORS[0]);
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Os documentos não serão excluídos, apenas ficarão sem categoria.")) {
      return;
    }

    try {
      await DocumentCategory.delete(id);
      toast({
        title: "Sucesso!",
        description: "Categoria excluída com sucesso.",
      });
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Formulário */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="cat-name">Nome *</Label>
                <Input
                  id="cat-name"
                  placeholder="Ex: Procedimentos Operacionais"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-desc">Descrição</Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Descrição opcional..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`h-12 rounded-lg transition-all ${
                        selectedColor === color ? 'ring-4 ring-gray-300 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {editingCategory && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(null);
                      setName("");
                      setDescription("");
                      setSelectedColor(PRESET_COLORS[0]);
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button onClick={handleSubmit} className="flex-1 gap-2">
                  <Plus className="w-4 h-4" />
                  {editingCategory ? "Atualizar" : "Criar Categoria"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Categorias */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              Categorias Existentes ({categories.length})
            </h3>

            {categories.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhuma categoria criada ainda
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {categories.map(cat => (
                  <Card key={cat.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{cat.name}</h4>
                          {cat.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(cat)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(cat.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}