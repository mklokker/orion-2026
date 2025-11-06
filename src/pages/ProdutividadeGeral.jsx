
import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, MoreVertical, Search, UserCheck, Activity, BarChart3, Clock } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, endOfDay, startOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import TaskViewEditModal from "@/components/tasks/TaskViewEditModal";
import ServiceViewEditModal from "@/components/services/ServiceViewEditModal";


const priorityColors = {
  "P1": "bg-red-500 text-white",
  "P2": "bg-orange-500 text-white",
  "P3": "bg-yellow-600 text-white",
  "P4": "bg-blue-500 text-white",
  "P5": "bg-green-500 text-white"
};

// Helper para converter 'YYYY-MM-DD' ou ISO string para um objeto Date local
const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  // Se for uma string ISO completa (com 'T' para hora), o construtor Date já lida corretamente
  // e date-fns functions will interpret it as local time based on the browser's timezone.
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  // Se for 'YYYY-MM-DD', parse manualmente para evitar problemas de fuso horário
  // e garantir que é interpretado como meia-noite no fuso horário local.
  const parts = dateString.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    // month is 0-indexed in Date constructor
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null; // Retorna nulo se o formato for inválido
};

// NOVA FUNÇÃO: Filtra protocolos duplicados por usuário
const filterUniqueProtocolsByUser = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    // If no assigned_to or protocol, treat as unique. This handles cases where items might not fit the protocol-tracking logic.
    if (!item.assigned_to || !item.protocol) {
      grouped[Symbol(item.id || Math.random())] = item; // Use Symbol for truly unique keys
      return;
    }
    
    const key = `${item.assigned_to}_${item.protocol}`;
    
    if (!grouped[key]) {
      grouped[key] = item;
    } else {
      // Compare by updated_date first, then created_date if updated_date is missing
      const existingDateStr = grouped[key].updated_date || grouped[key].created_date;
      const currentDateStr = item.updated_date || item.created_date;

      const existingDate = existingDateStr ? new Date(existingDateStr) : new Date(0);
      const currentDate = currentDateStr ? new Date(currentDateStr) : new Date(0);
      
      // Keep the item with the most recent date (updated_date or created_date)
      if (currentDate > existingDate) {
        grouped[key] = item;
      }
    }
  });
  
  return Object.values(grouped);
};

