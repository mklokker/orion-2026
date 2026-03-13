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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle, XCircle, Loader2, Copy } from "lucide-react";
import { differenceInDays, parseISO, isValid } from "date-fns";
import { 
  normalizeText, 
  normalizeNumeroOficio, 
  buildOficioSignature, 
  isDuplicateOficio 
} from "./oficiosImportUtils";

const CHUNK_SIZE = 15; // Processar 15 registros por lote
const CHUNK_DELAY_MS = 800; // Aguardar 800ms entre lotes
const MAX_RETRIES = 3; // Tentar até 3 vezes em caso de rate limit
const RETRY_DELAY_BASE_MS = 1000; // Backoff: 1s, 2s, 3s

export default function ImportOficiosModal({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
      setProgress(null);
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

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Buscar todos os ofícios existentes para verificação de duplicidade
  const fetchExistingOficios = async () => {
    try {
      const oficios = await base44.entities.OficioJuiz.list();
      return oficios;
    } catch (error) {
      console.error("Erro ao buscar ofícios existentes:", error);
      return [];
    }
  };

  // Criar um registro com retry em caso de rate limit
  const createWithRetry = async (payload, attemptNum = 0) => {
    try {
      await base44.entities.OficioJuiz.create(payload);
      return { success: true };
    } catch (error) {
      const isRateLimit = error?.message?.toLowerCase().includes("rate limit");
      const isTemporary = error?.message?.toLowerCase().includes("temporarily");
      
      if ((isRateLimit || isTemporary) && attemptNum < MAX_RETRIES) {
        const delayMs = RETRY_DELAY_BASE_MS * (attemptNum + 1);
        await sleep(delayMs);
        return createWithRetry(payload, attemptNum + 1);
      }
      
      return { success: false, error: error.message };
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);
    setProgress({
      total: 0,
      processed: 0,
      created: 0,
      ignored: 0,
      errors: 0,
      currentChunk: 0,
    });

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error("Nenhum dado válido encontrado no CSV");
      }

      // Buscar ofícios existentes
      const existingOficios = await fetchExistingOficios();

      const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
      let created = 0;
      let ignored = 0;
      let errors = 0;
      const errorDetails = [];
      const ignoredDetails = [];

      setProgress(prev => ({ ...prev, total: rows.length }));

      // Processar em chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, rows.length);
        const chunk = rows.slice(start, end);

        setProgress(prev => ({ ...prev, currentChunk: chunkIndex + 1 }));

        // Processar cada item do chunk sequencialmente
        for (const row of chunk) {
          try {
            const numero_ano = row.numero_ano || `${row.numero_oficio}/${row.ano_oficio}`;
            const status = row.status || calculateStatus(row);
            const tempo_resposta_dias = row.tempo_resposta_dias 
              ? parseInt(row.tempo_resposta_dias)
              : calculateTempoResposta(row.data_envio_malote, row.data_retorno_malote);

            const newRecord = {
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

            // Verificar duplicidade
            const duplicate = isDuplicateOficio(newRecord, existingOficios);
            
            if (duplicate) {
              ignored++;
              ignoredDetails.push({
                numero_ano,
                reason: "Já existe no sistema",
                existing_id: duplicate.id,
              });
            } else {
              // Tentar criar com retry
              const createResult = await createWithRetry(newRecord);
              
              if (createResult.success) {
                created++;
                // Adicionar ao conjunto de existentes para próximas verificações
                existingOficios.push({ ...newRecord, id: `temp_${Date.now()}` });
              } else {
                errors++;
                errorDetails.push({
                  numero_ano,
                  error: createResult.error,
                });
              }
            }

            setProgress(prev => ({
              ...prev,
              processed: prev.processed + 1,
              created,
              ignored,
              errors,
            }));

          } catch (error) {
            errors++;
            errorDetails.push({
              numero_ano: row.numero_ano || `${row.numero_oficio}/${row.ano_oficio}`,
              error: error.message,
            });
            setProgress(prev => ({ ...prev, processed: prev.processed + 1, errors }));
          }
        }

        // Aguardar entre chunks (exceto no último)
        if (chunkIndex < totalChunks - 1) {
          await sleep(CHUNK_DELAY_MS);
        }
      }

      setResult({ 
        success: created, 
        ignored,
        errors, 
        errorDetails,
        ignoredDetails,
        total: rows.length 
      });
      
      const hasErrors = errors > 0;
      toast({
        title: "Importação concluída",
        description: `${created} criados, ${ignored} ignorados (duplicados), ${errors} erros.`,
        variant: hasErrors ? "destructive" : "default",
      });

      if (created > 0) {
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
    if (!importing) {
      setFile(null);
      setResult(null);
      setProgress(null);
      onClose();
    }
  };

  const progressPercent = progress ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Ofícios</DialogTitle>
          <DialogDescription>
            Upload de arquivo CSV com proteção contra duplicidade e retry automático.
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
              disabled={importing}
            />
            {file && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                {file.name}
              </div>
            )}
          </div>

          {!importing && !result && (
            <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
              <p className="font-medium text-foreground">Formato esperado do CSV:</p>
              <code className="block bg-background p-2 rounded text-xs overflow-x-auto">
                numero_oficio,ano_oficio,assunto,data_envio_malote,data_retorno_malote,...
              </code>
              <p className="mt-2">
                <strong>Importação segura:</strong> detecta automaticamente duplicatas e permite reimportar o arquivo completo sem criar registros duplicados.
              </p>
            </div>
          )}

          {/* Progress durante importação */}
          {importing && progress && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Importando... ({progress.processed}/{progress.total})
              </div>
              
              <Progress value={progressPercent} className="h-2" />
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-background rounded p-2 text-center">
                  <div className="font-bold text-green-600">{progress.created}</div>
                  <div className="text-muted-foreground">Criados</div>
                </div>
                <div className="bg-background rounded p-2 text-center">
                  <div className="font-bold text-blue-600">{progress.ignored}</div>
                  <div className="text-muted-foreground">Ignorados</div>
                </div>
                <div className="bg-background rounded p-2 text-center">
                  <div className="font-bold text-red-600">{progress.errors}</div>
                  <div className="text-muted-foreground">Erros</div>
                </div>
                <div className="bg-background rounded p-2 text-center">
                  <div className="font-bold text-foreground">{progress.currentChunk}</div>
                  <div className="text-muted-foreground">Lote atual</div>
                </div>
              </div>
            </div>
          )}

          {/* Resultado final */}
          {result && (
            <div className="space-y-3 p-4 bg-muted rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium">Resultado da Importação</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="text-center p-3 bg-background rounded">
                  <div className="text-2xl font-bold">{result.total}</div>
                  <div className="text-muted-foreground text-xs">Total</div>
                </div>
                <div className="text-center p-3 bg-background rounded">
                  <div className="text-2xl font-bold text-green-600">{result.success}</div>
                  <div className="text-muted-foreground text-xs">Criados</div>
                </div>
                <div className="text-center p-3 bg-background rounded">
                  <div className="text-2xl font-bold text-blue-600">{result.ignored}</div>
                  <div className="text-muted-foreground text-xs">Ignorados</div>
                </div>
                <div className="text-center p-3 bg-background rounded">
                  <div className="text-2xl font-bold text-red-600">{result.errors}</div>
                  <div className="text-muted-foreground text-xs">Erros</div>
                </div>
              </div>

              {/* Detalhes de ignorados */}
              {result.ignoredDetails.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Registros ignorados (duplicados):</p>
                  {result.ignoredDetails.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="text-xs p-2 bg-blue-50 dark:bg-blue-950/20 rounded flex items-start gap-2">
                      <Copy className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-medium">{item.numero_ano}:</span> {item.reason}
                      </div>
                    </div>
                  ))}
                  {result.ignoredDetails.length > 10 && (
                    <p className="text-xs text-muted-foreground italic">
                      ... e mais {result.ignoredDetails.length - 10} ignorados
                    </p>
                  )}
                </div>
              )}

              {/* Detalhes de erros */}
              {result.errorDetails.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">Registros com erro:</p>
                  {result.errorDetails.map((err, idx) => (
                    <div key={idx} className="text-xs p-2 bg-red-50 dark:bg-red-950/20 rounded flex items-start gap-2">
                      <XCircle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 break-words">
                        <span className="font-medium">{err.numero_ano}:</span> {err.error}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={importing} className="min-h-[44px]">
              {result ? "Fechar" : "Cancelar"}
            </Button>
            {!result && (
              <Button onClick={handleImport} disabled={!file || importing} className="min-h-[44px]">
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  "Importar"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}