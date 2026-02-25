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
  Target,
  Calendar,
  User,
  DollarSign,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import PlanoAcaoItemModal from "./PlanoAcaoItemModal";
import PlanoAcaoItemRow from "./PlanoAcaoItemRow";

const PlanoAcao = base44.entities.PlanoAcao;
const PlanoAcaoItem = base44.entities.PlanoAcaoItem;

export default function PlanoAcaoViewModal({ open, onClose, plano, items, users, categories, programs, onUpdate }) {
  const { toast } = useToast();
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEfficacy, setShowEfficacy] = useState(false);
  const [efficacyForm, setEfficacyForm] = useState({
    efficacy_description: "",
    efficacy_date: new Date().toISOString().split("T")[0],
  });

  if (!plano) return null;

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email || "Não definido";
  };

  const getStatusConfig = () => {
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
    if (!confirm("Tem certeza que deseja excluir esta ação?")) return;
    try {
      await PlanoAcaoItem.delete(itemId);
      toast({ title: "Sucesso", description: "Ação excluída" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir ação", variant: "destructive" });
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
      toast({ title: "Sucesso", description: "Plano concluído com sucesso" });
      onUpdate();
      setShowEfficacy(false);
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao concluir plano", variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              {plano.title}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Data de Criação</p>
                  <p className="font-medium">
                    {plano.start_date && format(new Date(plano.start_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Até Quando</p>
                  <p className="font-medium">
                    {plano.due_date && format(new Date(plano.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recursos (R$)</p>
                  <p className="font-medium">
                    {plano.resources?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Responsável</p>
                  <p className="font-medium">{getUserName(plano.responsible)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Categoria/Fundamento</p>
                  <p className="font-medium">{plano.category || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <Badge variant="outline">
                    {plano.type === "estrategico" ? "Estratégico" : "Operacional"}
                  </Badge>
                </div>
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
                </div>
              )}

              {/* Objective */}
              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-indigo-600 mb-1">Objetivo Estratégico:</p>
                  <p className="text-indigo-900">{plano.objective}</p>
                </CardContent>
              </Card>

              {/* Meeting Reference */}
              {plano.meeting_reference && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Memória de Reunião:</p>
                  <p className="text-blue-600 underline">{plano.meeting_reference}</p>
                </div>
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
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">O que fazer?</th>
                          <th className="px-3 py-2 text-left">Como?</th>
                          <th className="px-3 py-2 text-left">Onde?</th>
                          <th className="px-3 py-2 text-left">Quem?</th>
                          <th className="px-3 py-2 text-left">Delegado</th>
                          <th className="px-3 py-2 text-left">Nível</th>
                          <th className="px-3 py-2 text-left">Quando?</th>
                          <th className="px-3 py-2 text-left">Materiais?</th>
                          <th className="px-3 py-2 text-center">Acomp.</th>
                          <th className="px-3 py-2 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => (
                          <PlanoAcaoItemRow
                            key={item.id}
                            item={item}
                            users={users}
                            onEdit={() => handleEditItem(item)}
                            onDelete={() => handleDeleteItem(item.id)}
                            onUpdate={onUpdate}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Efficacy Section (for concluded) */}
              {plano.status === "concluido" && plano.efficacy_description && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-green-700 mb-2">Eficácia:</p>
                    <p className="text-green-900">{plano.efficacy_description}</p>
                    {plano.efficacy_date && (
                      <p className="text-sm text-green-600 mt-2">
                        Data Eficácia: {format(new Date(plano.efficacy_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Conclude Button */}
              {plano.status === "em_andamento" && progress === 100 && !showEfficacy && (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setShowEfficacy(true)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir Plano de Ação
                </Button>
              )}

              {/* Efficacy Form */}
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
                      <Button className="bg-green-600 hover:bg-green-700" onClick={handleConcludePlano}>
                        Confirmar Conclusão
                      </Button>
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