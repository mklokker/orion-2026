import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Calculadora() {
  const [excelUrl, setExcelUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");

  const handleLoadExcel = () => {
    if (!excelUrl.trim()) return;
    
    // Adicionar /embed se não tiver
    let embedUrl = excelUrl.trim();
    if (!embedUrl.includes('/embed')) {
      embedUrl = embedUrl.replace('excel.cloud.microsoft', 'onedrive.live.com/embed');
    }
    
    setCurrentUrl(embedUrl);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent flex items-center gap-3">
            <Calculator className="w-10 h-10 text-green-600" />
            Calculadora Excel
          </h1>
          <p className="text-gray-600 mt-2">
            Acesse e edite planilhas Excel online com suporte a macros
          </p>
        </div>

        {/* Instruções */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-gray-700">
            <strong>Como usar:</strong>
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>Faça upload do arquivo Excel no <strong>OneDrive/SharePoint</strong> da Microsoft</li>
              <li>Abra o arquivo no Excel Online e clique em <strong>Compartilhar → Inserir</strong></li>
              <li>Copie o link de incorporação (iframe) e cole abaixo</li>
              <li><strong>Primeiro acesso:</strong> você precisará fazer login na conta Microsoft (uma única vez por navegador)</li>
              <li>As edições são salvas automaticamente no OneDrive</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Configuração */}
        <Card>
          <CardHeader>
            <CardTitle>Configurar Excel Online</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-url">URL de Incorporação do Excel Online</Label>
              <div className="flex gap-2">
                <Input
                  id="excel-url"
                  placeholder="https://onedrive.live.com/embed?resid=..."
                  value={excelUrl}
                  onChange={(e) => setExcelUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleLoadExcel} className="gap-2">
                  Carregar
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Cole o link de incorporação obtido no Excel Online (Compartilhar → Inserir)
              </p>
            </div>

            {currentUrl && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="text-sm text-green-700">✓ Excel carregado com sucesso</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(excelUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir em Nova Aba
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Excel Viewer */}
        {currentUrl ? (
          <Card className="border-2">
            <CardContent className="p-0">
              <div className="w-full h-[800px] rounded-lg overflow-hidden">
                <iframe
                  src={currentUrl}
                  className="w-full h-full border-0"
                  frameBorder="0"
                  allowFullScreen
                  title="Excel Online"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-24 text-center">
              <Calculator className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">Nenhuma planilha carregada</p>
              <p className="text-gray-400 text-sm">
                Configure a URL de incorporação acima para começar
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dicas Adicionais */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm space-y-2">
            <p><strong>💡 Dicas Importantes:</strong></p>
            <ul className="list-disc ml-4 space-y-1">
              <li><strong>Macros VBA:</strong> Excel Online suporta visualização, mas edição de macros requer Excel Desktop</li>
              <li><strong>Login Compartilhado:</strong> Não é possível (limitação de segurança do navegador)</li>
              <li><strong>Permissões:</strong> Configure o arquivo como "Qualquer pessoa pode editar" no OneDrive para acesso da equipe</li>
              <li><strong>Alternativa:</strong> Use uma conta Microsoft da empresa e compartilhe as credenciais com a equipe</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}