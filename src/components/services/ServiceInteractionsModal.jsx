import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ServiceInteraction } from "@/entities/ServiceInteraction";
import { User } from "@/entities/User";
import { X, Plus, MessageSquare, CheckCircle2, ArrowRight, Edit3, Building2 } from "lucide-react";
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
  comment: <MessageSquare className="w-4 h-4" />
};

const interactionColors = {
  created: "bg-blue-100 text-blue-800",
  updated: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  transferred: "bg-purple-100 text-purple-800",
  status_changed: "bg-orange-100 text-orange-800",
  department_changed: "bg-indigo-100 text-indigo-800",
  comment: "bg-gray-100 text-gray-800"
};

const interactionLabels = {
  created: "Criação",
  updated: "Atualização",
  completed: "Finalização",
  transferred: "Transferência",
  status_changed: "Mudança de Status",
  department_changed: "Mudança de Departamento",
  comment: "Comentário"
};

export default function ServiceInteractionsModal({ open, onClose, service, currentUser }) {
  const { toast } = useToast();
  const [interactions, setInteractions] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadInteractions();
    }
  }, [open, service]);

  const loadInteractions = async () => {
    try {
      const interactionsData = await ServiceInteraction.filter({ service_id: service.id }, "-created_date");
      setInteractions(interactionsData);
    } catch (error) {
      console.error("Erro ao carregar interações:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: "Erro",
        description: "Digite um comentário antes de adicionar.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await ServiceInteraction.create({
        service_id: service.id,
        interaction_type: "comment",
        message: newComment.trim(),
        user_email: currentUser.email,
        user_name: currentUser.full_name
      });

      toast({
        title: "Sucesso!",
        description: "Comentário adicionado com sucesso.",
      });

      setNewComment("");
      loadInteractions();
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Interações do Serviço</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Serviço Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900">{service.service_name}</h3>
            {service.description && (
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            )}
          </div>

          {/* Add Comment */}
          <div className="space-y-3">
            <Label>Adicionar Comentário</Label>
            <Textarea
              placeholder="Digite seu comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handleAddComment} 
              disabled={isSaving}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              {isSaving ? "Adicionando..." : "Adicionar Comentário"}
            </Button>
          </div>

          {/* Interactions Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Histórico de Interações</h4>
            
            {interactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhuma interação registrada ainda.</p>
            ) : (
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${interactionColors[interaction.interaction_type]} p-2 rounded-lg`}>
                        {interactionIcons[interaction.interaction_type]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${interactionColors[interaction.interaction_type]} border-0`}>
                            {interactionLabels[interaction.interaction_type]}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {format(new Date(interaction.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{interaction.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          por {interaction.user_name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}