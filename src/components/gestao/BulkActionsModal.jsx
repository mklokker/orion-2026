import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ArrowRight, Building2, Edit3, Trash2, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BulkActionsModal({ open, onClose, selectedCount, users, departments, onAction, isAdmin }) {
  const [action, setAction] = useState("");
  const [value, setValue] = useState("");

  const handleConfirm = () => {
    if (!action || (action !== "delete" && !value)) {
      return;
    }
    onAction(action, value);
    setAction("");
    setValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ações em Lote ({selectedCount} selecionadas)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta ação será aplicada a {selectedCount} tarefa(s) selecionada(s).
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Selecione a ação</Label>
            <Select value={action} onValueChange={(val) => { setAction(val); setValue(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Transferir para...
                  </div>
                </SelectItem>
                <SelectItem value="department">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Alterar Departamento...
                  </div>
                </SelectItem>
                <SelectItem value="status">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Alterar Status...
                  </div>
                </SelectItem>
                <SelectItem value="change_year">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Alterar Ano de Término...
                  </div>
                </SelectItem>
                {isAdmin && (
                  <SelectItem value="delete">
                    <div className="flex items-center gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      Excluir Selecionadas
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {action === "transfer" && (
            <div className="space-y-2">
              <Label>Transferir para</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "department" && (
            <div className="space-y-2">
              <Label>Novo departamento</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "status" && (
            <div className="space-y-2">
              <Label>Novo status</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Execução">Em Execução</SelectItem>
                  <SelectItem value="Atrasada">Atrasada</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "change_year" && (
            <div className="space-y-2">
              <Label>Novo ano de término</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                O dia e mês de término serão mantidos, apenas o ano será alterado.
              </p>
            </div>
          )}

          {action === "delete" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação não pode ser desfeita. As tarefas selecionadas serão permanentemente excluídas.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!action || (action !== "delete" && !value)}
            variant={action === "delete" ? "destructive" : "default"}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}