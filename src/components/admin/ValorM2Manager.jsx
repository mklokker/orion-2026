import React, { useState, useEffect } from "react";
import { ValorM2 } from "@/entities/ValorM2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Download, Search, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ValorM2Manager() {
  const { toast } = useToast();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ cidade: "", bairro: "", sub_bairro: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await ValorM2.list();
      setRegistros(data);
    } catch (error) {
      console.error("Erro ao carregar valores m²:", error);
    }
  };

  const downloadModelo = () => {
    const csvContent = `cidade,bairro,sub_bairro,codigo,valor_m2
Sao_Joao_Del_Rei,Centro,Apartamento - Localização Boa,6.5.2.3,3645.17
Sao_Joao_Del_Rei,Centro,Casa - Localização Boa,6.5.2.2,3668.88
Sao_Joao_Del_Rei,Centro,O Lote,6.5.2.1,1072.22
Tiradentes,Centro Histórico Tiradentes - Casa,7.4.1,7355.77
Tiradentes,Centro Histórico Tiradentes - Lote,7.4.2,522.33`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_valor_m2.csv";
    link.click();

    toast({
      title: "📥 Modelo baixado!",
      description: "Use este arquivo como base para importação.",
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "❌ Arquivo vazio",
          description: "O arquivo CSV não contém dados válidos.",
          variant: "destructive"
        });
        return;
      }

      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Pular linhas vazias
        
        const [cidade, bairro, sub_bairro, codigo, valor_m2] = line.split(',').map(v => v.trim());
        
        // Validar campos obrigatórios
        if (!cidade || !bairro || !sub_bairro || !valor_m2) {
          console.warn(`Linha ${i + 1} ignorada (campos faltando):`, line);
          continue;
        }

        // Validar se valor_m2 é numérico
        if (valor_m2 === 'NULL' || valor_m2 === '-' || valor_m2 === '') {
          console.warn(`Linha ${i + 1} ignorada (valor inválido):`, line);
          continue;
        }

        // Remove formatação monetária e processa o valor
        let valorLimpo = valor_m2
          .replace(/R\$/g, '')
          .replace(/\s/g, '');

        // Detectar o último ponto/vírgula como separador decimal
        const ultimoPonto = valorLimpo.lastIndexOf('.');
        const ultimaVirgula = valorLimpo.lastIndexOf(',');
        
        if (ultimaVirgula > ultimoPonto) {
          // Formato: 3.645,17 (padrão BR)
          valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
        } else if (ultimoPonto !== -1) {
          // Formato: 3.645.17 ou 3645.17
          const partes = valorLimpo.split('.');
          if (partes.length === 2 && partes[1].length <= 2) {
            // Apenas um ponto nos decimais: 3645.17
            valorLimpo = valorLimpo;
          } else {
            // Múltiplos pontos: remover todos exceto o último
            valorLimpo = partes.slice(0, -1).join('') + '.' + partes[partes.length - 1];
          }
        }

        const valorFinal = parseFloat(valorLimpo);
        if (isNaN(valorFinal)) {
          console.warn(`Linha ${i + 1} ignorada (valor não numérico):`, line);
          continue;
        }

        data.push({
          cidade,
          bairro,
          sub_bairro,
          codigo: codigo && codigo !== 'NULL' ? codigo : null,
          valor_m2: valorFinal,
          ativo: true
        });
      }

      if (data.length === 0) {
        toast({
          title: "❌ Nenhum dado válido",
          description: "Verifique o formato do arquivo CSV.",
          variant: "destructive"
        });
        return;
      }

      // Apagar registros antigos
      const registrosAtuais = await ValorM2.list();
      for (const reg of registrosAtuais) {
        await ValorM2.delete(reg.id);
      }

      // Inserir novos registros em lotes
      const BATCH_SIZE = 50;
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        await ValorM2.bulkCreate(batch);
      }

      toast({
        title: "✅ Importação concluída!",
        description: `${data.length} registros importados com sucesso.`,
      });

      loadData();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "❌ Erro na importação",
        description: "Erro ao processar o arquivo. Verifique o formato.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleLimparTudo = async () => {
    if (!confirm("⚠️ Tem certeza que deseja apagar TODOS os valores de m²?")) {
      return;
    }

    setLoading(true);
    try {
      for (const reg of registros) {
        await ValorM2.delete(reg.id);
      }

      toast({
        title: "✅ Dados limpos!",
        description: "Todos os registros foram removidos.",
      });

      loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao limpar dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const registrosFiltrados = registros.filter(reg => {
    const cidadeMatch = !filtros.cidade || reg.cidade.toLowerCase().includes(filtros.cidade.toLowerCase());
    const bairroMatch = !filtros.bairro || reg.bairro.toLowerCase().includes(filtros.bairro.toLowerCase());
    const subMatch = !filtros.sub_bairro || reg.sub_bairro.toLowerCase().includes(filtros.sub_bairro.toLowerCase());
    return cidadeMatch && bairroMatch && subMatch;
  });

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Valores por m² (Cidade → Bairro → Sub-bairro)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Alert>
          <AlertDescription>
            <p className="font-semibold mb-2">📋 Nova Estrutura Oficial do Excel</p>
            <p className="text-sm">
              Importe valores de m² organizados por <strong>cidade → bairro → sub-bairro</strong>.
              O sistema remove automaticamente formatação monetária (R$, pontos, vírgulas).
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button onClick={downloadModelo} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Baixar Modelo CSV
          </Button>

          <div>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              id="valor-m2-upload"
            />
            <label htmlFor="valor-m2-upload">
              <Button variant="outline" className="gap-2" disabled={loading} asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  {loading ? "Importando..." : "Importar CSV/TXT"}
                </span>
              </Button>
            </label>
          </div>

          {registros.length > 0 && (
            <Button onClick={handleLimparTudo} variant="destructive" className="gap-2" disabled={loading}>
              <Trash2 className="w-4 h-4" />
              Limpar Todos
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Filtrar por cidade..."
            value={filtros.cidade}
            onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
          />
          <Input
            placeholder="Filtrar por bairro..."
            value={filtros.bairro}
            onChange={(e) => setFiltros({ ...filtros, bairro: e.target.value })}
          />
          <Input
            placeholder="Filtrar por sub-bairro..."
            value={filtros.sub_bairro}
            onChange={(e) => setFiltros({ ...filtros, sub_bairro: e.target.value })}
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border">
          <p className="text-sm font-semibold text-gray-700">
            Status: {registros.length === 0 ? (
              <span className="text-red-600">Tabela vazia - importação necessária</span>
            ) : (
              <span className="text-green-600">{registros.length} registros carregados</span>
            )}
          </p>
          {registros.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Mostrando: {registrosFiltrados.length} de {registros.length}
            </p>
          )}
        </div>

        {/* Tabela */}
        {registrosFiltrados.length > 0 && (
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Sub-bairro</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Valor/m²</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.cidade}</TableCell>
                    <TableCell>{reg.bairro}</TableCell>
                    <TableCell>{reg.sub_bairro}</TableCell>
                    <TableCell className="text-gray-500">{reg.codigo || "-"}</TableCell>
                    <TableCell className="font-semibold text-green-700">
                      R$ {reg.valor_m2.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}