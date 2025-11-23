import React, { useState, useEffect } from "react";
import { ValorM2 } from "@/entities/ValorM2";
import { PadraoSemelhante } from "@/entities/PadraoSemelhante";
import { AvaliacaoImovel } from "@/entities/AvaliacaoImovel";
import { User } from "@/entities/User";
import { calcularAvaliacao } from "@/functions/calcularAvaliacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Calculator, Save, Upload } from "lucide-react";
import ImportValorM2Modal from "../components/calculadora/ImportValorM2Modal";

const VIDA_UTIL_OPTIONS = [
  "Lote",
  "Apartamentos, Kitnets, Garagens, Const. Rurais - 60 anos",
  "Casa de Alvenaria - 65 anos",
  "Casa de Madeira - 45 anos",
  "Hotéis, Teatros, Fábricas - 50 anos",
  "Lojas, Escritórios, Galpões, Bancos - 70 anos"
];

const ESTADO_CONSERVACAO_OPTIONS = [
  "A - Novo",
  "B - Entre novo e regular",
  "C - Regular",
  "D - Entre regular e reparos simples",
  "E - Reparos simples",
  "F - Entre reparos simples e importantes",
  "G - Reparos importantes",
  "H - Entre reparos importantes e 5,valor"
];

const FATOR_COMERCIALIZACAO_OPTIONS = [
  "Desaquecido",
  "Normal",
  "Aquecido"
];

