import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AlinhamentoViewModal({
  open,
  onClose,
  alinhamento,
  topicos,
  currentUser,
  isAdmin,
  users,
  categorias,
  onEdit,
  onDelete,
  onAcknowledge,
  onUpdate,
}) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);

  const vigentes = topicos.filter((t) => t.status === "vigente");
  const revogados = topicos.filter((t) => t.status === "revogado");

  const getCategoryColor = () => {
    const cat = categorias.find((c) => c.name === alinhamento?.category);
    return cat?.color || "#3B82F6";
  };

  const hasAcknowledged = (topico) => {
    return topico.acknowledged_by?.includes(currentUser?.email);
  };

  const getUserName = (email) => {
    const user = users.find((u) => u.email === email);
    return user?.full_name || email;
  };

  const handleAddTopic = async () => {
    if (!topicForm.title || !topicForm.content) {
      toast({ title: "Erro", description: "Preencha título e conteúdo.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await base44.entities.AlinhamentoTopico.create({
        alignment_id: alinhamento.id,
        title: topicForm.title,
        content: topicForm.content,
        order: vigentes.length,
        status: "vigente",
        acknowledged_by: [],
      });
      toast({ title: "Sucesso", description: "Tópico adicionado!" });
      setTopicForm({ title: "", content: "" });
      setShowAddTopic(false);
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao adicionar tópico.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTopic = async () => {
    if (!topicForm.title || !topicForm.content) {
      toast({ title: "Erro", description: "Preencha título e conteúdo.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await base44.entities.AlinhamentoTopico.update(editingTopic, {
        title: topicForm.title,
        content: topicForm.content,
      });
      toast({ title: "Sucesso", description: "Tópico atualizado!" });
      setTopicForm({ title: "", content: "" });
      setEditingTopic(null);
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeTopic = async (topicoId) => {
    setLoading(true);
    try {
      await base44.entities.AlinhamentoTopico.update(topicoId, {
        status: "revogado",
        revoked_at: new Date().toISOString(),
        revoked_by: currentUser?.email,
      });
      toast({ title: "Sucesso", description: "Tópico revogado!" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao revogar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async (topicoId) => {
    setLoading(true);
    try {
      await base44.entities.AlinhamentoTopico.delete(topicoId);
      toast({ title: "Sucesso", description: "Tópico excluído!" });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAll = async () => {
    setLoading(true);
    try {
      for (const topico of vigentes) {
        if (!hasAcknowledged(topico)) {
          await onAcknowledge(topico.id);
        }
      }
      toast({ title: "Sucesso", description: "Leitura confirmada em todos os tópicos!" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao confirmar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!alinhamento) return null;

  const allAcknowledged = vigentes.every((t) => hasAcknowledged(t));
  const pendingCount = vigentes.filter((t) => !hasAcknowledged(t)).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getCategoryColor() }}
                />
                <DialogTitle className="text-xl">{alinhamento.title}</DialogTitle>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={onEdit}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              {alinhamento.category}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {alinhamento.responsible}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {alinhamento.alignment_date
                ? format(new Date(alinhamento.alignment_date), "dd/MM/yyyy", { locale: ptBR })
                : "-"}
            </div>
          </div>

          {alinhamento.description && (
            <p className="text-gray-700 mb-4">{alinhamento.description}</p>
          )}

          <Separator />

          <div className="flex items-center justify-between py-3">
            <h3 className="font-semibold">Tópicos Vigentes ({vigentes.length})</h3>
            <div className="flex gap-2">
              {!allAcknowledged && pendingCount > 0 && (
                <Button size="sm" variant="outline" onClick={handleAcknowledgeAll} disabled={loading}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Confirmar Todos ({pendingCount})
                </Button>
              )}
              {isAdmin && (
                <Button size="sm" onClick={() => setShowAddTopic(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Tópico
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Form de adicionar/editar tópico */}
              {(showAddTopic || editingTopic) && (
                <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                  <div>
                    <Label>Título *</Label>
                    <Input
                      value={topicForm.title}
                      onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                      placeholder="Título do tópico"
                    />
                  </div>
                  <div>
                    <Label>Conteúdo *</Label>
                    <Textarea
                      value={topicForm.content}
                      onChange={(e) => setTopicForm({ ...topicForm, content: e.target.value })}
                      placeholder="Conteúdo do tópico"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={editingTopic ? handleUpdateTopic : handleAddTopic}
                      disabled={loading}
                    >
                      {loading ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddTopic(false);
                        setEditingTopic(null);
                        setTopicForm({ title: "", content: "" });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de tópicos vigentes */}
              {vigentes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum tópico vigente.</p>
              ) : (
                vigentes.map((topico, index) => {
                  const acknowledged = hasAcknowledged(topico);
                  return (
                    <div
                      key={topico.id}
                      className={`p-4 rounded-lg border ${
                        acknowledged ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-500">#{index + 1}</span>
                          <h4 className="font-medium">{topico.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {acknowledged ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Lido
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAcknowledge(topico.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirmar Leitura
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTopic(topico.id);
                                  setTopicForm({ title: topico.title, content: topico.content });
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRevokeTopic(topico.id)}
                              >
                                <XCircle className="w-4 h-4 text-orange-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteTopic(topico.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{topico.content}</p>
                      {topico.acknowledged_by?.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Confirmado por: {topico.acknowledged_by.map(getUserName).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Tópicos revogados */}
              {revogados.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h4 className="font-semibold text-gray-500">Tópicos Revogados ({revogados.length})</h4>
                  {revogados.map((topico) => (
                    <div
                      key={topico.id}
                      className="p-4 rounded-lg bg-gray-100 border border-gray-200 opacity-60"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <h4 className="font-medium line-through">{topico.title}</h4>
                      </div>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{topico.content}</p>
                      {topico.revoked_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Revogado em {format(new Date(topico.revoked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          {topico.revoked_by && ` por ${getUserName(topico.revoked_by)}`}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Alinhamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os tópicos associados também serão excluídos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}