import React, { useState } from "react";
import { TeamAlignment } from "@/entities/TeamAlignment";
import { AlignmentTopic } from "@/entities/AlignmentTopic";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  Users, 
  Edit, 
  Trash2,
  CheckCircle2,
  Plus,
  AlertTriangle,
  ArrowRight,
  X,
  Tag
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const priorityColors = {
  baixa: "bg-gray-100 text-gray-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700"
};

const priorityLabels = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente"
};

export default function AlignmentViewModal({ 
  open, 
  onClose, 
  alignment, 
  topics = [], 
  allTopics = [],
  currentUser, 
  users, 
  isAdmin, 
  onEdit, 
  onDelete, 
  onAcknowledge,
  onTopicsChange
}) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  
  // Topic management
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicContent, setTopicContent] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);
  
  // Revoke management
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [topicToRevoke, setTopicToRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [createReplacement, setCreateReplacement] = useState(false);
  const [replacementTitle, setReplacementTitle] = useState("");
  const [replacementContent, setReplacementContent] = useState("");

  if (!alignment) return null;

  const sortedTopics = [...topics].sort((a, b) => (a.order || 0) - (b.order || 0));
  const vigentTopics = sortedTopics.filter(t => t.status === 'vigente');
  const revokedTopics = sortedTopics.filter(t => t.status === 'revogado');
  
  const acknowledgedTopicsCount = vigentTopics.filter(t => t.acknowledged_by?.includes(currentUser?.email)).length;
  const isFullyAcknowledged = vigentTopics.length > 0 && acknowledgedTopicsCount === vigentTopics.length;

  const handleDelete = async () => {
    try {
      // Delete all topics first
      for (const topic of topics) {
        await AlignmentTopic.delete(topic.id);
      }
      await TeamAlignment.delete(alignment.id);
      toast({ title: "Alinhamento excluído com sucesso!" });
      onDelete();
      onClose();
    } catch (error) {
      toast({ title: "Erro ao excluir alinhamento", variant: "destructive" });
    }
  };

  const handleAcknowledgeTopic = async (topic) => {
    if (topic.acknowledged_by?.includes(currentUser?.email)) return;
    
    try {
      const newAcknowledged = [...(topic.acknowledged_by || []), currentUser.email];
      await AlignmentTopic.update(topic.id, { acknowledged_by: newAcknowledged });
      toast({ title: "Leitura do tópico confirmada!" });
      onAcknowledge();
    } catch (error) {
      toast({ title: "Erro ao confirmar leitura", variant: "destructive" });
    }
  };

  const handleAcknowledgeAll = async () => {
    const unacknowledgedTopics = vigentTopics.filter(t => !t.acknowledged_by?.includes(currentUser?.email));
    if (unacknowledgedTopics.length === 0) return;
    
    setAcknowledging(true);
    try {
      for (const topic of unacknowledgedTopics) {
        const newAcknowledged = [...(topic.acknowledged_by || []), currentUser.email];
        await AlignmentTopic.update(topic.id, { acknowledged_by: newAcknowledged });
      }
      toast({ title: `${unacknowledgedTopics.length} tópico(s) confirmado(s)!` });
      onAcknowledge();
    } catch (error) {
      toast({ title: "Erro ao confirmar leitura", variant: "destructive" });
    } finally {
      setAcknowledging(false);
    }
  };

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email;
  };

  // Topic CRUD
  const handleAddTopic = () => {
    setEditingTopic(null);
    setTopicTitle("");
    setTopicContent("");
    setShowTopicForm(true);
  };

  const handleEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicTitle(topic.title);
    setTopicContent(topic.content);
    setShowTopicForm(true);
  };

  const handleSaveTopic = async () => {
    if (!topicTitle.trim() || !topicContent.trim()) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }

    setSavingTopic(true);
    try {
      if (editingTopic) {
        await AlignmentTopic.update(editingTopic.id, {
          title: topicTitle.trim(),
          content: topicContent.trim()
        });
        toast({ title: "Tópico atualizado!" });
      } else {
        await AlignmentTopic.create({
          alignment_id: alignment.id,
          title: topicTitle.trim(),
          content: topicContent.trim(),
          order: topics.length,
          status: "vigente"
        });
        toast({ title: "Tópico adicionado!" });
      }
      setShowTopicForm(false);
      setEditingTopic(null);
      setTopicTitle("");
      setTopicContent("");
      onTopicsChange();
    } catch (error) {
      toast({ title: "Erro ao salvar tópico", variant: "destructive" });
    } finally {
      setSavingTopic(false);
    }
  };

  const handleDeleteTopic = async (topic) => {
    try {
      await AlignmentTopic.delete(topic.id);
      toast({ title: "Tópico excluído!" });
      onTopicsChange();
    } catch (error) {
      toast({ title: "Erro ao excluir tópico", variant: "destructive" });
    }
  };

  // Revoke
  const openRevokeDialog = (topic) => {
    setTopicToRevoke(topic);
    setRevokeReason("");
    setCreateReplacement(false);
    setReplacementTitle(topic.title + " (Atualizado)");
    setReplacementContent("");
    setShowRevokeDialog(true);
  };

  const handleRevoke = async () => {
    if (!topicToRevoke) return;

    try {
      let replacementTopicId = null;

      // Create replacement topic if requested
      if (createReplacement && replacementTitle.trim() && replacementContent.trim()) {
        const newTopic = await AlignmentTopic.create({
          alignment_id: alignment.id,
          title: replacementTitle.trim(),
          content: replacementContent.trim(),
          order: topicToRevoke.order,
          status: "vigente",
          replaces_topic_id: topicToRevoke.id
        });
        replacementTopicId = newTopic.id;
      }

      // Revoke the original topic
      await AlignmentTopic.update(topicToRevoke.id, {
        status: "revogado",
        revoked_at: new Date().toISOString(),
        revoked_by: currentUser.email,
        revoked_reason: revokeReason.trim() || null,
        replaced_by_topic_id: replacementTopicId
      });

      toast({ title: createReplacement ? "Tópico revogado e substituído!" : "Tópico revogado!" });
      setShowRevokeDialog(false);
      setTopicToRevoke(null);
      onTopicsChange();
    } catch (error) {
      toast({ title: "Erro ao revogar tópico", variant: "destructive" });
    }
  };

  const getReplacementTopic = (topicId) => {
    return allTopics.find(t => t.id === topicId);
  };

  const scrollToTopic = (topicId) => {
    const element = document.getElementById(`topic-${topicId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2000);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={priorityColors[alignment.priority]}>
                    {priorityLabels[alignment.priority]}
                  </Badge>
                  <Badge variant="outline">{alignment.category}</Badge>
                  {vigentTopics.length > 0 && (
                    <Badge variant="outline" className={`gap-1 ${isFullyAcknowledged ? 'text-green-600 border-green-600' : 'text-orange-600 border-orange-600'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {acknowledgedTopicsCount}/{vigentTopics.length} tópico(s) lido(s)
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{alignment.title}</DialogTitle>
              </div>
              {isAdmin && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => onEdit(alignment)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Informações */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(alignment.alignment_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{alignment.responsible}</span>
                </div>
              </div>

              {/* Descrição geral */}
              {alignment.description && (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-800 whitespace-pre-wrap">{alignment.description}</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Tópicos Vigentes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tópicos Vigentes ({vigentTopics.length})
                  </h3>
                  {isAdmin && (
                    <Button size="sm" onClick={handleAddTopic} className="gap-1">
                      <Plus className="w-4 h-4" />
                      Novo Tópico
                    </Button>
                  )}
                </div>

                {/* Topic Form */}
                {showTopicForm && (
                  <div className="p-4 border rounded-lg bg-blue-50 mb-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Título do Tópico *</Label>
                      <Input 
                        value={topicTitle} 
                        onChange={(e) => setTopicTitle(e.target.value)}
                        placeholder="Título do tópico"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conteúdo *</Label>
                      <Textarea 
                        value={topicContent} 
                        onChange={(e) => setTopicContent(e.target.value)}
                        placeholder="Conteúdo do tópico..."
                        rows={5}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowTopicForm(false)}>Cancelar</Button>
                      <Button onClick={handleSaveTopic} disabled={savingTopic}>
                        {savingTopic ? "Salvando..." : (editingTopic ? "Atualizar" : "Adicionar")}
                      </Button>
                    </div>
                  </div>
                )}

                {vigentTopics.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum tópico vigente</p>
                ) : (
                  <div className="space-y-3">
                    {vigentTopics.map((topic, idx) => {
                      const isTopicAcknowledged = topic.acknowledged_by?.includes(currentUser?.email);
                      return (
                        <div 
                          key={topic.id} 
                          id={`topic-${topic.id}`}
                          className={`p-4 border rounded-lg transition-all ${isTopicAcknowledged ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{idx + 1}. {topic.title}</h4>
                              {isTopicAcknowledged && (
                                <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Lido
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {!isTopicAcknowledged && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => handleAcknowledgeTopic(topic)}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Confirmar
                                </Button>
                              )}
                              {isAdmin && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTopic(topic)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-orange-600" 
                                    onClick={() => openRevokeDialog(topic)}
                                    title="Revogar tópico"
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-red-600" 
                                    onClick={() => handleDeleteTopic(topic)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{topic.content}</p>
                          {topic.replaces_topic_id && (
                            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              Este tópico substitui um tópico anterior revogado
                            </p>
                          )}
                          {topic.acknowledged_by?.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500">
                                {topic.acknowledged_by.length} pessoa(s) confirmaram: {topic.acknowledged_by.map(e => getUserName(e)).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tópicos Revogados */}
              {revokedTopics.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-gray-500 flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4" />
                      Tópicos Revogados ({revokedTopics.length})
                    </h3>
                    <div className="space-y-3">
                      {revokedTopics.map((topic) => {
                        const replacement = topic.replaced_by_topic_id ? getReplacementTopic(topic.replaced_by_topic_id) : null;
                        return (
                          <div 
                            key={topic.id} 
                            id={`topic-${topic.id}`}
                            className="p-4 border border-red-200 rounded-lg bg-red-50 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-gray-500 line-through">{topic.title}</h4>
                              <Badge variant="outline" className="text-red-600 border-red-300">Revogado</Badge>
                            </div>
                            <p className="text-gray-500 whitespace-pre-wrap line-through">{topic.content}</p>
                            
                            {topic.revoked_at && (
                              <p className="text-xs text-gray-400 mt-2">
                                Revogado em {format(new Date(topic.revoked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {topic.revoked_by && ` por ${getUserName(topic.revoked_by)}`}
                              </p>
                            )}
                            {topic.revoked_reason && (
                              <p className="text-xs text-gray-500 mt-1">
                                <strong>Motivo:</strong> {topic.revoked_reason}
                              </p>
                            )}
                            
                            {replacement && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="mt-2 text-blue-600 p-0 h-auto"
                                onClick={() => scrollToTopic(replacement.id)}
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Ver tópico substituto: {replacement.title}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}


            </div>
          </ScrollArea>

          {/* Botão de confirmação de todos */}
          {!isFullyAcknowledged && vigentTopics.length > 0 && (
            <div className="pt-4 border-t">
              <Button 
                onClick={handleAcknowledgeAll} 
                disabled={acknowledging}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                {acknowledging ? "Confirmando..." : `Confirmar Todos os Tópicos (${vigentTopics.length - acknowledgedTopicsCount} pendente(s))`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alignment Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Alinhamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este alinhamento e todos os seus tópicos? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Topic Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Revogar Tópico
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                <p>Você está revogando o tópico: <strong>{topicToRevoke?.title}</strong></p>
                <p className="text-sm">O texto original será mantido, porém marcado como revogado (cortado).</p>
                
                <div className="space-y-2">
                  <Label>Motivo da Revogação (opcional)</Label>
                  <Textarea 
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Ex: Atualizado conforme nova normativa..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="createReplacement"
                    checked={createReplacement}
                    onChange={(e) => setCreateReplacement(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="createReplacement" className="text-sm font-medium">
                    Criar tópico substituto
                  </label>
                </div>

                {createReplacement && (
                  <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Título do Novo Tópico *</Label>
                      <Input 
                        value={replacementTitle}
                        onChange={(e) => setReplacementTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conteúdo do Novo Tópico *</Label>
                      <Textarea 
                        value={replacementContent}
                        onChange={(e) => setReplacementContent(e.target.value)}
                        placeholder="Novo conteúdo..."
                        rows={4}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevoke} 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={createReplacement && (!replacementTitle.trim() || !replacementContent.trim())}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}