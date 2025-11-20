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
 * Tabela Ross-Heidecke COMPLETA,
 * copiada da aba ME.SJDR!B25:J124 da planilha CALCULOMODELO.xlsm
 * 
 * Chaves:
 *  - 1º nível: letra do estado (A..H)
 *  - 2º nível: porcentagem de vida útil (2,3,4,...,100)
 *  - valor: K correspondente
 */
const rossHeideckeTable = {
  "A": {"2":1.02,"3":1.55,"4":2.08,"5":2.63,"6":3.18,"7":3.75,"8":4.32,"9":4.91,"10":5.5,"11":6.11,"12":6.72,"13":7.35,"14":7.98,"15":8.63,"16":9.28,"17":9.94,"18":10.61,"19":11.29,"20":12,"21":12.71,"22":13.44,"23":14.17,"24":14.92,"25":15.69,"26":16.46,"27":17.25,"28":18.04,"29":18.85,"30":19.68,"31":20.51,"32":21.36,"33":22.23,"34":23.1,"35":24,"36":24.9,"37":25.81,"38":26.74,"39":27.69,"40":28.64,"41":29.61,"42":30.6,"43":31.59,"44":32.6,"45":33.63,"46":34.66,"47":35.71,"48":36.78,"49":37.85,"50":38.94,"51":40.05,"52":41.16,"53":42.29,"54":43.44,"55":44.59,"56":45.76,"57":46.95,"58":48.14,"59":49.35,"60":50.58,"61":51.81,"62":53.06,"63":54.33,"64":55.6,"65":56.89,"66":58.2,"67":59.51,"68":60.84,"69":62.19,"70":63.55,"71":64.92,"72":66.3,"73":67.7,"74":69.11,"75":70.54,"76":71.97,"77":73.42,"78":74.88,"79":76.35,"80":77.84,"81":79.33,"82":80.84,"83":82.36,"84":83.89,"85":85.43,"86":86.98,"87":88.54,"88":90.11,"89":91.69,"90":93.28,"91":94.88,"92":96.49,"93":98.11,"94":99.74,"95":100,"96":100,"97":100,"98":100,"99":100,"100":100},
  "B": {"2":1.05,"3":1.58,"4":2.11,"5":2.66,"6":3.21,"7":3.78,"8":4.35,"9":4.94,"10":5.53,"11":6.14,"12":6.75,"13":7.38,"14":8.01,"15":8.66,"16":9.31,"17":9.98,"18":10.65,"19":11.33,"20":12.03,"21":12.74,"22":13.47,"23":14.2,"24":14.95,"25":15.72,"26":16.49,"27":17.28,"28":18.07,"29":18.88,"30":19.71,"31":20.54,"32":21.39,"33":22.26,"34":23.13,"35":24.02,"36":24.93,"37":25.84,"38":26.77,"39":27.72,"40":28.67,"41":29.64,"42":30.63,"43":31.62,"44":32.63,"45":33.66,"46":34.69,"47":35.74,"48":36.81,"49":37.88,"50":38.97,"51":40.08,"52":41.19,"53":42.32,"54":43.47,"55":44.62,"56":45.79,"57":46.98,"58":48.17,"59":49.38,"60":50.61,"61":51.84,"62":53.09,"63":54.36,"64":55.64,"65":56.93,"66":58.24,"67":59.55,"68":60.88,"69":62.23,"70":63.59,"71":64.96,"72":66.34,"73":67.73,"74":69.14,"75":70.57,"76":72.0,"77":73.45,"78":74.91,"79":76.38,"80":77.87,"81":79.36,"82":80.87,"83":82.39,"84":83.92,"85":85.46,"86":87.01,"87":88.57,"88":90.14,"89":91.72,"90":93.31,"91":94.91,"92":96.52,"93":98.14,"94":99.77,"95":100,"96":100,"97":100,"98":100,"99":100,"100":100},
  "C": {"2":3.51,"3":4.03,"4":4.55,"5":5.09,"6":5.62,"7":6.18,"8":6.73,"9":7.31,"10":7.88,"11":8.48,"12":9.08,"13":9.69,"14":10.31,"15":10.95,"16":11.6,"17":12.26,"18":12.93,"19":13.61,"20":14.31,"21":15.02,"22":15.74,"23":16.48,"24":17.23,"25":17.99,"26":18.77,"27":19.55,"28":20.35,"29":21.17,"30":22.0,"31":22.84,"32":23.69,"33":24.56,"34":25.44,"35":26.33,"36":27.24,"37":28.16,"38":29.09,"39":30.03,"40":30.99,"41":31.96,"42":32.94,"43":33.93,"44":34.94,"45":35.97,"46":37.0,"47":38.05,"48":39.11,"49":40.19,"50":41.28,"51":42.38,"52":43.49,"53":44.62,"54":45.76,"55":46.91,"56":48.07,"57":49.24,"58":50.43,"59":51.63,"60":52.84,"61":54.06,"62":55.29,"63":56.54,"64":57.8,"65":59.07,"66":60.35,"67":61.64,"68":62.95,"69":64.27,"70":65.6,"71":66.94,"72":68.29,"73":69.66,"74":71.04,"75":72.43,"76":73.83,"77":75.25,"78":76.68,"79":78.12,"80":79.57,"81":81.03,"82":82.5,"83":83.99,"84":85.49,"85":87.0,"86":88.52,"87":90.05,"88":91.6,"89":93.15,"90":94.72,"91":96.3,"92":97.89,"93":99.49,"94":100,"95":100,"96":100,"97":100,"98":100,"99":100,"100":100},
  "D": {"2":9.03,"3":9.52,"4":10.0,"5":10.5,"6":11.0,"7":11.55,"8":12.1,"9":12.65,"10":13.2,"11":13.8,"12":14.4,"13":15.0,"14":15.6,"15":16.25,"16":16.9,"17":17.55,"18":18.2,"19":18.85,"20":19.5,"21":20.2,"22":20.9,"23":21.6,"24":22.3,"25":23.0,"26":23.75,"27":24.5,"28":25.25,"29":26.0,"30":26.75,"31":27.5,"32":28.25,"33":29.0,"34":29.75,"35":30.5,"36":31.3,"37":32.1,"38":32.9,"39":33.7,"40":34.5,"41":35.35,"42":36.2,"43":37.05,"44":37.9,"45":38.75,"46":39.6,"47":40.45,"48":41.3,"49":42.15,"50":43.0,"51":43.9,"52":44.8,"53":45.7,"54":46.6,"55":47.5,"56":48.4,"57":49.3,"58":50.2,"59":51.1,"60":52.0,"61":52.95,"62":53.9,"63":54.85,"64":55.8,"65":56.75,"66":57.7,"67":58.65,"68":59.6,"69":60.55,"70":61.5,"71":62.45,"72":63.4,"73":64.35,"74":65.3,"75":66.25,"76":67.2,"77":68.15,"78":69.1,"79":70.05,"80":71.0,"81":72.0,"82":73.0,"83":74.0,"84":75.0,"85":76.0,"86":77.0,"87":78.0,"88":79.0,"89":80.0,"90":81.0,"91":82.0,"92":83.0,"93":84.0,"94":85.0,"95":86.0,"96":87.0,"97":88.0,"98":89.0,"99":90.0,"100":100},
  "E": {"2":18.9,"3":19.35,"4":19.8,"5":20.25,"6":20.7,"7":21.15,"8":21.6,"9":22.1,"10":22.6,"11":23.1,"12":23.6,"13":24.1,"14":24.6,"15":25.1,"16":25.6,"17":26.1,"18":26.6,"19":27.1,"20":27.6,"21":28.1,"22":28.6,"23":29.1,"24":29.6,"25":30.1,"26":30.6,"27":31.1,"28":31.6,"29":32.1,"30":32.6,"31":33.1,"32":33.6,"33":34.1,"34":34.6,"35":35.1,"36":35.65,"37":36.2,"38":36.75,"39":37.3,"40":37.85,"41":38.4,"42":38.95,"43":39.5,"44":40.05,"45":40.6,"46":41.15,"47":41.7,"48":42.25,"49":42.8,"50":43.35,"51":43.95,"52":44.55,"53":45.15,"54":45.75,"55":46.35,"56":46.95,"57":47.55,"58":48.15,"59":48.75,"60":49.35,"61":49.95,"62":50.55,"63":51.15,"64":51.75,"65":52.35,"66":52.95,"67":53.55,"68":54.15,"69":54.75,"70":55.35,"71":55.95,"72":56.55,"73":57.15,"74":57.75,"75":58.35,"76":58.95,"77":59.55,"78":60.15,"79":60.75,"80":61.35,"81":62.0,"82":62.65,"83":63.3,"84":63.95,"85":64.6,"86":65.25,"87":65.9,"88":66.55,"89":67.2,"90":67.85,"91":68.5,"92":69.15,"93":69.8,"94":70.45,"95":71.1,"96":71.75,"97":72.4,"98":73.05,"99":73.7,"100":100},
  "F": {"2":33.9,"3":34.25,"4":34.6,"5":34.95,"6":35.3,"7":35.7,"8":36.1,"9":36.5,"10":36.9,"11":37.3,"12":37.7,"13":38.1,"14":38.5,"15":38.9,"16":39.3,"17":39.7,"18":40.1,"19":40.5,"20":40.9,"21":41.35,"22":41.8,"23":42.25,"24":42.7,"25":43.15,"26":43.6,"27":44.05,"28":44.5,"29":44.95,"30":45.4,"31":45.85,"32":46.3,"33":46.75,"34":47.2,"35":47.65,"36":48.1,"37":48.55,"38":49.0,"39":49.45,"40":49.9,"41":50.35,"42":50.8,"43":51.25,"44":51.7,"45":52.15,"46":52.6,"47":53.05,"48":53.5,"49":53.95,"50":54.4,"51":54.9,"52":55.4,"53":55.9,"54":56.4,"55":56.9,"56":57.4,"57":57.9,"58":58.4,"59":58.9,"60":59.4,"61":59.95,"62":60.5,"63":61.05,"64":61.6,"65":62.15,"66":62.7,"67":63.25,"68":63.8,"69":64.35,"70":64.9,"71":65.45,"72":66.0,"73":66.55,"74":67.1,"75":67.65,"76":68.2,"77":68.75,"78":69.3,"79":69.85,"80":70.4,"81":70.95,"82":71.5,"83":72.05,"84":72.6,"85":73.15,"86":73.7,"87":74.25,"88":74.8,"89":75.35,"90":75.9,"91":76.45,"92":77.0,"93":77.55,"94":78.1,"95":78.65,"96":79.2,"97":79.75,"98":80.3,"99":80.85,"100":100},
  "G": {"2":53.1,"3":53.35,"4":53.6,"5":53.85,"6":54.1,"7":54.35,"8":54.6,"9":54.9,"10":55.2,"11":55.5,"12":55.8,"13":56.1,"14":56.4,"15":56.7,"16":57.0,"17":57.3,"18":57.6,"19":57.9,"20":58.2,"21":58.55,"22":58.9,"23":59.25,"24":59.6,"25":59.95,"26":60.3,"27":60.65,"28":61.0,"29":61.35,"30":61.7,"31":62.05,"32":62.4,"33":62.75,"34":63.1,"35":63.45,"36":63.8,"37":64.15,"38":64.5,"39":64.85,"40":65.2,"41":65.55,"42":65.9,"43":66.25,"44":66.6,"45":66.95,"46":67.3,"47":67.65,"48":68.0,"49":68.35,"50":68.7,"51":69.1,"52":69.5,"53":69.9,"54":70.3,"55":70.7,"56":71.1,"57":71.5,"58":71.9,"59":72.3,"60":72.7,"61":73.15,"62":73.6,"63":74.05,"64":74.5,"65":74.95,"66":75.4,"67":75.85,"68":76.3,"69":76.75,"70":77.2,"71":77.65,"72":78.1,"73":78.55,"74":79.0,"75":79.45,"76":79.9,"77":80.35,"78":80.8,"79":81.25,"80":81.7,"81":82.15,"82":82.6,"83":83.05,"84":83.5,"85":83.95,"86":84.4,"87":84.85,"88":85.3,"89":85.75,"90":86.2,"91":86.65,"92":87.1,"93":87.55,"94":88.0,"95":88.45,"96":88.9,"97":89.35,"98":89.8,"99":90.25,"100":100},
  "H": {"2":75.6,"3":75.8,"4":76.0,"5":76.2,"6":76.4,"7":76.6,"8":76.8,"9":77.0,"10":77.2,"11":77.45,"12":77.7,"13":77.95,"14":78.2,"15":78.45,"16":78.7,"17":78.95,"18":79.2,"19":79.45,"20":79.7,"21":80.0,"22":80.3,"23":80.6,"24":80.9,"25":81.2,"26":81.5,"27":81.8,"28":82.1,"29":82.4,"30":82.7,"31":83.0,"32":83.3,"33":83.6,"34":83.9,"35":84.2,"36":84.5,"37":84.8,"38":85.1,"39":85.4,"40":85.7,"41":86.0,"42":86.3,"43":86.6,"44":86.9,"45":87.2,"46":87.5,"47":87.8,"48":88.1,"49":88.4,"50":88.7,"51":89.05,"52":89.4,"53":89.75,"54":90.1,"55":90.45,"56":90.8,"57":91.15,"58":91.5,"59":91.85,"60":92.2,"61":92.55,"62":92.9,"63":93.25,"64":93.6,"65":93.95,"66":94.3,"67":94.65,"68":95.0,"69":95.35,"70":95.7,"71":96.05,"72":96.4,"73":96.75,"74":97.1,"75":97.45,"76":97.8,"77":98.15,"78":98.5,"79":98.85,"80":99.2,"81":99.4,"82":99.6,"83":99.8,"84":100,"85":100,"86":100,"87":100,"88":100,"89":100,"90":100,"91":100,"92":100,"93":100,"94":100,"95":100,"96":100,"97":100,"98":100,"99":100,"100":100}
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
 * Retorna o K da tabela Ross-Heidecke, conforme a planilha.
 * @param percVidaUtil % da vida útil consumida (idade / vidaUtil)
 * @param estadoConservacao string tipo "C - Regular"
 */
const obterK_RossHeidecke = (percVidaUtil, estadoConservacao) => {
  const letra = extrairLetraEstado(estadoConservacao);
  const tabela = rossHeideckeTable[letra] || rossHeideckeTable["C"];

  // Aplica EVEN (assim, 10.77% se torna 12%, 13% se torna 14%, etc.)
  let percEven = EVEN(percVidaUtil);

  // limita entre 2 e 100
  if (percEven < 2) percEven = 2;
  if (percEven > 100) percEven = 100;

  const chave = String(percEven);
  return tabela[chave] ?? 50;
};

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

      await loadRegioes();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const loadRegioes = async () => {
    try {
      const todasAvaliacoes = await AvaliacaoImovel.list();
      const regioesUnicas = [...new Set(todasAvaliacoes.map(a => a.regiao))].filter(Boolean).sort();
      setRegioes(regioesUnicas);
    } catch (error) {
      console.error("Erro ao carregar regiões:", error);
    }
  };

  const loadBairros = async (regiaoSelecionada) => {
    try {
      const avaliacoesDaRegiao = await AvaliacaoImovel.filter({
        regiao: regiaoSelecionada
      });
      const bairrosUnicos = [...new Set(avaliacoesDaRegiao.map(a => a.bairro))].filter(Boolean).sort();
      setBairros(bairrosUnicos);
    } catch (error) {
      console.error("Erro ao carregar bairros:", error);
    }
  };

  const loadSubBairros = async (regiaoSelecionada, bairroSelecionado) => {
    try {
      const avaliacoesDoBairro = await AvaliacaoImovel.filter({
        regiao: regiaoSelecionada,
        bairro: bairroSelecionado
      });
      const subBairrosUnicos = [...new Set(avaliacoesDoBairro.map(a => a.sub_bairro))].filter(Boolean).sort();
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
        title: "⚠️ Campos obrigatórios",
        description: "Preencha região, bairro e área do lote.",
        variant: "destructive"
      });
      return;
    }

    setCalculando(true);
    try {
      const areaLoteNum = parseFloat(areaLote);
      const areaConstrNum = areaConstruida ? parseFloat(areaConstruida) : 0;

      // 1) Buscar valor do m² (mantendo sua estrutura de TabelaReferencia)
      let valorM2 = 0;

      // primeiro tenta combinação região+bairro
      const valoresM2Diretos = await TabelaReferencia.filter({
        tipo_tabela: "Valor_Metro_Quadrado",
        regiao: regiao,
        bairro: bairro,
        ativo: true
      });

      if (valoresM2Diretos.length > 0) {
        valorM2 = valoresM2Diretos[0].valor;
      } else {
        // fallback: qualquer valor da região
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

      // 2) Valor do lote
      const valorLote = areaLoteNum * valorM2;

      // 3) Fator de mercado (Desaquecido / Normal / Aquecido)
      let fatorMercado = 1.0;
      const fatoresComercializacao = await TabelaReferencia.filter({
        tipo_tabela: "Fator_Mercado",
        categoria: fatorComercializacao,
        ativo: true
      });
      if (fatoresComercializacao.length > 0) {
        fatorMercado = fatoresComercializacao[0].valor;
      }

      // 4) Cálculo da benfeitoria depreciada (Ross-Heidecke) – se houver área construída
      let valorBenfeitoriaCalc = 0;

      if (areaConstrNum > 0 && padraoSemelhante !== "Lote") {
        const cubData = await TabelaReferencia.filter({
          tipo_tabela: "CUB",
          ativo: true
        });

        // tentar match exato com categoria
        let cubEncontrado = cubData.find(c => c.categoria === padraoSemelhante);

        // mapeamento alternativo simples
        if (!cubEncontrado) {
          const padraoToCUB = {
            "Lote": null,
            "Kitnet": "R1B - Residência unifamiliar padrão baixo",
            "RPIQ - Residência unifamiliar popular": "R1B - Residência unifamiliar padrão baixo"
          };
          const categoriaMapeada = padraoToCUB[padraoSemelhante];
          if (categoriaMapeada) {
            cubEncontrado = cubData.find(c => c.categoria === categoriaMapeada);
          }
        }

        // fallback padrão
        if (!cubEncontrado && padraoSemelhante !== "Lote") {
          cubEncontrado = cubData.find(c => c.categoria === "R1N - Residência unifamiliar padrão normal");
        }

        if (cubEncontrado) {
          const BDI = 1.2309; // mesmo da planilha
          const custoBenfeitoria = cubEncontrado.valor * areaConstrNum * BDI;

          if (idadeAparente && parseInt(idadeAparente) > 0) {
            const vidaUtilAnos = extrairAnosVidaUtil(vidaUtil);
            const idadeAnos = parseInt(idadeAparente);

            let percVidaUtil = (idadeAnos / vidaUtilAnos) * 100;
            // limita entre 0 e 100
            percVidaUtil = Math.max(0, Math.min(100, percVidaUtil));

            // obtém K pela tabela Ross-Heidecke
            const K = obterK_RossHeidecke(percVidaUtil, estadoConservacao);

            // *** CORREÇÃO: valor depreciado = custo * (100 - K)/100 ***
            const fatorDepreciacao = (100 - K) / 100;
            valorBenfeitoriaCalc = custoBenfeitoria * fatorDepreciacao;
          } else {
            // sem idade: sem depreciação
            valorBenfeitoriaCalc = custoBenfeitoria;
          }
        }
      }

      // 5) Regra especial para Centro / Apartamento (como na planilha)
      const bairroEhCentro = (bairro || "").trim().toLowerCase() === "centro";
      const subLoc = (subBairro || "").trim().toLowerCase();
      const ehApartamentoCentro =
        bairroEhCentro &&
        subLoc.startsWith("apartamento -") &&
        subLoc !== "apartamento - o lote";

      let baseCalculo = 0;

      if (ehApartamentoCentro && areaConstrNum > 0) {
        const v1 = valorLote;
        const v2 = (valorLote / areaLoteNum) * areaConstrNum;
        baseCalculo = Math.max(v1, v2);
      } else {
        baseCalculo = valorLote + valorBenfeitoriaCalc;
      }

      // 6) Aplica fator de mercado sobre a base
      const valorVendaBruto = baseCalculo * fatorMercado;

      // 7) Valor médio de venda sugerido – arredondado para o milhar
      const valorVendaSugerido = arredondarMilhar(valorVendaBruto);

      // 8) Limites inferior/superior (75% / 125%) arredondados
      const limiteInf = arredondarMilharParaBaixo(valorVendaBruto * 0.75);
      const limiteSup = arredondarMilharParaCima(valorVendaBruto * 1.25);

      // salva nos estados
      setValorMedioLote(valorLote);
      setValorBenfeitoria(valorBenfeitoriaCalc);
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
    if (!regiao || !bairro || !areaLote) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha os campos obrigatórios (região, bairro e área).",
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