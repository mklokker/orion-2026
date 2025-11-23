import React, { useState, useEffect } from "react";
import { ValorM2 } from "@/entities/ValorM2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Search, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function GerenciadorLocalizacao() {
  const { toast } = useToast();
  const [valoresM2, setValoresM2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Estados para migração em lote
  const [tipoCampo, setTipoCampo] = useState("cidade"); // cidade, bairro, sub_bairro
  const [valorAntigo, setValorAntigo] = useState("");
  const [valorNovo, setValorNovo] = useState("");
  const [campoDestino, setCampoDestino] = useState("cidade");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ValorM2.filter({ ativo: true });
      setValoresM2(data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigracaoLote = async () => {
    if (!valorAntigo || !valorNovo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o valor antigo e o novo valor.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Filtrar registros que correspondem ao valor antigo no campo selecionado
      const registrosParaMigrar = valoresM2.filter(item => {
        const valorCampo = item[tipoCampo]?.toLowerCase().trim();
        const valorBusca = valorAntigo.toLowerCase().trim();
        return valorCampo === valorBusca;
      });

      if (registrosParaMigrar.length === 0) {
        toast({
          title: "Nenhum registro encontrado",
          description: `Não foram encontrados registros com ${tipoCampo} = "${valorAntigo}".`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Confirmar com o usuário
      const confirmar = window.confirm(
        `Foram encontrados ${registrosParaMigrar.length} registro(s).\n\n` +
        `Campo: ${tipoCampo}\n` +
        `Valor atual: "${valorAntigo}"\n` +
        `Mover para campo: ${campoDestino}\n` +
        `Novo valor: "${valorNovo}"\n\n` +
        `Deseja continuar com a migração?`
      );

      if (!confirmar) {
        setLoading(false);
        return;
      }

      // Realizar a migração
      let sucesso = 0;
      let erros = 0;

      for (const item of registrosParaMigrar) {
        try {
          const novosDados = { ...item };
          
          // Se está movendo para um campo diferente
          if (tipoCampo !== campoDestino) {
            // Reorganizar os dados
            if (campoDestino === "cidade") {
              novosDados.cidade = valorNovo;
              novosDados.bairro = item.cidade;
              novosDados.sub_bairro = item.bairro;
            } else if (campoDestino === "bairro") {
              if (tipoCampo === "cidade") {
                novosDados.cidade = item.bairro || item.cidade;
                novosDados.bairro = valorNovo;
                novosDados.sub_bairro = item.sub_bairro;
              } else if (tipoCampo === "sub_bairro") {
                novosDados.bairro = valorNovo;
                novosDados.sub_bairro = item.bairro;
              }
            } else if (campoDestino === "sub_bairro") {
              novosDados.sub_bairro = valorNovo;
            }
          } else {
            // Mesmo campo, apenas renomear
            novosDados[tipoCampo] = valorNovo;
          }

          await ValorM2.update(item.id, novosDados);
          sucesso++;
        } catch (error) {
          console.error(`Erro ao atualizar ${item.id}:`, error);
          erros++;
        }
      }

      toast({
        title: "Migração concluída!",
        description: `${sucesso} registro(s) migrado(s) com sucesso. ${erros > 0 ? `${erros} erro(s).` : ''}`,
      });

      loadData();
      setValorAntigo("");
      setValorNovo("");
    } catch (error) {
      console.error("Erro na migração:", error);
      toast({
        title: "Erro na migração",
        description: "Ocorreu um erro ao processar a migração.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigracaoSelecionados = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione ao menos um registro para migrar.",
        variant: "destructive"
      });
      return;
    }

    if (!valorNovo) {
      toast({
        title: "Novo valor obrigatório",
        description: "Preencha o novo valor para a migração.",
        variant: "destructive"
      });
      return;
    }

    const confirmar = window.confirm(
      `Migrar ${selectedItems.length} registro(s) selecionado(s)?\n\n` +
      `Campo destino: ${campoDestino}\n` +
      `Novo valor: "${valorNovo}"`
    );

    if (!confirmar) return;

    setLoading(true);
    try {
      let sucesso = 0;
      let erros = 0;

      for (const itemId of selectedItems) {
        const item = valoresM2.find(v => v.id === itemId);
        if (!item) continue;

        try {
          const novosDados = { ...item };
          novosDados[campoDestino] = valorNovo;
          await ValorM2.update(item.id, novosDados);
          sucesso++;
        } catch (error) {
          console.error(`Erro ao atualizar ${item.id}:`, error);
          erros++;
        }
      }

      toast({
        title: "Migração concluída!",
        description: `${sucesso} registro(s) migrado(s). ${erros > 0 ? `${erros} erro(s).` : ''}`,
      });

      setSelectedItems([]);
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar migração.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const dadosFiltrados = valoresM2.filter(item => {
    if (!filtroTexto) return true;
    const busca = filtroTexto.toLowerCase();
    return (
      item.cidade?.toLowerCase().includes(busca) ||
      item.bairro?.toLowerCase().includes(busca) ||
      item.sub_bairro?.toLowerCase().includes(busca)
    );
  });

  const toggleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Migração em Lote por Valor */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle>🔄 Migração em Lote por Valor</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campo de Origem</Label>
              <Select value={tipoCampo} onValueChange={setTipoCampo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cidade">Cidade/Região</SelectItem>
                  <SelectItem value="bairro">Bairro</SelectItem>
                  <SelectItem value="sub_bairro">Sub-Bairro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Atual</Label>
              <Input
                placeholder="Ex: Sao_Joao_Del_Rei"
                value={valorAntigo}
                onChange={(e) => setValorAntigo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Campo de Destino</Label>
              <Select value={campoDestino} onValueChange={setCampoDestino}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cidade">Cidade/Região</SelectItem>
                  <SelectItem value="bairro">Bairro</SelectItem>
                  <SelectItem value="sub_bairro">Sub-Bairro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Novo Valor</Label>
              <Input
                placeholder="Ex: São João Del Rei"
                value={valorNovo}
                onChange={(e) => setValorNovo(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleMigracaoLote}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Executar Migração em Lote
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Migração de Selecionados */}
      {selectedItems.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <p className="font-semibold text-blue-900">
                {selectedItems.length} registro(s) selecionado(s)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mover para Campo</Label>
                  <Select value={campoDestino} onValueChange={setCampoDestino}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cidade">Cidade/Região</SelectItem>
                      <SelectItem value="bairro">Bairro</SelectItem>
                      <SelectItem value="sub_bairro">Sub-Bairro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Novo Valor</Label>
                  <Input
                    placeholder="Digite o novo valor"
                    value={valorNovo}
                    onChange={(e) => setValorNovo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleMigracaoSelecionados}
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  <Save className="w-4 h-4" />
                  Migrar Selecionados
                </Button>
                <Button
                  onClick={() => setSelectedItems([])}
                  variant="outline"
                >
                  Limpar Seleção
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Dados */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle>📊 Visualização de Dados</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Filtrar por cidade, bairro ou sub-bairro..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Total: {dadosFiltrados.length} registro(s)
            {selectedItems.length > 0 && ` • ${selectedItems.length} selecionado(s)`}
          </p>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === dadosFiltrados.length && dadosFiltrados.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(dadosFiltrados.map(item => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </TableHead>
                  <TableHead>Cidade/Região</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Sub-Bairro</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Valor/m²</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.cidade}</TableCell>
                    <TableCell>{item.bairro}</TableCell>
                    <TableCell>{item.sub_bairro}</TableCell>
                    <TableCell className="text-gray-600 text-xs">{item.codigo || "-"}</TableCell>
                    <TableCell className="font-semibold text-green-700">
                      R$ {item.valor_m2?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}