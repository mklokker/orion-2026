import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays, parseISO } from "date-fns";
import { Upload, X, FileText } from "lucide-react";

export default function OficioFormModal({ open, onClose, oficio, onSuccess }) {
  const [formData, setFormData] = useState({
    numero_oficio: "",
    ano_oficio: "",
    assunto: "",
    data_envio_malote: "",
    data_retorno_malote: "",
    data_envio_katia: "",
    arquivo_url: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (oficio) {
      setFormData({
        numero_oficio: oficio.numero_oficio || "",
        ano_oficio: oficio.ano_oficio || "",
        assunto: oficio.assunto || "",
        data_envio_malote: oficio.data_envio_malote || "",
        data_retorno_malote: oficio.data_retorno_malote || "",
        data_envio_katia: oficio.data_envio_katia || "",
        arquivo_url: oficio.arquivo_url || "",
        observacoes: oficio.observacoes || "",
      });
    } else {
      setFormData({
        numero_oficio: "",
        ano_oficio: new Date().getFullYear().toString(),
        assunto: "",
        data_envio_malote: "",
        data_retorno_malote: "",
        data_envio_katia: "",
        arquivo_url: "",
        observacoes: "",
      });
    }
    setSelectedFile(null);
  }, [oficio, open]);

  const calculateStatus = () => {
    if (formData.data_retorno_malote) return "Respondido";
    if (formData.data_envio_katia) return "Enviado à Kátia";
    if (formData.data_envio_malote) return "Enviado ao juiz";
    return "Rascunho";
  };

  const calculateTempoResposta = () => {
    if (formData.data_envio_malote && formData.data_retorno_malote) {
      try {
        return differenceInDays(
          parseISO(formData.data_retorno_malote),
          parseISO(formData.data_envio_malote)
        );
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, arquivo_url: result.file_url });
      setSelectedFile(file);
      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFormData({ ...formData, arquivo_url: "" });
    setSelectedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.numero_oficio || !formData.ano_oficio || !formData.assunto) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const numero_ano = `${formData.numero_oficio}/${formData.ano_oficio}`;
      const status = calculateStatus();
      const tempo_resposta_dias = calculateTempoResposta();

      const payload = {
        ...formData,
        numero_ano,
        status,
        tempo_resposta_dias,
      };

      if (oficio) {
        await base44.entities.OficioJuiz.update(oficio.id, payload);
        toast({
          title: "Sucesso",
          description: "Ofício atualizado com sucesso.",
        });
      } else {
        await base44.entities.OficioJuiz.create(payload);
        toast({
          title: "Sucesso",
          description: "Ofício criado com sucesso.",
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar ofício:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o ofício.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{oficio ? "Editar Ofício" : "Novo Ofício"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_oficio">Número do Ofício *</Label>
              <Input
                id="numero_oficio"
                value={formData.numero_oficio}
                onChange={(e) => setFormData({ ...formData, numero_oficio: e.target.value })}
                placeholder="123"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ano_oficio">Ano *</Label>
              <Input
                id="ano_oficio"
                value={formData.ano_oficio}
                onChange={(e) => setFormData({ ...formData, ano_oficio: e.target.value })}
                placeholder="2024"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto *</Label>
            <Textarea
              id="assunto"
              value={formData.assunto}
              onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
              placeholder="Descreva o assunto do ofício"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_envio_malote">Data Envio Malote</Label>
              <Input
                id="data_envio_malote"
                type="date"
                value={formData.data_envio_malote}
                onChange={(e) => setFormData({ ...formData, data_envio_malote: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_retorno_malote">Data Retorno Malote</Label>
              <Input
                id="data_retorno_malote"
                type="date"
                value={formData.data_retorno_malote}
                onChange={(e) => setFormData({ ...formData, data_retorno_malote: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_envio_katia">Data Envio à Kátia</Label>
              <Input
                id="data_envio_katia"
                type="date"
                value={formData.data_envio_katia}
                onChange={(e) => setFormData({ ...formData, data_envio_katia: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivo">Arquivo</Label>
            {formData.arquivo_url ? (
              <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/30">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedFile?.name || "Arquivo anexado"}
                  </p>
                  <a
                    href={formData.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Ver arquivo
                  </a>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id="arquivo"
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Enviando..." : "Clique para anexar arquivo"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}