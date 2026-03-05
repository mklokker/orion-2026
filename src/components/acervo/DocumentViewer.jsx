import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, ExternalLink, Edit, Trash2, History, Upload, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DocumentVersion } from "@/entities/DocumentVersion";
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
import {
  Dialog as VersionDialog,
  DialogContent as VersionDialogContent,
  DialogHeader as VersionDialogHeader,
  DialogTitle as VersionDialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

export default function DocumentViewer({ open, onClose, document: doc, currentUser, isAdmin, onEdit, onDelete, onUpdate }) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [versions, setVersions] = useState([]);
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [newVersionNotes, setNewVersionNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [viewingVersion, setViewingVersion] = useState(null);

  useEffect(() => {
    if (doc && open) {
      loadVersions();
    }
  }, [doc, open]);

  if (!doc) return null;

  const loadVersions = async () => {
    try {
      const versionsData = await DocumentVersion.filter(
        { document_id: doc.id },
        "-version_number"
      );
      setVersions(versionsData);
    } catch (error) {
      console.error("Erro ao carregar versões:", error);
    }
  };

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

  const handleNewVersion = async () => {
    if (!newVersionFile) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para a nova versão.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file: newVersionFile });

      // Criar nova versão
      await DocumentVersion.create({
        document_id: doc.id,
        version_number: versions.length + 1,
        file_url,
        file_name: newVersionFile.name,
        file_type: newVersionFile.type,
        file_size: newVersionFile.size,
        change_notes: newVersionNotes.trim() || "Nova versão",
        created_by_name: currentUser?.display_name || currentUser?.full_name
      });

      toast({
        title: "Sucesso!",
        description: "Nova versão criada com sucesso.",
      });

      setShowNewVersionDialog(false);
      setNewVersionFile(null);
      setNewVersionNotes("");
      loadVersions();
      onUpdate();
    } catch (error) {
      console.error("Erro ao criar nova versão:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar nova versão.",
        variant: "destructive"
      });
    }

    setIsUploading(false);
  };

  const handleRestoreVersion = async (version) => {
    if (!confirm(`Restaurar versão ${version.version_number}? A versão atual será substituída.`)) {
      return;
    }

    try {
      // Atualizar documento com dados da versão
      await base44.entities.Document.update(doc.id, {
        file_url: version.file_url,
        file_name: version.file_name,
        file_type: version.file_type,
        file_size: version.file_size
      });

      toast({
        title: "Sucesso!",
        description: `Versão ${version.version_number} restaurada com sucesso.`,
      });

      setShowVersionDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Erro ao restaurar versão:", error);
      toast({
        title: "Erro",
        description: "Erro ao restaurar versão.",
        variant: "destructive"
      });
    }
  };

  const renderContent = () => {
    const contentDoc = viewingVersion || doc;

    if (doc.document_type === 'text') {
      return (
        <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900">
            {contentDoc.text_content}
          </pre>
        </div>
      );
    }

    const fileType = contentDoc.file_type?.toLowerCase() || '';

    // PDFs - visualização inline
    if (fileType.includes('pdf')) {
      return (
        <div className="w-full h-[600px] border rounded-lg overflow-hidden">
          <iframe
            src={contentDoc.file_url}
            className="w-full h-full"
            title={contentDoc.title || doc.title}
          />
        </div>
      );
    }

    // Imagens - visualização inline
    if (fileType.includes('image')) {
      return (
        <div className="flex justify-center items-center bg-gray-50 rounded-lg p-4">
          <img
            src={contentDoc.file_url}
            alt={contentDoc.title || doc.title}
            className="max-w-full max-h-[600px] object-contain rounded"
          />
        </div>
      );
    }

    // Word/Excel - usar Office Online Viewer (melhor que Google Docs)
    if (fileType.includes('word') || fileType.includes('document') || 
        fileType.includes('excel') || fileType.includes('spreadsheet')) {
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(contentDoc.file_url)}`;
      return (
        <div className="w-full h-[600px] border rounded-lg overflow-hidden">
          <iframe
            src={officeUrl}
            className="w-full h-full"
            title={contentDoc.title || doc.title}
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
                <div className="flex gap-2">
                  {doc.document_type === 'file' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVersionDialog(true)}
                        className="gap-2"
                      >
                        <History className="w-4 h-4" />
                        Histórico ({versions.length})
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNewVersionDialog(true)}
                          className="gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Nova Versão
                        </Button>
                      )}
                    </>
                  )}
                  {isAdmin && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              {doc.description && (
                <p className="text-sm text-gray-600">{doc.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {doc.document_type === 'text' ? 'Documento de Texto' : doc.file_name?.split('.').pop()?.toUpperCase()}
                </Badge>
                {viewingVersion && (
                  <Badge className="bg-blue-600">
                    Visualizando Versão {viewingVersion.version_number}
                  </Badge>
                )}
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
            {viewingVersion && (
              <Button variant="outline" onClick={() => setViewingVersion(null)} className="gap-2">
                Voltar para Versão Atual
              </Button>
            )}
            <Button onClick={handleDownload} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="w-4 h-4" />
              Baixar
            </Button>
            {doc.document_type === 'file' && (
              <Button onClick={() => window.open(doc.file_url, '_blank')} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <ExternalLink className="w-4 h-4" />
                Abrir em Nova Aba
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Histórico de Versões */}
      <VersionDialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <VersionDialogContent className="max-w-3xl">
          <VersionDialogHeader>
            <VersionDialogTitle>Histórico de Versões</VersionDialogTitle>
          </VersionDialogHeader>

          <div className="py-4 space-y-3">
            {versions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhuma versão anterior encontrada
              </p>
            ) : (
              versions.map((version) => (
                <Card key={version.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>Versão {version.version_number}</Badge>
                          <span className="text-sm text-gray-600">
                            {format(new Date(version.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{version.change_notes}</p>
                        <p className="text-xs text-gray-500">
                          Por: {version.created_by_name} • {version.file_name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewingVersion(version);
                            setShowVersionDialog(false);
                          }}
                        >
                          Visualizar
                        </Button>
                        {isAdmin && (
                          <Button
                             size="sm"
                             onClick={() => handleRestoreVersion(version)}
                             className="bg-primary text-primary-foreground hover:bg-primary/90"
                           >
                             Restaurar
                           </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </VersionDialogContent>
      </VersionDialog>

      {/* Nova Versão */}
      <VersionDialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
        <VersionDialogContent>
          <VersionDialogHeader>
            <VersionDialogTitle>Criar Nova Versão</VersionDialogTitle>
          </VersionDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Arquivo da Nova Versão *</Label>
              <input
                type="file"
                onChange={(e) => setNewVersionFile(e.target.files[0])}
                className="w-full text-sm"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas sobre as Mudanças</Label>
              <Textarea
                placeholder="Descreva o que foi alterado nesta versão..."
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowNewVersionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleNewVersion} disabled={isUploading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isUploading ? "Enviando..." : "Criar Versão"}
            </Button>
          </div>
        </VersionDialogContent>
      </VersionDialog>

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