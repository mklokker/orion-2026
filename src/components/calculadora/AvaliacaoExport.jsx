import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

export default function AvaliacaoExport({ open, onClose, avaliacao }) {
  const { toast } = useToast();
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Gerando PDF...",
      description: "Use a opção de imprimir do navegador e salve como PDF.",
    });
    setTimeout(() => window.print(), 100);
  };

  if (!avaliacao) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório de Avaliação</DialogTitle>
          </DialogHeader>

          <div ref={printRef} className="print-content">
            {/* Cabeçalho */}
            <div className="text-center mb-8 print-header">
              <h1 className="text-2xl font-bold text-gray-900">
                AVALIAÇÃO DE IMÓVEL
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Ofício do Registro de Imóveis - São João Del Rei
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Data: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>

            {/* Dados de Localização */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-2 mb-3">
                📍 Dados de Localização
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Região:</p>
                  <p className="font-semibold">{avaliacao.regiao}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Bairro:</p>
                  <p className="font-semibold">{avaliacao.bairro}</p>
                </div>
                {avaliacao.sub_bairro && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-600">Sub-Bairro/Localização:</p>
                    <p className="font-semibold">{avaliacao.sub_bairro}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dados do Imóvel */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-2 mb-3">
                🏠 Dados do Imóvel
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Área do Lote (m²):</p>
                  <p className="font-semibold">{avaliacao.area_lote}</p>
                </div>
                {avaliacao.area_construida > 0 && (
                  <div>
                    <p className="text-xs text-gray-600">Área Construída (m²):</p>
                    <p className="font-semibold">{avaliacao.area_construida}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600">Vida Útil:</p>
                  <p className="font-semibold">{avaliacao.vida_util}</p>
                </div>
                {avaliacao.idade_aparente > 0 && (
                  <div>
                    <p className="text-xs text-gray-600">Idade Aparente (Anos):</p>
                    <p className="font-semibold">{avaliacao.idade_aparente}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600">Padrão:</p>
                  <p className="font-semibold">{avaliacao.padrao_semelhante}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Conservação:</p>
                  <p className="font-semibold">{avaliacao.estado_conservacao}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Fator de Comercialização:</p>
                  <p className="font-semibold">{avaliacao.fator_comercializacao}</p>
                </div>
              </div>
            </div>

            {/* Análise e Valores */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-green-700 border-b-2 border-green-200 pb-2 mb-3">
                💰 Análise e Valores
              </h2>
              <div className="space-y-3">
                {avaliacao.valor_benfeitoria > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-700">Valor da Benfeitoria Depreciada:</span>
                    <span className="font-bold">{formatCurrency(avaliacao.valor_benfeitoria)}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-700">Valor Médio Sugerido do Lote:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(avaliacao.valor_medio_lote)}</span>
                </div>
                <div className="flex justify-between bg-green-100 p-3 rounded-lg">
                  <span className="font-bold text-gray-900">Valor Médio de Venda Sugerido:</span>
                  <span className="font-bold text-green-800 text-xl">{formatCurrency(avaliacao.valor_medio_venda)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Limite Inferior:</p>
                    <p className="font-bold text-orange-700">{formatCurrency(avaliacao.limite_inferior)}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Limite Superior:</p>
                    <p className="font-bold text-orange-700">{formatCurrency(avaliacao.limite_superior)}</p>
                  </div>
                </div>
                {avaliacao.valor_considerado && (
                  <div className="flex justify-between bg-purple-100 p-3 rounded-lg mt-3">
                    <span className="font-bold text-gray-900">Valor Considerado:</span>
                    <span className="font-bold text-purple-800 text-xl">{formatCurrency(avaliacao.valor_considerado)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dados do Cliente */}
            {(avaliacao.nome_cliente || avaliacao.cpf_cliente || avaliacao.endereco_cliente || avaliacao.telefone_cliente) && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-purple-700 border-b-2 border-purple-200 pb-2 mb-3">
                  👤 Dados do Cliente
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {avaliacao.nome_cliente && (
                    <div>
                      <p className="text-xs text-gray-600">Nome:</p>
                      <p className="font-semibold">{avaliacao.nome_cliente}</p>
                    </div>
                  )}
                  {avaliacao.cpf_cliente && (
                    <div>
                      <p className="text-xs text-gray-600">CPF:</p>
                      <p className="font-semibold">{avaliacao.cpf_cliente}</p>
                    </div>
                  )}
                  {avaliacao.endereco_cliente && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-600">Endereço:</p>
                      <p className="font-semibold">{avaliacao.endereco_cliente}</p>
                    </div>
                  )}
                  {avaliacao.telefone_cliente && (
                    <div>
                      <p className="text-xs text-gray-600">Telefone:</p>
                      <p className="font-semibold">{avaliacao.telefone_cliente}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t print-footer">
              <p>Documento gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              <p className="mt-1">Ofício do Registro de Imóveis - São João Del Rei</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 print-hide">
            <Button onClick={handlePrint} className="flex-1 gap-2" variant="outline">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} className="flex-1 gap-2">
              <FileDown className="w-4 h-4" />
              Salvar como PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2cm;
          }
          .print-hide {
            display: none !important;
          }
          .print-header {
            page-break-after: avoid;
          }
          .print-footer {
            page-break-before: avoid;
          }
        }
      `}</style>
    </>
  );
}