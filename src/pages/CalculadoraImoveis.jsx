import React, { useState, useEffect } from "react";
import { AvaliacaoImovel } from "@/entities/AvaliacaoImovel";
import { TabelaReferencia } from "@/entities/TabelaReferencia";
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
import AvaliacaoExport from "../components/calculadora/AvaliacaoExport";

export default function CalculadoraImoveis() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  
  // Dados de localização
  const [regiao, setRegiao] = useState("");
  const [bairro, setBairro] = useState("");
  const [subBairro, setSubBairro] = useState("");
  
  // Opções de localização para dropdowns
  const [regioes, setRegioes] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [subBairros, setSubBairros] = useState([]);
  
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

      // Carregar regiões únicas da tabela de referência
      await loadRegioes();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const loadRegioes = async () => {
    try {
      const tabelas = await TabelaReferencia.filter({
        tipo_tabela: "Valor_Metro_Quadrado",
        ativo: true
      });

      const regioesUnicas = [...new Set(tabelas.map(t => t.regiao))].filter(Boolean).sort();
      setRegioes(regioesUnicas);
    } catch (error) {
      console.error("Erro ao carregar regiões:", error);
    }
  };

  const loadBairros = async (regiaoSelecionada) => {
    try {
      const tabelas = await TabelaReferencia.filter({
        tipo_tabela: "Valor_Metro_Quadrado",
        regiao: regiaoSelecionada,
        ativo: true
      });

      const bairrosUnicos = [...new Set(tabelas.map(t => t.bairro))].filter(Boolean).sort();
      setBairros(bairrosUnicos);
    } catch (error) {
      console.error("Erro ao carregar bairros:", error);
    }
  };

  const loadSubBairros = async (regiaoSelecionada, bairroSelecionado) => {
    try {
      const tabelas = await TabelaReferencia.filter({
        tipo_tabela: "Valor_Metro_Quadrado",
        regiao: regiaoSelecionada,
        bairro: bairroSelecionado,
        ativo: true
      });

      const subBairrosUnicos = [...new Set(tabelas.map(t => t.descricao))].filter(Boolean).sort();
      setSubBairros(subBairrosUnicos);
    } catch (error) {
      console.error("Erro ao carregar sub-bairros:", error);
    }
  };

  const handleRegiaoChange = (value) => {
    setRegiao(value);
    setBairro("");
    setSubBairro("");
    setBairros([]);
    setSubBairros([]);
    loadBairros(value);
  };

  const handleBairroChange = (value) => {
    setBairro(value);
    setSubBairro("");
    setSubBairros([]);
    loadSubBairros(regiao, value);
  };

  const calcularAvaliacao = async () => {
    if (!areaLote || !regiao || !bairro) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha região, bairro e área do lote.",
        variant: "destructive"
      });
      return;
    }

    try {
      // 1. Buscar valor do m² na tabela de referência
      const valoresM2 = await TabelaReferencia.filter({
        tipo_tabela: "Valor_Metro_Quadrado",
        regiao: regiao,
        bairro: bairro,
        ativo: true
      });

      let valorM2 = 0;
      if (valoresM2.length > 0) {
        valorM2 = valoresM2[0].valor;
      } else {
        // Tentar buscar valor geral do bairro
        const valoresGerais = await TabelaReferencia.filter({
          tipo_tabela: "Valor_Metro_Quadrado",
          regiao: regiao,
          ativo: true
        });
        
        if (valoresGerais.length > 0) {
          valorM2 = valoresGerais[0].valor;
        } else {
          toast({
            title: "Valor não encontrado",
            description: "Não há valor cadastrado para esta região/bairro. Usando R$ 200/m² como base.",
            variant: "destructive"
          });
          valorM2 = 200;
        }
      }

      // 2. Calcular valor do lote
      const area = parseFloat(areaLote);
      let valorLote = area * valorM2;

      // 3. Aplicar fator de comercialização
      const fatoresComercializacao = await TabelaReferencia.filter({
        tipo_tabela: "Fator_Mercado",
        categoria: fatorComercializacao,
        ativo: true
      });

      let fatorMercado = 1.0;
      if (fatoresComercializacao.length > 0) {
        fatorMercado = fatoresComercializacao[0].valor;
      }

      valorLote = valorLote * fatorMercado;

      // 4. Calcular benfeitoria (se houver área construída)
      let valorBenfeitoriaCalc = 0;
      
      if (areaConstruida && parseFloat(areaConstruida) > 0 && padraoSemelhante !== "Lote") {
        // Buscar CUB
        const cubData = await TabelaReferencia.filter({
          tipo_tabela: "CUB",
          ativo: true
        });

        // Mapear padrão semelhante para categoria CUB
        const padraoToCUB = {
          "Baixo": "R1B - Residência unifamiliar padrão baixo",
          "Normal": "R1N - Residência unifamiliar padrão normal",
          "Alto": "R1A - Residência unifamiliar padrão alto",
          "Luxo": "R1A - Residência unifamiliar padrão alto"
        };

        const cubCategoria = padraoToCUB[padraoSemelhante] || "R1N - Residência unifamiliar padrão normal";
        const cubEncontrado = cubData.find(c => c.categoria === cubCategoria);
        
        if (cubEncontrado) {
          const BDI = 1.2309; // Fixo conforme planilha
          const custoBenfeitoria = cubEncontrado.valor * parseFloat(areaConstruida) * BDI;

          // Aplicar depreciação Ross Heidecke
          if (idadeAparente && parseInt(idadeAparente) > 0) {
            // Vida útil padrão
            const vidasUteis = {
              "Lote": 50,
              "Casa": 65,
              "Apartamento": 60,
              "Comercial": 70
            };

            const vidaUtilAnos = vidasUteis[vidaUtil] || 50;
            const idadeAnos = parseInt(idadeAparente);
            const percVidaUtil = Math.min(100, (idadeAnos / vidaUtilAnos) * 100);

            // Mapeamento estado de conservação para coluna Ross Heidecke
            const conservacaoToCol = {
              "Novo": "A",
              "Bom": "B",
              "Regular": "C",
              "Ruim": "G"
            };

            const coluna = conservacaoToCol[estadoConservacao] || "B";
            
            // Tabela Ross Heidecke simplificada (valores aproximados)
            const tabelaRossHeidecke = {
              "A": { 10: 5.5, 20: 12, 30: 19.5, 40: 28.8, 50: 37.5, 60: 48.8, 70: 59.5, 80: 72, 90: 85.5, 100: 100 },
              "B": { 10: 5.53, 20: 12, 30: 19.5, 40: 28.8, 50: 37.5, 60: 48.8, 70: 59.5, 80: 72, 90: 85.5, 100: 100 },
              "C": { 10: 7.88, 20: 14.2, 30: 21.5, 40: 29.9, 50: 39.1, 60: 49.3, 70: 60.5, 80: 72.7, 90: 85.9, 100: 100 },
              "G": { 10: 55.2, 20: 58.3, 30: 61.8, 40: 65.9, 50: 70.4, 60: 75.3, 70: 80.8, 80: 86.7, 90: 93.1, 100: 100 }
            };

            // Interpolar valor K
            const tabela = tabelaRossHeidecke[coluna] || tabelaRossHeidecke["B"];
            const percArredondado = Math.ceil(percVidaUtil / 10) * 10;
            const K = tabela[Math.min(100, percArredondado)] || 50;

            // Depreciação = (100 - K) / 100
            const depreciacao = (100 - K) / 100;

            valorBenfeitoriaCalc = custoBenfeitoria * (1 - depreciacao);
          } else {
            valorBenfeitoriaCalc = custoBenfeitoria;
          }
        }
      }

      // 5. Valor médio de venda = Valor Lote + Valor Benfeitoria
      const valorTotal = valorLote + valorBenfeitoriaCalc;
      
      setValorMedioLote(valorLote);
      setValorBenfeitoria(valorBenfeitoriaCalc);
      setValorMedioVenda(Math.round(valorTotal / 1000) * 1000); // Arredondar para milhar
      setLimiteInferior(valorTotal * 0.75);
      setLimiteSuperior(valorTotal * 1.25);

      toast({
        title: "Cálculo realizado!",
        description: `Valor base: ${formatCurrency(valorM2)}/m² encontrado na tabela de referência.`,
      });
    } catch (error) {
      console.error("Erro ao calcular:", error);
      toast({
        title: "Erro no cálculo",
        description: "Erro ao consultar tabelas de referência.",
        variant: "destructive"
      });
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
    if (!regiao || !bairro || !areaLote) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      await AvaliacaoImovel.create({
        regiao,
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
        title: "Sucesso!",
        description: "Avaliação salva com sucesso.",
      });

      loadData();
      limparFormulario();
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar avaliação.",
        variant: "destructive"
      });
    }
  };

  const limparFormulario = () => {
    setRegiao("");
    setBairro("");
    setSubBairro("");
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
    }).format(value);
  };

  return (
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
                  Dados de Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="regiao">Região *</Label>
                    <Select value={regiao} onValueChange={handleRegiaoChange}>
                      <SelectTrigger id="regiao">
                        <SelectValue placeholder="Selecione a região" />
                      </SelectTrigger>
                      <SelectContent>
                        {regioes.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Select value={bairro} onValueChange={handleBairroChange} disabled={!regiao}>
                      <SelectTrigger id="bairro">
                        <SelectValue placeholder={regiao ? "Selecione o bairro" : "Selecione uma região primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {bairros.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-bairro">Sub-Bairro/Localização</Label>
                  <Select value={subBairro} onValueChange={setSubBairro} disabled={!bairro}>
                    <SelectTrigger id="sub-bairro">
                      <SelectValue placeholder={bairro ? "Selecione (opcional)" : "Selecione um bairro primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhum</SelectItem>
                      {subBairros.map(sb => (
                        <SelectItem key={sb} value={sb}>{sb}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Label htmlFor="area-lote">Área do Lote / Área Total Útil (m²) *</Label>
                    <Input
                      id="area-lote"
                      type="number"
                      placeholder="195"
                      value={areaLote}
                      onChange={(e) => setAreaLote(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area-construida">Área Construída Equivalente (m²)</Label>
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
                        <SelectItem value="Casa">Casa</SelectItem>
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                        <SelectItem value="Comercial">Comercial</SelectItem>
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
                    <Label htmlFor="padrao">Padrão Semelhante</Label>
                    <Select value={padraoSemelhante} onValueChange={setPadraoSemelhante}>
                      <SelectTrigger id="padrao">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lote">Lote</SelectItem>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Alto">Alto</SelectItem>
                        <SelectItem value="Luxo">Luxo</SelectItem>
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
                        <SelectItem value="Novo">Novo</SelectItem>
                        <SelectItem value="Bom">Bom</SelectItem>
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="Ruim">Ruim</SelectItem>
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

                <Button onClick={calcularAvaliacao} className="w-full gap-2" size="lg">
                  <Calculator className="w-5 h-5" />
                  Calcular Avaliação
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
  );
}