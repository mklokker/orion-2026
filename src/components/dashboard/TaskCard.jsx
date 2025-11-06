
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Clock, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  // Se for uma string ISO completa, o construtor Date já lida corretamente
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  // Se for 'YYYY-MM-DD', parse manualmente para evitar problemas de fuso horário
  const parts = dateString.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null; // Retorna nulo se o formato for inválido
};

export default function TaskCard({ task, departments, users, onTaskClick }) {
  const department = departments.find(d => d.id === task.department_id);
  const assignedUser = users.find(u => u.email === task.assigned_to);
  const assignedUserName = assignedUser?.display_name || assignedUser?.full_name || task.assigned_to;

  const formattedEndDate = task.end_date ? format(parseDateAsLocal(task.end_date), "dd/MM/yyyy", { locale: ptBR }) : '-';
  const formattedStartDate = task.created_date ? format(parseDateAsLocal(task.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-';

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 cursor-pointer"
      onClick={() => onTaskClick(task)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header com protocolo e prioridade */}
        <div className="flex items-start justify-between">
          <h3 className="text-2xl font-bold text-gray-900">{task.protocol}</h3>
          <div className="flex items-center gap-2">
            <Badge className={`${priorityColors[task.priority]} border-0 font-semibold px-2 py-1`}>
              {task.priority}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTaskClick(task)}>Ver detalhes</DropdownMenuItem>
                {/* Outras ações podem ser adicionadas aqui */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data e Responsável */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formattedEndDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{assignedUserName}</span>
          </div>
        </div>

        {/* Protocolo repetido menor */}
        <p className="text-sm text-gray-500 font-medium">{task.protocol}</p>

        {/* Descrição da tarefa */}
        {task.description && (
          <p className="text-sm text-gray-700 line-clamp-2">
            Tarefa {task.description}
          </p>
        )}

        {/* Departamento */}
        {department && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              DEPARTAMENTO: <span className="font-semibold text-gray-700">{department.name}</span>
            </p>
          </div>
        )}

        {/* Status e Data de início */}
        <div className="flex items-center justify-between pt-2">
          <Badge className={`${statusColors[task.status]} border-0 text-xs px-3 py-1`}>
            {task.status}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Início: {formattedStartDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
