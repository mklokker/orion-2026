import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  User,
  Eye,
  Edit,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PlanoAcaoCard({ plano, items, progress, users, categories, onView, onEdit }) {
  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email || "Não definido";
  };

  const getStatusConfig = () => {
    const isOverdue = new Date(plano.due_date) < new Date() && plano.status !== "concluido";
    
    if (plano.status === "concluido") {
      return { label: "Concluído", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    }
    if (isOverdue) {
      return { label: "Atrasado", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    }
    if (plano.status === "cancelado") {
      return { label: "Cancelado", color: "bg-gray-100 text-gray-800", icon: Clock };
    }
    return { label: "Em Andamento", color: "bg-blue-100 text-blue-800", icon: Clock };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const completedItems = items.filter(i => i.status === "realizada").length;
  const overdueItems = items.filter(i => i.status !== "realizada" && new Date(i.due_date) < new Date()).length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Left Section */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Target className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{plano.title}</h3>
                <p className="text-sm text-indigo-600 mt-1">
                  <span className="font-medium">Objetivo:</span> {plano.objective}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge variant="outline">
                {plano.type === "estrategico" ? "Estratégico" : "Operacional"}
              </Badge>
              {plano.category && (
                <Badge variant="secondary">{plano.category}</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{getUserName(plano.responsible)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {plano.start_date && format(new Date(plano.start_date), "dd/MM/yyyy", { locale: ptBR })}
                  {" → "}
                  {plano.due_date && format(new Date(plano.due_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex flex-col items-end gap-3 min-w-[200px]">
            <div className="w-full">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Progresso</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{completedItems}/{items.length} ações</span>
                {overdueItems > 0 && (
                  <span className="text-red-500">{overdueItems} atrasada(s)</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onView}>
                <Eye className="w-4 h-4 mr-1" />
                Ver
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}