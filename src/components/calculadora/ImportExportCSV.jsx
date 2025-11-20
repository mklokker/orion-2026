import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AvaliacaoImovel } from "@/entities/AvaliacaoImovel";
import { TabelaReferencia } from "@/entities/TabelaReferencia";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportExportCSV() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [entityType, setEntityType] = useState("avaliacoes");

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
        const row = {};
        headers.forEach((header, index) => {
          const value = values[index];
          if (value === '' || value === 'NULL' || value === 'null') {
            row[header] = null;
          } else if (!isNaN(value) && value !== '') {
            row[header] = parseFloat(value);
          } else {
            row[header] = value;
          }
        });
        data.push(row);
      }
    }
    
    return data;
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        throw new Error("Arquivo CSV vazio ou inválido");
      }

      let inserted = 0;
      const BATCH_SIZE = 50;

      if (entityType === "avaliacoes") {
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          await AvaliacaoImovel.bulkCreate(batch);
          inserted += batch.length;
        }
      } else {
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          await TabelaReferencia.bulkCreate(batch);
          inserted += batch.length;
        }
      }

      toast({
        title: "Sucesso!",
        description: `${inserted} registros importados com sucesso.`,
      });

      setShowDialog(false);
      event.target.value = '';
    } catch (error) {
      console.error("Erro ao importar CSV:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao importar CSV.",
        variant: "destructive"
      });
    }
    setImporting(false);
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar.",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let data;
      let filename;

      if (entityType === "avaliacoes") {
        data = await AvaliacaoImovel.list();
        filename = `avaliacoes_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        data = await TabelaReferencia.list();
        filename = `tabelas_referencia_${new Date().toISOString().split('T')[0]}.csv`;
      }

      exportToCSV(data, filename);

      toast({
        title: "Sucesso!",
        description: `${data.length} registros exportados.`,
      });
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar dados.",
        variant: "destructive"
      });
    }
    setExporting(false);
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        className="gap-2"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Importar/Exportar CSV
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar/Exportar Dados CSV</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Dados</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avaliacoes">Avaliações de Imóveis</SelectItem>
                  <SelectItem value="tabelas">Tabelas de Referência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Importar CSV</Label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  disabled={importing}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={importing}
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      {importing ? "Importando..." : "Selecionar Arquivo"}
                    </span>
                  </Button>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Exportar CSV</Label>
                <Button
                  onClick={handleExportCSV}
                  disabled={exporting}
                  className="w-full gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? "Exportando..." : "Baixar CSV"}
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              <p className="font-semibold mb-1">Formato do CSV:</p>
              <p>• Primeira linha deve conter os cabeçalhos</p>
              <p>• Use vírgula (,) como separador</p>
              <p>• Valores nulos podem ser vazios ou "NULL"</p>
              <p>• Números decimais use ponto (.)</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}