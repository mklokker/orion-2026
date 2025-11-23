import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Code, Info, Calculator } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const LOGICA_ATUAL = `// ===== FÓRMULA DE CÁLCULO =====
// valor_final = area × valor_m2 × (1 - depreciacao) × fator_mercado + valor_padrao

// ===== ETAPAS DO CÁLCULO =====

// 1. VALOR BASE
// Se houver área construída, usa ela, senão usa área do lote
const areaCalculo = areaConstrNum > 0 ? areaConstrNum : areaLoteNum;
const valorBase = areaCalculo * valorM2;

// 2. DEPRECIAÇÃO (Ross-Heidecke)
// Calcula % de vida útil consumida
const vidaUtilAnos = extrairAnosVidaUtil(vidaUtil);
const percVidaUtil = (idadeAnos / vidaUtilAnos) * 100;

// Aplica função EVEN (arredonda para par superior)
// Ex: 11% → 12%, 15% → 16%
let percEven = EVEN(percVidaUtil);

// Busca valor K na tabela Ross-Heidecke
// Usa: percentual (2, 4, 6...100) + estado conservação (A-H)
const K = await obterK_RossHeidecke(percEven, estadoConservacao);
const percDepreciacao = K / 100; // Ex: K=50 → 0.50

// 3. APLICAR DEPRECIAÇÃO
const valorDepreciado = valorBase * (1 - percDepreciacao);

// 4. ADICIONAR VALOR DO PADRÃO
const valorComPadrao = valorDepreciado + valorPadrao;

// 5. APLICAR FATOR DE MERCADO
// Busca na tabela FatorMercado: Desaquecido (0.85), Normal (1.0), Aquecido (1.15)
const valorFinal = valorComPadrao * fatorMercadoValor;

// 6. ARREDONDAMENTO
const valorVendaSugerido = arredondarMilhar(valorFinal);
const limiteInferior = arredondarMilharParaBaixo(valorFinal * 0.75);
const limiteSuperior = arredondarMilharParaCima(valorFinal * 1.25);

// ===== REFERÊNCIAS DE DADOS =====

// TABELA: ValorM2
// - cidade (ex: "Sao_Joao_Del_Rei")
// - bairro (ex: "Centro")
// - sub_bairro (ex: "Centro Histórico")
// - valor_m2 (ex: 1072.22)

// TABELA: TabelaDepreciacaoRoss
// - percentual (2, 4, 6, 8, ..., 100)
// - estado (A, B, C, D, E, F, G, H)
// - k (valor de depreciação)

// TABELA: PadraoSemelhante
// - descricao (ex: "R1B - Residência unifamiliar padrão baixo")
// - valor (valor adicional do padrão)

// TABELA: FatorMercado
// - descricao (Desaquecido, Normal, Aquecido)
// - fator (0.85, 1.0, 1.15)`;

export default function EditorLogicaCalculo() {
  const { toast } = useToast();
  const [logica, setLogica] = useState(LOGICA_ATUAL);
  const [salvo, setSalvo] = useState(false);

  const handleSalvar = () => {
    // Por enquanto, apenas simulação de salvamento
    // Em produção, isso salvaria em configuração do sistema
    localStorage.setItem('logica_calculo_custom', logica);
    setSalvo(true);
    toast({
      title: "✅ Lógica salva!",
      description: "As alterações foram salvas localmente. Note: Esta é uma visualização da lógica atual.",
    });
    
    setTimeout(() => setSalvo(false), 3000);
  };

  const handleRestaurar = () => {
    setLogica(LOGICA_ATUAL);
    localStorage.removeItem('logica_calculo_custom');
    toast({
      title: "Lógica restaurada",
      description: "A lógica foi restaurada para o padrão original.",
    });
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>ℹ️ Editor de Lógica de Cálculo</strong>
          <p className="mt-2 text-sm">
            Esta é a lógica atual utilizada pela calculadora. Aqui você pode visualizar como os cálculos são realizados
            e quais tabelas são referenciadas. A fórmula principal é:
          </p>
          <p className="mt-2 font-mono text-xs bg-white p-2 rounded">
            valor_final = area × valor_m2 × (1 - depreciacao) × fator_mercado + valor_padrao
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Lógica de Cálculo Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Código da Lógica</Label>
            <Textarea
              value={logica}
              onChange={(e) => setLogica(e.target.value)}
              className="font-mono text-sm h-[600px] bg-gray-50"
              placeholder="// Insira a lógica de cálculo aqui..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSalvar}
              className={`flex-1 gap-2 ${salvo ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              <Save className="w-4 h-4" />
              {salvo ? 'Salvo!' : 'Salvar Alterações'}
            </Button>
            <Button
              onClick={handleRestaurar}
              variant="outline"
              className="flex-1"
            >
              Restaurar Padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Referência de Funções Auxiliares
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold mb-2">arredondarMilhar(valor)</h4>
              <p className="text-gray-600">Arredonda para o milhar mais próximo</p>
              <code className="block mt-2 text-xs">Math.round(valor / 1000) * 1000</code>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold mb-2">EVEN(num)</h4>
              <p className="text-gray-600">Arredonda para o próximo número par (para cima)</p>
              <code className="block mt-2 text-xs">
                rounded = Math.ceil(num);<br/>
                return (rounded % 2 === 0) ? rounded : rounded + 1;
              </code>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold mb-2">obterK_RossHeidecke(percVidaUtil, estadoConservacao)</h4>
              <p className="text-gray-600">Busca o valor K na tabela Ross-Heidecke</p>
              <p className="text-xs text-gray-500 mt-2">
                Consulta: TabelaDepreciacaoRoss.filter({'{'}percentual: EVEN(percVidaUtil), estado: letra{'}'})
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold mb-2">extrairAnosVidaUtil(vidaUtilStr)</h4>
              <p className="text-gray-600">Extrai o número de anos da descrição da vida útil</p>
              <code className="block mt-2 text-xs">
                Ex: "Casa de Alvenaria - 65 anos" → 65
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}