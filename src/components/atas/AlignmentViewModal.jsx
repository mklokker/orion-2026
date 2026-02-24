import React from "react";
import { TeamAlignment } from "@/entities/TeamAlignment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  Users, 
  Edit, 
  Trash2,
  CheckCircle2,
  AlertCircle
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

export default function AlignmentViewModal({ open, onClose, alignment, currentUser, users, isAdmin, onEdit, onDelete, onAcknowledge }) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [acknowledging, setAcknowledging] = React.useState(false);

  if (!alignment) return null;

  const isAcknowledged = alignment.acknowledged_by?.includes(currentUser?.email);

  const handleDelete = async () => {
    try {
      await TeamAlignment.delete(alignment.id);
      toast({ title: "Alinhamento excluído com sucesso!" });
      onDelete();
      onClose();
    } catch (error) {
      toast({ title: "Erro ao excluir alinhamento", variant: "destructive" });
    }
  };

  const handleAcknowledge = async () => {
    if (isAcknowledged) return;
    
    setAcknowledging(true);
    try {
      const newAcknowledged = [...(alignment.acknowledged_by || []), currentUser.email];
      await TeamAlignment.update(alignment.id, { acknowledged_by: newAcknowledged });
      toast({ title: "Leitura confirmada!" });
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

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={priorityColors[alignment.priority]}>
                    {priorityLabels[alignment.priority]}
                  </Badge>
                  <Badge variant="outline">{alignment.category}</Badge>
                  {isAcknowledged && (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      Lido
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

              <Separator />

              {/* Conteúdo */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Conteúdo do Alinhamento</h3>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-gray-800 whitespace-pre-wrap">{alignment.description}</p>
                </div>
              </div>

              <Separator />

              {/* Confirmações de leitura */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Confirmações de Leitura ({alignment.acknowledged_by?.length || 0})
                </h3>
                {alignment.acknowledged_by?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {alignment.acknowledged_by.map((email, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        {getUserName(email)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma confirmação ainda</p>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Botão de confirmação */}
          {!isAcknowledged && (
            <div className="pt-4 border-t">
              <Button 
                onClick={handleAcknowledge} 
                disabled={acknowledging}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                {acknowledging ? "Confirmando..." : "Confirmar Leitura"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Alinhamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este alinhamento? Esta ação não pode ser desfeita.
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
    </>
  );
}