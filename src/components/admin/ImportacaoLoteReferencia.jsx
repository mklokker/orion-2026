import React, { useState } from "react";
import { TabelaReferencia } from "@/entities/TabelaReferencia";
import { AvaliacaoImovel } from "@/entities/AvaliacaoImovel";
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
  const [tipoImportacao, setTipoImportacao] = useState("tabelas");
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
    },
    "Avaliacoes": {
      headers: ["regiao", "bairro", "sub_bairro", "area_lote", "area_construida", "vida_util", "idade_aparente", "padrao_semelhante", "estado_conservacao", "fator_comercializacao", "valor_benfeitoria", "valor_medio_lote", "valor_medio_venda", "limite_inferior", "limite_superior", "valor_considerado", "nome_cliente", "cpf_cliente", "endereco_cliente", "telefone_cliente"],
      exemplo: [
        ["São_João_Del_Rei", "Centro", "Centro Histórico", "300", "150", "Casa", "20", "Normal", "Bom", "Normal", "250000", "150000", "400000", "300000", "500000", "400000", "João Silva", "123.456.789-00", "Rua das Flores, 123", "(32) 99999-9999"],
        ["Tiradentes", "Águas Santas", "", "450", "174.31", "Casa", "1", "Normal", "Novo", "Aquecido", "550878.47", "112221.45", "663000", "497000", "829000", "325000", "Maria Santos", "987.654.321-00", "Rua São Vicente, 210", "(32) 98888-8888"]
      ]
    }
  };

  const downloadModelo = () => {
    const modeloKey = tipoImportacao === "avaliacoes" ? "Avaliacoes" : tipoTabela;
    const modelo = modelos[modeloKey];
    const csvContent = [
      modelo.headers.join(','),
      ...modelo.exemplo.map(row => row.map(cell => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = tipoImportacao === "avaliacoes" ? "modelo_avaliacoes_historicas.csv" : `modelo_${tipoTabela}.csv`;
    link.download = fileName;
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
        const row = tipoImportacao === "avaliacoes" ? {} : { tipo_tabela: tipoTabela, ativo: true };
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (value === '' || value === 'NULL' || value === 'null') {
            row[header] = null;
          } else if (['valor', 'percentual', 'area_lote', 'area_construida', 'idade_aparente', 'valor_benfeitoria', 'valor_medio_lote', 'valor_medio_venda', 'limite_inferior', 'limite_superior', 'valor_considerado'].includes(header)) {
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

      if (tipoImportacao === "avaliacoes") {
        // Validação mínima - apenas campos essenciais
        if (!row.regiao?.trim()) {
          rowErrors.push("Região é obrigatória");
        }
        if (!row.bairro?.trim()) {
          rowErrors.push("Bairro é obrigatório");
        }
        if (!row.area_lote || isNaN(row.area_lote) || row.area_lote <= 0) {
          rowErrors.push("Área do lote é obrigatória e deve ser maior que zero");
        }
        
        // Aplicar valores padrão para campos opcionais se vazios
        if (!row.vida_util) row.vida_util = "Lote";
        if (!row.fator_comercializacao) row.fator_comercializacao = "Normal";
        if (!row.padrao_semelhante) row.padrao_semelhante = "Lote";
        if (!row.estado_conservacao) row.estado_conservacao = null;
      } else if (tipoTabela === "Valor_Metro_Quadrado") {
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

  const parseTXT = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const data = [];
    
    for (const line of lines) {
      // Remover o número da linha (ex: "1) ")
      const cleanLine = line.replace(/^\d+\)\s*/, '');
      
      // Dividir por " | "
      const parts = cleanLine.split(' | ');
      const row = tipoImportacao === "avaliacoes" ? {} : { tipo_tabela: tipoTabela, ativo: true };
      
      for (const part of parts) {
        const [key, ...valueParts] = part.split(':');
        const value = valueParts.join(':').trim();
        
        if (!key || !value) continue;
        
        // Mapear nomes dos campos do TXT para campos da entidade
        const fieldMap = {
          'Região': 'regiao',
          'Bairro': 'bairro',
          'Sub-Bairro / Localização': 'sub_bairro',
          'Área': 'area_lote',
          'Área Construida Equivalente(M2)': 'area_construida',
          'Vida Útil': 'vida_util',
          'Idade Aparente Do Imóvel (Anos)': 'idade_aparente',
          'Padrão Semelhante ²': 'padrao_semelhante',
          'Estado De Conservação': 'estado_conservacao',
          'Valor Da Benfeitoria Depreciada': 'valor_benfeitoria',
          'Valor Médio Sugerido Do Lote': 'valor_medio_lote',
          'Valor Médio De Venda Sugerido (R$)': 'valor_medio_venda',
          'Limite Inferior': 'limite_inferior',
          'Limite Superior': 'limite_superior',
          'Valor Considerado': 'valor_considerado',
          'Nome': 'nome_cliente',
          'Cpf': 'cpf_cliente',
          'Endereço': 'endereco_cliente',
          'Telefone': 'telefone_cliente',
          'FC': 'fator_comercializacao'
        };
        
        const fieldName = fieldMap[key.trim()];
        if (!fieldName) continue;
        
        // Tratar valores
        if (value === 'NULL' || value === 'null' || !value) {
          row[fieldName] = null;
        } else if (['area_lote', 'area_construida', 'idade_aparente', 'valor_benfeitoria', 'valor_medio_lote', 'valor_medio_venda', 'limite_inferior', 'limite_superior', 'valor_considerado'].includes(fieldName)) {
          // Números: trocar vírgula por ponto
          const numValue = value.replace(/\./g, '').replace(',', '.');
          row[fieldName] = parseFloat(numValue);
        } else if (fieldName === 'vida_util') {
          // Mapear vida útil
          if (value.toLowerCase().includes('lote')) {
            row[fieldName] = 'Lote';
          } else if (value.toLowerCase().includes('casa') || value.toLowerCase().includes('alvenaria')) {
            row[fieldName] = 'Casa';
          } else if (value.toLowerCase().includes('apartamento')) {
            row[fieldName] = 'Apartamento';
          } else if (value.toLowerCase().includes('comercial')) {
            row[fieldName] = 'Comercial';
          } else {
            row[fieldName] = 'Lote';
          }
        } else if (fieldName === 'padrao_semelhante') {
          // Mapear padrão semelhante
          if (value.toLowerCase().includes('lote')) {
            row[fieldName] = 'Lote';
          } else if (value.toLowerCase().includes('r1b') || value.toLowerCase().includes('baixo')) {
            row[fieldName] = 'Baixo';
          } else if (value.toLowerCase().includes('r1n') || value.toLowerCase().includes('normal')) {
            row[fieldName] = 'Normal';
          } else if (value.toLowerCase().includes('r1a') || value.toLowerCase().includes('alto')) {
            row[fieldName] = 'Alto';
          } else if (value.toLowerCase().includes('luxo')) {
            row[fieldName] = 'Luxo';
          } else {
            row[fieldName] = 'Normal';
          }
        } else if (fieldName === 'estado_conservacao') {
          // Mapear estado de conservação
          if (value.toLowerCase().includes('novo')) {
            row[fieldName] = 'Novo';
          } else if (value.toLowerCase().includes('bom') || value.toLowerCase().includes('b -')) {
            row[fieldName] = 'Bom';
          } else if (value.toLowerCase().includes('regular') || value.toLowerCase().includes('c -')) {
            row[fieldName] = 'Regular';
          } else if (value.toLowerCase().includes('ruim') || value.toLowerCase().includes('g -')) {
            row[fieldName] = 'Ruim';
          } else {
            row[fieldName] = null;
          }
        } else if (fieldName === 'fator_comercializacao') {
          // FC sempre vem como número, mapear para texto
          const fcValue = parseFloat(value);
          if (fcValue < 1) {
            row[fieldName] = 'Desaquecido';
          } else if (fcValue > 1) {
            row[fieldName] = 'Aquecido';
          } else {
            row[fieldName] = 'Normal';
          }
        } else {
          row[fieldName] = value;
        }
      }
      
      if (Object.keys(row).length > 2) { // Mais que apenas tipo_tabela e ativo
        data.push(row);
      }
    }
    
    return data;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const isTXT = file.name.toLowerCase().endsWith('.txt');
      const data = isTXT ? parseTXT(text) : parseCSV(text);

      if (data.length === 0) {
        toast({
          title: "❌ Arquivo vazio",
          description: `O arquivo ${isTXT ? 'TXT' : 'CSV'} não contém dados válidos.`,
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
        description: "Verifique se o arquivo está no formato correto.",
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

      const Entity = tipoImportacao === "avaliacoes" ? AvaliacaoImovel : TabelaReferencia;

      for (let i = 0; i < validationResults.valid.length; i += BATCH_SIZE) {
        const batch = validationResults.valid.slice(i, i + BATCH_SIZE);
        await Entity.bulkCreate(batch);
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
          {/* Seleção de Tipo de Importação */}
          <div className="space-y-2">
            <Label>O que deseja importar? *</Label>
            <Select value={tipoImportacao} onValueChange={(value) => {
              setTipoImportacao(value);
              setValidationResults(null);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tabelas">Tabelas de Referência</SelectItem>
                <SelectItem value="avaliacoes">Avaliações Históricas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Tipo de Tabela (apenas se for tabelas) */}
          {tipoImportacao === "tabelas" && (
            <div className="space-y-2">
              <Label>Tipo de Tabela *</Label>
              <Select value={tipoTabela} onValueChange={(value) => {
                setTipoTabela(value);
                setValidationResults(null);
              }}>
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
          )}

          {/* Info sobre formato */}
          <Alert>
            <AlertDescription>
              <p className="font-semibold mb-2">📋 Formatos aceitos:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-semibold mb-1">CSV:</p>
                  <ul className="text-xs space-y-1 ml-3">
                    <li>• Primeira linha: cabeçalhos</li>
                    <li>• Separador: vírgula (,)</li>
                    <li>• Decimais: ponto (.)</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">TXT:</p>
                  <ul className="text-xs space-y-1 ml-3">
                    <li>• Formato: Campo: Valor | Campo: Valor</li>
                    <li>• Uma linha por registro</li>
                    <li>• NULL para campos vazios</li>
                  </ul>
                </div>
              </div>
              {tipoImportacao === "avaliacoes" && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-900">
                    <strong>Campos obrigatórios:</strong> regiao, bairro, area_lote<br />
                    <strong>Outros campos:</strong> opcionais, podem ser NULL ou vazios
                  </p>
                </div>
              )}
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
                accept=".csv,.txt"
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
                    Selecionar CSV ou TXT
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