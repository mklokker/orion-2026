import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { ValorM2 } from "@/entities/ValorM2";

export default function ImportValorM2Modal({ open, onClose, onImportComplete }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Arquivo inválido",
          description: "Selecione um arquivo .txt ou .csv",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione um arquivo para importar.",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error("Arquivo vazio ou inválido.");
      }

      // Pular cabeçalho
      const dataLines = lines.slice(1);
      const records = [];

      for (const line of dataLines) {
        const [cidade, bairro, sub_bairro, codigo, valor_m2] = line.split(',').map(s => s.trim());
        
        if (!cidade || !bairro || !valor_m2) {
          console.warn("Linha inválida ignorada:", line);
          continue;
        }

        records.push({
          cidade,
          bairro,
          sub_bairro: sub_bairro || null,
          codigo: codigo || null,
          valor_m2: parseFloat(valor_m2),
          ativo: true
        });
      }

      if (records.length === 0) {
        throw new Error("Nenhum registro válido encontrado no arquivo.");
      }

      // Importar em lotes de 50
      const BATCH_SIZE = 50;
      let imported = 0;

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        await ValorM2.bulkCreate(batch);
        imported += batch.length;
        
        toast({
          title: "Importando...",
          description: `${imported} de ${records.length} registros importados.`,
        });
      }

      toast({
        title: "Importação concluída!",
        description: `${records.length} registros importados com sucesso.`,
      });

      setFile(null);
      onImportComplete();
      onClose();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Erro ao importar dados.",
        variant: "destructive"
      });
    }

    setIsImporting(false);
  };

  const downloadTemplate = () => {
    const template = `cidade,bairro,sub_bairro,codigo,valor_m2
Sao_Joao_Del_Rei,Centro,Apartamento - Localização Boa,6.5.2.3,3645.17
Sao_Joao_Del_Rei,Centro,Apartamento - Localização Ótima,6.5.2.3,4987.44
Tiradentes,Centro,Casa - Padrão Alto,7.4.2,2500.00`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_valor_m2.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    toast({
      title: "Template baixado",
      description: "Use este arquivo como modelo para importação.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Valores de m²</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              O arquivo deve estar no formato CSV/TXT com as colunas:
              <br />
              <code className="text-xs bg-white px-2 py-1 rounded mt-2 inline-block">
                cidade,bairro,sub_bairro,codigo,valor_m2
              </code>
            </p>
          </div>

          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar Template de Exemplo
          </Button>

          <div className="space-y-2">
            <Label>Selecionar Arquivo</Label>
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileChange}
              className="w-full text-sm"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !file}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}