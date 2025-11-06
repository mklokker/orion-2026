
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function CreateDocumentModal({ open, onClose, categories, onCreateDocument, editingDocument }) {
  const { toast } = useToast();
  const [documentType, setDocumentType] = useState("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(null); // Initialize with null for "Sem categoria"
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Carregar dados do documento ao editar ou resetar ao criar novo
  React.useEffect(() => {
    if (editingDocument) {
      setTitle(editingDocument.title || "");
      setDescription(editingDocument.description || "");
      setCategoryId(editingDocument.category_id || null);
      setDocumentType(editingDocument.document_type || "file"); // Use existing type
      setTextContent(editingDocument.text_content || "");
      setFile(null); // Clear any potentially selected new file when loading an existing document
    } else {
      // Reset ao criar novo
      setTitle("");
      setDescription("");
      setCategoryId(null); // Reset to null for "Sem categoria"
      setTextContent("");
      setFile(null);
      setDocumentType("file"); // Default for new document
    }
  }, [editingDocument]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Limite de 10MB
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    // Validações específicas para novo documento
    if (!editingDocument) {
      if (documentType === "file" && !file) {
        toast({
          title: "Erro",
          description: "Selecione um arquivo para enviar.",
          variant: "destructive"
        });
        return;
      }

      if (documentType === "text" && !textContent.trim()) {
        toast({
          title: "Erro",
          description: "Digite o conteúdo do documento.",
          variant: "destructive"
        });
        return;
      }
    } else { // Validações para documento existente
        // Se estiver editando um documento de texto e o conteúdo estiver vazio
        if (editingDocument.document_type === "text" && !textContent.trim()) {
            toast({
                title: "Erro",
                description: "O conteúdo do documento é obrigatório.",
                variant: "destructive"
            });
            return;
        }
    }

    setIsUploading(true);

    try {
      let documentData = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId || null,
      };

      if (editingDocument) {
        documentData.id = editingDocument.id; // Incluir ID para atualização
        documentData.document_type = editingDocument.document_type; // Manter o tipo original

        // Se for tipo texto, atualizar conteúdo
        if (editingDocument.document_type === "text") {
          documentData.text_content = textContent.trim();
        } 
        // Se for tipo file e tiver um NOVO arquivo selecionado, fazer upload
        else if (editingDocument.document_type === "file") {
          if (file) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            documentData.file_url = file_url;
            documentData.file_name = file.name;
            documentData.file_type = file.type;
            documentData.file_size = file.size;
          }
          // Se não houver novo arquivo selecionado, os detalhes do arquivo existente
          // não são incluídos no payload, assumindo que a API manterá o arquivo original.
        }
      } else {
        // Lógica para novo documento
        documentData.document_type = documentType;

        if (documentType === "file") {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          documentData.file_url = file_url;
          documentData.file_name = file.name;
          documentData.file_type = file.type;
          documentData.file_size = file.size;
        } else {
          documentData.text_content = textContent.trim();
        }
      }

      await onCreateDocument(documentData); // This function should now handle both create and update
      
      // Reset form
      setTitle("");
      setDescription("");
      setCategoryId(null);
      setTextContent("");
      setFile(null);
      setDocumentType("file");
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar documento.",
        variant: "destructive"
      });
    }

    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDocument ? "Editar Documento" : "Novo Documento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!editingDocument && ( // Ocultar se estiver editando
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Arquivo (PDF, Word, Excel, Imagem)
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Texto Direto
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: POP - Atendimento ao Cliente"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição opcional do documento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Sem categoria</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(editingDocument?.document_type === "file" || (!editingDocument && documentType === "file")) && (
            <div className="space-y-2">
              <Label htmlFor="file">
                {editingDocument ? "Trocar Arquivo (opcional)" : "Arquivo *"}
              </Label>
              {editingDocument && !file && editingDocument.document_type === "file" && (
                <div className="text-sm text-gray-600 mb-2">
                  Arquivo atual: {editingDocument.file_name}
                </div>
              )}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                />
                <label htmlFor="file" className="cursor-pointer">
                  {file ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button variant="outline" size="sm" type="button">
                        Escolher outro arquivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <p className="text-sm font-medium">
                        Clique para selecionar ou arraste o arquivo
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, Word, Excel, Imagens (máx. 10MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {(editingDocument?.document_type === "text" || (!editingDocument && documentType === "text")) && (
            <div className="space-y-2">
              <Label htmlFor="text-content">Conteúdo *</Label>
              <Textarea
                id="text-content"
                placeholder="Digite ou cole o conteúdo do documento aqui..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading} className="gap-2">
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {editingDocument ? "Salvando..." : (documentType === "file" ? "Enviando..." : "Salvando...")}
              </>
            ) : (
              <>
                {editingDocument ? (
                  <>
                    <FileText className="w-4 h-4" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    {documentType === "file" ? <Upload className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    Criar Documento
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
