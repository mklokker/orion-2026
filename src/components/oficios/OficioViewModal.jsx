import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";

const statusColors = {
  "Rascunho": "bg-gray-100 text-gray-800 border-gray-300",
  "Enviado ao juiz": "bg-blue-100 text-blue-800 border-blue-300",
  "Enviado à Kátia": "bg-purple-100 text-purple-800 border-purple-300",
  "Respondido": "bg-green-100 text-green-800 border-green-300",
  "Arquivado": "bg-slate-100 text-slate-600 border-slate-300",
};

export default function OficioViewModal({ open, onClose, oficio }) {
  if (!oficio) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Ofício
            {oficio.duplicidade_detectada && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Duplicidade
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número/Ano</label>
              <p className="text-base font-semibold">{oficio.numero_ano}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant="outline" className={statusColors[oficio.status]}>
                  {oficio.status}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Assunto</label>
            <p className="text-base mt-1">{oficio.assunto}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data Envio Malote</label>
              <p className="text-base">
                {oficio.data_envio_malote ? format(parseISO(oficio.data_envio_malote), "dd/MM/yyyy") : "-"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data Retorno Malote</label>
              <p className="text-base">
                {oficio.data_retorno_malote ? format(parseISO(oficio.data_retorno_malote), "dd/MM/yyyy") : "-"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data Envio à Kátia</label>
              <p className="text-base">
                {oficio.data_envio_katia ? format(parseISO(oficio.data_envio_katia), "dd/MM/yyyy") : "-"}
              </p>
            </div>
          </div>

          {oficio.tempo_resposta_dias != null && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tempo de Resposta</label>
              <p className="text-base font-semibold text-blue-600">{oficio.tempo_resposta_dias} dias</p>
            </div>
          )}

          {oficio.arquivo_url && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Arquivo</label>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => window.open(oficio.arquivo_url, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Arquivo
              </Button>
            </div>
          )}

          {oficio.observacoes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Observações</label>
              <p className="text-base mt-1 whitespace-pre-wrap">{oficio.observacoes}</p>
            </div>
          )}

          {oficio.id_importacao && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID Importação</label>
              <p className="text-xs text-muted-foreground mt-1">{oficio.id_importacao}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Criado em:</span>{" "}
              {oficio.created_date ? format(parseISO(oficio.created_date), "dd/MM/yyyy HH:mm") : "-"}
            </div>
            <div>
              <span className="font-medium">Atualizado em:</span>{" "}
              {oficio.updated_date ? format(parseISO(oficio.updated_date), "dd/MM/yyyy HH:mm") : "-"}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}