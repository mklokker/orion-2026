import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Trash2, Edit2 } from "lucide-react";

export default function SectorManager({ open, onClose, sectors, onCreateSector, onUpdateSector, onDeleteSector }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSector, setEditingSector] = useState(null);
  const [deletingSector, setDeletingSector] = useState(null);
  const [sectorData, setSectorData] = useState({
    name: "",
    description: "",
    color: "#3B82F6"
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const handleCreate = () => {
    if (!sectorData.name.trim()) {
      alert("Por favor, dê um nome ao setor");
      return;
    }
    onCreateSector(sectorData);
    setSectorData({ name: "", description: "", color: "#3B82F6" });
    setShowCreateForm(false);
  };

  const handleEdit = (sector) => {
    setEditingSector(sector);
    setSectorData({
      name: sector.name,
      description: sector.description || "",
      color: sector.color || "#3B82F6"
    });
  };

  const handleUpdate = () => {
    if (!sectorData.name.trim()) {
      alert("Por favor, dê um nome ao setor");
      return;
    }
    onUpdateSector(editingSector.id, sectorData);
    setSectorData({ name: "", description: "", color: "#3B82F6" });
    setEditingSector(null);
  };

  const handleDelete = () => {
    onDeleteSector(deletingSector.id);
    setDeletingSector(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Setores</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!showCreateForm && !editingSector && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Setores são áreas físicas do ambiente de trabalho
                  </p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Setor
                  </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sectors.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>Nenhum setor criado ainda</p>
                    </div>
                  ) : (
                    sectors.map(sector => (
                      <div
                        key={sector.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg"
                            style={{ backgroundColor: sector.color }}
                          />
                          <div>
                            <p className="font-medium">{sector.name}</p>
                            {sector.description && (
                              <p className="text-xs text-gray-500">{sector.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(sector)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingSector(sector)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {(showCreateForm || editingSector) && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Setor</Label>
                  <Input
                    placeholder="Ex: Salão Principal, Sala Adm 1..."
                    value={sectorData.name}
                    onChange={(e) => setSectorData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Área principal com 20 mesas..."
                    value={sectorData.description}
                    onChange={(e) => setSectorData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor do Setor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map(color => (
                      <button
                        key={color}
                        className="w-12 h-12 rounded-lg border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: sectorData.color === color ? '#1F2937' : 'transparent'
                        }}
                        onClick={() => setSectorData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingSector(null);
                      setSectorData({ name: "", description: "", color: "#3B82F6" });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={editingSector ? handleUpdate : handleCreate}>
                    {editingSector ? "Salvar" : "Criar Setor"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!showCreateForm && !editingSector && (
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSector} onOpenChange={() => setDeletingSector(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Setor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o setor "{deletingSector?.name}"? As mesas não serão excluídas, apenas desvinculadas.
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