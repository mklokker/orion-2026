import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, MoreVertical, Plus, CheckCircle2, ChevronLeft, ChevronRight, HardHat, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import CreateTasksModal from "../components/gestao/CreateTasksModal";
import CreateServiceModal from "../components/services/CreateServiceModal";
import AutoStatusUpdater from "../components/gestao/AutoStatusUpdater";
import TaskViewEditModal from "../components/tasks/TaskViewEditModal";
import ServiceViewEditModal from "../components/services/ServiceViewEditModal";
import BulkActionsModal from "../components/gestao/BulkActionsModal";
import { TaskInteraction } from "@/entities/TaskInteraction";
import { ServiceInteraction } from "@/entities/ServiceInteraction";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser, useUsers, useDepartments, useTasks, useServices } from "@/components/useData";

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

const ITEMS_PER_PAGE = 100;

const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, ""); // Mantém apenas letras, números e espaços
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

const getUserDisplayName = (email, users) => {
  const user = users?.find(u => u.email === email);
  return user?.display_name || user?.full_name || email;
};

// NOVA FUNÇÃO: Filtra protocolos duplicados por usuário
const filterUniqueProtocolsByUser = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    // Use protocol for tasks and service_name for services as the unique identifier within a user's context
    const protocolIdentifier = item.type === 'task' ? item.protocol : item.service_name;
    const key = `${item.assigned_to}_${protocolIdentifier}`;
    
    if (!grouped[key]) {
      grouped[key] = item;
    } else {
      // Compare by updated_date first, then created_date if updated_date is not available
      const existingDate = new Date(grouped[key].updated_date || grouped[key].created_date);
      const currentDate = new Date(item.updated_date || item.created_date);
      
      if (currentDate > existingDate) {
        grouped[key] = item;
      }
    }
  });
  
  return Object.values(grouped);
};

