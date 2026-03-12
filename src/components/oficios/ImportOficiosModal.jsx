import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { differenceInDays, parseISO, isValid } from "date-fns";

export default function ImportOficiosModal({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV válido.",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (text) => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values.length < headers.length) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });
      rows.push(row);
    }

    return rows;
  };

  const calculateStatus = (row) => {
    if (row.data_retorno_malote) return "Respondido";
    if (row.data_envio_katia) return "Enviado à Kátia";
    if (row.data_envio_malote) return "Enviado ao juiz";
    return "Rascunho";
  };

  const calculateTempoResposta = (dataEnvio, dataRetorno) => {
    if (!dataEnvio || !dataRetorno) return null;
    try {
      const envio = parseISO(dataEnvio);
      const retorno = parseISO(dataRetorno);
      if (isValid(envio) && isValid(retorno)) {
        return differenceInDays(retorno, envio);
      }
    } catch {}
    return null;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error("Nenhum dado válido encontrado no CSV");
      }

      let success = 0;
      let errors = 0;
      const errorDetails = [];

      for (const row of rows) {
        try {
          const numero_ano = row.numero_ano || `${row.numero_oficio}/${row.ano_oficio}`;
          const status = row.status || calculateStatus(row);
          const tempo_resposta_dias = row.tempo_resposta_dias 
            ? parseInt(row.tempo_resposta_dias)
            : calculateTempoResposta(row.data_envio_malote, row.data_retorno_malote);

          const payload = {
            numero_oficio: row.numero_oficio || "",
            ano_oficio: row.ano_oficio || "",
            numero_ano,
            assunto: row.assunto || "",
            data_envio_malote: row.data_envio_malote || null,
            data_retorno_malote: row.data_retorno_malote || null,
            data_envio_katia: row.data_envio_katia || null,
            arquivo_url: row.arquivo_url || "",
            status,
            tempo_resposta_dias,
            observacoes: row.observacoes || "",
            duplicidade_detectada: row.duplicidade_detectada === "true" || row.duplicidade_detectada === "1",
            id_importacao: row.id_importacao || "",
          };

          await base44.entities.OficioJuiz.create(payload);
          success++;
        } catch (error) {
          errors++;
          errorDetails.push({
            numero_ano: row.numero_ano || `${row.numero_oficio}/${row.ano_oficio}`,
            error: error.message,
          });
        }
      }

      setResult({ success, errors, errorDetails, total: rows.length });
      
      toast({
        title: "Importação concluída",
        description: `${success} ofícios importados com sucesso. ${errors} erros.`,
        variant: errors > 0 ? "destructive" : "default",
      });

      if (success > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Não foi possível processar o arquivo CSV.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Ofícios</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com os dados dos ofícios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-xs mx-auto"
            />
            {file && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                {file.name}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Formato esperado do CSV:</p>
            <code className="block bg-muted p-2 rounded text-xs">
              numero_oficio,ano_oficio,assunto,data_envio_malote,data_retorno_malote,...
            </code>
            <p className="mt-2">
              Campos opcionais: data_envio_katia, arquivo_url, observacoes, duplicidade_detectada, id_importacao
            </p>
          </div>

          {result && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium">Resultado da Importação</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-background rounded">
                  <div className="text-2xl font-bold">{result.total}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-2 bg-background rounded">
                  <div className="text-2xl font-bold text-green-600">{result.success}</div>
                  <div className="text-muted-foreground">Sucesso</div>
                </div>
                <div className="text-center p-2 bg-background rounded">
                  <div className="text-2xl font-bold text-red-600">{result.errors}</div>
                  <div className="text-muted-foreground">Erros</div>
                </div>
              </div>
              {result.errorDetails.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Detalhes dos erros:</p>
                  {result.errorDetails.map((err, idx) => (
                    <div key={idx} className="text-xs p-2 bg-red-50 rounded flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{err.numero_ano}:</span> {err.error}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? "Fechar" : "Cancelar"}
            </Button>
            {!result && (
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? "Importando..." : "Importar"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}