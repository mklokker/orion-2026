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
    const csvContent = `percentual,estado,k
2,A,1.02
2,B,1.05
2,C,3.51
2,D,9.03
2,E,18.9
2,F,33.9
2,G,53.1
2,H,75.4
4,A,2.08
4,B,2.11
4,C,4.55
4,D,10
4,E,19.8
4,F,34.6
4,G,53.6
4,H,75.7
6,A,3.18
6,B,3.21
6,C,5.62
6,D,11
6,E,20.7
6,F,35.3
6,G,54.1
6,H,76
8,A,4.32
8,B,4.35
8,C,6.73
8,D,12.1
8,E,21.6
8,F,36.1
8,G,54.6
8,H,76.3
10,A,5.5
10,B,5.53
10,C,7.88
10,D,13.2
10,E,22.6
10,F,36.9
10,G,55.2
10,H,76.6
12,A,6.72
12,B,6.75
12,C,9.08
12,D,14.4
12,E,23.6
12,F,37.7
12,G,55.8
12,H,76.9
14,A,7.98
14,B,8.01
14,C,10.31
14,D,15.6
14,E,24.6
14,F,38.5
14,G,56.4
14,H,77.2
16,A,9.28
16,B,9.31
16,C,11.6
16,D,16.9
16,E,25.6
16,F,39.3
16,G,57
16,H,77.5
18,A,10.61
18,B,10.65
18,C,12.93
18,D,18.2
18,E,26.6
18,F,40.1
18,G,57.6
18,H,77.8
20,A,12
20,B,12.03
20,C,14.31
20,D,19.5
20,E,27.6
20,F,40.9
20,G,58.2
20,H,78.1
22,A,13.44
22,B,13.47
22,C,15.74
22,D,20.9
22,E,28.6
22,F,41.8
22,G,58.9
22,H,78.5
24,A,14.92
24,B,14.95
24,C,17.23
24,D,22.3
24,E,29.6
24,F,42.7
24,G,59.6
24,H,78.9
26,A,16.46
26,B,16.49
26,C,18.77
26,D,23.75
26,E,30.6
26,F,43.6
26,G,60.3
26,H,79.3
28,A,18.04
28,B,18.07
28,C,20.35
28,D,25.25
28,E,31.6
28,F,44.5
28,G,61
28,H,79.7
30,A,19.68
30,B,19.71
30,C,22
30,D,26.75
30,E,32.6
30,F,45.4
30,G,61.7
30,H,80.1
32,A,21.36
32,B,21.39
32,C,23.69
32,D,28.25
32,E,33.6
32,F,46.3
32,G,62.4
32,H,80.5
34,A,23.1
34,B,23.13
34,C,25.44
34,D,29.75
34,E,34.6
34,F,47.2
34,G,63.1
34,H,80.9
36,A,24.9
36,B,24.93
36,C,27.24
36,D,31.3
36,E,35.65
36,F,48.1
36,G,63.8
36,H,81.3
38,A,26.74
38,B,26.77
38,C,29.09
38,D,32.9
38,E,36.75
38,F,49
38,G,64.5
38,H,81.7
40,A,28.64
40,B,28.67
40,C,30.99
40,D,34.5
40,E,37.85
40,F,49.9
40,G,65.2
40,H,82.1
42,A,30.6
42,B,30.63
42,C,32.94
42,D,36.2
42,E,38.95
42,F,50.8
42,G,65.9
42,H,82.5
44,A,32.6
44,B,32.63
44,C,34.94
44,D,37.9
44,E,40.05
44,F,51.7
44,G,66.6
44,H,82.9
46,A,34.66
46,B,34.69
46,C,37
46,D,39.6
46,E,41.15
46,F,52.6
46,G,67.3
46,H,83.3
48,A,36.78
48,B,36.81
48,C,39.11
48,D,41.3
48,E,42.25
48,F,53.5
48,G,68
48,H,83.7
50,A,38.94
50,B,38.97
50,C,41.28
50,D,43
50,E,43.35
50,F,54.4
50,G,68.7
50,H,84.1
52,A,41.16
52,B,41.19
52,C,43.49
52,D,44.8
52,E,44.55
52,F,55.4
52,G,69.1
52,H,84.35
54,A,43.44
54,B,43.47
54,C,45.76
54,D,46.6
54,E,45.75
54,F,56.4
54,G,70.3
54,H,85.1
56,A,45.76
56,B,45.79
56,C,48.07
56,D,48.4
56,E,46.95
56,F,57.4
56,G,71.1
56,H,85.6
58,A,48.14
58,B,48.17
58,C,50.43
58,D,50.2
58,E,48.15
58,F,58.4
58,G,71.9
58,H,86.1
60,A,50.58
60,B,50.61
60,C,52.84
60,D,52
60,E,49.35
60,F,59.4
60,G,72.7
60,H,86.6
62,A,53.06
62,B,53.09
62,C,55.29
62,D,53.9
62,E,50.55
62,F,60.5
62,G,73.15
62,H,87.2
64,A,55.6
64,B,55.64
64,C,57.8
64,D,55.8
64,E,51.75
64,F,61.6
64,G,74.5
64,H,87.8
66,A,58.2
66,B,58.24
66,C,60.35
66,D,57.7
66,E,52.95
66,F,62.7
66,G,75.4
66,H,88.1
68,A,60.84
68,B,60.88
68,C,62.95
68,D,59.6
68,E,54.15
68,F,63.8
68,G,76.3
68,H,88.4
70,A,63.55
70,B,63.59
70,C,65.6
70,D,61.5
70,E,55.35
70,F,64.9
70,G,77.2
70,H,88.7
72,A,66.3
72,B,66.34
72,C,68.29
72,D,63.4
72,E,56.55
72,F,66
72,G,78.1
72,H,89
74,A,69.11
74,B,69.14
74,C,71.04
74,D,65.3
74,E,57.75
74,F,67.1
74,G,79
74,H,89.3
76,A,71.97
76,B,72
76,C,73.83
76,D,67.2
76,E,58.95
76,F,68.2
76,G,79.9
76,H,89.6
78,A,74.88
78,B,74.91
78,C,76.68
78,D,69.1
78,E,60.15
78,F,69.3
78,G,80.8
78,H,89.9
80,A,77.84
80,B,77.87
80,C,79.57
80,D,70.4
80,E,61.35
80,F,70.4
80,G,81.7
80,H,90.2
82,A,80.84
82,B,80.87
82,C,82.5
82,D,73
82,E,62.65
82,F,71.5
82,G,82.6
82,H,90.5
84,A,83.89
84,B,83.92
84,C,85.49
84,D,75
84,E,63.95
84,F,72.6
84,G,83.5
84,H,90.8
86,A,86.98
86,B,87.01
86,C,88.52
86,D,77
86,E,65.25
86,F,73.7
86,G,84.4
86,H,91.1
88,A,90.11
88,B,90.14
88,C,91.6
88,D,79
88,E,66.55
88,F,74.8
88,G,85.3
88,H,91.4
90,A,93.28
90,B,93.31
90,C,94.72
90,D,81
90,E,67.85
90,F,75.9
90,G,86.2
90,H,91.7
92,A,96.49
92,B,96.52
92,C,97.89
92,D,83
92,E,69.15
92,F,77
92,G,87.1
92,H,92
94,A,99.74
94,B,99.77
94,C,100
94,D,85
94,E,70.45
94,F,78.1
94,G,88
94,H,92.3
96,A,100
96,B,100
96,C,100
96,D,87
96,E,71.75
96,F,79.2
96,G,88.9
96,H,92.6
98,A,100
98,B,100
98,C,100
98,D,89
98,E,73.05
98,F,80.3
98,G,89.8
98,H,92.9
100,A,100
100,B,100
100,C,100
100,D,100
100,E,100
100,F,100
100,G,100
100,H,100`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "ross_heidecke_completo.csv";
    link.click();

    toast({
      title: "📥 CSV Completo baixado!",
      description: "400 registros prontos para importar.",
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