const formatCurrency = (value) => {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function CalculadoraAvaliacao() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Dados de localização
  const [cidades, setCidades] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [subBairros, setSubBairros] = useState([]);
  const [padroesSemelhantes, setPadroesSemelhantes] = useState([]);
  
  // Formulário
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [subBairro, setSubBairro] = useState("");
  const [areaLote, setAreaLote] = useState("");
  const [areaConstruida, setAreaConstruida] = useState("");
  const [vidaUtil, setVidaUtil] = useState("Lote");
  const [idadeAparente, setIdadeAparente] = useState("");
  const [padraoSemelhante, setPadraoSemelhante] = useState("Lote");
  const [estadoConservacao, setEstadoConservacao] = useState("C - Regular");
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
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (cidade) {
      loadBairros();
    }
  }, [cidade]);

  useEffect(() => {
    if (cidade && bairro) {
      loadSubBairros();
    }
  }, [cidade, bairro]);

  const loadInitialData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);
      setIsAdmin(userData.role === 'admin');

      const [cidadesData, padroesData] = await Promise.all([
        ValorM2.list(),
        PadraoSemelhante.filter({ ativo: true })
      ]);

      const cidadesUnicas = [...new Set(cidadesData.map(v => v.cidade))].sort();
      setCidades(cidadesUnicas);
      setPadroesSemelhantes(padroesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados iniciais.",
        variant: "destructive"
      });
    }
  };

  const loadBairros = async () => {
    try {
      const dados = await ValorM2.filter({ cidade });
      const bairrosUnicos = [...new Set(dados.map(v => v.bairro))].sort();
      setBairros(bairrosUnicos);
      setBairro("");
      setSubBairro("");
    } catch (error) {
      console.error("Erro ao carregar bairros:", error);
    }
  };

  const loadSubBairros = async () => {
    try {
      const dados = await ValorM2.filter({ cidade, bairro });
      const subBairrosUnicos = [...new Set(dados.map(v => v.sub_bairro).filter(s => s))].sort();
      setSubBairros(subBairrosUnicos);
      setSubBairro("");
    } catch (error) {
      console.error("Erro ao carregar sub-bairros:", error);
    }
  };

  const handleCalcular = async () => {
    if (!cidade || !bairro || !subBairro || !areaLote) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cidade, bairro, sub-bairro e área do lote.",
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);

    try {
      const { data } = await calcularAvaliacao({
        cidade,
        bairro,
        sub_bairro: subBairro,
        area_lote: areaLote,
        area_construida: areaConstruida || 0,
        vida_util: vidaUtil,
        idade_aparente: idadeAparente || 0,
        padrao_semelhante: padraoSemelhante,
        estado_conservacao: estadoConservacao,
        fator_comercializacao: fatorComercializacao,
      });

      setValorBenfeitoria(data.valor_benfeitoria);
      setValorMedioLote(data.valor_medio_lote);
      setValorMedioVenda(data.valor_medio_venda);
      setLimiteInferior(data.limite_inferior);
      setLimiteSuperior(data.limite_superior);

      toast({
        title: "Avaliação calculada!",
        description: "Os valores foram calculados com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao calcular:", error);
      toast({
        title: "Erro no cálculo",
        description: error.response?.data?.error || "Erro ao calcular avaliação.",
        variant: "destructive"
      });
    }

    setIsCalculating(false);
  };

  const handleSalvar = async () => {
    if (!nomeCliente) {
      toast({
        title: "Nome obrigatório",
        description: "Preencha o nome do cliente para salvar a avaliação.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      await AvaliacaoImovel.create({
        regiao: cidade,
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
        title: "Avaliação salva!",
        description: "A avaliação foi salva com sucesso.",
      });

      // Limpar formulário
      limparFormulario();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Erro ao salvar a avaliação.",
        variant: "destructive"
      });
    }

    setIsSaving(false);
  };

  const limparFormulario = () => {
    setCidade("");
    setBairro("");
    setSubBairro("");
    setAreaLote("");
    setAreaConstruida("");
    setVidaUtil("Lote");
    setIdadeAparente("");
    setPadraoSemelhante("Lote");
    setEstadoConservacao("C - Regular");
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

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center gap-3">
              <Calculator className="w-10 h-10 text-blue-600" />
              Calculadora de Avaliação de Imóveis
            </h1>
            <p className="text-gray-600 mt-2">
              Avaliação com depreciação Ross-Heidecke
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar Dados
            </Button>
          )}
        </div>

        {/* Dados de Localização */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Localização</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cidade/Região *</Label>
              <Select value={cidade} onValueChange={setCidade}>
                <SelectTrigger>
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
              <Label>Bairro *</Label>
              <Select value={bairro} onValueChange={setBairro} disabled={!cidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bairro" />
                </SelectTrigger>
                <SelectContent>
                  {bairros.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sub-bairro *</Label>
              <Select value={subBairro} onValueChange={setSubBairro} disabled={!bairro}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sub-bairro" />
                </SelectTrigger>
                <SelectContent>
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
          <CardHeader>
            <CardTitle>Dados do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área do Lote (m²) *</Label>
                <Input
                  type="number"
                  value={areaLote}
                  onChange={(e) => setAreaLote(e.target.value)}
                  placeholder="Ex: 250"
                />
              </div>

              <div className="space-y-2">
                <Label>Área Construída (m²)</Label>
                <Input
                  type="number"
                  value={areaConstruida}
                  onChange={(e) => setAreaConstruida(e.target.value)}
                  placeholder="Ex: 120 (opcional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vida Útil</Label>
                <Select value={vidaUtil} onValueChange={setVidaUtil}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDA_UTIL_OPTIONS.map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Idade Aparente (anos)</Label>
                <Input
                  type="number"
                  value={idadeAparente}
                  onChange={(e) => setIdadeAparente(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Padrão Semelhante</Label>
                <Select value={padraoSemelhante} onValueChange={setPadraoSemelhante}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lote">Lote</SelectItem>
                    {padroesSemelhantes.map(p => (
                      <SelectItem key={p.id} value={p.descricao}>
                        {p.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado de Conservação</Label>
                <Select value={estadoConservacao} onValueChange={setEstadoConservacao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADO_CONSERVACAO_OPTIONS.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fator de Comercialização</Label>
                <Select value={fatorComercializacao} onValueChange={setFatorComercializacao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FATOR_COMERCIALIZACAO_OPTIONS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCalcular}
              disabled={isCalculating}
              className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Calculator className="w-4 h-4" />
              {isCalculating ? "Calculando..." : "Calcular Avaliação"}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {valorMedioVenda > 0 && (
          <Card className="border-2 border-blue-300 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-blue-900">Resultados da Avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Valor da Benfeitoria Depreciada</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(valorBenfeitoria)}</p>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Valor Médio do Lote</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(valorMedioLote)}</p>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-lg text-white md:col-span-2">
                  <p className="text-sm opacity-90">Valor Médio de Venda Sugerido</p>
                  <p className="text-3xl font-bold">{formatCurrency(valorMedioVenda)}</p>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Limite Inferior (75%)</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(limiteInferior)}</p>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Limite Superior (125%)</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(limiteSuperior)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados do Cliente */}
        {valorMedioVenda > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={cpfCliente}
                    onChange={(e) => setCpfCliente(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    value={enderecoCliente}
                    onChange={(e) => setEnderecoCliente(e.target.value)}
                    placeholder="Endereço completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Valor Considerado (opcional)</Label>
                  <Input
                    type="number"
                    value={valorConsiderado}
                    onChange={(e) => setValorConsiderado(e.target.value)}
                    placeholder="Valor final considerado"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSalvar}
                  disabled={isSaving}
                  className="flex-1 gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Salvando..." : "Salvar Avaliação"}
                </Button>
                <Button
                  onClick={limparFormulario}
                  variant="outline"
                  className="flex-1"
                >
                  Nova Avaliação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isAdmin && (
        <ImportValorM2Modal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            loadInitialData();
            toast({
              title: "Importação concluída!",
              description: "Os dados foram importados com sucesso.",
            });
          }}
        />
      )}
    </div>
  );
}