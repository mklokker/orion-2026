import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Edit2,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export default function AtaViewModal({
  open,
  onClose,
  ata,
  isAdmin,
  users,
  onEdit,
  onDelete,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!ata) return null;

  const controls = ata.controls || {};

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {ata.title}
              </DialogTitle>
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

          <div className="space-y-4">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>Responsável: <strong>{ata.responsible}</strong></span>
              </div>
              {ata.category && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Badge variant="outline">{ata.category}</Badge>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {ata.meeting_date
                    ? format(new Date(ata.meeting_date), "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </span>
              </div>
              {ata.meeting_time && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{ata.meeting_time}</span>
                </div>
              )}
              {ata.location && (
                <div className="flex items-center gap-2 text-gray-600 col-span-2">
                  <MapPin className="w-4 h-4" />
                  <span>{ata.location}</span>
                </div>
              )}
            </div>

            {/* Participantes */}
            {ata.participants?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Participantes ({ata.participants.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ata.participants.map((p, i) => (
                      <Badge key={i} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Pauta */}
            {ata.agenda && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Pauta</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{ata.agenda}</p>
                </div>
              </>
            )}

            {/* Tópicos Discutidos */}
            {ata.main_topics && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Principais Tópicos Discutidos</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{ata.main_topics}</p>
                </div>
              </>
            )}

            {/* Decisões */}
            {ata.decisions && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Decisões Tomadas</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{ata.decisions}</p>
                </div>
              </>
            )}

            {/* Controles */}
            <Separator />
            <div>
              <h4 className="font-semibold mb-3">Controles da Reunião</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "on_time", label: "Reunião no horário" },
                  { key: "started_on_time", label: "Iniciou no horário" },
                  { key: "had_agenda", label: "Tinha pauta definida" },
                  { key: "agenda_fulfilled", label: "Pauta foi cumprida" },
                  { key: "all_participants_present", label: "Todos presentes" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {controls[key] ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={controls[key] ? "text-green-700" : "text-gray-500"}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ata?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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