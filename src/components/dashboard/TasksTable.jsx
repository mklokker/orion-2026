import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

const statusConfig = {
  "Pendente": { color: "bg-gray-100 text-gray-800 border-gray-200", icon: Clock },
  "Em Execução": { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  "Atrasada": { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  "Concluída": { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 }
};

const priorityColors = {
  "P1": "bg-red-500 text-white",
  "P2": "bg-orange-500 text-white",
  "P3": "bg-yellow-500 text-white",
  "P4": "bg-blue-500 text-white",
  "P5": "bg-green-500 text-white"
};

export default function TasksTable({ tasks, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-dashed">
        <XCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500 font-medium">Nenhuma tarefa encontrada</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
            <TableHead className="font-semibold text-gray-700">Protocolo</TableHead>
            <TableHead className="font-semibold text-gray-700">Descrição</TableHead>
            <TableHead className="font-semibold text-gray-700">Responsável</TableHead>
            <TableHead className="font-semibold text-gray-700">Data Término</TableHead>
            <TableHead className="font-semibold text-gray-700">Prioridade</TableHead>
            <TableHead className="font-semibold text-gray-700">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const StatusIcon = statusConfig[task.status]?.icon || Clock;
            return (
              <TableRow key={task.id} className="hover:bg-blue-50/50 transition-colors">
                <TableCell className="font-mono font-semibold text-blue-700">
                  {task.protocol}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {task.description || "-"}
                </TableCell>
                <TableCell className="text-gray-600">
                  {task.assigned_to}
                </TableCell>
                <TableCell>
                  {format(new Date(task.end_date), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge className={`${priorityColors[task.priority]} border-0 font-semibold`}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary"
                    className={`${statusConfig[task.status]?.color} border flex items-center gap-1 w-fit`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {task.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}