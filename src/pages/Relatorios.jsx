import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, Search, TrendingUp, Printer } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// NOVA FUNÇÃO: Filtra protocolos duplicados por usuário
const filterUniqueProtocolsByUser = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    // If an item doesn't have an assigned user or a protocol, treat it as unique
    // and use a unique symbol key to store it directly.
    if (!item.assigned_to || !item.protocol) {
      grouped[Symbol(item.id || Math.random())] = item;
      return;
    }
    
    const key = `${item.assigned_to}_${item.protocol}`;
    
    if (!grouped[key]) {
      grouped[key] = item;
    } else {
      // If a duplicate is found, keep the one with the most recent updated_date or created_date
      const existingDateStr = grouped[key].updated_date || grouped[key].created_date;
      const currentDateStr = item.updated_date || item.created_date;

      const existingDate = existingDateStr ? new Date(existingDateStr) : new Date(0);
      const currentDate = currentDateStr ? new Date(currentDateStr) : new Date(0);
      
      if (currentDate > existingDate) {
        grouped[key] = item;
      }
    }
  });
  
  return Object.values(grouped);
};

export default function Relatorios() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "all",
    user: "all",
    priority: "all",
    search: ""
  });

  const isAdmin = currentUserData?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, items]);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUserData(userData);

      let tasksData = [];
      let servicesData = [];
      let usersData = [];

      if (userData.role === 'admin') {
        [tasksData, servicesData] = await Promise.all([
            Task.list("-created_date"),
            Service.list("-created_date"),
        ]);
        try {
            usersData = await User.list();
        } catch(e) {
            usersData = [userData];
            console.warn("Could not load all users, defaulting to current user.", e);
        }
      } else {
        [tasksData, servicesData] = await Promise.all([
          Task.filter({ assigned_to: userData.email }, "-created_date"),
          Service.filter({ assigned_to: userData.email }, "-created_date")
        ]);
        usersData = [userData];
        setFilters(prevFilters => ({ ...prevFilters, user: userData.email }));
      }

      const normalizedTasks = tasksData.map(t => ({...t, type: 'task', protocol: t.protocol}));
      const normalizedServices = servicesData.map(s => ({...s, type: 'service', protocol: s.service_name, description: s.description}));
      const combinedItems = [...normalizedTasks, ...normalizedServices];

      // NOVA LÓGICA: Filtra protocolos duplicados por usuário
      const uniqueItems = filterUniqueProtocolsByUser(combinedItems);
      console.log(`[Relatorios] Total: ${combinedItems.length}, Únicos: ${uniqueItems.length}`);

      setItems(uniqueItems);
      setUsers(usersData);
      setFilteredItems(uniqueItems);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    if (filters.startDate || filters.endDate) {
      const start = filters.startDate ? startOfDay(parseDateAsLocal(filters.startDate)) : null;
      const end = filters.endDate ? endOfDay(parseDateAsLocal(filters.endDate)) : null;

      filtered = filtered.filter(t => {
        const effectiveDateStr = (t.status === 'Concluída' && t.completed_date)
            ? t.completed_date
            : t.end_date;
        
        const effectiveDate = parseDateAsLocal(effectiveDateStr);
        if (!effectiveDate) return false;

        if(start && end) {
          return isWithinInterval(effectiveDate, { start, end });
        }
        if(start) {
          return effectiveDate >= start;
        }
        if(end) {
          return effectiveDate <= end;
        }
        return true;
      });
    }

    if (filters.status !== "all") {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters.user !== "all") {
      filtered = filtered.filter(t => t.assigned_to === filters.user);
    }
    if (filters.priority !== "all") {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.protocol?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredItems(filtered);
  };

  const statusData = [
    { name: "Pendente", value: filteredItems.filter(t => t.status === "Pendente").length },
    { name: "Em Execução", value: filteredItems.filter(t => t.status === "Em Execução").length },
    { name: "Atrasada", value: filteredItems.filter(t => t.status === "Atrasada").length },
    { name: "Concluída", value: filteredItems.filter(t => t.status === "Concluída").length },
  ].filter(item => item.value > 0);

  const priorityData = [
    { name: "P1", value: filteredItems.filter(t => t.priority === "P1").length },
    { name: "P2", value: filteredItems.filter(t => t.priority === "P2").length },
    { name: "P3", value: filteredItems.filter(t => t.priority === "P3").length },
    { name: "P4", value: filteredItems.filter(t => t.priority === "P4").length },
    { name: "P5", value: filteredItems.filter(t => t.priority === "P5").length },
  ].filter(item => item.value > 0);

  const userTasksData = users.map(user => ({
    name: user.display_name || user.full_name,
    tarefas: filteredItems.filter(t => t.assigned_to === user.email).length
  })).filter(item => item.tarefas > 0).slice(0, 10);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="p-4 md:p-8 min-h-screen no-print dark:bg-slate-900">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                Relatórios
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Análise e visualização de dados</p>
            </div>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-900 hover:text-white"
            >
              <Printer className="w-4 h-4" />
              Imprimir Relatório
            </Button>
          </div>

          <Card className="shadow-lg border-0 dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 dark:border-slate-600">
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <FileText className="w-5 h-5" />
                Filtros de Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-300">Data Inicial</label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Final</label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Em Execução">Em Execução</SelectItem>
                      <SelectItem value="Atrasada">Atrasada</SelectItem>
                      <SelectItem value="Concluída">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário</label>
                  <Select
                    value={filters.user}
                    onValueChange={(value) => setFilters({...filters, user: value})}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin && (
                        <SelectItem value="all">Todos</SelectItem>
                      )}
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.display_name || user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="P1">P1</SelectItem>
                      <SelectItem value="P2">P2</SelectItem>
                      <SelectItem value="P3">P3</SelectItem>
                      <SelectItem value="P4">P4</SelectItem>
                      <SelectItem value="P5">P5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Protocolo ou descrição..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <TrendingUp className="inline w-4 h-4 mr-1" />
                  Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> itens
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-0 dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 dark:border-slate-600">
                <CardTitle className="dark:text-white">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 dark:border-slate-600">
                <CardTitle className="dark:text-white">Distribuição por Prioridade</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3B82F6" name="Tarefas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 lg:col-span-2 dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 dark:border-slate-600">
                <CardTitle className="dark:text-white">Tarefas por Usuário</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={userTasksData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tarefas" fill="#8B5CF6" name="Total de Tarefas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none;
          }
          .no-print button { 
            display: none !important;
          }
          
          body > #root > div {
            display: block !important; 
            margin: 0;
            padding: 0;
          }

          .p-4.md\\:p-8.min-h-screen {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          .max-w-7xl.mx-auto.space-y-8 {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .flex.items-center.justify-between {
            display: block !important;
            text-align: center !important;
            margin-bottom: 20px;
          }
          .flex.items-center.justify-between > div {
            margin-bottom: 10px;
          }
          .text-3xl.md\\:text-4xl.font-bold, .text-gray-600.mt-2 {
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-image: none !important;
            -webkit-text-fill-color: #000 !important;
          }
          .card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            margin-bottom: 20px;
          }
          .card-header {
            background-image: none !important;
            background-color: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            border-bottom: 1px solid #ccc !important;
          }
          .card-title {
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .card-content {
            padding: 10px !important;
          }
          .grid {
            display: block !important;
          }
          .grid > div {
            margin-bottom: 10px;
          }
          .lg\\:col-span-2 {
            grid-column: auto !important;
          }
          .recharts-wrapper {
            margin: auto;
          }
          .recharts-surface, .recharts-cartesian-grid line, .recharts-cartesian-axis-line, .recharts-legend-wrapper, .recharts-tooltip-wrapper {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}