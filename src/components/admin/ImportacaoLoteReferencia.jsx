import React, { useState } from "react";
import { TabelaReferencia } from "@/entities/TabelaReferencia";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ImportacaoLoteReferencia({ open, onClose, onImportComplete }) {
  const { toast } = useToast();
  const [tipoTabela, setTipoTabela] = useState("Valor_Metro_Quadrado");
  const [importing, setImporting] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [progress, setProgress] = useState(0);

  const modelos = {
    "Valor_Metro_Quadrado": {
      headers: ["regiao", "bairro", "valor", "descricao"],
      exemplo: [
        ["São_João_Del_Rei", "Centro", "450.50", "Região central"],
        ["Tiradentes", "Bonfim", "380.00", "Bairro residencial"]
      ]
    },
    "Fator_Mercado": {
      headers: ["categoria", "valor", "descricao"],
      exemplo: [
        ["Desaquecido", "0.85", "Mercado desaquecido"],
        ["Normal", "1.00", "Mercado normal"],
        ["Aquecido", "1.15", "Mercado aquecido"]
      ]
    },
    "Depreciacao": {
      headers: ["categoria", "percentual", "descricao"],
      exemplo: [
        ["Vida Útil 10%", "5.5", "Depreciação para 10% da vida útil"],
        ["Vida Útil 20%", "12.0", "Depreciação para 20% da vida útil"]
      ]
    },
    "CUB": {
      headers: ["categoria", "valor", "descricao"],
      exemplo: [
        ["R1B - Residência unifamiliar padrão baixo", "1850.50", "CUB padrão baixo"],
        ["R1N - Residência unifamiliar padrão normal", "2150.00", "CUB padrão normal"]
      ]
    }
  };

  const downloadModelo = () => {
    const modelo = modelos[tipoTabela];
    const csvContent = [
      modelo.headers.join(','),
      ...modelo.exemplo.map(row => row.map(cell => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `modelo_${tipoTabela}.csv`;
    link.click();

    toast({
      title: "📥 Modelo baixado!",
      description: "Use este arquivo como referência para preencher seus dados.",
    });
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let char of lines[i]) {
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim().replace(/"/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim().replace(/"/g, ''));
      
      if (values.length === headers.length) {
        const row = { tipo_tabela: tipoTabela, ativo: true };
        headers.forEach((header, index) => {
          const value = values[index];
          if (value === '' || value === 'NULL' || value === 'null') {
            row[header] = null;
          } else if (header === 'valor' || header === 'percentual') {
            row[header] = parseFloat(value.replace(',', '.'));
          } else {
            row[header] = value;
          }
        });
        data.push(row);
      }
    }
    
    return data;
  };

  const validateData = (data) => {
    const errors = [];
    const valid = [];

    data.forEach((row, index) => {
      const lineNum = index + 2;
      const rowErrors = [];

      if (tipoTabela === "Valor_Metro_Quadrado") {
        if (!row.regiao || !row.bairro) {
          rowErrors.push("Região e bairro são obrigatórios");
        }
        if (!row.valor || isNaN(row.valor) || row.valor <= 0) {
          rowErrors.push("Valor deve ser um número positivo");
        }
      } else if (tipoTabela === "Fator_Mercado") {
        if (!row.categoria) {
          rowErrors.push("Categoria é obrigatória");
        }
        if (!["Desaquecido", "Normal", "Aquecido"].includes(row.categoria)) {
          rowErrors.push("Categoria deve ser: Desaquecido, Normal ou Aquecido");
        }
        if (!row.valor || isNaN(row.valor) || row.valor <= 0) {
          rowErrors.push("Valor deve ser um número positivo");
        }
      } else if (tipoTabela === "Depreciacao") {
        if (!row.categoria) {
          rowErrors.push("Categoria é obrigatória");
        }
        if (!row.percentual || isNaN(row.percentual)) {
          rowErrors.push("Percentual deve ser um número");
        }
      } else if (tipoTabela === "CUB") {
        if (!row.categoria) {
          rowErrors.push("Categoria é obrigatória");
        }
        if (!row.valor || isNaN(row.valor) || row.valor <= 0) {
          rowErrors.push("Valor deve ser um número positivo");
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ line: lineNum, errors: rowErrors, data: row });
      } else {
        valid.push(row);
      }
    });

    return { valid, errors };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        toast({
          title: "❌ Arquivo vazio",
          description: "O arquivo CSV não contém dados válidos.",
          variant: "destructive"
        });
        return;
      }

      const validation = validateData(data);
      setValidationResults(validation);

      if (validation.errors.length > 0) {
        toast({
          title: "⚠️ Erros encontrados",
          description: `${validation.errors.length} linha(s) com erro. ${validation.valid.length} linha(s) válida(s).`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Validação bem-sucedida",
          description: `${validation.valid.length} registros prontos para importação.`,
        });
      }
    } catch (error) {
      console.error("Erro ao ler arquivo:", error);
      toast({
        title: "❌ Erro ao ler arquivo",
        description: "Verifique se o arquivo está no formato CSV correto.",
        variant: "destructive"
      });
    }

    event.target.value = '';
  };

  const handleImport = async () => {
    if (!validationResults || validationResults.valid.length === 0) {
      toast({
        title: "⚠️ Nenhum dado válido",
        description: "Não há dados válidos para importar.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const BATCH_SIZE = 50;
      const total = validationResults.valid.length;
      let imported = 0;

      for (let i = 0; i < validationResults.valid.length; i += BATCH_SIZE) {
        const batch = validationResults.valid.slice(i, i + BATCH_SIZE);
        await TabelaReferencia.bulkCreate(batch);
        imported += batch.length;
        setProgress((imported / total) * 100);
      }

      toast({
        title: "✅ Importação concluída!",
        description: `${imported} registros importados com sucesso.`,
      });

      setValidationResults(null);
      if (onImportComplete) onImportComplete();
      onClose();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "❌ Erro na importação",
        description: "Erro ao importar dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="w-6 h-6" />
            Importação em Lote - Tabelas de Referência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Tabela *</Label>
            <Select value={tipoTabela} onValueChange={setTipoTabela}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Valor_Metro_Quadrado">Valor do Metro Quadrado</SelectItem>
                <SelectItem value="Fator_Mercado">Fator de Mercado</SelectItem>
                <SelectItem value="Depreciacao">Depreciação</SelectItem>
                <SelectItem value="CUB">CUB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info sobre formato */}
          <Alert>
            <AlertDescription>
              <p className="font-semibold mb-2">📋 Formato do arquivo CSV:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Primeira linha deve conter os cabeçalhos</li>
                <li>• Use vírgula (,) como separador</li>
                <li>• Números decimais com ponto (.)</li>
                <li>• Baixe o modelo para ver o formato correto</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Botões de ação */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={downloadModelo}
              variant="outline"
              className="gap-2 w-full"
            >
              <Download className="w-4 h-4" />
              Baixar Modelo CSV
            </Button>

            <div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="w-full">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={importing}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4" />
                    Selecionar Arquivo CSV
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {/* Resultados da validação */}
          {validationResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                    Registros Válidos
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {validationResults.valid.length}
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                    <XCircle className="w-5 h-5" />
                    Registros com Erro
                  </div>
                  <p className="text-2xl font-bold text-red-800">
                    {validationResults.errors.length}
                  </p>
                </div>
              </div>

              {/* Lista de erros */}
              {validationResults.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50 max-h-64 overflow-y-auto">
                  <p className="font-semibold text-red-800 mb-3">Erros Encontrados:</p>
                  <div className="space-y-2">
                    {validationResults.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="bg-white rounded p-2 text-sm border border-red-100">
                        <p className="font-semibold text-red-700">Linha {error.line}:</p>
                        <ul className="ml-4 mt-1 text-red-600">
                          {error.errors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {validationResults.errors.length > 10 && (
                      <p className="text-sm text-red-600">
                        ...e mais {validationResults.errors.length - 10} erro(s)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Barra de progresso */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-semibold">Importando dados...</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-gray-600 text-center">
                    {Math.round(progress)}% concluído
                  </p>
                </div>
              )}

              {/* Botão de importar */}
              {!importing && validationResults.valid.length > 0 && (
                <Button
                  onClick={handleImport}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Upload className="w-5 h-5" />
                  Importar {validationResults.valid.length} Registro(s) Válido(s)
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}