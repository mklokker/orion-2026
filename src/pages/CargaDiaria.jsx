import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { UserColumnOrder } from "@/entities/UserColumnOrder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Printer, Eye, ArrowRight, CheckCircle2, X, Search, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TaskViewEditModal from "../components/tasks/TaskViewEditModal";
import ServiceViewEditModal from "../components/services/ServiceViewEditModal";

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

const filterUniqueProtocolsByUser = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    const key = `${item.assigned_to}_${item.displayProtocol}`;
    
    if (!grouped[key]) {
      grouped[key] = item;
    } else {
      const existingDate = new Date(grouped[key].updated_date || grouped[key].created_date);
      const currentDate = new Date(item.updated_date || item.created_date);
      
      if (currentDate > existingDate) {
        grouped[key] = item;
      }
    }
  });
  
  return Object.values(grouped);
};

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

export default function CargaDiaria() {
  const { toast } = useToast();
  const [itemsByUser, setItemsByUser] = useState({});
  const [users, setUsers] = useState([]);
  const [orderedUsers, setOrderedUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [showAllItemsModal, setShowAllItemsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);
      
      let tasksData = [];
      let servicesData = [];
      let usersData = [];
      let departmentsData = [];

      const filterOptions = { status: { $ne: "Concluída" } };

      if (userData.role === 'admin') {
        [tasksData, servicesData, departmentsData] = await Promise.all([
            Task.filter(filterOptions, "end_date"),
            Service.filter(filterOptions, "end_date"),
            Department.list()
        ]);
        try {
          usersData = await User.list();
        } catch(e) {
          console.warn("Falha ao carregar lista de usuários.");
          usersData = [userData];
        }
      } else {
        const userFilterOptions = { ...filterOptions, assigned_to: userData.email };
        [tasksData, servicesData, departmentsData] = await Promise.all([
            Task.filter(userFilterOptions, "end_date"),
            Service.filter(userFilterOptions, "end_date"),
            Department.list()
        ]);
        usersData = [userData];
      }
      
      setUsers(usersData);
      setDepartments(departmentsData);

      const normalizedTasks = tasksData.map(t => ({
        ...t, 
        type: 'task', 
        displayProtocol: t.protocol,
        displayName: t.protocol
      }));
      
      const normalizedServices = servicesData.map(s => ({
        ...s, 
        type: 'service', 
        displayProtocol: s.service_name,
        displayName: s.service_name
      }));
      
      const combinedItems = [...normalizedTasks, ...normalizedServices];
      const uniqueItems = filterUniqueProtocolsByUser(combinedItems);
      
      const grouped = {};
      usersData.forEach(user => {
        grouped[user.email] = uniqueItems.filter(item => item.assigned_to === user.email);
      });
      setItemsByUser(grouped);

      // CORRIGIDO: Passar o grouped diretamente ao invés de depender do estado
      await loadColumnOrder(usersData, userData.email, grouped);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const loadColumnOrder = async (usersData, currentUserEmail, groupedItems) => {
    try {
      const savedOrders = await UserColumnOrder.filter({ user_email: currentUserEmail });
      
      // Filtrar usuários que têm itens (usar o parâmetro groupedItems ao invés do estado)
      const usersWithItems = usersData.filter(user => {
        const items = groupedItems[user.email] || [];
        return items.length > 0;
      });
      
      if (savedOrders.length > 0 && savedOrders[0].column_order) {
        const savedOrder = savedOrders[0].column_order;
        
        // Ordenar conforme ordem salva
        const orderedUserEmails = savedOrder.filter(email => 
          usersWithItems.find(u => u.email === email)
        );
        
        const newUsers = usersWithItems.filter(user => 
          !orderedUserEmails.includes(user.email)
        );
        
        const finalOrder = [
          ...orderedUserEmails.map(email => usersWithItems.find(u => u.email === email)),
          ...newUsers
        ].filter(Boolean);
        
        setOrderedUsers(finalOrder);
      } else {
        // Ordem alfabética padrão
        const sortedUsers = usersWithItems.sort((a, b) => {
          const nameA = (a.display_name || a.full_name || a.email).toLowerCase();
          const nameB = (b.display_name || b.full_name || b.email).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setOrderedUsers(sortedUsers);
      }
    } catch (error) {
      console.error("Erro ao carregar ordem das colunas:", error);
      // Fallback
      const usersWithItems = usersData
        .filter(user => {
          const items = groupedItems[user.email] || [];
          return items.length > 0;
        })
        .sort((a, b) => {
          const nameA = (a.display_name || a.full_name || a.email).toLowerCase();
          const nameB = (b.display_name || b.full_name || b.email).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      
      setOrderedUsers(usersWithItems);
    }
  };

  const saveColumnOrder = async (newOrder) => {
    if (!currentUser) return;
    
    try {
      const orderEmails = newOrder.map(u => u.email);
      
      // Verificar se já existe uma ordem salva
      const existingOrders = await UserColumnOrder.filter({ user_email: currentUser.email });
      
      if (existingOrders.length > 0) {
        await UserColumnOrder.update(existingOrders[0].id, {
          column_order: orderEmails
        });
      } else {
        await UserColumnOrder.create({
          user_email: currentUser.email,
          column_order: orderEmails
        });
      }
    } catch (error) {
      console.error("Erro ao salvar ordem das colunas:", error);
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId, type } = result;

    if (!destination) return;

    // NOVO: Se está arrastando colunas (usuários)
    if (type === 'column') {
      const newOrderedUsers = Array.from(orderedUsers);
      const [movedUser] = newOrderedUsers.splice(source.index, 1);
      newOrderedUsers.splice(destination.index, 0, movedUser);
      
      setOrderedUsers(newOrderedUsers);
      
      // Salvar automaticamente a nova ordem
      await saveColumnOrder(newOrderedUsers);
      
      toast({
        title: "Ordem salva!",
        description: "A nova ordem das colunas foi salva automaticamente.",
      });
      
      return;
    }

    // Lógica existente para arrastar itens dentro das colunas
    const sourceUserEmail = source.droppableId;
    const destUserEmail = destination.droppableId;

    const draggedItem = itemsByUser[sourceUserEmail].find(item => item.id === draggableId);
    if (!draggedItem) return;

    const newItemsByUser = { ...itemsByUser };
    
    newItemsByUser[sourceUserEmail] = [...newItemsByUser[sourceUserEmail]];
    newItemsByUser[sourceUserEmail].splice(source.index, 1);
    
    if (!newItemsByUser[destUserEmail]) {
      newItemsByUser[destUserEmail] = [];
    } else {
      newItemsByUser[destUserEmail] = [...newItemsByUser[destUserEmail]];
    }
    
    const updatedItem = { ...draggedItem, assigned_to: destUserEmail };
    newItemsByUser[destUserEmail].splice(destination.index, 0, updatedItem);
    
    setItemsByUser(newItemsByUser);

    if (sourceUserEmail !== destUserEmail) {
      try {
        const api = draggedItem.type === 'task' ? Task : Service;
        await api.update(draggedItem.id, { assigned_to: destUserEmail });
        
        const destUser = users.find(u => u.email === destUserEmail);
        toast({
          title: "Movido com sucesso!",
          description: `${draggedItem.displayProtocol} atribuído para ${destUser?.display_name || destUser?.full_name || destUserEmail}`,
        });
      } catch (error) {
        console.error("Erro ao mover item:", error);
        toast({
          title: "Erro ao mover",
          description: "Não foi possível salvar a mudança. Recarregando...",
          variant: "destructive"
        });
        loadData();
      }
    }
  };

  const handleViewAllItems = (userEmail) => {
    setSelectedUserEmail(userEmail);
    setShowAllItemsModal(true);
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    if (item.type === 'task') {
      setShowTaskModal(true);
    } else {
      setShowServiceModal(true);
    }
  };

  const handleCompleteItem = async (item) => {
    try {
      const api = item.type === 'task' ? Task : Service;
      await api.update(item.id, {
        status: "Concluída",
        completed_date: format(new Date(), "yyyy-MM-dd")
      });
      
      toast({
        title: "Sucesso!",
        description: `${item.type === 'task' ? 'Tarefa' : 'Serviço'} finalizado!`,
      });
      
      loadData();
      setShowAllItemsModal(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível concluir o item.",
        variant: "destructive"
      });
    }
  };

  const handleMoveItem = async (item, newUserEmail) => {
    try {
      const api = item.type === 'task' ? Task : Service;
      await api.update(item.id, { assigned_to: newUserEmail });
      
      const destUser = users.find(u => u.email === newUserEmail);
      toast({
        title: "Movido com sucesso!",
        description: `Atribuído para ${destUser?.display_name || destUser?.full_name}`,
      });
      
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível mover o item.",
        variant: "destructive"
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedUserItems = selectedUserEmail ? (itemsByUser[selectedUserEmail] || []) : [];
  const filteredModalItems = selectedUserItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.displayProtocol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const selectedUserObj = users.find(u => u.email === selectedUserEmail);

  return (
    <>
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-full mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Carga Diária - Kanban
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Arraste itens e colunas para reorganizar</p>
            </div>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-2 border-gray-900 dark:border-slate-600 hover:bg-gray-900 hover:text-white dark:hover:bg-slate-700"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>

          {orderedUsers.length === 0 ? (
            <Card className="p-12 text-center dark:bg-slate-800 dark:border-slate-700">
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Nenhum item pendente encontrado
              </p>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="all-columns" direction="horizontal" type="column">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  >
                    {orderedUsers.map((user, index) => {
                      const userItems = itemsByUser[user.email] || [];
                      const visibleItems = userItems.slice(0, 15);
                      const hasMore = userItems.length > 15;

                      return (
                        <Draggable key={user.email} draggableId={user.email} index={index} type="column">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex flex-col h-full ${
                                snapshot.isDragging ? 'opacity-70 rotate-1' : ''
                              }`}
                            >
                              <Card className={`border-2 shadow-lg flex-1 flex flex-col transition-all dark:bg-slate-800 ${
                                snapshot.isDragging ? 'border-blue-400 shadow-2xl' : 'border-gray-200 dark:border-slate-700'
                              }`}>
                                <CardHeader 
                                  className="pb-3 border-b dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 cursor-pointer hover:from-blue-100 hover:to-indigo-100 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-colors"
                                  onClick={() => handleViewAllItems(user.email)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-blue-200 dark:hover:bg-slate-500 rounded transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1 flex items-center justify-between">
                                      <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                                        {user.display_name || user.full_name}
                                      </CardTitle>
                                      <Badge className="bg-blue-600 text-white text-base px-3 py-1">
                                        {userItems.length}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                                    Clique para ver todos • Arraste pela alça para mover coluna
                                  </p>
                                </CardHeader>

                                <Droppable droppableId={user.email} type="item">
                                  {(provided, snapshot) => (
                                    <CardContent
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`pt-4 space-y-2 flex-1 transition-colors ${
                                        snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-slate-700' : ''
                                      }`}
                                    >
                                      {visibleItems.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index} type="item">
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`p-3 bg-white dark:bg-slate-700 rounded-lg border-2 cursor-move hover:shadow-md transition-all ${
                                                snapshot.isDragging ? 'shadow-lg border-blue-400 rotate-2' : 'border-gray-200 dark:border-slate-600'
                                              }`}
                                              onClick={(e) => {
                                                if (!snapshot.isDragging) {
                                                  handleItemClick(item);
                                                }
                                              }}
                                            >
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">
                                                  {item.displayProtocol}
                                                </span>
                                                <Badge className={`${priorityColors[item.priority]} text-xs px-2 py-0.5`}>
                                                  {item.priority}
                                                </Badge>
                                              </div>
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                  {item.end_date ? format(parseDateAsLocal(item.end_date), "dd/MM", { locale: ptBR }) : '-'}
                                                </span>
                                                <Badge className={`${statusColors[item.status]} text-xs px-2 py-0.5`}>
                                                  {item.status}
                                                </Badge>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}
                                      {provided.placeholder}
                                      {hasMore && (
                                        <button
                                          onClick={() => handleViewAllItems(user.email)}
                                          className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium py-2 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
                                        >
                                          + {userItems.length - 15} itens adicionais
                                        </button>
                                      )}
                                      {userItems.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-8">
                                          Nenhum item
                                        </p>
                                      )}
                                    </CardContent>
                                  )}
                                </Droppable>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      <Dialog open={showAllItemsModal} onOpenChange={setShowAllItemsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                Todos os itens - {selectedUserObj?.display_name || selectedUserObj?.full_name}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAllItemsModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Total: {selectedUserItems.length} itens
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por protocolo ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Em Execução">Em Execução</SelectItem>
                <SelectItem value="Atrasada">Atrasada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {filteredModalItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum item encontrado</p>
              </div>
            ) : (
              filteredModalItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {item.displayProtocol}
                          </h3>
                          <Badge className={`${priorityColors[item.priority]}`}>
                            {item.priority}
                          </Badge>
                          <Badge className={`${statusColors[item.status]}`}>
                            {item.status}
                          </Badge>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Término: {item.end_date ? format(parseDateAsLocal(item.end_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}</span>
                          <span>Tipo: {item.type === 'task' ? 'Tarefa' : 'Serviço'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleItemClick(item)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </Button>
                        
                        {currentUser?.email === item.assigned_to && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteItem(item)}
                            className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Concluir
                          </Button>
                        )}

                        <Select onValueChange={(value) => handleMoveItem(item, value)}>
                          <SelectTrigger className="h-9">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="w-4 h-4" />
                              <span className="text-xs">Mover</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {users
                              .filter(u => u.email !== item.assigned_to)
                              .map(user => (
                                <SelectItem key={user.email} value={user.email}>
                                  {user.display_name || user.full_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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
          onUpdate={loadData}
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
          onUpdate={loadData}
        />
      )}

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          
          .grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </>
  );
}