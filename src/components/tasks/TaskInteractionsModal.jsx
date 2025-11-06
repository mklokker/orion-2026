import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TaskInteraction } from "@/entities/TaskInteraction";
import { User } from "@/entities/User";
import { X, Plus, MessageSquare, CheckCircle2, ArrowRight, Edit3, Building2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

const interactionIcons = {
  created: <Plus className="w-4 h-4" />,
  updated: <Edit3 className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  transferred: <ArrowRight className="w-4 h-4" />,
  status_changed: <Edit3 className="w-4 h-4" />,
  department_changed: <Building2 className="w-4 h-4" />,
  comment: <MessageSquare className="w-4 h-4" />,
  deleted: <Trash2 className="w-4 h-4" />
};

const interactionColors = {
  created: "bg-blue-100 text-blue-800",
  updated: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  transferred: "bg-purple-100 text-purple-800",
  status_changed: "bg-orange-100 text-orange-800",
  department_changed: "bg-indigo-100 text-indigo-800",
  comment: "bg-gray-100 text-gray-800",
  deleted: "bg-red-100 text-red-800"
};

const interactionLabels = {
  created: "Criação",
  updated: "Atualização",
  completed: "Finalização",
  transferred: "Transferência",
  status_changed: "Mudança de Status",
  department_changed: "Mudança de Departamento",
  comment: "Comentário",
  deleted: "Exclusão"
};

export default function TaskInteractionsModal({ open, onClose, task }) {
  const { toast } = useToast();
  const [interactions, setInteractions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, task]);

  const loadData = async () => {
    try {
      const [interactionsData, userData] = await Promise.all([
        TaskInteraction.filter({ task_id: task.id }, "-created_date"),
        User.me()
      ]);
      setInteractions(interactionsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Erro ao carregar interações:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSaving(true);
    try {
      await TaskInteraction.create({
        task_id: task.id,
        interaction_type: "comment",
        message: newComment,
        user_email: currentUser.email,
        user_name: currentUser.full_name
      });

      toast({
        title: "Sucesso!",
        description: "Comentário adicionado com sucesso.",
      });

      setNewComment("");
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário.",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Interações — {task.protocol}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Histórico */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Histórico</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {interactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma interação registrada</p>
              ) : (
                interactions.map((interaction) => (
                  <div 
                    key={interaction.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      interaction.interaction_type === "completed" ? "border-green-500 bg-green-50" :
                      interaction.interaction_type === "comment" ? "border-gray-500 bg-white" :
                      "border-blue-500 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{interaction.user_name}</span>
                        <Badge className={`${interactionColors[interaction.interaction_type]} border-0 text-xs`}>
                          <span className="mr-1">{interactionIcons[interaction.interaction_type]}</span>
                          {interactionLabels[interaction.interaction_type]}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(interaction.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{interaction.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adicionar nova interação */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-lg">Adicionar novas interações</h3>
            <div className="space-y-3">
              <Label>Interação 1</Label>
              <Textarea
                placeholder="Descreva a etapa, comentário ou interação realizada..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button 
            onClick={handleAddComment}
            disabled={isSaving || !newComment.trim()}
            className="gap-2"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}