import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Circle,
  User,
  Calendar as CalendarIcon,
  Target,
  Filter,
  X,
  Search,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";

const PlanoAcaoItem = base44.entities.PlanoAcaoItem;

const STATUS_COLUMNS = [
  { id: "pendente", title: "Pendente", color: "bg-gray-100", icon: Circle, iconColor: "text-gray-500" },
  { id: "em_andamento", title: "Em Andamento", color: "bg-blue-100", icon: Clock, iconColor: "text-blue-600" },
  { id: "realizada", title: "Realizada", color: "bg-green-100", icon: CheckCircle2, iconColor: "text-green-600" },
  { id: "atrasada", title: "Atrasada", color: "bg-red-100", icon: AlertTriangle, iconColor: "text-red-600" },
];

export default function PlanoAcaoKanban({ items, planos, users, onUpdate }) {
  const [localItems, setLocalItems] = useState(items);
  const [planoFilter, setPlanoFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearch, setUserSearch] = useState("");

  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const normalizeText = (text) => {
    return (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email || "Não definido";
  };

  const getPlanoTitle = (planoId) => {
    const plano = planos.find(p => p.id === planoId);
    return plano?.title || "Sem plano";
  };

  const filteredItems = useMemo(() => {
    return localItems.filter(item => {
      const matchesPlano = planoFilter === "all" || item.plano_id === planoFilter;
      const matchesResponsible = responsibleFilter === "all" || item.who === responsibleFilter;
      const matchesDueDate = !dueDateFilter || (item.due_date && new Date(item.due_date).toDateString() === dueDateFilter.toDateString());
      const matchesSearch = !searchQuery || normalizeText(item.what).includes(normalizeText(searchQuery));

      return matchesPlano && matchesResponsible && matchesDueDate && matchesSearch;
    });
  }, [localItems, planoFilter, responsibleFilter, dueDateFilter, searchQuery]);

  const getItemsByStatus = (status) => {
    return filteredItems.filter(item => item.status === status);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const itemId = draggableId;

    // Atualizar localmente primeiro para feedback imediato
    setLocalItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    ));

    try {
      await PlanoAcaoItem.update(itemId, { status: newStatus });
      toast({
        title: "Status atualizado",
        description: `Ação movida para "${STATUS_COLUMNS.find(c => c.id === newStatus)?.title}"`,
      });
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      // Reverter em caso de erro
      setLocalItems(items);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setPlanoFilter("all");
    setResponsibleFilter("all");
    setDueDateFilter(null);
    setSearchQuery("");
  };

  const hasActiveFilters = planoFilter !== "all" || responsibleFilter !== "all" || dueDateFilter || searchQuery;

  // Usuários únicos dos itens
  const uniqueResponsibles = useMemo(() => {
    const emails = [...new Set(localItems.map(item => item.who).filter(Boolean))];
    return emails.map(email => ({
      email,
      name: getUserName(email)
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [localItems, users]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return uniqueResponsibles;
    return uniqueResponsibles.filter(u => 
      normalizeText(u.name).includes(normalizeText(userSearch)) ||
      normalizeText(u.email).includes(normalizeText(userSearch))
    );
  }, [uniqueResponsibles, userSearch]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar ação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={planoFilter} onValueChange={setPlanoFilter}>
              <SelectTrigger className="w-full lg:w-64">
                <Target className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Filtrar por Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                {planos.map(plano => (
                  <SelectItem key={plano.id} value={plano.id}>{plano.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full lg:w-64 justify-start">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  {responsibleFilter === "all" ? "Filtrar por Responsável" : getUserName(responsibleFilter)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      <Button
                        variant={responsibleFilter === "all" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => { setResponsibleFilter("all"); setUserSearch(""); }}
                      >
                        Todos os Responsáveis
                      </Button>
                      {filteredUsers.map(user => (
                        <Button
                          key={user.email}
                          variant={responsibleFilter === user.email ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => { setResponsibleFilter(user.email); setUserSearch(""); }}
                        >
                          {user.name}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full lg:w-48 justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                  {dueDateFilter ? format(dueDateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Data de Vencimento"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDateFilter}
                  onSelect={setDueDateFilter}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(column => {
            const columnItems = getItemsByStatus(column.id);
            const Icon = column.icon;

            return (
              <div key={column.id} className="flex flex-col">
                <div className={`${column.color} rounded-t-lg px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${column.iconColor}`} />
                    <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-white/70">
                    {columnItems.length}
                  </Badge>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[400px] p-2 rounded-b-lg border-2 border-t-0 transition-colors ${
                        snapshot.isDraggingOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2 pr-2">
                          {columnItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`shadow-sm hover:shadow-md transition-shadow ${
                                    snapshot.isDragging ? "shadow-lg rotate-2" : ""
                                  }`}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-2">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-2">
                                        <p className="font-medium text-sm text-gray-900 line-clamp-2">
                                          {item.what}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-1">
                                          <Badge variant="outline" className="text-xs truncate max-w-full">
                                            <Target className="w-3 h-3 mr-1" />
                                            {getPlanoTitle(item.plano_id)}
                                          </Badge>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                          <div className="flex items-center gap-1 truncate">
                                            <User className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{getUserName(item.who)}</span>
                                          </div>
                                          {item.due_date && (
                                            <div className={`flex items-center gap-1 ${
                                              new Date(item.due_date) < new Date() && item.status !== "realizada"
                                                ? "text-red-600 font-medium"
                                                : ""
                                            }`}>
                                              <CalendarIcon className="w-3 h-3" />
                                              {format(new Date(item.due_date), "dd/MM", { locale: ptBR })}
                                            </div>
                                          )}
                                        </div>

                                        {item.level && (
                                          <Badge 
                                            variant="secondary" 
                                            className={`text-xs ${
                                              item.level === "determinar" 
                                                ? "bg-purple-100 text-purple-700" 
                                                : "bg-blue-100 text-blue-700"
                                            }`}
                                          >
                                            {item.level === "determinar" ? "Determinar" : "Recomendar"}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}