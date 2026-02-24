import React, { useState } from "react";
import { AlignmentCategory } from "@/entities/AlignmentCategory";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CategoryManagerModal({ open, onClose, categories, onUpdate }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("#3B82F6");
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setColor(cat.color || "#3B82F6");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data = { name: name.trim(), description: description.trim(), color };
      
      if (editing) {
        await AlignmentCategory.update(editing.id, data);
        toast({ title: "Categoria atualizada!" });
      } else {
        await AlignmentCategory.create(data);
        toast({ title: "Categoria criada!" });
      }
      
      resetForm();
      onUpdate();
    } catch (error) {
      toast({ title: "Erro ao salvar categoria", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await AlignmentCategory.delete(deleteTarget.id);
      toast({ title: "Categoria excluída!" });
      setDeleteTarget(null);
      onUpdate();
    } catch (error) {
      toast({ title: "Erro ao excluir categoria", variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Gerenciar Categorias
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {showForm ? (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da categoria" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
                  <Button onClick={handleSave} disabled={loading} className="flex-1">
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            )}

            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cat)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteTarget(cat)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center text-gray-500 py-4">Nenhuma categoria criada</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deleteTarget?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}