export default function ProdutividadeGeral() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    user: "all",
    startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  });
  const [currentUserData, setCurrentUserData] = useState(null);
  const [view, setView] = useState("summary"); // 'summary' or 'details'
  const [detailedItems, setDetailedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (items.length > 0 && users.length > 0 && currentUserData) {
      processData();
    }
  }, [items, users, filters, currentUserData]);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUserData(userData);

      let tasksData = [];
      let servicesData = [];
      let usersData = [userData];
      let departmentsData = [];

      if (userData.role === 'admin') {
        [tasksData, servicesData, departmentsData] = await Promise.all([
          Task.list("-completed_date"),
          Service.list("-completed_date"),
          Department.list()
        ]);
        try {
          usersData = await User.list();
        } catch(e) {
          console.warn("Falha ao carregar todos os usuários:", e);
        }
      } else { // Non-admin user
        [tasksData, servicesData, departmentsData] = await Promise.all([
          Task.filter({ assigned_to: userData.email, status: 'Concluída' }, "-completed_date"),
          Service.filter({ assigned_to: userData.email, status: 'Concluída' }, "-completed_date"),
          Department.list()
        ]);
        usersData = [userData]; // Only current user for non-admin
      }
      
      const normalizedTasks = tasksData
        .filter(t => t.status === "Concluída")
        .map(t => ({
            ...t,
            type: 'task',
            title: t.description || t.protocol,
            protocol: t.protocol,
            displayDate: t.completed_date
        }));
      
      const normalizedServices = servicesData
        .filter(s => s.status === "Concluída")
        .map(s => ({
            ...s,
            type: 'service',
            title: s.service_name,
            protocol: s.service_name, // outline used s.service_name for protocol, original used s.service_name for title. Let's use service_name for protocol too.
            displayDate: s.completed_date
        }));
      
      const combinedItems = [...normalizedTasks, ...normalizedServices];
      
      // NOVA LÓGICA: Filtra protocolos duplicados por usuário
      const uniqueItems = filterUniqueProtocolsByUser(combinedItems);
      console.log(`[ProdutividadeGeral] Total: ${combinedItems.length}, Únicos: ${uniqueItems.length}`);
      
      setItems(uniqueItems);
      setUsers(usersData);
      setDepartments(departmentsData);
      
      if (userData.role !== 'admin' && userData.email) {
        setFilters(prev => ({ ...prev, user: userData.email }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const processData = () => {
    if (!filters.startDate || !filters.endDate || !currentUserData) {
      setProcessedData([]);
      return;
    }

    const start = startOfDay(parseDateAsLocal(filters.startDate));
    const end = endOfDay(parseDateAsLocal(filters.endDate));
    const intervalDays = eachDayOfInterval({ start, end });

    let filteredUsers = users;
    if (filters.user === 'all' && currentUserData.role === 'admin') {
      // Use all loaded users
    } else if (filters.user !== 'all' && currentUserData.role === 'admin') {
      filteredUsers = users.filter(u => u.email === filters.user);
    } else {
      filteredUsers = users.filter(u => u.email === currentUserData.email);
    }

    const data = filteredUsers.map(user => {
      const userItems = items.filter(item => item.assigned_to === user.email);
      
      const dailyCounts = intervalDays.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        
        return userItems.filter(item => {
          const completedDate = item.completed_date ? parseDateAsLocal(item.completed_date) : null;
          return completedDate && completedDate >= dayStart && completedDate <= dayEnd;
        }).length;
      });

      const totalCompleted = dailyCounts.reduce((sum, count) => sum + count, 0);

      return {
        user,
        dailyCounts,
        totalCompleted
      };
    });

    setProcessedData(data);
  };
  
  const handleViewDetails = (userEmail, dayIndex) => {
    if (!filters.startDate || !filters.endDate) return;

    const start = startOfDay(parseDateAsLocal(filters.startDate));
    const end = endOfDay(parseDateAsLocal(filters.endDate));
    const intervalDays = eachDayOfInterval({ start, end });
    const targetDay = intervalDays[dayIndex];
    
    const dayStart = startOfDay(targetDay);
    const dayEnd = endOfDay(targetDay);

    const userItems = items.filter(item => 
      item.assigned_to === userEmail &&
      item.status === 'Concluída' &&
      (item.completed_date ? parseDateAsLocal(item.completed_date) : null) >= dayStart &&
      (item.completed_date ? parseDateAsLocal(item.completed_date) : null) <= dayEnd
    );

    userItems.sort((a, b) => {
      const dateA = a.completed_date ? parseDateAsLocal(a.completed_date) : new Date(0);
      const dateB = b.completed_date ? parseDateAsLocal(b.completed_date) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    setDetailedItems(userItems);
    setView('details');
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    if (item.type === 'task') {
      setShowTaskModal(true);
    } else if (item.type === 'service') {
      setShowServiceModal(true);
    }
  };

  const handleBackToSummary = () => {
    setView('summary');
    setDetailedItems([]);
  };

  const handleDateFilterChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  const setPeriod = (periodType) => {
    const today = new Date();
    let startDate, endDate;

    switch (periodType) {
      case "thisWeek":
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "lastWeek":
        const lastWeek = subDays(today, 7);
        startDate = startOfWeek(lastWeek, { weekStartsOn: 1 });
        endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(today), 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      default:
        return;
    }
    setFilters(prev => ({
      ...prev,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd")
    }));
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const dateHeaders = filters.startDate && filters.endDate
    ? eachDayOfInterval({ 
        start: parseDateAsLocal(filters.startDate), 
        end: parseDateAsLocal(filters.endDate) 
      })
    : [];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Produtividade Geral</h1>
            <p className="text-gray-600 mt-1">Análise de itens concluídos por usuário em um período.</p>
          </div>
          {view === 'details' && (
            <Button variant="outline" onClick={handleBackToSummary}>Voltar ao Resumo</Button>
          )}
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-4">
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Period Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data de Início</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleDateFilterChange("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data de Fim</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleDateFilterChange("endDate", e.target.value)}
                />
              </div>

              {/* User Filter - Conditionally rendered based on role */}
              {currentUserData?.role === 'admin' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Usuário</label>
                  <Select value={filters.user} onValueChange={(value) => setFilters({...filters, user: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.display_name || user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setPeriod("thisWeek")}>Esta Semana</Button>
                <Button variant="outline" onClick={() => setPeriod("lastWeek")}>Semana Passada</Button>
                <Button variant="outline" onClick={() => setPeriod("thisMonth")}>Este Mês</Button>
                <Button variant="outline" onClick={() => setPeriod("lastMonth")}>Mês Passado</Button>
            </div>
          </CardContent>
        </Card>
        
        {view === 'summary' && (
          <Card className="shadow-sm border-2">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle>Resumo de Produtividade</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sticky left-0 bg-gray-50 z-10">Usuário</TableHead>
                      {dateHeaders.map((date, index) => (
                        <TableHead key={index} className="text-center">
                          {format(date, "dd/MM", { locale: ptBR })}<br/>
                          <span className="text-xs text-gray-500">{weekDays[date.getDay()]}</span>
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[80px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={dateHeaders.length + 2} className="text-center py-8 text-gray-500">
                          Nenhum dado de produtividade encontrado para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      processedData.map((data, rowIndex) => (
                        <TableRow key={data.user.id || rowIndex}>
                          <TableCell className="font-semibold sticky left-0 bg-white z-10">
                            {data.user.display_name || data.user.full_name || data.user.email}
                          </TableCell>
                          {data.dailyCounts.map((count, dayIndex) => (
                            <TableCell key={dayIndex} className="text-center cursor-pointer hover:bg-gray-100" 
                                       onClick={() => handleViewDetails(data.user.email, dayIndex)}>
                              {count > 0 ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {count}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold">
                            <Badge className="bg-blue-600 text-white text-lg">
                              {data.totalCompleted}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'details' && (
          <Card className="shadow-sm border-2">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle>Detalhes dos Itens Concluídos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Protocolo/Nome</TableHead>
                      <TableHead>Título/Descrição</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Data de Conclusão</TableHead>
                      <TableHead className="w-12">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          Nenhum item concluído encontrado para este dia.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detailedItems.map(item => (
                        <TableRow key={`${item.type}-${item.id}`}>
                          <TableCell>
                            <Badge variant="outline" className={item.type === 'task' ? 'bg-indigo-50 text-indigo-700' : 'bg-green-50 text-green-700'}>
                              {item.type === 'task' ? 'Tarefa' : 'Serviço'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{item.protocol}</TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>
                            <Badge className={`${priorityColors[item.priority] || 'bg-gray-200 text-gray-800'} border-0 font-semibold`}>
                              {item.priority || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.completed_date 
                              ? format(parseDateAsLocal(item.completed_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleItemClick(item)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedItem?.type === 'task' && showTaskModal && (
        <TaskViewEditModal
          open={showTaskModal}
          onClose={() => { setShowTaskModal(false); setSelectedItem(null); }}
          task={selectedItem}
          currentUser={currentUserData}
          userPermissions={currentUserData?.role === 'admin' ? { can_edit_all_tasks: true, can_view_all_tasks: true } : { can_edit_all_tasks: false, can_view_all_tasks: false }} // Simplified permissions for modal
          users={users}
          departments={departments}
          onUpdate={() => {}}
        />
      )}
      {selectedItem?.type === 'service' && showServiceModal && (
        <ServiceViewEditModal
          open={showServiceModal}
          onClose={() => { setShowServiceModal(false); setSelectedItem(null); }}
          service={selectedItem}
          currentUser={currentUserData}
          userPermissions={currentUserData?.role === 'admin' ? { can_edit_all_services: true, can_view_all_services: true } : { can_edit_all_services: false, can_view_all_services: false }} // Simplified permissions for modal
          users={users}
          departments={departments}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}
