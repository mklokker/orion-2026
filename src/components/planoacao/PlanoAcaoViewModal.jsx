import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Calendar,
  User,
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import PlanoAcaoItemModal from "./PlanoAcaoItemModal";

const PlanoAcao = base44.entities.PlanoAcao;
const PlanoAcaoItem = base44.entities.PlanoAcaoItem;

export default function PlanoAcaoViewModal({ open, onClose, plano, items, users, categories, indicators, objectives, atas, onUpdate }) {
  const { toast } = useToast();
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEfficacy, setShowEfficacy] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]);
  const [efficacyForm, setEfficacyForm] = useState({
    efficacy_description: "",
    efficacy_date: new Date().toISOString().split("T")[0],
  });

  if (!plano) return null;

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email || "Não definido";
  };

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || "-";
  const getIndicatorName = (id) => indicators.find(i => i.id === id)?.name || "-";
  const getObjectiveName = (id) => objectives.find(o => o.id === id)?.name || "-";
  const getAtaTitle = (id) => atas.find(a => a.id === id)?.title || "-";

  const getStatusConfig = () => {
    const isOverdue = new Date(plano.due_date) < new Date() && plano.status !== "concluido";
    if (plano.status === "concluido") return { label: "Concluído", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    if (isOverdue) return { label: "Atrasado", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    if (plano.status === "cancelado") return { label: "Cancelado", color: "bg-gray-100 text-gray-800", icon: Clock };
    return { label: "Em Andamento", color: "bg-blue-100 text-blue-800", icon: Clock };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const completedItems = items.filter(i => i.status === "realizada").length;
  const progress = items.length > 0 ? Math.round((completedItems / items.length) * 100) : 0;

  const handleAddItem = () => {
    setSelectedItem(null);
    setShowItemModal(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm("Excluir esta ação?")) return;
    try {
      await PlanoAcaoItem.delete(itemId);
      toast({ title: "Sucesso", description: "Ação excluída" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await PlanoAcaoItem.update(itemId, { status: newStatus });
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleConcludePlano = async () => {
    if (!efficacyForm.efficacy_description) {
      toast({ title: "Erro", description: "Preencha a descrição da eficácia", variant: "destructive" });
      return;
    }
    try {
      await PlanoAcao.update(plano.id, {
        status: "concluido",
        efficacy_description: efficacyForm.efficacy_description,
        efficacy_date: efficacyForm.efficacy_date,
      });
      toast({ title: "Sucesso", description: "Plano concluído" });
      onUpdate();
      setShowEfficacy(false);
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao concluir", variant: "destructive" });
    }
  };

  const getItemStatusConfig = (item) => {
    const isOverdue = item.status !== "realizada" && new Date(item.due_date) < new Date();
    if (item.status === "realizada") return { label: "Realizada", color: "bg-green-500 text-white" };
    if (isOverdue || item.status === "atrasada") return { label: "Atraso", color: "bg-red-500 text-white" };
    if (item.status === "em_andamento") return { label: "Em Andamento", color: "bg-blue-500 text-white" };
    return { label: "Pendente", color: "bg-gray-200 text-gray-700" };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              {plano.title}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="text-gray-500">Data de Criação</p>
                  <p className="font-medium">{plano.start_date && format(new Date(plano.start_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-gray-500">Até Quando</p>
                  <p className="font-medium">{plano.due_date && format(new Date(plano.due_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-gray-500">Recursos (R$)</p>
                  <p className="font-medium">{plano.resources?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Responsável</p>
                  <p className="font-medium">{getUserName(plano.responsible)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Categoria/Fundamento</p>
                  <p className="font-medium">{getCategoryName(plano.category_id)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tipo</p>
                  <Badge variant="outline">
                    {plano.type === "estrategico" ? "Estratégico" : plano.type === "tatico" ? "Tático" : "Operacional"}
                  </Badge>
                </div>
                {plano.indicator_id && (
                  <div>
                    <p className="text-gray-500">Indicador</p>
                    <p className="font-medium">{getIndicatorName(plano.indicator_id)}</p>
                  </div>
                )}
                {plano.ata_id && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Ata de Reunião</p>
                    <p className="font-medium text-blue-600">{getAtaTitle(plano.ata_id)}</p>
                  </div>
                )}
              </div>

              {/* Programs */}
              {plano.programs?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Programas e NBRs:</p>
                  <div className="flex flex-wrap gap-2">
                    {plano.programs.map((prog, idx) => (
                      <Badge key={idx} variant="secondary">(X) {prog}</Badge>
                    ))}
                  </div>
                  {plano.programs_outros && (
                    <p className="text-sm mt-2">Outros: {plano.programs_outros}</p>
                  )}
                </div>
              )}

              {/* Objective */}
              {plano.objective_id && (
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-indigo-600 mb-1">Objetivo Estratégico:</p>
                    <p className="text-indigo-900">{getObjectiveName(plano.objective_id)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">Progresso das Ações</p>
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-gray-500 mt-1">{completedItems} de {items.length} ações concluídas ({progress}%)</p>
              </div>

              <Separator />

              {/* Actions Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Ações (5W2H)</h3>
                  <Button size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Nova Ação
                  </Button>
                </div>

                {items.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      Nenhuma ação cadastrada. Adicione a primeira ação.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {items.sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => {
                      const itemStatus = getItemStatusConfig(item);
                      const isExpanded = expandedItems.includes(item.id);
                      
                      return (
                        <div key={item.id} className="border rounded-lg overflow-hidden">
                          {/* Linha resumida - clicável */}
                          <div 
                            className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 cursor-pointer"
                            onClick={() => setExpandedItems(prev => 
                              prev.includes(item.id) 
                                ? prev.filter(id => id !== item.id) 
                                : [...prev, item.id]
                            )}
                          >
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.what}</p>
                              <p className="text-xs text-gray-500">
                                {getUserName(item.who)} • {item.due_date && format(new Date(item.due_date), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
                                <SelectTrigger className={`h-7 text-xs w-28 ${itemStatus.color} border-0`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                  <SelectItem value="realizada">Realizada</SelectItem>
                                  <SelectItem value="atrasada">Atrasada</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteItem(item.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Detalhes expandidos */}
                          {isExpanded && (
                            <div className="border-t bg-gray-50 p-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">O que fazer?</p>
                                  <p className="font-medium">{item.what}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Como?</p>
                                  <p>{item.how || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Onde?</p>
                                  <p>{item.where || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Quem?</p>
                                  <p className="font-medium">{getUserName(item.who)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Delegado</p>
                                  <p>{item.delegate ? getUserName(item.delegate) : "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Nível</p>
                                  <p>{item.level === "determinar" ? "Determinar" : "Recomendar"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Quando?</p>
                                  <p>{item.due_date && format(new Date(item.due_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-gray-500 text-xs mb-1">Materiais</p>
                                  <p>{item.materials || "-"}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Efficacy */}
              {plano.status === "concluido" && plano.efficacy_description && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-green-700 mb-2">Eficácia:</p>
                    <p className="text-green-900">{plano.efficacy_description}</p>
                    {plano.efficacy_date && (
                      <p className="text-sm text-green-600 mt-2">Data Eficácia: {format(new Date(plano.efficacy_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {plano.status === "em_andamento" && progress === 100 && !showEfficacy && (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setShowEfficacy(true)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir Plano de Ação
                </Button>
              )}

              {showEfficacy && (
                <Card className="border-green-200">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-green-700">Registrar Eficácia</h4>
                    <div>
                      <Label>Descrição da Eficácia *</Label>
                      <Textarea
                        value={efficacyForm.efficacy_description}
                        onChange={(e) => setEfficacyForm({ ...efficacyForm, efficacy_description: e.target.value })}
                        placeholder="Descreva a eficácia das ações realizadas..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Data da Eficácia</Label>
                      <Input
                        type="date"
                        value={efficacyForm.efficacy_date}
                        onChange={(e) => setEfficacyForm({ ...efficacyForm, efficacy_date: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowEfficacy(false)}>Cancelar</Button>
                      <Button className="bg-green-600 hover:bg-green-700" onClick={handleConcludePlano}>Confirmar Conclusão</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <PlanoAcaoItemModal
        open={showItemModal}
        onClose={() => { setShowItemModal(false); setSelectedItem(null); }}
        onSave={onUpdate}
        planoId={plano?.id}
        item={selectedItem}
        users={users}
      />
    </>
  );
}