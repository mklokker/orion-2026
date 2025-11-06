import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Task } from "@/entities/Task";
import { Department } from "@/entities/Department";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";

export default function ImportTasksModal({ open, onClose, departments, onImportComplete }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const downloadTemplate = () => {
    const template = `protocol,description,end_date,priority,status,assigned_to,department_name,completed_date
123.456,Exemplo de tarefa 1,2025-12-31,P1,Pendente,usuario@example.com,Registro de Imóveis,
789.012,Exemplo de tarefa 2,2025-11-15,P2,Em Execução,usuario@example.com,Cartório,
345.678,Exemplo de tarefa 3,2025-10-20,P3,Concluída,usuario@example.com,Atendimento,2025-10-18`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_tarefas.csv';
    link.click();

    toast({
      title: "Modelo baixado!",
      description: "Use este arquivo como referência para importar suas tarefas.",
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo CSV para importar.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // 1. Upload do arquivo
      const { file_url } = await UploadFile({ file });

      // 2. Extrair dados do CSV
      const jsonSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            protocol: { type: "string" },
            description: { type: "string" },
            end_date: { type: "string" },
            priority: { type: "string", enum: ["P1", "P2", "P3", "P4", "P5"] },
            status: { type: "string", enum: ["Pendente", "Em Execução", "Atrasada", "Concluída"] },
            assigned_to: { type: "string" },
            department_name: { type: "string" },
            completed_date: { type: "string" }
          },
          required: ["protocol", "end_date", "priority", "assigned_to"]
        }
      };

      const extractResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      if (extractResult.status === "error") {
        throw new Error(extractResult.details || "Erro ao processar arquivo");
      }

      const tasksData = extractResult.output;

      // 3. Processar e validar dados
      const tasksToCreate = [];
      const errors = [];

      for (let i = 0; i < tasksData.length; i++) {
        const task = tasksData[i];
        const lineNum = i + 2; // +2 porque linha 1 é header e arrays começam em 0

        try {
          // Encontrar departamento por nome
          let department_id = null;
          if (task.department_name) {
            const dept = departments.find(d => 
              d.name.toLowerCase() === task.department_name.toLowerCase()
            );
            if (dept) {
              department_id = dept.id;
            } else {
              errors.push(`Linha ${lineNum}: Departamento "${task.department_name}" não encontrado`);
              continue;
            }
          }

          // Validar e formatar data
          let end_date = task.end_date;
          if (task.end_date.includes('/')) {
            // Converter DD/MM/YYYY para YYYY-MM-DD
            const [day, month, year] = task.end_date.split('/');
            end_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          // Validar data de conclusão se existir
          let completed_date = task.completed_date || null;
          if (completed_date && completed_date.includes('/')) {
            const [day, month, year] = completed_date.split('/');
            completed_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          tasksToCreate.push({
            protocol: task.protocol,
            description: task.description || task.protocol,
            end_date,
            priority: task.priority,
            status: task.status || "Pendente",
            assigned_to: task.assigned_to,
            department_id,
            completed_date
          });
        } catch (error) {
          errors.push(`Linha ${lineNum}: ${error.message}`);
        }
      }

      // 4. Criar tarefas em lote
      if (tasksToCreate.length > 0) {
        await Task.bulkCreate(tasksToCreate);
      }

      setUploadResult({
        success: tasksToCreate.length,
        errors: errors.length,
        errorDetails: errors
      });

      if (errors.length === 0) {
        toast({
          title: "Importação concluída!",
          description: `${tasksToCreate.length} tarefa(s) importada(s) com sucesso.`,
        });
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 2000);
      } else {
        toast({
          title: "Importação parcial",
          description: `${tasksToCreate.length} tarefa(s) importada(s), ${errors.length} erro(s) encontrado(s).`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Erro ao importar tarefas. Verifique o formato do arquivo.",
        variant: "destructive"
      });
    }

    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Importar Tarefas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Importe tarefas em lote usando um arquivo CSV. Baixe o modelo para ver o formato correto.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar Modelo CSV
              </Button>
              <p className="text-sm text-gray-500">
                Use este modelo como referência para o formato correto
              </p>
            </div>

            <div className="space-y-2">
              <Label>Selecionar arquivo CSV</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {file && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>
              {file && (
                <p className="text-sm text-gray-600">
                  Arquivo selecionado: <strong>{file.name}</strong>
                </p>
              )}
            </div>

            {uploadResult && (
              <Alert variant={uploadResult.errors === 0 ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      Resultado da Importação:
                    </p>
                    <p>✓ {uploadResult.success} tarefa(s) importada(s) com sucesso</p>
                    {uploadResult.errors > 0 && (
                      <>
                        <p>✗ {uploadResult.errors} erro(s) encontrado(s)</p>
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          <p className="font-semibold text-sm mb-1">Detalhes dos erros:</p>
                          {uploadResult.errorDetails.map((error, index) => (
                            <p key={index} className="text-xs">• {error}</p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">Formato do CSV:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• <strong>protocol</strong>: Número do protocolo (ex: 123.456)</li>
                <li>• <strong>description</strong>: Descrição da tarefa (opcional)</li>
                <li>• <strong>end_date</strong>: Data de término (YYYY-MM-DD ou DD/MM/YYYY)</li>
                <li>• <strong>priority</strong>: Prioridade (P1, P2, P3, P4 ou P5)</li>
                <li>• <strong>status</strong>: Status (Pendente, Em Execução, Atrasada ou Concluída)</li>
                <li>• <strong>assigned_to</strong>: Email do responsável</li>
                <li>• <strong>department_name</strong>: Nome do departamento (deve existir no sistema)</li>
                <li>• <strong>completed_date</strong>: Data de conclusão (opcional, formato igual end_date)</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!file || isUploading}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Importando..." : "Importar Tarefas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}