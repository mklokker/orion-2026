import React, { useState, useEffect } from "react";
import { AvaliacaoImovel } from "@/entities/AvaliacaoImovel";
import { TabelaReferencia } from "@/entities/TabelaReferencia";
import { TabelaDepreciacaoRoss } from "@/entities/TabelaDepreciacaoRoss";
import { ValorM2 } from "@/entities/ValorM2";
import { PadraoSemelhante } from "@/entities/PadraoSemelhante";
import { FatorMercado } from "@/entities/FatorMercado";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Building2, 
  DollarSign,
  MapPin,
  Save,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Download
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, HelpCircle } from "lucide-react";
import AvaliacaoExport from "../components/calculadora/AvaliacaoExport";

// ===== helpers de arredondamento =====
const arredondarMilhar = (valor) => Math.round(valor / 1000) * 1000;
const arredondarMilharParaBaixo = (valor) => Math.floor(valor / 1000) * 1000;
const arredondarMilharParaCima = (valor) => Math.ceil(valor / 1000) * 1000;

// extrair anos da descrição da vida útil
const extrairAnosVidaUtil = (vidaUtilStr) => {
  if (!vidaUtilStr) return 50;
  if (vidaUtilStr === "Lote") return 50;
  const match = vidaUtilStr.match(/(\d+)\s*anos?/i);
  return match ? parseInt(match[1]) : 50;
};

// extrair letra de estado de conservação (A..H)
const extrairLetraEstado = (estado) => {
  if (!estado) return "C";
  const match = estado.match(/^([A-H])/i);
  return match ? match[1].toUpperCase() : "C";
};

/**
 * Função EVEN da planilha:
 * Se o número já é PAR, retorna ele.
 * Se é ÍMPAR, arredonda para CIMA (próximo par).
 * Ex.: 11 -> 12, 12 -> 12, 15 -> 16.
 */
const EVEN = (num) => {
  const rounded = Math.ceil(num);
  return (rounded % 2 === 0) ? rounded : rounded + 1;
};

/**
 * Retorna o K da tabela Ross-Heidecke consultando o banco de dados.
 * @param percVidaUtil % da vida útil consumida (idade / vidaUtil)
 * @param estadoConservacao string tipo "C - Regular"
 */
const obterK_RossHeidecke = async (percVidaUtil, estadoConservacao) => {
  const letra = extrairLetraEstado(estadoConservacao);

  // Aplica EVEN (assim, 10.77% se torna 12%, 13% se torna 14%, etc.)
  let percEven = EVEN(percVidaUtil);

  // limita entre 2 e 100
  if (percEven < 2) percEven = 2;
  if (percEven > 100) percEven = 100;

  try {
    const resultados = await TabelaDepreciacaoRoss.filter({
      percentual: percEven,
      estado: letra,
      ativo: true
    });

    if (resultados.length > 0) {
      return resultados[0].k;
    }
  } catch (error) {
    console.error("Erro ao buscar Ross-Heidecke:", error);
  }

  // Fallback se não encontrar
  return 50;
};

