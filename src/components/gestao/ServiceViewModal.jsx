import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, User as UserIcon, Building2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const priorityColors = {
  "P1": "bg-red-500 text-white",
  "P2": "bg-orange-500 text-white",
  "P3": "bg-yellow-500 text-white",
  "P4": "bg-blue-500 text-white",
  "P5": "bg-green-500 text-white"
};

const statusColors = {
  "Pendente": "bg-gray-500 text-white",
  "Em Execução": "bg-blue-500 text-white",
  "Atrasada": "bg-red-500 text-white",
  "Concluída": "bg-green-500 text-white"
};

// Helper para converter 'YYYY-MM-DD' ou ISO string para um objeto Date local
const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  const parts = dateString.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
};


export default function ServiceViewModal({ open, onClose, service, users, departments }) {
  if (!service) return null;

  const department = departments?.find(d => d.id === service.department_id);
  const assignedUser = users?.find(u => u.email === service.assigned_to);
  const assignedUserName = assignedUser?.display_name || assignedUser?.full_name || service.assigned_to;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Detalhes do Serviço
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-gray-500">Serviço</p>
              <p className="text-2xl font-bold text-gray-900">{service.service_name}</p>
            </div>
            <div className="space-y-2 text-right">
              <p className="text-sm font-medium text-gray-500">Prioridade</p>
              <Badge className={`${priorityColors[service.priority]} border-0 font-semibold text-lg px-4 py-2`}>
                {service.priority}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Detalhes</p>
            <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
              {service.details || "Sem detalhes"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Atribuído a
              </p>
              <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{assignedUserName}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Departamento
              </p>
              <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{department?.name || "-"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Data de Início
              </p>
              <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
                {service.created_date ? format(parseDateAsLocal(service.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Data de Término
              </p>
              <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
                {service.end_date ? format(parseDateAsLocal(service.end_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Status</p>
            <Badge className={`${statusColors[service.status]} border-0 text-base px-4 py-2`}>
              {service.status}
            </Badge>
          </div>

          {service.completed_date && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Data de Conclusão
              </p>
              <p className="text-gray-700 p-3 bg-green-50 rounded-lg">
                {format(parseDateAsLocal(service.completed_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}