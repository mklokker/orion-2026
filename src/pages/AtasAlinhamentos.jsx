import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Users,
  Calendar,
  Tag,
  Settings,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Trash2,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

import CreateAlinhamentoModal from "@/components/atas/CreateAlinhamentoModal";
import CreateAtaModal from "@/components/atas/CreateAtaModal";
import AlinhamentoViewModal from "@/components/atas/AlinhamentoViewModal";
import AtaViewModal from "@/components/atas/AtaViewModal";
import CategoriaManagerModal from "@/components/atas/CategoriaManagerModal";
import AuditLogModal from "@/components/atas/AuditLogModal.jsx";
import DeletedItemsTab from "@/components/atas/DeletedItemsTab.jsx";

export default function AtasAlinhamentos() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("alinhamentos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Data
  const [alinhamentos, setAlinhamentos] = useState([]);
  const [topicos, setTopicos] = useState([]);
  const [atas, setAtas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [users, setUsers] = useState([]);

  // Modals
  const [showCreateAlinhamento, setShowCreateAlinhamento] = useState(false);
  const [showCreateAta, setShowCreateAta] = useState(false);
  const [showCategoriaManager, setShowCategoriaManager] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedAlinhamento, setSelectedAlinhamento] = useState(null);
  const [selectedAta, setSelectedAta] = useState(null);
  const [editingAlinhamento, setEditingAlinhamento] = useState(null);
  const [editingAta, setEditingAta] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      setCurrentUser(user);
      setIsAdmin(user?.role === "admin");

      const [alinhamentosData, topicosData, atasData, categoriasData, usersData] = await Promise.all([
        base44.entities.Alinhamento.list(),
        base44.entities.AlinhamentoTopico.list(),
        base44.entities.AtaReuniao.list(),
        base44.entities.AlinhamentoCategoria.list(),
        base44.functions.invoke('listAllUsers').then(res => res.data?.users || []).catch(() => []),
      ]);

      setAlinhamentos(alinhamentosData || []);
      setTopicos(topicosData || []);
      setAtas(atasData || []);
      setCategorias(categoriasData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTopicosForAlinhamento = (alinhamentoId) => {
    return topicos.filter((t) => t.alignment_id === alinhamentoId);
  };

  const getCategoryColor = (categoryName) => {
    const cat = categorias.find((c) => c.name === categoryName);
    return cat?.color || "#3B82F6";
  };

  const getPriorityBadge = (priority) => {
    const config = {
      baixa: { label: "Baixa", className: "bg-green-100 text-green-800", icon: Clock },
      media: { label: "Média", className: "bg-yellow-100 text-yellow-800", icon: Clock },
      alta: { label: "Alta", className: "bg-orange-100 text-orange-800", icon: AlertTriangle },
      urgente: { label: "Urgente", className: "bg-red-100 text-red-800", icon: Zap },
    };
    return config[priority] || config.media;
  };

  // Filtros case insensitive - excluir itens deletados
  const filteredAlinhamentos = alinhamentos.filter((a) => {
    if (a.is_deleted) return false;
    const matchesSearch =
      !searchQuery ||
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.responsible?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAtas = atas.filter((a) => {
    if (a.is_deleted) return false;
    const matchesSearch =
      !searchQuery ||
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.responsible?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Função para registrar log
  const logAction = async (action, entityType, entityId, entityTitle, details = "", oldData = null) => {
    try {
      await base44.entities.AtasAlinhamentosLog.create({
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_title: entityTitle,
        user_email: currentUser?.email,
        user_name: currentUser?.display_name || currentUser?.full_name || currentUser?.email,
        details,
        old_data: oldData,
      });
    } catch (error) {
      console.error("Erro ao registrar log:", error);
    }
  };

  const handleSaveAlinhamento = async (isNew = false, title = "") => {
    if (isNew && title) {
      await logAction("create", "alinhamento", "", title, "Alinhamento criado");
    } else if (editingAlinhamento) {
      await logAction("update", "alinhamento", editingAlinhamento.id, editingAlinhamento.title, "Alinhamento atualizado");
    }
    await loadData();
    setShowCreateAlinhamento(false);
    setEditingAlinhamento(null);
  };

  const handleSaveAta = async (isNew = false, title = "") => {
    if (isNew && title) {
      await logAction("create", "ata", "", title, "Ata criada");
    } else if (editingAta) {
      await logAction("update", "ata", editingAta.id, editingAta.title, "Ata atualizada");
    }
    await loadData();
    setShowCreateAta(false);
    setEditingAta(null);
  };

  const handleDeleteAlinhamento = async (id) => {
    try {
      const alinhamento = alinhamentos.find(a => a.id === id);
      // Soft delete - apenas marca como excluído
      await base44.entities.Alinhamento.update(id, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser?.email,
      });
      await logAction("delete", "alinhamento", id, alinhamento?.title, "Alinhamento movido para lixeira", alinhamento);
      toast({ title: "Sucesso", description: "Alinhamento movido para lixeira." });
      await loadData();
      setSelectedAlinhamento(null);
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
    }
  };

  const handleDeleteAta = async (id) => {
    try {
      const ata = atas.find(a => a.id === id);
      // Soft delete - apenas marca como excluído
      await base44.entities.AtaReuniao.update(id, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser?.email,
      });
      await logAction("delete", "ata", id, ata?.title, "Ata movida para lixeira", ata);
      toast({ title: "Sucesso", description: "Ata movida para lixeira." });
      await loadData();
      setSelectedAta(null);
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
    }
  };

  const handleRestoreAlinhamento = async (id) => {
    try {
      const alinhamento = alinhamentos.find(a => a.id === id);
      await base44.entities.Alinhamento.update(id, {
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      });
      await logAction("restore", "alinhamento", id, alinhamento?.title, "Alinhamento restaurado da lixeira");
      toast({ title: "Sucesso", description: "Alinhamento restaurado." });
      await loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao restaurar.", variant: "destructive" });
    }
  };

  const handleRestoreAta = async (id) => {
    try {
      const ata = atas.find(a => a.id === id);
      await base44.entities.AtaReuniao.update(id, {
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      });
      await logAction("restore", "ata", id, ata?.title, "Ata restaurada da lixeira");
      toast({ title: "Sucesso", description: "Ata restaurada." });
      await loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao restaurar.", variant: "destructive" });
    }
  };

  const handlePermanentDelete = async (type, id) => {
    try {
      if (type === "alinhamento") {
        const topicosToDelete = topicos.filter((t) => t.alignment_id === id);
        for (const topico of topicosToDelete) {
          await base44.entities.AlinhamentoTopico.delete(topico.id);
        }
        await base44.entities.Alinhamento.delete(id);
      } else {
        await base44.entities.AtaReuniao.delete(id);
      }
      toast({ title: "Sucesso", description: "Item excluído permanentemente." });
      await loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir permanentemente.", variant: "destructive" });
    }
  };

  const handleAcknowledgeTopic = async (topicoId) => {
    try {
      const topico = topicos.find((t) => t.id === topicoId);
      if (!topico || !currentUser) return;

      const acknowledgedBy = topico.acknowledged_by || [];
      if (acknowledgedBy.includes(currentUser.email)) return;

      await base44.entities.AlinhamentoTopico.update(topicoId, {
        acknowledged_by: [...acknowledgedBy, currentUser.email],
      });
      toast({ title: "Sucesso", description: "Leitura confirmada!" });
      await loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao confirmar leitura.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Atas e Alinhamentos</h1>
          <p className="text-gray-500 mt-1">Gerencie atas de reunião e alinhamentos da equipe</p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowAuditLog(true)}>
              <History className="w-4 h-4 mr-2" />
              Auditoria
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowCategoriaManager(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Categorias
          </Button>
          {activeTab === "alinhamentos" ? (
            <Button onClick={() => setShowCreateAlinhamento(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Alinhamento
            </Button>
          ) : activeTab === "atas" ? (
            <Button onClick={() => setShowCreateAta(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Ata
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isAdmin ? "grid-cols-3" : "grid-cols-2"} max-w-xl`}>
          <TabsTrigger value="alinhamentos" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Alinhamentos ({filteredAlinhamentos.length})
          </TabsTrigger>
          <TabsTrigger value="atas" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Atas ({filteredAtas.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="excluidos" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Excluídos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="alinhamentos" className="mt-6">
          {filteredAlinhamentos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum alinhamento encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAlinhamentos.map((alinhamento) => {
                const alinhamentoTopicos = getTopicosForAlinhamento(alinhamento.id);
                const vigentes = alinhamentoTopicos.filter((t) => t.status === "vigente");
                const priority = getPriorityBadge(alinhamento.priority);
                const PriorityIcon = priority.icon;

                return (
                  <Card
                    key={alinhamento.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedAlinhamento(alinhamento)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(alinhamento.category) }}
                        />
                        <Badge className={priority.className}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {priority.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{alinhamento.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          {alinhamento.category}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {alinhamento.responsible}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {alinhamento.alignment_date
                            ? format(new Date(alinhamento.alignment_date), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {vigentes.length} tópico(s) vigente(s)
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="atas" className="mt-6">
          {filteredAtas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma ata encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAtas.map((ata) => (
                <Card
                  key={ata.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedAta(ata)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{ata.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      {ata.category && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          {ata.category}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {ata.responsible}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {ata.meeting_date
                          ? format(new Date(ata.meeting_date), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                        {ata.meeting_time && ` às ${ata.meeting_time}`}
                      </div>
                      {ata.participants?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {ata.participants.length} participante(s)
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="excluidos" className="mt-6">
            <DeletedItemsTab
              alinhamentos={alinhamentos.filter(a => a.is_deleted)}
              atas={atas.filter(a => a.is_deleted)}
              users={users}
              onRestoreAlinhamento={handleRestoreAlinhamento}
              onRestoreAta={handleRestoreAta}
              onPermanentDelete={handlePermanentDelete}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      <CreateAlinhamentoModal
        open={showCreateAlinhamento}
        onClose={() => {
          setShowCreateAlinhamento(false);
          setEditingAlinhamento(null);
        }}
        onSave={handleSaveAlinhamento}
        alinhamento={editingAlinhamento}
        categorias={categorias}
        users={users}
      />

      <CreateAtaModal
        open={showCreateAta}
        onClose={() => {
          setShowCreateAta(false);
          setEditingAta(null);
        }}
        onSave={handleSaveAta}
        ata={editingAta}
        categorias={categorias}
        users={users}
      />

      <CategoriaManagerModal
        open={showCategoriaManager}
        onClose={() => setShowCategoriaManager(false)}
        categorias={categorias}
        onUpdate={loadData}
      />

      {isAdmin && (
        <AuditLogModal
          open={showAuditLog}
          onClose={() => setShowAuditLog(false)}
          users={users}
        />
      )}

      {selectedAlinhamento && (
        <AlinhamentoViewModal
          open={!!selectedAlinhamento}
          onClose={() => setSelectedAlinhamento(null)}
          alinhamento={selectedAlinhamento}
          topicos={getTopicosForAlinhamento(selectedAlinhamento.id)}
          currentUser={currentUser}
          isAdmin={true}
          users={users}
          categorias={categorias}
          onEdit={() => {
            setEditingAlinhamento(selectedAlinhamento);
            setSelectedAlinhamento(null);
            setShowCreateAlinhamento(true);
          }}
          onDelete={() => handleDeleteAlinhamento(selectedAlinhamento.id)}
          onAcknowledge={handleAcknowledgeTopic}
          onUpdate={loadData}
        />
      )}

      {selectedAta && (
        <AtaViewModal
          open={!!selectedAta}
          onClose={() => setSelectedAta(null)}
          ata={selectedAta}
          isAdmin={true}
          users={users}
          onEdit={() => {
            setEditingAta(selectedAta);
            setSelectedAta(null);
            setShowCreateAta(true);
          }}
          onDelete={() => handleDeleteAta(selectedAta.id)}
        />
      )}
    </div>
  );
}