import React from "react";
import { MeetingMinutes } from "@/entities/MeetingMinutes";
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
  Clock, 
  MapPin, 
  Users, 
  Edit, 
  Trash2,
  CheckCircle2,
  XCircle,
  FileText
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

export default function MeetingMinutesViewModal({ open, onClose, meeting, users, isAdmin, onEdit, onDelete }) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  if (!meeting) return null;

  const handleDelete = async () => {
    try {
      await MeetingMinutes.delete(meeting.id);
      toast({ title: "Ata excluída com sucesso!" });
      onDelete();
      onClose();
    } catch (error) {
      toast({ title: "Erro ao excluir ata", variant: "destructive" });
    }
  };

  const ControlItem = ({ label, checked }) => (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-300" />
      )}
      <span className={checked ? "text-gray-900" : "text-gray-400"}>{label}</span>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">{meeting.title}</DialogTitle>
                {meeting.category && (
                  <Badge variant="outline" className="mt-2">{meeting.category}</Badge>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(meeting)}>
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
              {/* Informações básicas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{format(new Date(meeting.meeting_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                {meeting.meeting_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{meeting.meeting_time}</span>
                  </div>
                )}
                {meeting.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{meeting.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>{meeting.responsible}</span>
                </div>
              </div>

              {/* Pauta */}
              {meeting.agenda && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Pauta</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{meeting.agenda}</p>
                </div>
              )}

              <Separator />

              {/* Participantes */}
              {meeting.participants?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Participantes</h3>
                  <div className="flex flex-wrap gap-2">
                    {meeting.participants.map((p, idx) => (
                      <Badge key={idx} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Principais Tópicos */}
              {meeting.main_topics && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Principais Tópicos</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{meeting.main_topics}</p>
                </div>
              )}

              <Separator />

              {/* Decisões */}
              {meeting.decisions && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Decisões</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-gray-800 whitespace-pre-wrap">{meeting.decisions}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Controles */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Controles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ControlItem label="Cumpriu Horário" checked={meeting.controls?.on_time} />
                  <ControlItem label="Começou no Horário Certo" checked={meeting.controls?.started_on_time} />
                  <ControlItem label="Tinha Pauta de Reunião" checked={meeting.controls?.had_agenda} />
                  <ControlItem label="Cumprimento da Pauta" checked={meeting.controls?.agenda_fulfilled} />
                  <ControlItem label="Estavam todos os participantes" checked={meeting.controls?.all_participants_present} />
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ata</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ata de reunião? Esta ação não pode ser desfeita.
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