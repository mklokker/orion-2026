import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Settings,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

import CreatePlanoModal from "@/components/planoacao/CreatePlanoModal";
import PlanoAcaoViewModal from "@/components/planoacao/PlanoAcaoViewModal";
import CadastrosModal from "@/components/planoacao/CadastrosModal";

const PlanoAcao = base44.entities.PlanoAcao;
const PlanoAcaoItem = base44.entities.PlanoAcaoItem;
const PlanoAcaoCategoria = base44.entities.PlanoAcaoCategoria;
const PlanoAcaoIndicador = base44.entities.PlanoAcaoIndicador;
const PlanoAcaoObjetivo = base44.entities.PlanoAcaoObjetivo;
const PlanoAcaoPrograma = base44.entities.PlanoAcaoPrograma;
const AtaReuniao = base44.entities.AtaReuniao;
const User_ = base44.entities.User;

export default function PlanoAcaoPage() {
  const [planos, setPlanos] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [atas, setAtas] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCadastrosModal, setShowCadastrosModal] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planosData, itemsData, categoriesData, indicatorsData, objectivesData, programsData, atasData, usersData, userData] = await Promise.all([
        PlanoAcao.list("-created_date"),
        PlanoAcaoItem.list(),
        PlanoAcaoCategoria.list(),
        PlanoAcaoIndicador.list(),
        PlanoAcaoObjetivo.list(),
        PlanoAcaoPrograma.list(),
        AtaReuniao.list("-meeting_date"),
        User_.list(),
        base44.auth.me(),
      ]);
      setPlanos(planosData);
      setItems(itemsData);
      setCategories(categoriesData);
      setIndicators(indicatorsData);
      setObjectives(objectivesData);
      setPrograms(programsData);
      setAtas(atasData);
      setUsers(usersData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email || "Não definido";
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat?.name || "-";
  };

  const getIndicatorName = (id) => {
    const ind = indicators.find(i => i.id === id);
    return ind?.name || "-";
  };

  const getObjectiveName = (id) => {
    const obj = objectives.find(o => o.id === id);
    return obj?.name || "-";
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
      plano.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || plano.status === statusFilter;
    const matchesType = typeFilter === "all" || plano.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
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

  const getStatusConfig = (plano) => {
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
          <Button variant="outline" onClick={() => setShowCadastrosModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Cadastros
          </Button>
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
                placeholder="Buscar por título..."
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
                <SelectItem value="tatico">Tático</SelectItem>
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
            {filteredPlanos.map(plano => {
              const statusConfig = getStatusConfig(plano);
              const StatusIcon = statusConfig.icon;
              const progress = getPlanoProgress(plano.id);
              const planoItems = getPlanoItems(plano.id);

              return (
                <Card 
                  key={plano.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewPlano(plano)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Target className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{plano.title}</h3>
                            {plano.objective_id && (
                              <p className="text-sm text-indigo-600 mt-1">
                                <span className="font-medium">Objetivo:</span> {getObjectiveName(plano.objective_id)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          <Badge variant="outline">
                            {plano.type === "estrategico" ? "Estratégico" : plano.type === "tatico" ? "Tático" : "Operacional"}
                          </Badge>
                          {plano.category_id && (
                            <Badge variant="secondary">{getCategoryName(plano.category_id)}</Badge>
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

                      <div className="flex flex-col items-end gap-3 min-w-[200px]">
                        <div className="w-full">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">Progresso</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-gray-400 mt-1">
                            {planoItems.filter(i => i.status === "realizada").length}/{planoItems.length} ações
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
        indicators={indicators}
        objectives={objectives}
        programs={programs}
        atas={atas}
        users={users}
      />

      <PlanoAcaoViewModal
        open={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedPlano(null); }}
        plano={selectedPlano}
        items={selectedPlano ? getPlanoItems(selectedPlano.id) : []}
        users={users}
        categories={categories}
        indicators={indicators}
        objectives={objectives}
        atas={atas}
        onUpdate={loadData}
        onEdit={handleEditPlano}
      />

      <CadastrosModal
        open={showCadastrosModal}
        onClose={() => setShowCadastrosModal(false)}
        categories={categories}
        indicators={indicators}
        objectives={objectives}
        programs={programs}
        onUpdate={loadData}
      />
    </div>
  );
}