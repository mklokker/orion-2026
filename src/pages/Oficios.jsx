import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Upload,
  Download,
  Search,
  Eye,
  Edit,
  ExternalLink,
  Archive,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Filter,
  X,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import OficioFormModal from "../components/oficios/OficioFormModal";
import OficioViewModal from "../components/oficios/OficioViewModal";
import ImportOficiosModal from "../components/oficios/ImportOficiosModal";
import { useToast } from "@/components/ui/use-toast";

const statusColors = {
  "Rascunho": "bg-gray-100 text-gray-800 border-gray-300",
  "Enviado ao juiz": "bg-blue-100 text-blue-800 border-blue-300",
  "Enviado à Kátia": "bg-purple-100 text-purple-800 border-purple-300",
  "Respondido": "bg-green-100 text-green-800 border-green-300",
  "Arquivado": "bg-slate-100 text-slate-600 border-slate-300",
};

export default function Oficios() {
  const [oficios, setOficios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAno, setFilterAno] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterDataEnvioInicio, setFilterDataEnvioInicio] = useState("");
  const [filterDataEnvioFim, setFilterDataEnvioFim] = useState("");
  const [filterDataRetornoInicio, setFilterDataRetornoInicio] = useState("");
  const [filterDataRetornoFim, setFilterDataRetornoFim] = useState("");
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedOficio, setSelectedOficio] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadOficios();
  }, []);

  const loadOficios = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.OficioJuiz.list("-created_date");
      setOficios(data);
    } catch (error) {
      console.error("Erro ao carregar ofícios:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os ofícios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedOficio(null);
    setShowFormModal(true);
  };

  const handleEdit = (oficio) => {
    setSelectedOficio(oficio);
    setShowFormModal(true);
  };

  const handleView = (oficio) => {
    setSelectedOficio(oficio);
    setShowViewModal(true);
  };

  const handleArchive = async (oficio) => {
    try {
      await base44.entities.OficioJuiz.update(oficio.id, { status: "Arquivado" });
      toast({
        title: "Sucesso",
        description: "Ofício arquivado com sucesso.",
      });
      loadOficios();
    } catch (error) {
      console.error("Erro ao arquivar ofício:", error);
      toast({
        title: "Erro",
        description: "Não foi possível arquivar o ofício.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    // Implement Excel export logic
    toast({
      title: "Exportar Excel",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const anos = useMemo(() => {
    const anosSet = new Set(oficios.map(o => o.ano_oficio).filter(Boolean));
    return Array.from(anosSet).sort((a, b) => b.localeCompare(a));
  }, [oficios]);

  const filteredOficios = useMemo(() => {
    return oficios.filter(oficio => {
      // Search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchNumero = oficio.numero_ano?.toLowerCase().includes(searchLower);
        const matchAssunto = oficio.assunto?.toLowerCase().includes(searchLower);
        if (!matchNumero && !matchAssunto) return false;
      }

      // Year
      if (filterAno !== "todos" && oficio.ano_oficio !== filterAno) return false;

      // Status
      if (filterStatus !== "todos" && oficio.status !== filterStatus) return false;

      // Date filters
      if (filterDataEnvioInicio && oficio.data_envio_malote) {
        if (oficio.data_envio_malote < filterDataEnvioInicio) return false;
      }
      if (filterDataEnvioFim && oficio.data_envio_malote) {
        if (oficio.data_envio_malote > filterDataEnvioFim) return false;
      }
      if (filterDataRetornoInicio && oficio.data_retorno_malote) {
        if (oficio.data_retorno_malote < filterDataRetornoInicio) return false;
      }
      if (filterDataRetornoFim && oficio.data_retorno_malote) {
        if (oficio.data_retorno_malote > filterDataRetornoFim) return false;
      }

      // Duplicates
      if (showDuplicates && !oficio.duplicidade_detectada) return false;

      return true;
    });
  }, [oficios, searchTerm, filterAno, filterStatus, filterDataEnvioInicio, filterDataEnvioFim, filterDataRetornoInicio, filterDataRetornoFim, showDuplicates]);

  const stats = useMemo(() => {
    const total = filteredOficios.length;
    const respondidos = filteredOficios.filter(o => o.status === "Respondido").length;
    const pendentes = filteredOficios.filter(o => ["Enviado ao juiz", "Enviado à Kátia"].includes(o.status)).length;
    const duplicidades = filteredOficios.filter(o => o.duplicidade_detectada).length;
    
    const temposResposta = filteredOficios
      .filter(o => o.tempo_resposta_dias != null && o.tempo_resposta_dias >= 0)
      .map(o => o.tempo_resposta_dias);
    
    const tempoMedio = temposResposta.length > 0
      ? Math.round(temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length)
      : 0;

    return { total, respondidos, pendentes, tempoMedio, duplicidades };
  }, [filteredOficios]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterAno("todos");
    setFilterStatus("todos");
    setFilterDataEnvioInicio("");
    setFilterDataEnvioFim("");
    setFilterDataRetornoInicio("");
    setFilterDataRetornoFim("");
    setShowDuplicates(false);
  };

  const hasActiveFilters = searchTerm || filterAno !== "todos" || filterStatus !== "todos" || 
    filterDataEnvioInicio || filterDataEnvioFim || filterDataRetornoInicio || filterDataRetornoFim || showDuplicates;

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              Ofícios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Controle de ofícios enviados ao juiz
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Upload className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={handleCreate} size="sm" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ofício
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                Respondidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.respondidos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4 text-yellow-600" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.tempoMedio}d</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
                Duplicidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-red-600">{stats.duplicidades}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Filter className="w-4 h-4 md:w-5 md:h-5" />
                Filtros
              </CardTitle>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="ghost" size="sm" className="text-xs">
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou assunto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterAno} onValueChange={setFilterAno}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os anos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {anos.map(ano => (
                    <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Enviado ao juiz">Enviado ao juiz</SelectItem>
                  <SelectItem value="Enviado à Kátia">Enviado à Kátia</SelectItem>
                  <SelectItem value="Respondido">Respondido</SelectItem>
                  <SelectItem value="Arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Período de Envio</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filterDataEnvioInicio}
                    onChange={(e) => setFilterDataEnvioInicio(e.target.value)}
                    placeholder="De"
                  />
                  <Input
                    type="date"
                    value={filterDataEnvioFim}
                    onChange={(e) => setFilterDataEnvioFim(e.target.value)}
                    placeholder="Até"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Período de Retorno</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filterDataRetornoInicio}
                    onChange={(e) => setFilterDataRetornoInicio(e.target.value)}
                    placeholder="De"
                  />
                  <Input
                    type="date"
                    value={filterDataRetornoFim}
                    onChange={(e) => setFilterDataRetornoFim(e.target.value)}
                    placeholder="Até"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showDuplicates"
                checked={showDuplicates}
                onChange={(e) => setShowDuplicates(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="showDuplicates" className="text-sm font-medium cursor-pointer">
                Mostrar apenas duplicidades
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : filteredOficios.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum ofício encontrado</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número/Ano</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Data Envio</TableHead>
                        <TableHead>Data Retorno</TableHead>
                        <TableHead>Tempo Resposta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOficios.map((oficio) => (
                        <TableRow 
                          key={oficio.id}
                          className={oficio.duplicidade_detectada ? "bg-red-50/50" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {oficio.numero_ano}
                              {oficio.duplicidade_detectada && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{oficio.assunto}</TableCell>
                          <TableCell>
                            {oficio.data_envio_malote ? format(parseISO(oficio.data_envio_malote), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {oficio.data_retorno_malote ? format(parseISO(oficio.data_retorno_malote), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {oficio.tempo_resposta_dias != null ? `${oficio.tempo_resposta_dias}d` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[oficio.status]}>
                              {oficio.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {oficio.arquivo_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(oficio.arquivo_url, "_blank")}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleView(oficio)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(oficio)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {oficio.status !== "Arquivado" && (
                                <Button variant="ghost" size="sm" onClick={() => handleArchive(oficio)}>
                                  <Archive className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3 p-3">
                  {filteredOficios.map((oficio) => (
                    <Card key={oficio.id} className={oficio.duplicidade_detectada ? "border-red-300 bg-red-50/30" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm">{oficio.numero_ano}</p>
                              {oficio.duplicidade_detectada && (
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{oficio.assunto}</p>
                          </div>
                          <Badge variant="outline" className={`${statusColors[oficio.status]} shrink-0 text-xs`}>
                            {oficio.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Envio:</span>
                            <p className="font-medium">
                              {oficio.data_envio_malote ? format(parseISO(oficio.data_envio_malote), "dd/MM/yyyy") : "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Retorno:</span>
                            <p className="font-medium">
                              {oficio.data_retorno_malote ? format(parseISO(oficio.data_retorno_malote), "dd/MM/yyyy") : "-"}
                            </p>
                          </div>
                          {oficio.tempo_resposta_dias != null && (
                            <div>
                              <span className="text-muted-foreground">Tempo:</span>
                              <p className="font-medium">{oficio.tempo_resposta_dias} dias</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={() => handleView(oficio)} className="flex-1">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(oficio)} className="flex-1">
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          {oficio.arquivo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(oficio.arquivo_url, "_blank")}
                              className="flex-1"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Arquivo
                            </Button>
                          )}
                          {oficio.status !== "Arquivado" && (
                            <Button variant="outline" size="sm" onClick={() => handleArchive(oficio)} className="flex-1">
                              <Archive className="w-4 h-4 mr-1" />
                              Arquivar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <OficioFormModal
        open={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedOficio(null);
        }}
        oficio={selectedOficio}
        onSuccess={loadOficios}
      />
      <OficioViewModal
        open={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedOficio(null);
        }}
        oficio={selectedOficio}
      />
      <ImportOficiosModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadOficios}
      />
    </div>
  );
}