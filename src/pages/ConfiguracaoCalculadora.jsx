import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Settings, Database, Code } from "lucide-react";
import BaseCalculoManager from "../components/admin/BaseCalculoManager";
import GerenciadorLocalizacao from "../components/calculadora/GerenciadorLocalizacao";
import EditorLogicaCalculo from "../components/calculadora/EditorLogicaCalculo";

export default function ConfiguracaoCalculadora() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-center text-red-800">
              ⚠️ Acesso restrito a administradores
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <Settings className="w-10 h-10 text-blue-600" />
            Configurações da Calculadora de Imóveis
          </h1>
          <p className="text-gray-600">
            Gerencie todos os aspectos da calculadora de avaliação
          </p>
        </div>

        <Tabs defaultValue="base_calculo" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="base_calculo" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Base de Cálculo</span>
              <span className="sm:hidden">Base</span>
            </TabsTrigger>
            <TabsTrigger value="localizacao" className="gap-2">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Gerenciar Localização</span>
              <span className="sm:hidden">Localização</span>
            </TabsTrigger>
            <TabsTrigger value="logica" className="gap-2">
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">Lógica de Cálculo</span>
              <span className="sm:hidden">Lógica</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base_calculo" className="mt-6">
            <BaseCalculoManager />
          </TabsContent>

          <TabsContent value="localizacao" className="mt-6">
            <GerenciadorLocalizacao />
          </TabsContent>

          <TabsContent value="logica" className="mt-6">
            <EditorLogicaCalculo />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}