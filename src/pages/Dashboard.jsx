
import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TaskCard from "../components/dashboard/TaskCard";
import TaskViewEditModal from "../components/tasks/TaskViewEditModal";
import ServiceViewEditModal from "../components/services/ServiceViewEditModal";
import { startOfMonth, endOfMonth, isWithinInterval, isSameDay, subDays, startOfDay, endOfDay } from "date-fns";

const ITEMS_PER_PAGE = 100;

const normalizeString = (str) => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
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
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ativas");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOldestFirst, setSortOldestFirst] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userFilter, setUserFilter] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showOnlyMyItems, setShowOnlyMyItems] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      // Carregar tarefas/serviços/departamentos PRIMEIRO para permitir fallback de usuários
      const [tasksData, servicesData, departmentsData] = await Promise.all([
        Task.list("-end_date"),
        Service.list("-end_date"),
        Department.list(),
      ]);

      // 1) Tenta buscar usuários "oficiais"
      let usersData = [];
      try {
        usersData = await User.list();
        console.log("[Dashboard] User.list() retornou:", usersData.length, "usuários");
      } catch (e) {
        console.error("[Dashboard] ERRO ao carregar User.list():", e);
        usersData = []; // Garante que seja um array vazio se houver erro
      }

      // 2) FALLBACK INTELIGENTE: Se voltou vazio ou só tem 1 usuário (suspeito de falha no backend ou permissões)
      // O critério `usersData.length <= 1` é uma heurística: se só o usuário atual ou ninguém é retornado,
      // a lista completa pode não ter sido carregada.
      const looksInsufficient = !usersData || usersData.length <= 1;

      if (looksInsufficient) {
        console.warn("[Dashboard] User.list() insuficiente, usando FALLBACK via assigned_to");
        
        // Coleta todos os emails únicos que aparecem como responsáveis
        const assignedEmails = new Set();
        for (const t of tasksData) {
          if (t?.assigned_to) assignedEmails.add(t.assigned_to);
        }
        for (const s of servicesData) {
          if (s?.assigned_to) assignedEmails.add(s.assigned_to);
        }
        
        // Garante que o usuário atual esteja incluído, mesmo que não seja responsável por nada
        if (userData?.email) assignedEmails.add(userData.email);

        // Cria objetos "User-like" mínimos com nomes mais amigáveis
        const fallbackUsers = Array.from(assignedEmails).map((email, idx) => {
          const displayName = generateDisplayNameFromEmail(email);
          return {
            id: `fallback-${idx}-${email}`, // ID único para usuários de fallback
            email: email,
            display_name: displayName, // Nome gerado do email como fallback
            full_name: displayName,   // Nome gerado do email como fallback
            // Atribui a role do usuário atual se for o email dele, caso contrário, "user"
            role: email === userData?.email ? userData?.role : "user", 
          };
        });

        // Se usersData tinha algo (ex: só o próprio user), faz merge pelo email
        // Dando preferência aos dados oficiais quando disponíveis
        const byEmail = new Map();
        for (const u of usersData || []) {
          if (u?.email) byEmail.set(u.email, u);
        }
        
        // Mescla usuários oficiais com fallback, garantindo display_name
        const merged = fallbackUsers.map(fu => {
          const official = byEmail.get(fu.email);
          if (official) {
            // CORREÇÃO CRÍTICA: Usa dados oficiais e SEMPRE prioriza display_name/full_name real
            return {
              ...official,
              // Prioridade: display_name > full_name > email
              display_name: official.display_name || official.full_name || generateDisplayNameFromEmail(official.email)
            };
          }
          return fu; // Se não houver dados oficiais, usa o usuário de fallback
        });
        
        usersData = merged;
        console.log("[Dashboard] FALLBACK ativado! Total de usuários disponíveis:", usersData.length);
      } else {
        // Se User.list() funcionou bem, garante que todos tenham display_name
        usersData = usersData.map(u => ({
          ...u,
          display_name: u.display_name || u.full_name || generateDisplayNameFromEmail(u.email)
        }));
      }

      setUsers(usersData);

      const normalizedTasks = tasksData.map(t => ({...t, type: 'task'}));
      const normalizedServices = servicesData.map(s => ({
        ...s, 
        type: 'service', 
        protocol: s.service_name,
        description: s.description
      }));
      const combinedItems = [...normalizedTasks, ...normalizedServices];
      
      // NOVA LÓGICA: Filtra protocolos duplicados por usuário, mantendo apenas o mais recente
      const uniqueItems = filterUniqueProtocolsByUser(combinedItems);
      console.log(`[Dashboard] Total de itens brutos: ${combinedItems.length}, Únicos após filtro: ${uniqueItems.length}`);
      
      setItems(uniqueItems);
      setDepartments(departmentsData);
    } catch (error) {
      console.error("[Dashboard] Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

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
      dateMatch = isSameDay(effectiveDate, new Date());
    } else if (filterPeriod === 'ontem') {
      dateMatch = isSameDay(effectiveDate, subDays(new Date(), 1));
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
      
    return dateMatch && statusMatch && searchMatch && userFilterMatch;
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
        dateMatch = isSameDay(effectiveDate, new Date());
      } else if (filterPeriod === 'ontem') {
        dateMatch = isSameDay(effectiveDate, subDays(new Date(), 1));
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
        
      return dateMatch && searchMatch && userFilterMatch;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Painel Principal
          </h1>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sort-order"
                checked={!sortOldestFirst}
                onCheckedChange={(checked) => setSortOldestFirst(!checked)}
              />
              <Label htmlFor="sort-order" className="text-sm cursor-pointer flex items-center gap-1">
                <ArrowUpDown className="w-4 h-4" />
                Mais novas primeiro
              </Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-primary text-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Total {hasActiveFilters ? "(filtrado)" : "(mês)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary-accent text-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ativas {hasActiveFilters ? "(filtrado)" : "(mês)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.ativas}</p>
            </CardContent>
          </Card>

          <Card className="bg-success text-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Concluídas {hasActiveFilters ? "(filtrado)" : "(mês)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.concluidas}</p>
            </CardContent>
          </Card>

          <Card className="bg-danger text-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por protocolo, título, responsável..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-12 h-12 text-base bg-white border-2 focus:border-blue-400"
          />
        </div>
        
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={filterPeriod === 'hoje' ? 'default' : 'outline'}
                onClick={() => { setFilterPeriod('hoje'); setCustomStartDate(''); setCustomEndDate(''); setCurrentPage(1); }}
                className={filterPeriod === 'hoje' ? 'bg-primary' : ''}
              >
                Hoje
              </Button>
              <Button
                variant={filterPeriod === 'ontem' ? 'default' : 'outline'}
                onClick={() => { setFilterPeriod('ontem'); setCustomStartDate(''); setCustomEndDate(''); setCurrentPage(1); }}
                className={filterPeriod === 'ontem' ? 'bg-primary' : ''}
              >
                Ontem
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="start-date">De:</Label>
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
              <Label htmlFor="end-date">Até:</Label>
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
                className="text-sm text-blue-600"
              >
                Limpar filtros de data
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-grow w-full sm:w-auto">
            <Label htmlFor="user-filter" className="text-sm font-medium">Filtrar por Responsável</Label>
            <Select 
              value={userFilter} 
              onValueChange={(value) => {
                setUserFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger id="user-filter" className="bg-white mt-1">
                <SelectValue placeholder="Selecione um usuário" />
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
          <div className="flex items-center space-x-2 pt-2 sm:pt-6">
            <Switch
              id="my-items-only"
              checked={showOnlyMyItems}
              onCheckedChange={(checked) => {
                setShowOnlyMyItems(checked);
                setCurrentPage(1);
              }}
            />
            <Label htmlFor="my-items-only" className="text-sm cursor-pointer">
              Ver apenas meus itens
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab("ativas"); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "ativas"
                ? "bg-white text-gray-900 shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-white/50"
            }`}
          >
            Ativas
            <Badge className="ml-2 bg-gray-900 text-white border-0">
              {stats.ativas}
            </Badge>
          </button>
          <button
            onClick={() => { setActiveTab("concluidas"); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "concluidas"
                ? "bg-white text-gray-900 shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-white/50"
            }`}
          >
            Concluídas
            <Badge className="ml-2 bg-gray-900 text-white border-0">
              {stats.concluidas}
            </Badge>
          </button>
        </div>

        {paginatedItems.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {searchQuery 
                ? "Nenhum item encontrado para sua busca"
                : (userFilter === "all" ? "Nenhum item encontrado" : "Nenhum item encontrado para o usuário selecionado")}
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <span className="text-sm text-gray-600">
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
  );
}
