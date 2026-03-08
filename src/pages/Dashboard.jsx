import React, { useState, useEffect, useCallback } from "react";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { Department } from "@/entities/Department";
import { User } from "@/entities/User";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, FileText, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser, useUsers, useDepartments, useTasks, useServices } from "@/components/useData";
import TaskCard from "../components/dashboard/TaskCard";
import TaskViewEditModal from "../components/tasks/TaskViewEditModal";
import ServiceViewEditModal from "../components/services/ServiceViewEditModal";
import { startOfMonth, endOfMonth, isWithinInterval, isSameDay, subDays, startOfDay, endOfDay } from "date-fns";
import { parseDateAsLocal, getTodayBR, isSameDayBR } from "@/components/utils/dateUtils";

const ITEMS_PER_PAGE = 100;

const normalizeString = (str) => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Função auxiliar para gerar um nome amigável a partir do email
const generateDisplayNameFromEmail = (email) => {
  if (!email) return "Usuário";
  const namePart = email.split('@')[0];
  // Substitui underscores e pontos por espaços e capitaliza
  return namePart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// NOVA FUNÇÃO: Filtra itens duplicados mantendo apenas o mais recente por protocolo/usuário
const filterUniqueProtocolsByUser = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    // Ensure both assigned_to and protocol exist for a valid key
    if (!item.assigned_to || !item.protocol) {
      // If either is missing, we can't group by this criteria, so just include it
      // or handle as an edge case, for now, we'll assign a unique key to prevent collisions
      grouped[Symbol(item.id || Math.random())] = item; 
      return;
    }
    
    const key = `${item.assigned_to}_${item.protocol}`;
    
    if (!grouped[key]) {
      grouped[key] = item;
    } else {
      // Mantém o item mais recente (maior created_date ou updated_date)
      // Prioriza updated_date se existir, senão created_date
      const existingDateStr = grouped[key].updated_date || grouped[key].created_date;
      const currentDateStr = item.updated_date || item.created_date;

      const existingDate = existingDateStr ? new Date(existingDateStr) : new Date(0); // Epoch start for comparison
      const currentDate = currentDateStr ? new Date(currentDateStr) : new Date(0);
      
      if (currentDate > existingDate) {
        grouped[key] = item;
      }
    }
  });
  
  return Object.values(grouped);
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Hooks
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();
  
  const isAdmin = currentUser?.role === 'admin';

  // Always fetch all for dashboard to allow filtering by other users if needed, or stick to standard logic
  // Actually dashboard loads everything usually to calculate global stats or stats for filters
  // Let's use the hooks but maybe we need 'all' if we are admin or user wants to see other stuff?
  // Original logic: Fetch all tasks/services always (it used Task.list() without params in previous code, well sort of)
  // The hook useTasks uses Task.list() if admin, else filter.
  // For Dashboard, let's assume we follow the same permission logic as GestaoTarefas
  const { data: tasksData = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useTasks(true, currentUser?.email); 
  // Passing true to useTasks forces it to behave as "admin" (fetch all) which seems to be what Dashboard did (Task.list())
  const { data: servicesData = [], isLoading: isLoadingServices, refetch: refetchServices } = useServices(true, currentUser?.email);

  const isLoading = isLoadingUser || isLoadingTasks || isLoadingServices;

  const [activeTab, setActiveTab] = useState("ativas");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOldestFirst, setSortOldestFirst] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userFilter, setUserFilter] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showOnlyMyItems, setShowOnlyMyItems] = useState(false);

  const items = React.useMemo(() => {
    if (!tasksData || !servicesData) return [];
    
    const normalizedTasks = tasksData.map(t => ({...t, type: 'task'}));
    const normalizedServices = servicesData.map(s => ({
      ...s, 
      type: 'service', 
      protocol: s.service_name,
      description: s.description
    }));
    const combinedItems = [...normalizedTasks, ...normalizedServices];
    return filterUniqueProtocolsByUser(combinedItems);
  }, [tasksData, servicesData]);

  const loadData = useCallback(() => {
    refetchTasks();
    refetchServices();
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['services'] });
  }, [refetchTasks, refetchServices, queryClient]);

  // Pull to refresh handler para mobile
  const handlePullRefresh = useCallback(async () => {
    await Promise.all([refetchTasks(), refetchServices()]);
  }, [refetchTasks, refetchServices]);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    if (item.type === 'task') {
      setShowTaskModal(true);
      setShowServiceModal(false);
    } else {
      setShowServiceModal(true);
      setShowTaskModal(false);
    }
  };

  const handleItemUpdate = () => {
    loadData();
  };

  const itemsForCurrentUser = showOnlyMyItems
      ? items.filter(item => item.assigned_to === currentUser?.email)
      : items;

  const filteredItems = itemsForCurrentUser.filter(item => {
    const effectiveDateStr = (item.status === 'Concluída' && item.completed_date)
        ? item.completed_date
        : item.end_date;

    const effectiveDate = parseDateAsLocal(effectiveDateStr);
    if (!effectiveDate) return false;

    let dateMatch = true;
    if (filterPeriod === 'hoje') {
      dateMatch = isSameDayBR(effectiveDate, getTodayBR());
    } else if (filterPeriod === 'ontem') {
      const yesterday = new Date(getTodayBR());
      yesterday.setDate(yesterday.getDate() - 1);
      dateMatch = isSameDayBR(effectiveDate, yesterday);
    } else if (filterPeriod === 'personalizado' && customStartDate && customEndDate) {
      const start = startOfDay(parseDateAsLocal(customStartDate));
      const end = endOfDay(parseDateAsLocal(customEndDate));
      dateMatch = isWithinInterval(effectiveDate, { start, end });
    }
    
    const statusMatch = activeTab === "ativas" 
      ? item.status !== "Concluída" 
      : item.status === "Concluída";
    
    const normalizedSearch = normalizeString(searchQuery);
    const searchWithoutPunctuation = normalizedSearch.replace(/[.-]/g, "");
    
    const assignedUser = users?.find(u => u.email === item.assigned_to);
    const assignedUserName = assignedUser?.display_name || assignedUser?.full_name || item.assigned_to;
    
    const searchMatch = !searchQuery || 
      (item.protocol && item.protocol.replace(/[.-]/g, '').includes(searchWithoutPunctuation)) ||
      (item.description && normalizeString(item.description).includes(normalizedSearch)) ||
      (item.assigned_to && normalizeString(item.assigned_to).includes(normalizedSearch)) ||
      (assignedUserName && normalizeString(assignedUserName).includes(normalizedSearch));

    const userFilterMatch = userFilter === 'all' || item.assigned_to === userFilter;
    const priorityMatch = selectedPriority === 'all' || item.priority === selectedPriority;
      
    return dateMatch && statusMatch && searchMatch && userFilterMatch && priorityMatch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const dateA = parseDateAsLocal(a.end_date);
    const dateB = parseDateAsLocal(b.end_date);
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return sortOldestFirst ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // NOVA LÓGICA: Detectar se há filtros ativos
  const hasActiveFilters = 
    searchQuery !== "" ||
    userFilter !== "all" ||
    selectedPriority !== "all" ||
    filterPeriod !== "all" ||
    customStartDate !== "" ||
    customEndDate !== "" ||
    showOnlyMyItems;

  // NOVA LÓGICA: Stats baseados nos filtros
  let statsBaseItems;
  
  if (hasActiveFilters) {
    // Se há filtros ativos, usar itemsForCurrentUser antes da filtragem por tab
    // (precisa incluir tanto ativas quanto concluídas para contagem correta)
    statsBaseItems = itemsForCurrentUser.filter(item => {
      const effectiveDateStr = (item.status === 'Concluída' && item.completed_date)
          ? item.completed_date
          : item.end_date;

      const effectiveDate = parseDateAsLocal(effectiveDateStr);
      if (!effectiveDate) return false;

      let dateMatch = true;
      if (filterPeriod === 'hoje') {
        dateMatch = isSameDayBR(effectiveDate, getTodayBR());
      } else if (filterPeriod === 'ontem') {
        const yesterday = new Date(getTodayBR());
        yesterday.setDate(yesterday.getDate() - 1);
        dateMatch = isSameDayBR(effectiveDate, yesterday);
      } else if (filterPeriod === 'personalizado' && customStartDate && customEndDate) {
        const start = startOfDay(parseDateAsLocal(customStartDate));
        const end = endOfDay(parseDateAsLocal(customEndDate));
        dateMatch = isWithinInterval(effectiveDate, { start, end });
      }
      
      const normalizedSearch = normalizeString(searchQuery);
      const searchWithoutPunctuation = normalizedSearch.replace(/[.-]/g, "");
      
      const assignedUser = users?.find(u => u.email === item.assigned_to);
      const assignedUserName = assignedUser?.display_name || assignedUser?.full_name || item.assigned_to;
      
      const searchMatch = !searchQuery || 
        (item.protocol && item.protocol.replace(/[.-]/g, '').includes(searchWithoutPunctuation)) ||
        (item.description && normalizeString(item.description).includes(normalizedSearch)) ||
        (item.assigned_to && normalizeString(item.assigned_to).includes(normalizedSearch)) ||
        (assignedUserName && normalizeString(assignedUserName).includes(normalizedSearch));

      const userFilterMatch = userFilter === 'all' || item.assigned_to === userFilter;
      const priorityMatch = selectedPriority === 'all' || item.priority === selectedPriority;
        
      return dateMatch && searchMatch && userFilterMatch && priorityMatch;
    });
  } else {
    // Sem filtros: usar lógica do mês vigente (comportamento original)
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    statsBaseItems = items.filter(item => {
      const itemEndDate = parseDateAsLocal(item.end_date);
      const itemCompletedDate = parseDateAsLocal(item.completed_date);
      
      const isCurrentMonth = itemEndDate && isWithinInterval(itemEndDate, { start: currentMonthStart, end: currentMonthEnd });
      const isCompletedThisMonth = itemCompletedDate && isWithinInterval(itemCompletedDate, { start: currentMonthStart, end: currentMonthEnd });
      
      const isActive = item.status !== "Concluída";

      return isCompletedThisMonth || (isActive && isCurrentMonth) || (isActive && !itemEndDate); 
    });
  }

  const stats = {
    total: statsBaseItems.length,
    ativas: statsBaseItems.filter(t => t.status !== "Concluída").length,
    concluidas: statsBaseItems.filter(t => t.status === "Concluída").length,
    atrasadas: statsBaseItems.filter(t => t.status === "Atrasada").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen">
    <div className="p-3 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground">
            Painel Principal
          </h1>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sort-order"
                checked={!sortOldestFirst}
                onCheckedChange={(checked) => setSortOldestFirst(!checked)}
              />
              <Label htmlFor="sort-order" className="text-sm cursor-pointer flex items-center gap-1 text-muted-foreground">
                <ArrowUpDown className="w-4 h-4" />
                Mais novas primeiro
              </Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-0 shadow-md bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2 text-primary-foreground">
                <FileText className="w-4 h-4" />
                Total {hasActiveFilters ? "(filtrado)" : "(mês)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-secondary text-secondary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2 text-secondary-foreground">
                <Clock className="w-4 h-4" />
                Ativas {hasActiveFilters ? "(filtrado)" : "(mês)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.ativas}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2 text-green-50">
                <CheckCircle2 className="w-4 h-4" />
                Concluídas {hasActiveFilters ? "(filtrado)" : "(mês)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.concluidas}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-destructive text-destructive-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2 text-destructive-foreground">
                <AlertCircle className="w-4 h-4" />
                Atrasadas {hasActiveFilters ? "(filtrado)" : "(mês)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.atrasadas}</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por protocolo, título, responsável..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-12 h-12 text-base bg-card border-2 border-border focus:border-primary"
          />
        </div>
        
        <Card>
          <CardContent className="pt-4 md:pt-6 flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={filterPeriod === 'hoje' ? 'default' : 'outline'}
                onClick={() => { setFilterPeriod('hoje'); setCustomStartDate(''); setCustomEndDate(''); setCurrentPage(1); }}
                className={filterPeriod === 'hoje' ? 'bg-primary text-primary-foreground' : ''}
              >
                Hoje
              </Button>
              <Button
                variant={filterPeriod === 'ontem' ? 'default' : 'outline'}
                onClick={() => { setFilterPeriod('ontem'); setCustomStartDate(''); setCustomEndDate(''); setCurrentPage(1); }}
                className={filterPeriod === 'ontem' ? 'bg-primary text-primary-foreground' : ''}
              >
                Ontem
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="start-date" className="text-muted-foreground">De:</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  if (e.target.value) { 
                      setFilterPeriod('personalizado');
                  } else if (!customEndDate) {
                      setFilterPeriod('all');
                  }
                  setCurrentPage(1);
                }}
                className="w-auto"
              />
              <Label htmlFor="end-date" className="text-muted-foreground">Até:</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  if (e.target.value) {
                      setFilterPeriod('personalizado');
                  } else if (!customStartDate) {
                      setFilterPeriod('all');
                  }
                  setCurrentPage(1);
                }}
                className="w-auto"
              />
            </div>
            {(filterPeriod !== 'all' || customStartDate || customEndDate) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setFilterPeriod('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
                className="text-sm text-primary"
              >
                Limpar filtros de data
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div>
            <Label htmlFor="user-filter" className="text-sm font-medium text-muted-foreground">Responsável</Label>
            <Select 
              value={userFilter} 
              onValueChange={(value) => {
                setUserFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger id="user-filter" className="mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Usuários</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.email}>
                    {user.display_name || user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority-filter" className="text-sm font-medium text-muted-foreground">Prioridade</Label>
            <Select 
              value={selectedPriority} 
              onValueChange={(value) => {
                setSelectedPriority(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger id="priority-filter" className="mt-1">
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

          <div className="flex items-center space-x-2 pt-2 sm:pt-6">
            <Switch
              id="my-items-only"
              checked={showOnlyMyItems}
              onCheckedChange={(checked) => {
                setShowOnlyMyItems(checked);
                setCurrentPage(1);
              }}
            />
            <Label htmlFor="my-items-only" className="text-sm cursor-pointer text-muted-foreground">
              Ver apenas meus itens
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab("ativas"); setCurrentPage(1); }}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] ${
              activeTab === "ativas"
                ? "bg-card text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:bg-card/50"
            }`}
          >
            Ativas
            <Badge className="ml-2 bg-primary text-primary-foreground border-0">
              {stats.ativas}
            </Badge>
          </button>
          <button
            onClick={() => { setActiveTab("concluidas"); setCurrentPage(1); }}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] ${
              activeTab === "concluidas"
                ? "bg-card text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:bg-card/50"
            }`}
          >
            Concluídas
            <Badge className="ml-2 bg-primary text-primary-foreground border-0">
              {stats.concluidas}
            </Badge>
          </button>
        </div>

        {paginatedItems.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              {searchQuery 
                ? "Nenhum item encontrado para sua busca"
                : (userFilter === "all" ? "Nenhum item encontrado" : "Nenhum item encontrado para o usuário selecionado")}
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {paginatedItems.map((item) => (
                <TaskCard
                  key={item.id} 
                  task={item}
                  departments={departments}
                  users={users}
                  onTaskClick={handleItemClick}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages} ({sortedItems.length} itens)
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
          </>
        )}
      </div>

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
          onUpdate={handleItemUpdate}
        />
      )}

      {selectedItem?.type === 'service' && (
        <ServiceViewEditModal
          open={showServiceModal}
          onClose={() => {
            setShowServiceModal(false);
            setSelectedItem(null);
          }}
          service={selectedItem}
          currentUser={currentUser}
          users={users}
          departments={departments}
          onUpdate={handleItemUpdate}
        />
      )}
    </div>
    </PullToRefresh>
  );
}