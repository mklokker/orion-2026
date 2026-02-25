import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  History,
  User,
  Calendar,
  FileText,
  Users as UsersIcon,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export default function AuditLogModal({ open, onClose, users }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const logsData = await base44.entities.AtasAlinhamentosLog.list("-created_date");
      setLogs(logsData || []);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (email) => {
    const user = users.find((u) => u.email === email);
    return user?.display_name || user?.full_name || email;
  };

  const getActionConfig = (action) => {
    const config = {
      create: { label: "Criação", color: "bg-green-100 text-green-800", icon: Plus },
      update: { label: "Edição", color: "bg-blue-100 text-blue-800", icon: Edit },
      delete: { label: "Exclusão", color: "bg-red-100 text-red-800", icon: Trash2 },
      restore: { label: "Restauração", color: "bg-purple-100 text-purple-800", icon: RotateCcw },
    };
    return config[action] || { label: action, color: "bg-gray-100 text-gray-800", icon: History };
  };

  const getEntityIcon = (entityType) => {
    return entityType === "alinhamento" ? UsersIcon : FileText;
  };

  const normalizeText = (text) => {
    return (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      normalizeText(log.entity_title).includes(normalizeText(searchQuery)) ||
      normalizeText(log.user_name).includes(normalizeText(searchQuery)) ||
      normalizeText(log.user_email).includes(normalizeText(searchQuery));
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Log de Auditoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por título, usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Edição</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
                <SelectItem value="restore">Restauração</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="alinhamento">Alinhamento</SelectItem>
                <SelectItem value="ata">Ata</SelectItem>
                <SelectItem value="topico">Tópico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Logs */}
          <ScrollArea className="h-[500px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log) => {
                  const actionConfig = getActionConfig(log.action);
                  const ActionIcon = actionConfig.icon;
                  const EntityIcon = getEntityIcon(log.entity_type);

                  return (
                    <div key={log.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${actionConfig.color}`}>
                          <ActionIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={actionConfig.color}>{actionConfig.label}</Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <EntityIcon className="w-3 h-3" />
                              {log.entity_type === "alinhamento"
                                ? "Alinhamento"
                                : log.entity_type === "ata"
                                ? "Ata"
                                : "Tópico"}
                            </Badge>
                          </div>
                          <p className="font-medium text-gray-900">
                            {log.entity_title || "Sem título"}
                          </p>
                          {log.details && (
                            <p className="text-sm text-gray-600">{log.details}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user_name || getUserName(log.user_email)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {log.created_date
                                ? formatInTimeZone(
                                    new Date(log.created_date.endsWith('Z') ? log.created_date : log.created_date + 'Z'), 
                                    "America/Sao_Paulo", 
                                    "dd/MM/yyyy 'às' HH:mm:ss", 
                                    { locale: ptBR }
                                  )
                                : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}