export default function CalculadoraImoveis() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  
  // Dados de localização (NOVA ESTRUTURA: Cidade → Bairro → Sub-bairro)
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [subBairro, setSubBairro] = useState("");
  
  // Opções de localização para dropdowns dependentes
  const [cidades, setCidades] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [subBairros, setSubBairros] = useState([]);
  
  // Cache de valores m²
  const [valoresM2, setValoresM2] = useState([]);
  
  // Estado para exportação
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [avaliacaoParaExportar, setAvaliacaoParaExportar] = useState(null);
  
  // Dados do imóvel
  const [areaLote, setAreaLote] = useState("");
  const [areaConstruida, setAreaConstruida] = useState("");
  const [vidaUtil, setVidaUtil] = useState("Lote");
  const [idadeAparente, setIdadeAparente] = useState("");
  const [padraoSemelhante, setPadraoSemelhante] = useState("Lote");
  const [estadoConservacao, setEstadoConservacao] = useState("Bom");
  const [fatorComercializacao, setFatorComercializacao] = useState("Normal");
  
  // Resultados
  const [valorBenfeitoria, setValorBenfeitoria] = useState(0);
  const [valorMedioLote, setValorMedioLote] = useState(0);
  const [valorMedioVenda, setValorMedioVenda] = useState(0);
  const [limiteInferior, setLimiteInferior] = useState(0);
  const [limiteSuperior, setLimiteSuperior] = useState(0);
  const [calculando, setCalculando] = useState(false);
  
  // Dados do cliente
  const [nomeCliente, setNomeCliente] = useState("");
  const [cpfCliente, setCpfCliente] = useState("");
  const [enderecoCliente, setEnderecoCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [valorConsiderado, setValorConsiderado] = useState("");

  // Calculadoras auxiliares
  const [calcPorcValor, setCalcPorcValor] = useState("");
  const [calcPorcPerc, setCalcPorcPerc] = useState("");
  const [calcPorcResult, setCalcPorcResult] = useState("");

  const [calcFracValor, setCalcFracValor] = useState("");
  const [calcFracNumerador, setCalcFracNumerador] = useState("");
  const [calcFracDenominador, setCalcFracDenominador] = useState("");
  const [calcFracResult, setCalcFracResult] = useState("");

  const [calcRegraTresA, setCalcRegraTresA] = useState("");
  const [calcRegraTresB, setCalcRegraTresB] = useState("");
  const [calcRegraTresC, setCalcRegraTresC] = useState("");
  const [calcRegraTresResult, setCalcRegraTresResult] = useState("");

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      const avaliacoesData = await AvaliacaoImovel.list("-created_date");
      setAvaliacoes(avaliacoesData);

      // Carregar valores m² (nova estrutura)
      const valoresData = await ValorM2.filter({ ativo: true });
      setValoresM2(valoresData);

      // Extrair cidades únicas
      const cidadesUnicas = [...new Set(valoresData.map(v => v.cidade))].filter(Boolean).sort();
      setCidades(cidadesUnicas);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleCidadeChange = (value) => {
    setCidade(value);
    setBairro("");
    setSubBairro("");
    setSubBairros([]);

    // Filtrar bairros da cidade selecionada
    const bairrosDaCidade = [...new Set(
      valoresM2
        .filter(v => v.cidade === value)
        .map(v => v.bairro)
    )].filter(Boolean).sort();
    setBairros(bairrosDaCidade);
  };

  const handleBairroChange = (value) => {
    setBairro(value);
    setSubBairro("");

    // Filtrar sub-bairros do bairro selecionado
    const subBairrosDoBairro = [...new Set(
      valoresM2
        .filter(v => v.cidade === cidade && v.bairro === value)
        .map(v => v.sub_bairro)
    )].filter(Boolean).sort();
    setSubBairros(subBairrosDoBairro);
  };

  const calcularAvaliacao = async () => {
    if (!areaLote || !cidade || !bairro || !subBairro) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha cidade, bairro, sub-bairro e área do lote.",
        variant: "destructive"
      });
      return;
    }

    setCalculando(true);
    try {
      const areaLoteNum = parseFloat(areaLote);
      const areaConstrNum = areaConstruida ? parseFloat(areaConstruida) : 0;

      // 1) Buscar valor do m² (NOVA ESTRUTURA: cidade + bairro + sub_bairro)
      const valoresEncontrados = await ValorM2.filter({
        cidade: cidade,
        bairro: bairro,
        sub_bairro: subBairro,
        ativo: true
      });

      if (valoresEncontrados.length === 0) {
        toast({
          title: "❌ Valor não encontrado",
          description: "Não há valor de m² cadastrado para esta localização.",
          variant: "destructive"
        });
        setCalculando(false);
        return;
      }

      const valorM2 = valoresEncontrados[0].valor_m2;

      // 2) Buscar fator de mercado (da nova tabela FatorMercado)
      let fatorMercadoValor = 1.0;
      const fatoresMercado = await FatorMercado.filter({
        descricao: fatorComercializacao,
        ativo: true
      });
      if (fatoresMercado.length > 0) {
        fatorMercadoValor = fatoresMercado[0].fator;
      }

      // 3) Buscar valor do padrão semelhante (da nova tabela PadraoSemelhante)
      let valorPadrao = 0;
      if (padraoSemelhante !== "Lote") {
        const padroes = await PadraoSemelhante.filter({
          descricao: padraoSemelhante,
          ativo: true
        });
        if (padroes.length > 0) {
          valorPadrao = padroes[0].valor;
        }
      }

      // 4) Calcular depreciação usando Ross-Heidecke
      let percDepreciacao = 0;
      if (areaConstrNum > 0 && idadeAparente && parseInt(idadeAparente) > 0) {
        const vidaUtilAnos = extrairAnosVidaUtil(vidaUtil);
        const idadeAnos = parseInt(idadeAparente);

        let percVidaUtil = (idadeAnos / vidaUtilAnos) * 100;
        percVidaUtil = Math.max(0, Math.min(100, percVidaUtil));

        const K = await obterK_RossHeidecke(percVidaUtil, estadoConservacao);
        percDepreciacao = K / 100; // Convertendo K para decimal (ex: 50 → 0.50)
      }

      // 5) FÓRMULA OFICIAL DO EXCEL:
      // valor_final = area * valor_m2 * (1 - depreciacao) * fator_mercado + valor_padrao
      
      const valorBase = areaConstrNum > 0 ? areaConstrNum * valorM2 : areaLoteNum * valorM2;
      const valorDepreciado = valorBase * (1 - percDepreciacao);
      const valorComPadrao = valorDepreciado + valorPadrao;
      const valorFinal = valorComPadrao * fatorMercadoValor;

      // Arredondar para milhares
      const valorVendaSugerido = arredondarMilhar(valorFinal);
      const limiteInf = arredondarMilharParaBaixo(valorFinal * 0.75);
      const limiteSup = arredondarMilharParaCima(valorFinal * 1.25);

      // Salvar nos estados
      setValorMedioLote(areaLoteNum * valorM2);
      setValorBenfeitoria(valorDepreciado);
      setValorMedioVenda(valorVendaSugerido);
      setLimiteInferior(limiteInf);
      setLimiteSuperior(limiteSup);

      toast({
        title: "✅ Cálculo realizado!",
        description: `Valor base de R$ ${valorM2.toFixed(2)}/m² encontrado na tabela de referência.`,
      });
    } catch (error) {
      console.error("Erro ao calcular:", error);
      toast({
        title: "❌ Erro no cálculo",
        description: "Erro ao consultar tabelas de referência. Verifique se os dados estão cadastrados.",
        variant: "destructive"
      });
    } finally {
      setCalculando(false);
    }
  };

  const calcularPorcentagem = () => {
    if (calcPorcValor && calcPorcPerc) {
      const result = (parseFloat(calcPorcValor) * parseFloat(calcPorcPerc)) / 100;
      setCalcPorcResult(result.toFixed(2));
    }
  };

  const calcularFracao = () => {
    if (calcFracValor && calcFracNumerador && calcFracDenominador) {
      const result = (parseFloat(calcFracValor) * parseFloat(calcFracNumerador)) / parseFloat(calcFracDenominador);
      setCalcFracResult(result.toFixed(2));
    }
  };

  const calcularRegraTres = () => {
    if (calcRegraTresA && calcRegraTresB && calcRegraTresC) {
      const result = (parseFloat(calcRegraTresB) * parseFloat(calcRegraTresC)) / parseFloat(calcRegraTresA);
      setCalcRegraTresResult(result.toFixed(2));
    }
  };

  const salvarAvaliacao = async () => {
    if (!cidade || !bairro || !subBairro || !areaLote) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha os campos obrigatórios (cidade, bairro, sub-bairro e área).",
        variant: "destructive"
      });
      return;
    }

    if (valorMedioVenda === 0) {
      toast({
        title: "⚠️ Calcule primeiro",
        description: "Realize o cálculo antes de salvar a avaliação.",
        variant: "destructive"
      });
      return;
    }

    try {
      await AvaliacaoImovel.create({
        regiao: cidade, // Salvar cidade como "regiao" para compatibilidade
        bairro,
        sub_bairro: subBairro,
        area_lote: parseFloat(areaLote),
        area_construida: areaConstruida ? parseFloat(areaConstruida) : null,
        vida_util: vidaUtil,
        idade_aparente: idadeAparente ? parseInt(idadeAparente) : null,
        padrao_semelhante: padraoSemelhante,
        estado_conservacao: estadoConservacao,
        fator_comercializacao: fatorComercializacao,
        valor_benfeitoria: valorBenfeitoria,
        valor_medio_lote: valorMedioLote,
        valor_medio_venda: valorMedioVenda,
        limite_inferior: limiteInferior,
        limite_superior: limiteSuperior,
        nome_cliente: nomeCliente,
        cpf_cliente: cpfCliente,
        endereco_cliente: enderecoCliente,
        telefone_cliente: telefoneCliente,
        valor_considerado: valorConsiderado ? parseFloat(valorConsiderado) : null
      });

      toast({
        title: "✅ Sucesso!",
        description: "Avaliação salva no histórico com sucesso.",
      });

      loadData();
      limparFormulario();
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar a avaliação. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const limparFormulario = () => {
    setCidade("");
    setBairro("");
    setSubBairro("");
    setBairros([]);
    setSubBairros([]);
    setAreaLote("");
    setAreaConstruida("");
    setVidaUtil("Lote");
    setIdadeAparente("");
    setPadraoSemelhante("Lote");
    setEstadoConservacao("Bom");
    setFatorComercializacao("Normal");
    setValorBenfeitoria(0);
    setValorMedioLote(0);
    setValorMedioVenda(0);
    setLimiteInferior(0);
    setLimiteSuperior(0);
    setNomeCliente("");
    setCpfCliente("");
    setEnderecoCliente("");
    setTelefoneCliente("");
    setValorConsiderado("");
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <Calculator className="w-10 h-10 text-blue-600" />
            Calculadora de Avaliação de Imóveis
          </h1>
          <p className="text-gray-600">
            Ofício do Registro de Imóveis - São João Del Rei
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados de Localização */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Dados de Localização (Cidade → Bairro → Sub-bairro)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Select value={cidade} onValueChange={handleCidadeChange}>
                      <SelectTrigger id="cidade">
                        <SelectValue placeholder="Selecione a cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {cidades.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Select value={bairro} onValueChange={handleBairroChange} disabled={!cidade}>
                      <SelectTrigger id="bairro">
                        <SelectValue placeholder={cidade ? "Selecione o bairro" : "Selecione uma cidade primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {bairros.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-bairro">Sub-Bairro *</Label>
                    <Select value={subBairro} onValueChange={setSubBairro} disabled={!bairro}>
                      <SelectTrigger id="sub-bairro">
                        <SelectValue placeholder={bairro ? "Selecione o sub-bairro" : "Selecione um bairro primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subBairros.map(sb => (
                          <SelectItem key={sb} value={sb}>{sb}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Imóvel */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Dados do Imóvel
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="area-lote">Área do Lote / Área Total Útil (m²) *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Área total do terreno em metros quadrados</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="area-lote"
                      type="number"
                      placeholder="195"
                      value={areaLote}
                      onChange={(e) => setAreaLote(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="area-construida">Área Construída Equivalente (m²)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Área total das edificações no terreno</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="area-construida"
                      type="number"
                      placeholder="0"
                      value={areaConstruida}
                      onChange={(e) => setAreaConstruida(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vida-util">Vida Útil</Label>
                    <Select value={vidaUtil} onValueChange={setVidaUtil}>
                      <SelectTrigger id="vida-util">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lote">Lote</SelectItem>
                        <SelectItem value="Apartamentos, Kitnets, Garagens, Const. Rurais - 60 anos">Apartamentos, Kitnets, Garagens, Const. Rurais - 60 anos</SelectItem>
                        <SelectItem value="Casa de Alvenaria - 65 anos">Casa de Alvenaria - 65 anos</SelectItem>
                        <SelectItem value="Casa de Madeira - 45 anos">Casa de Madeira - 45 anos</SelectItem>
                        <SelectItem value="Hotéis, Teatros, Fábricas - 50 anos">Hotéis, Teatros, Fábricas - 50 anos</SelectItem>
                        <SelectItem value="Lojas, Escritórios, Galpões, Bancos - 70 anos">Lojas, Escritórios, Galpões, Bancos - 70 anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idade">Idade Aparente (Anos)</Label>
                    <Input
                      id="idade"
                      type="number"
                      placeholder="0"
                      value={idadeAparente}
                      onChange={(e) => setIdadeAparente(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="padrao">Padrão Semelhante ²</Label>
                    <Select value={padraoSemelhante} onValueChange={setPadraoSemelhante}>
                      <SelectTrigger id="padrao">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        <SelectItem value="Lote">Lote</SelectItem>
                        <SelectItem value="Kitnet">Kitnet</SelectItem>
                        <SelectItem value="R1B - Residência unifamiliar padrão baixo">R1B - Residência unifamiliar padrão baixo</SelectItem>
                        <SelectItem value="R1N - Residência unifamiliar padrão normal">R1N - Residência unifamiliar padrão normal</SelectItem>
                        <SelectItem value="R1A - Residência unifamiliar padrão alto">R1A - Residência unifamiliar padrão alto</SelectItem>
                        <SelectItem value="RPIQ - Residência unifamiliar popular">RPIQ - Residência unifamiliar popular</SelectItem>
                        <SelectItem value="PIS - Residência multifamiliar - Projeto de interesse social">PIS - Residência multifamiliar - Projeto de interesse social</SelectItem>
                        <SelectItem value="PP4B - Residência multifamiliar - Prédio popular - padrão baixo">PP4B - Residência multifamiliar - Prédio popular - padrão baixo</SelectItem>
                        <SelectItem value="PP4N - Residência multifamiliar - Prédio popular - padrão normal">PP4N - Residência multifamiliar - Prédio popular - padrão normal</SelectItem>
                        <SelectItem value="R8B - Residência multifamiliar padrão baixo">R8B - Residência multifamiliar padrão baixo</SelectItem>
                        <SelectItem value="R8N - Residência multifamiliar, padrão normal">R8N - Residência multifamiliar, padrão normal</SelectItem>
                        <SelectItem value="R8A - Residência multifamiliar, padrão alto">R8A - Residência multifamiliar, padrão alto</SelectItem>
                        <SelectItem value="R16N - Residência multifamiliar, padrão normal">R16N - Residência multifamiliar, padrão normal</SelectItem>
                        <SelectItem value="R16A - Residência multifamiliar, padrão alto">R16A - Residência multifamiliar, padrão alto</SelectItem>
                        <SelectItem value="CSL8N - Edifício comercial, com lojas e salas">CSL8N - Edifício comercial, com lojas e salas</SelectItem>
                        <SelectItem value="CSL16N - Edifício comercial, com lojas e salas, padrão normal">CSL16N - Edifício comercial, com lojas e salas, padrão normal</SelectItem>
                        <SelectItem value="CAL8N - Edifício Comercial Andares Livres, padrão normal">CAL8N - Edifício Comercial Andares Livres, padrão normal</SelectItem>
                        <SelectItem value="CSL8A - Edifício comercial, com lojas e salas, padrão alto">CSL8A - Edifício comercial, com lojas e salas, padrão alto</SelectItem>
                        <SelectItem value="CSL16A - Edifício comercial, com lojas e salas, padrão alto">CSL16A - Edifício comercial, com lojas e salas, padrão alto</SelectItem>
                        <SelectItem value="CAL8A - Edifício Comercial Andares Livres, padrão alto">CAL8A - Edifício Comercial Andares Livres, padrão alto</SelectItem>
                        <SelectItem value="G1 - Galpão industrial">G1 - Galpão industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conservacao">Estado de Conservação</Label>
                    <Select value={estadoConservacao} onValueChange={setEstadoConservacao}>
                      <SelectTrigger id="conservacao">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A - Novo">A - Novo</SelectItem>
                        <SelectItem value="B - Entre novo e regular">B - Entre novo e regular</SelectItem>
                        <SelectItem value="C - Regular">C - Regular</SelectItem>
                        <SelectItem value="D - Entre regular e reparos simples">D - Entre regular e reparos simples</SelectItem>
                        <SelectItem value="E - Reparos simples">E - Reparos simples</SelectItem>
                        <SelectItem value="F - Entre reparos simples e importantes">F - Entre reparos simples e importantes</SelectItem>
                        <SelectItem value="G - Reparos importantes">G - Reparos importantes</SelectItem>
                        <SelectItem value="H - Entre reparos importantes e 5,valor">H - Entre reparos importantes e 5,valor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fator de Comercialização *</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={fatorComercializacao === "Desaquecido" ? "default" : "outline"}
                      onClick={() => setFatorComercializacao("Desaquecido")}
                      className="gap-2"
                    >
                      <TrendingDown className="w-4 h-4" />
                      Desaquecido
                    </Button>
                    <Button
                      variant={fatorComercializacao === "Normal" ? "default" : "outline"}
                      onClick={() => setFatorComercializacao("Normal")}
                      className="gap-2"
                    >
                      <Minus className="w-4 h-4" />
                      Normal
                    </Button>
                    <Button
                      variant={fatorComercializacao === "Aquecido" ? "default" : "outline"}
                      onClick={() => setFatorComercializacao("Aquecido")}
                      className="gap-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Aquecido
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={calcularAvaliacao} 
                  className="w-full gap-2" 
                  size="lg"
                  disabled={calculando}
                >
                  {calculando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-5 h-5" />
                      Calcular Avaliação
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Análise / Resultados */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Análise
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor da Benfeitoria Depreciada</Label>
                    <div className="p-3 bg-gray-50 rounded-lg font-semibold">
                      {formatCurrency(valorBenfeitoria)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Médio Sugerido do Lote</Label>
                    <div className="p-3 bg-gray-50 rounded-lg font-semibold text-blue-700">
                      {formatCurrency(valorMedioLote)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Médio da Venda Sugerida</Label>
                    <div className="p-3 bg-green-100 rounded-lg font-bold text-green-800 text-lg">
                      {formatCurrency(valorMedioVenda)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Limite Inferior</Label>
                    <div className="p-3 bg-orange-50 rounded-lg font-semibold text-orange-700">
                      {formatCurrency(limiteInferior)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Limite Superior</Label>
                    <div className="p-3 bg-orange-50 rounded-lg font-semibold text-orange-700">
                      {formatCurrency(limiteSuperior)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Cliente */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="valor-considerado">Valor Considerado</Label>
                  <Input
                    id="valor-considerado"
                    type="number"
                    placeholder="0,00"
                    value={valorConsiderado}
                    onChange={(e) => setValorConsiderado(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      placeholder="Nome completo"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpfCliente}
                      onChange={(e) => setCpfCliente(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    placeholder="Endereço completo"
                    value={enderecoCliente}
                    onChange={(e) => setEnderecoCliente(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={limparFormulario} variant="outline" className="flex-1">
                    Limpar Tudo
                  </Button>
                  <Button onClick={salvarAvaliacao} className="flex-1 gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Avaliação
                  </Button>
                </div>

                {valorMedioVenda > 0 && (
                  <Button 
                    onClick={() => {
                      setAvaliacaoParaExportar({
                        regiao, bairro, sub_bairro: subBairro,
                        area_lote: parseFloat(areaLote),
                        area_construida: areaConstruida ? parseFloat(areaConstruida) : 0,
                        vida_util: vidaUtil,
                        idade_aparente: idadeAparente ? parseInt(idadeAparente) : 0,
                        padrao_semelhante: padraoSemelhante,
                        estado_conservacao: estadoConservacao,
                        fator_comercializacao: fatorComercializacao,
                        valor_benfeitoria: valorBenfeitoria,
                        valor_medio_lote: valorMedioLote,
                        valor_medio_venda: valorMedioVenda,
                        limite_inferior: limiteInferior,
                        limite_superior: limiteSuperior,
                        nome_cliente: nomeCliente,
                        cpf_cliente: cpfCliente,
                        endereco_cliente: enderecoCliente,
                        telefone_cliente: telefoneCliente,
                        valor_considerado: valorConsiderado ? parseFloat(valorConsiderado) : null
                      });
                      setShowExportDialog(true);
                    }}
                    variant="outline" 
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Gerar PDF/Imprimir
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calculadoras Auxiliares */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle>Calculadoras</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="porcentagem">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="porcentagem">%</TabsTrigger>
                    <TabsTrigger value="fracao">Fração</TabsTrigger>
                    <TabsTrigger value="regra3">Regra 3</TabsTrigger>
                  </TabsList>

                  <TabsContent value="porcentagem" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Valor a ser alocado</Label>
                      <Input
                        type="number"
                        value={calcPorcValor}
                        onChange={(e) => setCalcPorcValor(e.target.value)}
                        placeholder="10.000,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Porc. a ser calculada (%)</Label>
                      <Input
                        type="number"
                        value={calcPorcPerc}
                        onChange={(e) => setCalcPorcPerc(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    <Button onClick={calcularPorcentagem} className="w-full">
                      Calcular
                    </Button>
                    {calcPorcResult && (
                      <div className="p-3 bg-green-100 rounded-lg font-bold text-green-800 text-center">
                        {formatCurrency(parseFloat(calcPorcResult))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="fracao" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Valor a ser alocado</Label>
                      <Input
                        type="number"
                        value={calcFracValor}
                        onChange={(e) => setCalcFracValor(e.target.value)}
                        placeholder="10.000,00"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Numerador</Label>
                        <Input
                          type="number"
                          value={calcFracNumerador}
                          onChange={(e) => setCalcFracNumerador(e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Denominador</Label>
                        <Input
                          type="number"
                          value={calcFracDenominador}
                          onChange={(e) => setCalcFracDenominador(e.target.value)}
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <Button onClick={calcularFracao} className="w-full">
                      Calcular
                    </Button>
                    {calcFracResult && (
                      <div className="p-3 bg-green-100 rounded-lg font-bold text-green-800 text-center">
                        {formatCurrency(parseFloat(calcFracResult))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="regra3" className="space-y-4">
                    <div className="space-y-3">
                      <Input
                        type="number"
                        value={calcRegraTresA}
                        onChange={(e) => setCalcRegraTresA(e.target.value)}
                        placeholder="10.000,00 está para"
                      />
                      <Input
                        type="number"
                        value={calcRegraTresB}
                        onChange={(e) => setCalcRegraTresB(e.target.value)}
                        placeholder="100,00"
                      />
                      <Input
                        type="number"
                        value={calcRegraTresC}
                        onChange={(e) => setCalcRegraTresC(e.target.value)}
                        placeholder="1.000,00 está para"
                      />
                    </div>
                    <Button onClick={calcularRegraTres} className="w-full">
                      Calcular
                    </Button>
                    {calcRegraTresResult && (
                      <div className="p-3 bg-green-100 rounded-lg font-bold text-green-800 text-center">
                        {formatCurrency(parseFloat(calcRegraTresResult))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                <CardTitle className="text-sm">Avaliações Recentes</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {avaliacoes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhuma avaliação salva ainda
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {avaliacoes.slice(0, 10).map((av) => (
                      <button
                        key={av.id}
                        onClick={() => {
                          setAvaliacaoParaExportar(av);
                          setShowExportDialog(true);
                        }}
                        className="w-full p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm text-left transition-colors"
                      >
                        <div className="font-semibold">{av.regiao} - {av.bairro}</div>
                        <div className="text-xs text-gray-600">{av.area_lote}m²</div>
                        <div className="text-sm font-bold text-green-700">
                          {formatCurrency(av.valor_medio_venda)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AvaliacaoExport
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        avaliacao={avaliacaoParaExportar}
      />
      </div>
    </TooltipProvider>
  );
}