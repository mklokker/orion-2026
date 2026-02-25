import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Target,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import PlanoAcaoCard from "@/components/planoacao/PlanoAcaoCard";
import CreatePlanoModal from "@/components/planoacao/CreatePlanoModal";
import PlanoAcaoViewModal from "@/components/planoacao/PlanoAcaoViewModal";
import PlanoAcaoConfigModal from "@/components/planoacao/PlanoAcaoConfigModal";

const PlanoAcao = base44.entities.PlanoAcao;
const PlanoAcaoItem = base44.entities.PlanoAcaoItem;
const PlanoAcaoCategoria = base44.entities.PlanoAcaoCategoria;
const PlanoAcaoPrograma = base44.entities.PlanoAcaoPrograma;
const User_ = base44.entities.User;

export default function PlanoAcaoPage() {
  const [planos, setPlanos] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planosData, itemsData, categoriesData, programsData, usersData, userData] = await Promise.all([
        PlanoAcao.list("-created_date"),
        PlanoAcaoItem.list(),
        PlanoAcaoCategoria.list(),
        PlanoAcaoPrograma.list(),
        User_.list(),
        User_.me(),
      ]);
      setPlanos(planosData);
      setItems(itemsData);
      setCategories(categoriesData);
      setPrograms(programsData);
      setUsers(usersData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const getPlanoItems = (planoId) => {
    return items.filter(item => item.plano_id === planoId);
  };

  const getPlanoProgress = (planoId) => {
    const planoItems = getPlanoItems(planoId);
    if (planoItems.length === 0) return 0;
    const completed = planoItems.filter(item => item.status === "realizada").length;
    return Math.round((completed / planoItems.length) * 100);
  };

  const filteredPlanos = planos.filter(plano => {
    const matchesSearch = 
      plano.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plano.objective?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || plano.status === statusFilter;
    const matchesType = typeFilter === "all" || plano.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || plano.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  const stats = {
    total: planos.length,
    emAndamento: planos.filter(p => p.status === "em_andamento").length,
    concluidos: planos.filter(p => p.status === "concluido").length,
    atrasados: planos.filter(p => {
      if (p.status === "concluido") return false;
      return new Date(p.due_date) < new Date();
    }).length,
  };

  const handleViewPlano = (plano) => {
    setSelectedPlano(plano);
    setShowViewModal(true);
  };

  const handleEditPlano = (plano) => {
    setSelectedPlano(plano);
    setShowCreateModal(true);
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" />
            Plano de Ação
          </h1>
          <p className="text-gray-500 mt-1">Gerencie objetivos estratégicos e ações</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowConfigModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          )}
          <Button onClick={() => { setSelectedPlano(null); setShowCreateModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Target className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total de Planos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
                <p className="text-sm text-gray-500">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.concluidos}</p>
                <p className="text-sm text-gray-500">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.atrasados}</p>
                <p className="text-sm text-gray-500">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por título ou objetivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="estrategico">Estratégico</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Planos List */}
      <ScrollArea className="h-[calc(100vh-450px)]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredPlanos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Nenhum plano encontrado</h3>
              <p className="text-gray-500 mt-1">Crie seu primeiro plano de ação</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPlanos.map(plano => (
              <PlanoAcaoCard
                key={plano.id}
                plano={plano}
                items={getPlanoItems(plano.id)}
                progress={getPlanoProgress(plano.id)}
                users={users}
                categories={categories}
                onView={() => handleViewPlano(plano)}
                onEdit={() => handleEditPlano(plano)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Modals */}
      <CreatePlanoModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSelectedPlano(null); }}
        onSave={loadData}
        plano={selectedPlano}
        categories={categories}
        programs={programs}
        users={users}
      />

      <PlanoAcaoViewModal
        open={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedPlano(null); }}
        plano={selectedPlano}
        items={selectedPlano ? getPlanoItems(selectedPlano.id) : []}
        users={users}
        categories={categories}
        programs={programs}
        onUpdate={loadData}
      />

      <PlanoAcaoConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        categories={categories}
        programs={programs}
        onUpdate={loadData}
      />
    </div>
  );
}