export default function GestaoTarefas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Using React Query Hooks
  const { data: currentUser } = useCurrentUser();
  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();
  
  const isAdmin = currentUser?.role === 'admin';
  
  const { data: tasksData = [], refetch: refetchTasks } = useTasks(isAdmin, currentUser?.email);
  const { data: servicesData = [], refetch: refetchServices } = useServices(isAdmin, currentUser?.email);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showServiceModalView, setShowServiceModalView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("ativas");
  
  // Novos filtros
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Process items using useMemo for efficiency
  const items = React.useMemo(() => {
    if (!tasksData || !servicesData) return [];
    
    const normalizedTasks = tasksData.map(t => ({...t, type: 'task', title: t.description || t.protocol}));
    const normalizedServices = servicesData.map(s => ({
      ...s, 
      type: 'service', 
      protocol: s.service_name,
      title: s.description || s.service_name,
      description: s.description || s.service_name
    }));
    
    const combinedItems = [...normalizedTasks, ...normalizedServices].sort((a, b) => {
      const dateA = new Date(b.created_date);
      const dateB = new Date(a.created_date);
      return dateA - dateB;
    });

    return filterUniqueProtocolsByUser(combinedItems);
  }, [tasksData, servicesData]);

  const loadData = () => {
    // Refetch data using react-query
    refetchTasks();
    refetchServices();
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['services'] });
  };

  const createTaskInteraction = async (taskId, type, message, metadata = {}) => {
    try {
      const user = currentUser || await User.me(); 
      if (!user) {
        console.warn("Cannot create task interaction: current user not available.");
        return;
      }

      await TaskInteraction.create({
        task_id: taskId,
        interaction_type: type,
        message,
        user_email: user.email,
        user_name: user.full_name,
        metadata
      });
    } catch (error) {
      console.error("Erro ao criar interação:", error);
    }
  };

  const handleCreateTasks = async (tasksToCreate, observations) => {
    try {
      const createdTasks = await Task.bulkCreate(tasksToCreate);
      
      for (const task of createdTasks) {
        await createTaskInteraction(
          task.id,
          "created",
          `Tarefa ${task.protocol} criada e atribuída a ${task.assigned_to}`,
          { observations }
        );
      }

      toast({
        title: "Sucesso!",
        description: `${tasksToCreate.length} tarefa(s) criada(s) com sucesso.`,
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar tarefas.",
        variant: "destructive"
      });
    }
  };

  const handleCreateServices = async (servicesToCreate) => {
    try {
      const createdServices = await Service.bulkCreate(servicesToCreate);

      for (const service of createdServices) {
        await ServiceInteraction.create({
          service_id: service.id,
          interaction_type: "created",
          message: `Serviço "${service.service_name}" criado e atribuído a ${service.assigned_to}`,
          user_email: currentUser?.email,
          user_name: currentUser?.full_name,
          metadata: { bulk_action: true }
        });
      }

      toast({
        title: "Sucesso!",
        description: `${servicesToCreate.length} serviço(s) criado(s) com sucesso.`,
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar serviços.",
        variant: "destructive"
      });
    }
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    if (item.type === 'task') {
        setShowTaskModal(true);
        setShowServiceModalView(false);
    } else {
        setShowServiceModalView(true);
        setShowTaskModal(false);
    }
  };

  const handleTaskUpdate = () => {
    loadData();
  };

  const handleCompleteItem = async (item) => {
    const api = item.type === 'task' ? Task : Service;
    const interactionEntity = item.type === 'task' ? TaskInteraction : ServiceInteraction;
    const interactionType = 'completed';
    const message = `${currentUser.full_name} finalizou ${item.type === 'task' ? 'a tarefa' : 'o serviço'}.`;
    const entityIdField = item.type === 'task' ? 'task_id' : 'service_id';

    try {
      await api.update(item.id, {
        status: "Concluída",
        completed_date: format(new Date(), "yyyy-MM-dd")
      });

      await interactionEntity.create({
        [entityIdField]: item.id,
        interaction_type: interactionType,
        message: message,
        user_email: currentUser.email,
        user_name: currentUser.full_name
      });

      toast({
        title: "Sucesso!",
        description: `${item.type === 'task' ? 'Tarefa' : 'Serviço'} finalizado com sucesso.`,
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: `Erro ao finalizar ${item.type === 'task' ? 'tarefa' : 'serviço'}.`,
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action, value) => {
    const itemIds = selectedTasks;
    const itemsToUpdate = items.filter(t => itemIds.includes(t.id));

    try {
      for (const item of itemsToUpdate) {
        const api = item.type === 'task' ? Task : Service;
        const interactionEntity = item.type === 'task' ? TaskInteraction : ServiceInteraction;
        const entityIdField = item.type === 'task' ? 'task_id' : 'service_id';

        if (action === "delete") {
          await api.delete(item.id);
          await interactionEntity.create({
            [entityIdField]: item.id,
            interaction_type: "deleted",
            message: `${item.type === 'task' ? 'Tarefa' : 'Serviço'} excluído(a) em ação em lote`,
            user_email: currentUser.email,
            user_name: currentUser.full_name,
            metadata: { bulk_action: true }
          });
        } else if (action === "transfer") {
          await api.update(item.id, {
            status: "Concluída",
            completed_date: format(new Date(), "yyyy-MM-dd")
          });

          await interactionEntity.create({
            [entityIdField]: item.id,
            interaction_type: "transferred_out",
            message: `${item.type === 'task' ? 'Tarefa' : 'Serviço'} original finalizado(a) e transferido(a) de ${getUserDisplayName(item.assigned_to, users)} para ${getUserDisplayName(value, users)}`,
            user_email: currentUser.email,
            user_name: currentUser.full_name,
            metadata: { bulk_action: true, old_assignee: item.assigned_to, new_assignee: value }
          });

          let newItemData = {
            end_date: item.end_date,
            priority: item.priority,
            assigned_to: value,
            department_id: item.department_id,
            status: "Pendente"
          };
          
          if(item.type === 'task') {
            newItemData = {
              ...newItemData,
              protocol: item.protocol,
              description: item.description,
              start_date: format(new Date(), "yyyy-MM-dd"),
            };
          } else {
            newItemData = {
              ...newItemData,
              service_name: item.service_name,
              description: item.description,
            };
          }

          const created = await api.create(newItemData);

          await interactionEntity.create({
            [entityIdField]: created.id,
            interaction_type: "created_by_transfer",
            message: `Novo(a) ${item.type === 'task' ? 'tarefa' : 'serviço'} "${created.protocol || created.service_name}" criado(a) por transferência de ${getUserDisplayName(item.assigned_to, users)} para ${getUserDisplayName(value, users)}`,
            user_email: currentUser.email,
            user_name: currentUser.full_name,
            metadata: { bulk_action: true, original_item_id: item.id }
          });
        } else if (action === "department") {
          const oldDept = departments.find(d => d.id === item.department_id);
          const newDepartment = departments.find(d => d.id === value);
          
          await api.update(item.id, { department_id: value });

          await interactionEntity.create({
            [entityIdField]: item.id,
            interaction_type: "department_changed",
            message: `Departamento do(a) ${item.type === 'task' ? 'tarefa' : 'serviço'} alterado de "${oldDept?.name || "-"}" para "${newDepartment?.name || "-"}"`,
            user_email: currentUser.email,
            user_name: currentUser.full_name,
            metadata: { bulk_action: true, old_department_id: item.department_id, new_department_id: value }
          });
        } else if (action === "status") {
          const completionDate = value === "Concluída" ? format(new Date(), "yyyy-MM-dd") : null;
          const updates = { status: value };
          if (completionDate) updates.completed_date = completionDate;

          await api.update(item.id, updates);

          await interactionEntity.create({
            [entityIdField]: item.id,
            interaction_type: "status_changed",
            message: `Status do(a) ${item.type === 'task' ? 'tarefa' : 'serviço'} alterado de "${item.status}" para "${value}"`,
            user_email: currentUser.email,
            user_name: currentUser.full_name,
            metadata: { bulk_action: true, old_status: item.status, new_status: value }
          });
        }
      }
      
      toast({
        title: "Sucesso!",
        description: `${itemIds.length} item(ns) ${action === "delete" ? "excluído(s)" : action === "transfer" ? "transferido(s)" : action === "department" ? "com departamento atualizado" : "com status atualizado"} com sucesso.`,
      });

      setSelectedTasks([]);
      setShowBulkActionsModal(false);
      loadData();
    } catch (error) {
      console.error("Erro ao executar ação em lote:", error);
      toast({
        title: "Erro",
        description: "Erro ao executar ação em lote.",
        variant: "destructive"
      });
    }
  };

  // NOVA LÓGICA: Detectar se há filtros ativos
  const hasActiveFilters = 
    searchQuery !== "" || 
    selectedDepartment !== "all" || 
    selectedPriority !== "all" || 
    startDate !== "" || 
    endDate !== "";

  // NOVA LÓGICA: Aplicar filtros (sem separar por tab ainda) para cálculo de stats
  const allFilteredItems = items.filter(item => {
    // 1. Filtro de Busca Inteligente
    let matchesSearch = true;
    if (searchQuery) {
      const normalizedSearch = normalizeText(searchQuery);
      const searchWithoutPunctuation = normalizedSearch.replace(/\s/g, ''); // Remove espaços para busca de protocolo colado
      
      const normalizedProtocol = normalizeText(item.protocol || "");
      const normalizedTitle = normalizeText(item.title || "");
      const normalizedDescription = normalizeText(item.description || "");
      const normalizedAssignedTo = normalizeText(item.assigned_to || "");
      const normalizedAssignedName = normalizeText(getUserDisplayName(item.assigned_to, users) || "");
      
      // Busca flexível: ignora pontuação no protocolo (ex: 123456 acha 123.456)
      const protocolMatch = normalizedProtocol.replace(/\s/g, '').includes(searchWithoutPunctuation);
      
      matchesSearch = 
        protocolMatch ||
        normalizedTitle.includes(normalizedSearch) ||
        normalizedDescription.includes(normalizedSearch) ||
        normalizedAssignedTo.includes(normalizedSearch) ||
        normalizedAssignedName.includes(normalizedSearch);
    }

    // 2. Filtro de Departamento
    let matchesDepartment = true;
    if (selectedDepartment !== "all") {
      matchesDepartment = item.department_id === selectedDepartment;
    }

    // 3. Filtro de Prioridade
    let matchesPriority = true;
    if (selectedPriority !== "all") {
      matchesPriority = item.priority === selectedPriority;
    }

    // 4. Filtro de Data (Início ou Término dentro do intervalo)
    let matchesDate = true;
    if (startDate || endDate) {
      const itemStartDate = item.created_date ? parseDateAsLocal(item.created_date) : null;
      const itemEndDate = item.end_date ? parseDateAsLocal(item.end_date) : null;
      const filterStart = startDate ? parseDateAsLocal(startDate) : null;
      const filterEnd = endDate ? parseDateAsLocal(endDate) : null;

      // Lógica: se qualquer parte da duração da tarefa sobrepor o intervalo OU se a data de criação estiver no intervalo
      // Simplificação: vamos filtrar pela data de criação OU data de término estar no intervalo
      
      const isAfterStart = !filterStart || (itemStartDate && itemStartDate >= filterStart) || (itemEndDate && itemEndDate >= filterStart);
      const isBeforeEnd = !filterEnd || (itemStartDate && itemStartDate <= filterEnd) || (itemEndDate && itemEndDate <= filterEnd);
      
      matchesDate = isAfterStart && isBeforeEnd;
    }

    return matchesSearch && matchesDepartment && matchesPriority && matchesDate;
  });

  // Separar por tab para exibição
  const filteredByTab = allFilteredItems.filter(item => {
    if (activeTab === 'ativas') return item.status !== 'Concluída';
    if (activeTab === 'concluidas') return item.status === 'Concluída';
    return true;
  });

  const filteredItems = filteredByTab; // Now filteredItems directly refers to filteredByTab, as allFilteredItems already applied the search filter.

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const toggleTaskSelection = (itemId) => {
    setSelectedTasks(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleAllTasks = () => {
    if (selectedTasks.length === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(paginatedItems.map(t => t.id));
    }
  };

  // NOVA LÓGICA: Stats baseados nos filtros (usar allFilteredItems ao invés de items)
  const stats = {
      ativas: allFilteredItems.filter(item => item.status !== "Concluída").length,
      concluidas: allFilteredItems.filter(item => item.status === "Concluída").length
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <AutoStatusUpdater />
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Gestão de Tarefas e Serviços
          </h1>

          <div className="flex gap-3">
            {isAdmin && selectedTasks.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowBulkActionsModal(true)}
                className="gap-2 bg-white"
              >
                Ações em Lote ({selectedTasks.length})
              </Button>
            )}
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowServiceModal(true)}
                  className="gap-2 bg-white"
                >
                  <Plus className="w-4 h-4" />
                  Novo Serviço
                </Button>
                <Button
                  onClick={() => setShowTasksModal(true)}
                  className="gap-2 bg-gray-900 hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Nova Tarefa
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-b">
          <button
            onClick={() => { setActiveTab("ativas"); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === "ativas"
                ? "border-primary text-primary"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Ativas
            <Badge className="ml-2 bg-gray-200 text-gray-800">
              {stats.ativas}
            </Badge>
          </button>
          <button
            onClick={() => { setActiveTab("concluidas"); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === "concluidas"
                ? "border-primary text-primary"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Concluídas
            <Badge className="ml-2 bg-gray-200 text-gray-800">
              {stats.concluidas}
            </Badge>
          </button>
        </div>

        <Card className="bg-white shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por protocolo, serviço, título, responsável (busca inteligente)..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                }}
                className="pl-12 h-12 text-base bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Departamento</Label>
              <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Departamentos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Prioridade</Label>
              <Select value={selectedPriority} onValueChange={(v) => { setSelectedPriority(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Prioridades</SelectItem>
                  <SelectItem value="P1">P1 - Crítica</SelectItem>
                  <SelectItem value="P2">P2 - Alta</SelectItem>
                  <SelectItem value="P3">P3 - Média</SelectItem>
                  <SelectItem value="P4">P4 - Baixa</SelectItem>
                  <SelectItem value="P5">P5 - Mínima</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Data Inicial</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Data Final</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
        </Card>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12 px-4">
                  <div
                    onClick={paginatedItems.length > 0 ? toggleAllTasks : undefined}
                    className={`cursor-pointer text-xl select-none flex items-center justify-center ${paginatedItems.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                    role="checkbox"
                    aria-checked={selectedTasks.length > 0 && selectedTasks.length === paginatedItems.length}
                    aria-label="Selecionar todos os itens na página"
                  >
                    {selectedTasks.length > 0 && selectedTasks.length === paginatedItems.length ? '✅' : '☐'}
                  </div>
                </TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Protocolo/Serviço</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Atribuído a</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="w-12">Ver</TableHead>
                <TableHead className="w-12">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => {
                  const department = departments.find(d => d.id === item.department_id);
                  const isMyItem = item.assigned_to === currentUser?.email;
                  const canComplete = (isMyItem || isAdmin) && item.status !== "Concluída";

                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="px-4">
                        <div
                          onClick={() => toggleTaskSelection(item.id)}
                          className="cursor-pointer text-xl select-none flex items-center justify-center"
                          role="checkbox"
                          aria-checked={selectedTasks.includes(item.id)}
                          aria-label={`Selecionar item ${item.protocol}`}
                        >
                          {selectedTasks.includes(item.id) ? '✅' : '☐'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
                            {item.type === 'task' ? <FileText className="w-3 h-3" /> : <HardHat className="w-3 h-3" />}
                            {item.type === 'task' ? 'Tarefa' : 'Serviço'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{item.protocol}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>
                        <Badge className={`${priorityColors[item.priority]} border-0 font-semibold`}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">{getUserDisplayName(item.assigned_to, users)}</TableCell>
                      <TableCell>
                        {item.created_date ? format(parseDateAsLocal(item.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.end_date ? format(parseDateAsLocal(item.end_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[item.status]} border-0`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{department?.name || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewItem(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewItem(item)}>
                              Ver detalhes
                            </DropdownMenuItem>
                            {canComplete && (
                              <DropdownMenuItem
                                onClick={() => handleCompleteItem(item)}
                                className="text-green-600"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Finalizar {item.type === 'task' ? 'Tarefa' : 'Serviço'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages} ({filteredItems.length} itens)
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <CreateTasksModal
        open={showTasksModal}
        onClose={() => setShowTasksModal(false)}
        users={users}
        departments={departments}
        onCreateTasks={handleCreateTasks}
      />

      <CreateServiceModal
        open={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        users={users}
        departments={departments}
        onCreateServices={handleCreateServices}
      />

      {selectedItem?.type === 'task' && (
        <TaskViewEditModal
          open={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedItem(null);
          }}
          task={selectedItem}
          currentUser={currentUser}
          users={users}
          departments={departments}
          onUpdate={handleTaskUpdate}
        />
      )}

      {selectedItem?.type === 'service' && (
        <ServiceViewEditModal
          open={showServiceModalView}
          onClose={() => {
            setShowServiceModalView(false);
            setSelectedItem(null);
          }}
          service={selectedItem}
          currentUser={currentUser}
          users={users}
          departments={departments}
          onUpdate={handleTaskUpdate}
        />
      )}

      <BulkActionsModal
        open={showBulkActionsModal}
        onClose={() => setShowBulkActionsModal(false)}
        selectedCount={selectedTasks.length}
        users={users}
        departments={departments}
        onAction={handleBulkAction}
        isAdmin={isAdmin}
      />
    </div>
  );
}