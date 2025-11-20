import React, { useState, useEffect } from "react";
import { TabelaReferencia } from "@/entities/TabelaReferencia";
import { AvaliacaoImovel } from "@/entities/AvaliacaoImovel";
import RossHeideckeManager from "./RossHeideckeManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, X, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ImportacaoLoteReferencia from "./ImportacaoLoteReferencia";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BaseCalculoManager() {
  const { toast } = useToast();
  const [tabelas, setTabelas] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState(null);
  const [editingAvaliacao, setEditingAvaliacao] = useState(null);
  const [newAvaliacao, setNewAvaliacao] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Estados para seleção e filtros
  const [selectedItems, setSelectedItems] = useState([]);
  const [filters, setFilters] = useState({
    regiao: "",
    bairro: "",
    categoria: "",
    ativo: "todos"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await TabelaReferencia.list();
      setTabelas(data);
      const avaliacoesData = await AvaliacaoImovel.list("-created_date");
      setAvaliacoes(avaliacoesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const getItemsByType = (tipo) => {
    let items = tabelas.filter(t => t.tipo_tabela === tipo);
    
    // Aplicar filtros
    if (filters.regiao) {
      items = items.filter(i => i.regiao?.toLowerCase().includes(filters.regiao.toLowerCase()));
    }
    if (filters.bairro) {
      items = items.filter(i => i.bairro?.toLowerCase().includes(filters.bairro.toLowerCase()));
    }
    if (filters.categoria) {
      items = items.filter(i => i.categoria?.toLowerCase().includes(filters.categoria.toLowerCase()));
    }
    if (filters.ativo !== "todos") {
      items = items.filter(i => i.ativo === (filters.ativo === "ativo"));
    }
    
    return items;
  };

  const getFilteredAvaliacoes = () => {
    let items = avaliacoes;
    
    if (filters.regiao) {
      items = items.filter(i => i.regiao?.toLowerCase().includes(filters.regiao.toLowerCase()));
    }
    if (filters.bairro) {
      items = items.filter(i => i.bairro?.toLowerCase().includes(filters.bairro.toLowerCase()));
    }
    
    return items;
  };

  const handleCreate = (tipo) => {
    const template = {
      tipo_tabela: tipo,
      regiao: "",
      bairro: "",
      categoria: "",
      valor: 0,
      percentual: null,
      descricao: "",
      ativo: true
    };
    setNewItem(template);
  };

  const handleCreateAvaliacao = () => {
    const template = {
      regiao: "",
      bairro: "",
      sub_bairro: "",
      area_lote: null,
      area_construida: null,
      vida_util: "Lote",
      idade_aparente: null,
      padrao_semelhante: "Lote",
      estado_conservacao: "Bom",
      fator_comercializacao: "Normal",
      valor_benfeitoria: null,
      valor_medio_lote: null,
      valor_medio_venda: null,
      limite_inferior: null,
      limite_superior: null,
      valor_considerado: null,
      nome_cliente: "",
      cpf_cliente: "",
      endereco_cliente: "",
      telefone_cliente: ""
    };
    setNewAvaliacao(template);
  };

  const handleSaveNew = async () => {
    if (!newItem.valor && !newItem.percentual) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    try {
      await TabelaReferencia.create(newItem);
      toast({
        title: "✅ Sucesso!",
        description: "Item criado e salvo com sucesso.",
      });
      setNewItem(null);
      loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao criar item. Verifique os dados.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editingItem.valor && !editingItem.percentual) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    try {
      await TabelaReferencia.update(editingItem.id, editingItem);
      toast({
        title: "✅ Sucesso!",
        description: "Item atualizado com sucesso.",
      });
      setEditingItem(null);
      loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao atualizar item. Verifique os dados.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (itemToDelete.tipo === "avaliacao") {
        await AvaliacaoImovel.delete(itemToDelete.id);
      } else {
        await TabelaReferencia.delete(itemToDelete.id);
      }
      toast({
        title: "✅ Item Excluído!",
        description: "O item foi removido permanentemente da base de cálculo.",
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error) {
      toast({
        title: "❌ Erro ao Excluir",
        description: "Não foi possível remover o item. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleSaveNewAvaliacao = async () => {
    if (!newAvaliacao.regiao || !newAvaliacao.bairro || !newAvaliacao.area_lote) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios (região, bairro e área do lote).",
        variant: "destructive"
      });
      return;
    }
    try {
      await AvaliacaoImovel.create(newAvaliacao);
      toast({
        title: "✅ Sucesso!",
        description: "Avaliação histórica criada com sucesso.",
      });
      setNewAvaliacao(null);
      loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao criar avaliação. Verifique os dados.",
        variant: "destructive"
      });
    }
  };

  const handleSaveEditAvaliacao = async () => {
    if (!editingAvaliacao.regiao || !editingAvaliacao.bairro || !editingAvaliacao.area_lote) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios (região, bairro e área do lote).",
        variant: "destructive"
      });
      return;
    }
    try {
      await AvaliacaoImovel.update(editingAvaliacao.id, editingAvaliacao);
      toast({
        title: "✅ Sucesso!",
        description: "Avaliação histórica atualizada com sucesso.",
      });
      setEditingAvaliacao(null);
      loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao atualizar avaliação. Verifique os dados.",
        variant: "destructive"
      });
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedItems.length === 0) {
      toast({
        title: "⚠️ Nenhum item selecionado",
        description: "Selecione pelo menos um item para alterar o status.",
        variant: "destructive"
      });
      return;
    }

    try {
      for (const id of selectedItems) {
        await TabelaReferencia.update(id, { ativo: status });
      }
      
      toast({
        title: "✅ Status atualizado!",
        description: `${selectedItems.length} registro(s) ${status ? 'ativado(s)' : 'desativado(s)'} com sucesso.`,
      });
      
      setSelectedItems([]);
      loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao atualizar status. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = (item) => {
    const duplicate = { ...item };
    delete duplicate.id;
    delete duplicate.created_date;
    delete duplicate.updated_date;
    delete duplicate.created_by;
    setNewItem(duplicate);
    
    toast({
      title: "📋 Registro duplicado",
      description: "Edite os campos e clique em Salvar para criar o novo registro.",
    });
  };

  const handleDuplicateAvaliacao = (item) => {
    const duplicate = { ...item };
    delete duplicate.id;
    delete duplicate.created_date;
    delete duplicate.updated_date;
    delete duplicate.created_by;
    setNewAvaliacao(duplicate);
    
    toast({
      title: "📋 Avaliação duplicada",
      description: "Edite os campos e clique em Salvar para criar o novo registro.",
    });
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = (items) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const renderAvaliacaoForm = (item, isNew) => {
    const updateItem = isNew 
      ? (updates) => setNewAvaliacao({ ...item, ...updates })
      : (updates) => setEditingAvaliacao({ ...item, ...updates });

    return (
      <Card className="mb-4 border-2 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Região *</Label>
              <Input
                value={item.regiao || ""}
                onChange={(e) => updateItem({ regiao: e.target.value })}
                placeholder="Ex: São_João_Del_Rei"
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro *</Label>
              <Input
                value={item.bairro || ""}
                onChange={(e) => updateItem({ bairro: e.target.value })}
                placeholder="Ex: Centro"
              />
            </div>
            <div className="space-y-2">
              <Label>Sub-Bairro / Localização</Label>
              <Input
                value={item.sub_bairro || ""}
                onChange={(e) => updateItem({ sub_bairro: e.target.value })}
                placeholder="Ex: Centro Histórico"
              />
            </div>
            <div className="space-y-2">
              <Label>Área do Lote (m²) *</Label>
              <Input
                type="number"
                value={item.area_lote || ""}
                onChange={(e) => updateItem({ area_lote: parseFloat(e.target.value) })}
                placeholder="300"
              />
            </div>
            <div className="space-y-2">
              <Label>Área Construída Equivalente (m²)</Label>
              <Input
                type="number"
                value={item.area_construida || ""}
                onChange={(e) => updateItem({ area_construida: parseFloat(e.target.value) })}
                placeholder="150"
              />
            </div>
            <div className="space-y-2">
              <Label>Vida Útil</Label>
              <Select 
                value={item.vida_util || "Lote"} 
                onValueChange={(value) => updateItem({ vida_util: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
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
              <Label>Idade Aparente (Anos)</Label>
              <Input
                type="number"
                value={item.idade_aparente || ""}
                onChange={(e) => updateItem({ idade_aparente: parseInt(e.target.value) })}
                placeholder="20"
              />
            </div>
            <div className="space-y-2">
              <Label>Padrão Semelhante</Label>
              <Select 
                value={item.padrao_semelhante || "Lote"} 
                onValueChange={(value) => updateItem({ padrao_semelhante: value })}
              >
                <SelectTrigger>
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
              <Label>Estado de Conservação</Label>
              <Select 
                value={item.estado_conservacao || "C - Regular"} 
                onValueChange={(value) => updateItem({ estado_conservacao: value })}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Fator de Comercialização</Label>
              <Select 
                value={item.fator_comercializacao || "Normal"} 
                onValueChange={(value) => updateItem({ fator_comercializacao: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Desaquecido">Desaquecido</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Aquecido">Aquecido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Benfeitoria Depreciada (R$)</Label>
              <Input
                type="number"
                value={item.valor_benfeitoria || ""}
                onChange={(e) => updateItem({ valor_benfeitoria: parseFloat(e.target.value) })}
                placeholder="250000"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Médio Sugerido do Lote (R$)</Label>
              <Input
                type="number"
                value={item.valor_medio_lote || ""}
                onChange={(e) => updateItem({ valor_medio_lote: parseFloat(e.target.value) })}
                placeholder="150000"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Médio de Venda Sugerido (R$)</Label>
              <Input
                type="number"
                value={item.valor_medio_venda || ""}
                onChange={(e) => updateItem({ valor_medio_venda: parseFloat(e.target.value) })}
                placeholder="400000"
              />
            </div>
            <div className="space-y-2">
              <Label>Limite Inferior (R$)</Label>
              <Input
                type="number"
                value={item.limite_inferior || ""}
                onChange={(e) => updateItem({ limite_inferior: parseFloat(e.target.value) })}
                placeholder="300000"
              />
            </div>
            <div className="space-y-2">
              <Label>Limite Superior (R$)</Label>
              <Input
                type="number"
                value={item.limite_superior || ""}
                onChange={(e) => updateItem({ limite_superior: parseFloat(e.target.value) })}
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Considerado (R$)</Label>
              <Input
                type="number"
                value={item.valor_considerado || ""}
                onChange={(e) => updateItem({ valor_considerado: parseFloat(e.target.value) })}
                placeholder="400000"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={item.nome_cliente || ""}
                onChange={(e) => updateItem({ nome_cliente: e.target.value })}
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={item.cpf_cliente || ""}
                onChange={(e) => updateItem({ cpf_cliente: e.target.value })}
                placeholder="123.456.789-00"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={item.endereco_cliente || ""}
                onChange={(e) => updateItem({ endereco_cliente: e.target.value })}
                placeholder="Rua das Flores, 123"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={item.telefone_cliente || ""}
                onChange={(e) => updateItem({ telefone_cliente: e.target.value })}
                placeholder="(32) 99999-9999"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={isNew ? handleSaveNewAvaliacao : handleSaveEditAvaliacao}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar
            </Button>
            <Button 
              variant="outline"
              onClick={() => isNew ? setNewAvaliacao(null) : setEditingAvaliacao(null)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderForm = (item, isNew) => {
    const tipo = item.tipo_tabela;
    const updateItem = isNew 
      ? (updates) => setNewItem({ ...item, ...updates })
      : (updates) => setEditingItem({ ...item, ...updates });

    return (
      <Card className="mb-4 border-2 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tipo === "Valor_Metro_Quadrado" && (
              <>
                <div className="space-y-2">
                  <Label>Região *</Label>
                  <Input
                    value={item.regiao || ""}
                    onChange={(e) => updateItem({ regiao: e.target.value })}
                    placeholder="Ex: São_João_Del_Rei"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro *</Label>
                  <Input
                    value={item.bairro || ""}
                    onChange={(e) => updateItem({ bairro: e.target.value })}
                    placeholder="Ex: Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor por m² (R$) *</Label>
                  <Input
                    type="number"
                    value={item.valor || ""}
                    onChange={(e) => updateItem({ valor: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            {tipo === "Fator_Mercado" && (
              <>
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select 
                    value={item.categoria || ""} 
                    onValueChange={(value) => updateItem({ categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Desaquecido">Desaquecido</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Aquecido">Aquecido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fator *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.valor || ""}
                    onChange={(e) => updateItem({ valor: parseFloat(e.target.value) })}
                    placeholder="1.00"
                  />
                </div>
              </>
            )}

            {tipo === "Depreciacao" && (
              <>
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Input
                    value={item.categoria || ""}
                    onChange={(e) => updateItem({ categoria: e.target.value })}
                    placeholder="Ex: Vida Útil (%)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentual (%) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.percentual || ""}
                    onChange={(e) => updateItem({ percentual: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            {tipo === "CUB" && (
              <>
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select 
                    value={item.categoria || ""} 
                    onValueChange={(value) => updateItem({ categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R1B - Residência unifamiliar padrão baixo">R1B - Residência unifamiliar padrão baixo</SelectItem>
                      <SelectItem value="R1N - Residência unifamiliar padrão normal">R1N - Residência unifamiliar padrão normal</SelectItem>
                      <SelectItem value="R1A - Residência unifamiliar padrão alto">R1A - Residência unifamiliar padrão alto</SelectItem>
                      <SelectItem value="R8N - Residência multifamiliar, padrão normal">R8N - Residência multifamiliar, padrão normal</SelectItem>
                      <SelectItem value="CSL8N - Edifício comercial, com lojas e salas">CSL8N - Edifício comercial, com lojas e salas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor CUB (R$/m²) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.valor || ""}
                    onChange={(e) => updateItem({ valor: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={item.descricao || ""}
                onChange={(e) => updateItem({ descricao: e.target.value })}
                placeholder="Informações adicionais (opcional)"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={isNew ? handleSaveNew : handleSaveEdit}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar
            </Button>
            <Button 
              variant="outline"
              onClick={() => isNew ? setNewItem(null) : setEditingItem(null)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTable = (tipo, titulo) => {
    const items = getItemsByType(tipo);
    const allSelected = items.length > 0 && selectedItems.length === items.length;

    return (
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <CardTitle>{titulo}</CardTitle>
              <Button 
                onClick={() => handleCreate(tipo)}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {(tipo === "Valor_Metro_Quadrado") && (
                <>
                  <Input
                    placeholder="Filtrar por região..."
                    value={filters.regiao}
                    onChange={(e) => setFilters({ ...filters, regiao: e.target.value })}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Filtrar por bairro..."
                    value={filters.bairro}
                    onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}
                    className="text-sm"
                  />
                </>
              )}
              {(tipo === "Fator_Mercado" || tipo === "Depreciacao" || tipo === "CUB") && (
                <Input
                  placeholder="Filtrar por categoria..."
                  value={filters.categoria}
                  onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
                  className="text-sm"
                />
              )}
              <Select value={filters.ativo} onValueChange={(value) => setFilters({ ...filters, ativo: value })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Ações em massa */}
            {selectedItems.length > 0 && (
              <div className="flex gap-2 items-center bg-blue-50 p-2 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-900">
                  {selectedItems.length} selecionado(s)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange(true)}
                  className="gap-1"
                >
                  Ativar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange(false)}
                  className="gap-1"
                >
                  Desativar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedItems([])}
                  className="gap-1"
                >
                  Limpar Seleção
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {newItem && newItem.tipo_tabela === tipo && renderForm(newItem, true)}

          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum registro cadastrado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleSelectAll(items)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableHead>
                    {tipo === "Valor_Metro_Quadrado" && (
                      <>
                        <TableHead>Região</TableHead>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Valor (R$/m²)</TableHead>
                      </>
                    )}
                    {tipo === "Fator_Mercado" && (
                      <>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Fator</TableHead>
                      </>
                    )}
                    {tipo === "Depreciacao" && (
                      <>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Percentual (%)</TableHead>
                      </>
                    )}
                    {tipo === "CUB" && (
                      <>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Valor (R$/m²)</TableHead>
                      </>
                    )}
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    if (editingItem && editingItem.id === item.id) {
                      return (
                        <TableRow key={item.id}>
                          <TableCell colSpan={tipo === "Valor_Metro_Quadrado" ? 8 : 7}>
                            {renderForm(editingItem, false)}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </TableCell>
                        {tipo === "Valor_Metro_Quadrado" && (
                          <>
                            <TableCell className="font-medium">{item.regiao}</TableCell>
                            <TableCell>{item.bairro}</TableCell>
                            <TableCell>R$ {item.valor?.toFixed(2)}</TableCell>
                          </>
                        )}
                        {tipo === "Fator_Mercado" && (
                          <>
                            <TableCell className="font-medium">{item.categoria}</TableCell>
                            <TableCell>{item.valor?.toFixed(2)}</TableCell>
                          </>
                        )}
                        {tipo === "Depreciacao" && (
                          <>
                            <TableCell className="font-medium">{item.categoria}</TableCell>
                            <TableCell>{item.percentual?.toFixed(2)}%</TableCell>
                          </>
                        )}
                        {tipo === "CUB" && (
                          <>
                            <TableCell className="font-medium">{item.categoria}</TableCell>
                            <TableCell>R$ {item.valor?.toFixed(2)}</TableCell>
                          </>
                        )}
                        <TableCell className="text-gray-600">{item.descricao || "-"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {item.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicate(item)}
                                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Duplicar</TooltipContent>
                            </Tooltip>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete(item);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-blue-900 flex-1">
              <strong>ℹ️ Base de Cálculo:</strong> Gerencie aqui todos os valores e tabelas utilizados pela Calculadora de Avaliação de Imóveis. 
              Alterações aqui afetam os cálculos futuros.
            </p>
            <Button
              onClick={() => setShowImportDialog(true)}
              className="gap-2 bg-green-600 hover:bg-green-700 shrink-0"
            >
              <Upload className="w-4 h-4" />
              Importação em Lote
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="valor_m2" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="valor_m2" className="text-xs md:text-sm">Valor/m²</TabsTrigger>
            <TabsTrigger value="fator_mercado" className="text-xs md:text-sm">Fator Mercado</TabsTrigger>
            <TabsTrigger value="depreciacao" className="text-xs md:text-sm">Depreciação</TabsTrigger>
            <TabsTrigger value="cub" className="text-xs md:text-sm">CUB</TabsTrigger>
            <TabsTrigger value="avaliacoes" className="text-xs md:text-sm">Avaliações Históricas</TabsTrigger>
          </TabsList>

        <TabsContent value="valor_m2" className="space-y-4">
          {renderTable("Valor_Metro_Quadrado", "Valor do Metro Quadrado por Região/Bairro")}
        </TabsContent>

        <TabsContent value="fator_mercado" className="space-y-4">
          {renderTable("Fator_Mercado", "Fatores de Comercialização")}
        </TabsContent>

        <TabsContent value="depreciacao" className="space-y-4">
          <RossHeideckeManager />
        </TabsContent>

        <TabsContent value="cub" className="space-y-4">
          {renderTable("CUB", "Custos Unitários Básicos (CUB)")}
        </TabsContent>

        <TabsContent value="avaliacoes" className="space-y-4">
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Avaliações Históricas</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowImportDialog(true)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Importar CSV
                    </Button>
                    <Button 
                      onClick={handleCreateAvaliacao}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>
                
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    placeholder="Filtrar por região..."
                    value={filters.regiao}
                    onChange={(e) => setFilters({ ...filters, regiao: e.target.value })}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Filtrar por bairro..."
                    value={filters.bairro}
                    onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {newAvaliacao && renderAvaliacaoForm(newAvaliacao, true)}

              {getFilteredAvaliacoes().length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma avaliação histórica cadastrada
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Região</TableHead>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Sub-Bairro</TableHead>
                        <TableHead>Área Lote</TableHead>
                        <TableHead>Área Const.</TableHead>
                        <TableHead>Valor Venda</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAvaliacoes().map((av) => {
                        if (editingAvaliacao && editingAvaliacao.id === av.id) {
                          return (
                            <TableRow key={av.id}>
                              <TableCell colSpan={7}>
                                {renderAvaliacaoForm(editingAvaliacao, false)}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return (
                          <TableRow key={av.id}>
                            <TableCell className="font-medium">{av.regiao}</TableCell>
                            <TableCell>{av.bairro}</TableCell>
                            <TableCell>{av.sub_bairro || "-"}</TableCell>
                            <TableCell>{av.area_lote} m²</TableCell>
                            <TableCell>{av.area_construida ? `${av.area_construida} m²` : "-"}</TableCell>
                            <TableCell>
                              {av.valor_medio_venda ? 
                                `R$ ${av.valor_medio_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDuplicateAvaliacao(av)}
                                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Duplicar</TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingAvaliacao({ ...av })}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setItemToDelete({ ...av, tipo: "avaliacao" });
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-red-600">⚠️ Confirmar Exclusão Permanente</AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-2">
              <p className="font-semibold">Você está prestes a excluir este item da base de cálculo:</p>
              {itemToDelete && (
                <div className="bg-gray-50 p-3 rounded-lg border text-gray-900">
                  <p><strong>Tipo:</strong> {itemToDelete.tipo_tabela}</p>
                  {itemToDelete.categoria && <p><strong>Categoria:</strong> {itemToDelete.categoria}</p>}
                  {itemToDelete.regiao && <p><strong>Região:</strong> {itemToDelete.regiao}</p>}
                  {itemToDelete.bairro && <p><strong>Bairro:</strong> {itemToDelete.bairro}</p>}
                </div>
              )}
              <p className="text-red-600 font-semibold">⚠️ Esta ação é IRREVERSÍVEL e pode afetar cálculos futuros!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-semibold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 font-bold">
              Sim, Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportacaoLoteReferencia
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={loadData}
      />
    </TooltipProvider>
  );
}