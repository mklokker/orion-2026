import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, FileText, HardHat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const priorityColors = {
  "P1": "bg-red-500 text-white",
  "P2": "bg-orange-500 text-white",
  "P3": "bg-yellow-600 text-white",
  "P4": "bg-blue-500 text-white",
  "P5": "bg-green-500 text-white"
};

const statusColors = {
  "Pendente": "bg-gray-200 text-gray-800",
  "Em Execução": "bg-blue-200 text-blue-800",
  "Atrasada": "bg-red-200 text-red-800",
  "Concluída": "bg-green-200 text-green-800"
};

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

export default function MobileTaskCard({ 
  item, 
  department, 
  assignedName, 
  onView, 
  onComplete, 
  canComplete,
  isSelected,
  onToggleSelect
}) {
  return (
    <div 
      className={`bg-white rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}
      onClick={onToggleSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Badge variant="outline" className="flex items-center gap-1 shrink-0 text-xs px-1.5 py-0.5">
            {item.type === 'task' ? <FileText className="w-3 h-3" /> : <HardHat className="w-3 h-3" />}
            {item.type === 'task' ? 'Tarefa' : 'Serviço'}
          </Badge>
          <span className="font-semibold text-sm truncate">{item.protocol}</span>
        </div>
        <Badge className={`${priorityColors[item.priority]} border-0 text-xs shrink-0`}>
          {item.priority}
        </Badge>
      </div>

      {item.title && (
        <p className="text-sm text-gray-700 line-clamp-1">{item.title}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="truncate max-w-[50%]">{assignedName}</span>
        <span>
          {item.end_date ? format(parseDateAsLocal(item.end_date), "dd/MM/yy", { locale: ptBR }) : '-'}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Badge className={`${statusColors[item.status]} border-0 text-xs`}>
            {item.status}
          </Badge>
          {department && (
            <span className="text-xs text-gray-400 truncate max-w-[80px]">{department.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canComplete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-green-600"
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => { e.stopPropagation(); onView(); }}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}