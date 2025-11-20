import React, { useState, useEffect } from "react";
import { TabelaReferencia } from "@/entities/TabelaReferencia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await TabelaReferencia.list();
      setTabelas(data);
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error);
    }
  };

  const getItemsByType = (tipo) => {
    return tabelas.filter(t => t.tipo_tabela === tipo);
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
      await TabelaReferencia.delete(itemToDelete.id);
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

    return (
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
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
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    if (editingItem && editingItem.id === item.id) {
                      return (
                        <TableRow key={item.id}>
                          <TableCell colSpan={tipo === "Valor_Metro_Quadrado" ? 7 : 6}>
                            {renderForm(editingItem, false)}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={item.id}>
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
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Base de Cálculo:</strong> Gerencie aqui todos os valores e tabelas utilizados pela Calculadora de Avaliação de Imóveis. 
            Alterações aqui afetam os cálculos futuros.
          </p>
        </div>
        
        <Tabs defaultValue="valor_m2" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="valor_m2" className="text-xs md:text-sm">Valor/m²</TabsTrigger>
            <TabsTrigger value="fator_mercado" className="text-xs md:text-sm">Fator Mercado</TabsTrigger>
            <TabsTrigger value="depreciacao" className="text-xs md:text-sm">Depreciação</TabsTrigger>
            <TabsTrigger value="cub" className="text-xs md:text-sm">CUB</TabsTrigger>
          </TabsList>

        <TabsContent value="valor_m2" className="space-y-4">
          {renderTable("Valor_Metro_Quadrado", "Valor do Metro Quadrado por Região/Bairro")}
        </TabsContent>

        <TabsContent value="fator_mercado" className="space-y-4">
          {renderTable("Fator_Mercado", "Fatores de Comercialização")}
        </TabsContent>

        <TabsContent value="depreciacao" className="space-y-4">
          {renderTable("Depreciacao", "Tabela de Depreciação Ross Heidecke")}
        </TabsContent>

        <TabsContent value="cub" className="space-y-4">
          {renderTable("CUB", "Custos Unitários Básicos (CUB)")}
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
    </TooltipProvider>
  );
}