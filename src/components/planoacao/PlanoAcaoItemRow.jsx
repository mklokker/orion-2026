import React from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PlanoAcaoItem = base44.entities.PlanoAcaoItem;

export default function PlanoAcaoItemRow({ item, users, onEdit, onDelete, onUpdate }) {
  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email || "-";
  };

  const getStatusConfig = (status) => {
    const isOverdue = item.status !== "realizada" && new Date(item.due_date) < new Date();
    
    if (status === "realizada") {
      return { label: "Realizada", color: "bg-green-500 text-white" };
    }
    if (isOverdue || status === "atrasada") {
      return { label: "Atraso", color: "bg-red-500 text-white" };
    }
    if (status === "em_andamento") {
      return { label: "Em Andamento", color: "bg-blue-500 text-white" };
    }
    return { label: "Pendente", color: "bg-gray-200 text-gray-700" };
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await PlanoAcaoItem.update(item.id, { status: newStatus });
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const statusConfig = getStatusConfig(item.status);

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-3 py-2 max-w-[150px]">
        <span className="line-clamp-2">{item.what}</span>
      </td>
      <td className="px-3 py-2 max-w-[150px]">
        <span className="line-clamp-2 text-gray-600">{item.how || "-"}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-gray-600">{item.where || "-"}</span>
      </td>
      <td className="px-3 py-2 font-medium">
        {getUserName(item.who)}
      </td>
      <td className="px-3 py-2 text-gray-600">
        {item.delegate ? getUserName(item.delegate) : "-"}
      </td>
      <td className="px-3 py-2">
        <span className="capitalize">{item.level === "determinar" ? "Determinar" : "Recomendar"}</span>
      </td>
      <td className="px-3 py-2">
        {item.due_date && format(new Date(item.due_date), "dd/MM/yyyy", { locale: ptBR })}
      </td>
      <td className="px-3 py-2 text-gray-600">
        {item.materials || "-"}
      </td>
      <td className="px-3 py-2">
        <Select value={item.status} onValueChange={handleStatusChange}>
          <SelectTrigger className={`h-8 text-xs ${statusConfig.color} border-0`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="realizada">Realizada</SelectItem>
            <SelectItem value="atrasada">Atrasada</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-center">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Edit className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}