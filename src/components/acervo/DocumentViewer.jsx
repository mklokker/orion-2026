
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Edit, Trash2 } from "lucide-react";
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

export default function DocumentViewer({ open, onClose, document: doc, isAdmin, onEdit, onDelete }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!doc) return null;

  const handleDownload = () => {
    if (doc.document_type === 'text') {
      const blob = new Blob([doc.text_content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } else {
      window.open(doc.file_url, '_blank');
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete(doc);
  };

  const renderContent = () => {
    if (doc.document_type === 'text') {
      return (
        <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900">
            {doc.text_content}
          </pre>
        </div>
      );
    }

    // Para arquivos
    const fileType = doc.file_type?.toLowerCase() || '';

    // PDFs - visualização inline
    if (fileType.includes('pdf')) {
      return (
        <div className="w-full h-[600px] border rounded-lg overflow-hidden">
          <iframe
            src={doc.file_url}
            className="w-full h-full"
            title={doc.title}
          />
        </div>
      );
    }

    // Imagens - visualização inline
    if (fileType.includes('image')) {
      return (
        <div className="flex justify-center items-center bg-gray-50 rounded-lg p-4">
          <img
            src={doc.file_url}
            alt={doc.title}
            className="max-w-full max-h-[600px] object-contain rounded"
          />
        </div>
      );
    }

    // Word/Excel - usar Google Docs Viewer
    if (fileType.includes('word') || fileType.includes('document') || 
        fileType.includes('excel') || fileType.includes('spreadsheet')) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=true`;
      return (
        <div className="w-full h-[600px] border rounded-lg overflow-hidden">
          <iframe
            src={viewerUrl}
            className="w-full h-full"
            title={doc.title}
          />
        </div>
      );
    }

    // Outros tipos - mostrar botão de download
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <p className="text-gray-600 mb-4">
          Este tipo de arquivo não pode ser visualizado diretamente no navegador.
        </p>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Baixar Arquivo
        </Button>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <DialogTitle className="text-2xl">{doc.title}</DialogTitle>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(doc)}
                      className="gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
              {doc.description && (
                <p className="text-sm text-gray-600">{doc.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {doc.document_type === 'text' ? 'Documento de Texto' : doc.file_name?.split('.').pop()?.toUpperCase()}
                </Badge>
                <span className="text-xs text-gray-500">
                  Enviado por {doc.uploaded_by_name} em {format(new Date(doc.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            {renderContent()}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Baixar
            </Button>
            {doc.document_type === 'file' && (
              <Button variant="outline" onClick={() => window.open(doc.file_url, '_blank')} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir em Nova Aba
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{doc.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
