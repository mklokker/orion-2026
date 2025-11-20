import React, { useState, useEffect } from "react";
import { TabelaDepreciacaoRoss } from "@/entities/TabelaDepreciacaoRoss";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Download, Trash2, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RossHeideckeManager() {
  const { toast } = useToast();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await TabelaDepreciacaoRoss.list();
      setRegistros(data);
    } catch (error) {
      console.error("Erro ao carregar Ross-Heidecke:", error);
    }
  };

  const downloadModelo = () => {
    const csvContent = [
      "percentual,estado,k",
      "2,A,1.02",
      "2,B,1.05",
      "2,C,3.51",
      "// ... restante dos dados"
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_ross_heidecke.csv";
    link.click();

    toast({
      title: "📥 Modelo baixado!",
      description: "Use este arquivo para importar a tabela completa.",
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
        const [percentual, estado, k] = lines[i].split(',').map(v => v.trim());
        
        if (percentual && estado && k) {
          data.push({
            percentual: parseInt(percentual),
            estado: estado.toUpperCase(),
            k: parseFloat(k),
            ativo: true
          });
        }
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
      const registrosAtuais = await TabelaDepreciacaoRoss.list();
      for (const reg of registrosAtuais) {
        await TabelaDepreciacaoRoss.delete(reg.id);
      }

      // Inserir novos registros em lotes
      const BATCH_SIZE = 50;
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        await TabelaDepreciacaoRoss.bulkCreate(batch);
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
    if (!confirm("⚠️ Tem certeza que deseja apagar TODOS os registros da tabela Ross-Heidecke?")) {
      return;
    }

    setLoading(true);
    try {
      for (const reg of registros) {
        await TabelaDepreciacaoRoss.delete(reg.id);
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

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Tabela Ross-Heidecke (Depreciação)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Alert>
          <AlertDescription>
            <p className="font-semibold mb-2">📋 Gerenciar Tabela de Depreciação</p>
            <p className="text-sm">
              Esta tabela contém 400 registros (percentuais de 2% a 100%, para estados A-H).
              Use o botão de importação para carregar a tabela completa via CSV.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            onClick={downloadModelo}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo CSV
          </Button>

          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              id="ross-upload"
            />
            <label htmlFor="ross-upload">
              <Button
                variant="outline"
                className="gap-2"
                disabled={loading}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4" />
                  {loading ? "Importando..." : "Importar CSV Completo"}
                </span>
              </Button>
            </label>
          </div>

          {registros.length > 0 && (
            <Button
              onClick={handleLimparTudo}
              variant="destructive"
              className="gap-2"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4" />
              Limpar Todos
            </Button>
          )}
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
              Estados: {[...new Set(registros.map(r => r.estado))].sort().join(', ')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}