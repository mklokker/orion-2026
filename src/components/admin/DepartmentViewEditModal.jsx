import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Department } from "@/entities/Department";
import { User } from "@/entities/User";
import { Save, X, Building2, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DepartmentViewEditModal({ open, onClose, department, onUpdate }) {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDepartment, setEditedDepartment] = useState(department);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    setEditedDepartment(department);
  }, [department]);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isAdmin;

  const handleSave = async () => {
    if (!editedDepartment.name) {
      toast({
        title: "Erro",
        description: "O nome do departamento é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await Department.update(department.id, editedDepartment);
      toast({
        title: "Sucesso!",
        description: "Departamento atualizado com sucesso.",
      });
      onUpdate();
      setIsEditing(false);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar departamento.",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              {isEditing ? "Editar Departamento" : "Detalhes do Departamento"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome do Departamento *</Label>
            {isEditing ? (
              <Input
                value={editedDepartment.name}
                onChange={(e) => setEditedDepartment({...editedDepartment, name: e.target.value})}
                placeholder="Ex: Registro de Imóveis"
              />
            ) : (
              <h3 className="text-2xl font-bold text-gray-900">{department.name}</h3>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            {isEditing ? (
              <Textarea
                value={editedDepartment.description}
                onChange={(e) => setEditedDepartment({...editedDepartment, description: e.target.value})}
                rows={3}
                placeholder="Descrição do departamento"
              />
            ) : (
              <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
                {department.description || "Sem descrição"}
              </p>
            )}
          </div>

          {/* Regra de virada automática */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dias antes de virar Atrasada
            </Label>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  min="0"
                  value={editedDepartment.days_before_overdue}
                  onChange={(e) => setEditedDepartment({...editedDepartment, days_before_overdue: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-gray-500">
                  Tarefas "Em Execução" virarão automaticamente para "Atrasada" quando faltarem X dias para a data de término
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                {department.days_before_overdue > 0 ? (
                  <Badge variant="outline" className="text-sm">
                    Virada automática: {department.days_before_overdue} {department.days_before_overdue === 1 ? 'dia' : 'dias'} antes
                  </Badge>
                ) : (
                  <p className="text-gray-500 text-sm">Sem virada automática configurada</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-3">
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              Editar
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditedDepartment(department);
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}