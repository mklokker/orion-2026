import React, { useState, useEffect, useCallback } from "react";
import { Document } from "@/entities/Document";
import { DocumentCategory } from "@/entities/DocumentCategory";
import { DocumentFavorite } from "@/entities/DocumentFavorite";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  FileText, 
  Eye, 
  Download, 
  Plus,
  FolderOpen,
  Filter,
  X,
  Files,
  Star
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { MobileSelect, useIsMobile } from "@/components/ui/mobile-select";
import CreateDocumentModal from "../components/acervo/CreateDocumentModal";
import DocumentViewer from "../components/acervo/DocumentViewer";
import CategoryManager from "../components/acervo/CategoryManager";
import DocumentEditor from "../components/acervo/DocumentEditor";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const getFileIcon = (fileType) => {
  if (!fileType) return <FileText className="w-8 h-8 text-gray-400" />;
  
  if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
  if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileText className="w-8 h-8 text-green-600" />;
  if (fileType.includes('image')) return <FileText className="w-8 h-8 text-purple-500" />;
  
  return <FileText className="w-8 h-8 text-gray-400" />;
};

export default function Acervo() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorDocId, setEditorDocId] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  // Pull to refresh handler
  const handlePullRefresh = useCallback(async () => {
    await loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      const [documentsData, categoriesData, favoritesData] = await Promise.all([
        Document.list("-created_date"),
        DocumentCategory.list("name"),
        DocumentFavorite.filter({ user_email: userData.email })
      ]);

      setDocuments(documentsData);
      setCategories(categoriesData);
      setFavorites(favoritesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos.",
        variant: "destructive"
      });
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      // Incrementar contador de visualizações
      await Document.update(doc.id, {
        views_count: (doc.views_count || 0) + 1
      });

      setViewingDocument(doc);
      setShowViewer(true);
      
      // Atualizar localmente
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, views_count: (d.views_count || 0) + 1 } : d
      ));
    } catch (error) {
      console.error("Erro ao abrir documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao abrir documento.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (doc) => {
    if (doc.document_type === 'text') {
      // Para documentos de texto, criar um arquivo .txt
      const blob = new Blob([doc.text_content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } else {
      // Para arquivos, abrir em nova aba
      window.open(doc.file_url, '_blank');
    }

    toast({
      title: "Download iniciado",
      description: "O arquivo está sendo baixado.",
    });
  };

  const handleEdit = (doc) => {
    if (doc.document_type === 'text') {
      setEditorDocId(doc.id);
      setShowViewer(false);
      setShowEditor(true);
    } else {
      setEditingDocument(doc);
      setShowViewer(false); // Close viewer if open
      setShowCreateModal(true); // Open create modal for editing
    }
  };

  const handleDelete = async (doc) => {
    try {
      await Document.delete(doc.id);
      
      toast({
        title: "Sucesso!",
        description: "Documento excluído com sucesso.",
      });

      setShowViewer(false);
      setViewingDocument(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir documento.",
        variant: "destructive"
      });
    }
  };

  const handleCreateDocument = async (documentData) => {
    try {
      if (editingDocument) {
        // Editar documento existente
        await Document.update(editingDocument.id, documentData);
        
        toast({
          title: "Sucesso!",
          description: "Documento atualizado com sucesso.",
        });
      } else {
        // Criar novo documento
        await Document.create({
          ...documentData,
          uploaded_by: currentUser.email,
          uploaded_by_name: currentUser.display_name || currentUser.full_name,
          views_count: 0
        });

        toast({
          title: "Sucesso!",
          description: "Documento criado com sucesso.",
        });
      }

      setShowCreateModal(false);
      setEditingDocument(null); // Clear editing document state
      loadData();
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${editingDocument ? "atualizar" : "criar"} documento.`,
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = async (doc, e) => {
    if (e) e.stopPropagation();
    
    try {
      const isFavorite = favorites.some(fav => fav.document_id === doc.id);
      
      if (isFavorite) {
        const favoriteToRemove = favorites.find(fav => fav.document_id === doc.id);
        await DocumentFavorite.delete(favoriteToRemove.id);
        setFavorites(favorites.filter(fav => fav.id !== favoriteToRemove.id));
        toast({
          title: "Removido dos favoritos",
          description: "Documento removido dos seus favoritos.",
        });
      } else {
        const newFavorite = await DocumentFavorite.create({
          document_id: doc.id,
          user_email: currentUser.email
        });
        setFavorites([...favorites, newFavorite]);
        toast({
          title: "Adicionado aos favoritos",
          description: "Documento marcado como favorito.",
        });
      }
    } catch (error) {
      console.error("Erro ao favoritar documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar favoritos.",
        variant: "destructive"
      });
    }
  };

  const isFavorite = (docId) => {
    return favorites.some(fav => fav.document_id === docId);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.category_id === selectedCategory;
    const matchesFavorites = !showOnlyFavorites || isFavorite(doc.id);
    
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const groupedByCategory = categories.map(cat => ({
    category: cat,
    documents: filteredDocuments.filter(doc => doc.category_id === cat.id)
  })).filter(group => group.documents.length > 0);

  const uncategorizedDocs = filteredDocuments.filter(doc => !doc.category_id);

  // Options for MobileSelect
  const categoryOptions = [
    { value: "all", label: "Todas" },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen">
    <div className="p-3 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center gap-2 md:gap-3">
              <Files className="w-6 h-6 md:w-10 md:h-10 text-blue-600" />
              Acervo
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xs md:text-base mt-1 md:mt-2 hidden md:block">
              Repositório central de documentos, POPs e materiais de referência
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowCategoryManager(true)}
                className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-10 px-2 md:px-4"
                size="sm"
              >
                <FolderOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">Gerenciar</span> Categorias
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setEditorDocId('new');
                setShowEditor(true);
              }}
              className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-10 px-2 md:px-4"
              size="sm"
            >
              <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Novo Texto</span>
              <span className="md:hidden">Texto</span>
            </Button>
            <Button
              onClick={() => {
                setEditingDocument(null);
                setShowCreateModal(true);
              }}
              className="gap-1.5 md:gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-xs md:text-sm h-8 md:h-10 px-2 md:px-4"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-3 md:pt-6 px-3 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Documentos</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
                </div>
                <FileText className="w-6 h-6 md:w-10 md:h-10 text-blue-600 opacity-20 hidden md:block" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-3 md:pt-6 px-3 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Categorias</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">{categories.length}</p>
                </div>
                <FolderOpen className="w-6 h-6 md:w-10 md:h-10 text-indigo-600 opacity-20 hidden md:block" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-3 md:pt-6 px-3 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Visualizações</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {documents.reduce((acc, doc) => acc + (doc.views_count || 0), 0)}
                  </p>
                </div>
                <Eye className="w-6 h-6 md:w-10 md:h-10 text-purple-600 opacity-20 hidden md:block" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-4 md:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 md:h-10 text-sm bg-white border-gray-300 text-gray-700 dark:bg-[#121212] dark:border-[#2e2e2e] dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                {isMobile ? (
                  <MobileSelect
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                    options={categoryOptions}
                    title="Selecione a Categoria"
                    placeholder="Categoria"
                    triggerClassName="h-9 md:h-10 text-sm"
                  />
                ) : (
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-9 md:h-10 text-sm bg-white border-gray-300 text-gray-700 dark:bg-[#121212] dark:border-[#2e2e2e] dark:text-white">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCategory !== "all" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedCategory("all")}
                    className="h-9 w-9"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <Button
                variant={showOnlyFavorites ? "default" : "outline"}
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`gap-2 h-9 md:h-10 text-sm ${!showOnlyFavorites ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-[#1a1a1a] dark:border-[#2e2e2e] dark:text-[#a1a1a1] dark:hover:bg-[#2a2a2a]' : ''}`}
              >
                <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                <span className="hidden md:inline">{showOnlyFavorites ? 'Mostrando Favoritos' : 'Meus Favoritos'}</span>
                <span className="md:hidden">Favoritos</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documentos por Categoria */}
        {groupedByCategory.length === 0 && uncategorizedDocs.length === 0 ? (
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum documento encontrado</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                {searchQuery || selectedCategory !== "all" 
                  ? "Tente ajustar os filtros de busca" 
                  : "Comece adicionando seu primeiro documento"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedByCategory.map(({ category, documents: catDocs }) => (
              <div key={category.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
                  <Badge variant="outline">{catDocs.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catDocs.map(doc => (
                    <Card 
                      key={doc.id} 
                      className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-600 relative dark:bg-slate-800 dark:border-slate-700"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <button
                        onClick={(e) => toggleFavorite(doc, e)}
                        className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Star 
                          className={`w-5 h-5 ${
                            isFavorite(doc.id) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3 pr-8">
                          <div className="mt-1">
                            {doc.document_type === 'text' ? (
                              <FileText className="w-8 h-8 text-blue-600" />
                            ) : (
                              getFileIcon(doc.file_type)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate dark:text-white">{doc.title}</CardTitle>
                            {doc.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Por: {doc.uploaded_by_name}</span>
                            <span>{format(new Date(doc.created_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          
                          {doc.document_type === 'file' && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">{formatFileSize(doc.file_size)}</span>
                              <Badge variant="outline" className="text-xs">
                                {doc.file_name?.split('.').pop()?.toUpperCase()}
                              </Badge>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Eye className="w-3 h-3" />
                            <span>{doc.views_count || 0} visualizações</span>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocument(doc);
                              }}
                              className="flex-1 gap-2"
                            >
                              <Eye className="w-3 h-3" />
                              Visualizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(doc);
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {uncategorizedDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-8 rounded-full bg-gray-400" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sem Categoria</h2>
                  <Badge variant="outline">{uncategorizedDocs.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uncategorizedDocs.map(doc => (
                    <Card 
                      key={doc.id} 
                      className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-600 relative dark:bg-slate-800 dark:border-slate-700"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <button
                        onClick={(e) => toggleFavorite(doc, e)}
                        className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Star 
                          className={`w-5 h-5 ${
                            isFavorite(doc.id) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3 pr-8">
                          <div className="mt-1">
                            {doc.document_type === 'text' ? (
                              <FileText className="w-8 h-8 text-blue-600" />
                            ) : (
                              getFileIcon(doc.file_type)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate dark:text-white">{doc.title}</CardTitle>
                            {doc.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Por: {doc.uploaded_by_name}</span>
                            <span>{format(new Date(doc.created_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          
                          {doc.document_type === 'file' && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">{formatFileSize(doc.file_size)}</span>
                              <Badge variant="outline" className="text-xs">
                                {doc.file_name?.split('.').pop()?.toUpperCase()}
                              </Badge>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Eye className="w-3 h-3" />
                            <span>{doc.views_count || 0} visualizações</span>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocument(doc);
                              }}
                              className="flex-1 gap-2"
                            >
                              <Eye className="w-3 h-3" />
                              Visualizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(doc);
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateDocumentModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingDocument(null); // Clear editing document state on modal close
        }}
        categories={categories}
        onCreateDocument={handleCreateDocument}
        editingDocument={editingDocument} // Pass the document to be edited
      />

      {isAdmin && (
        <CategoryManager
          open={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          categories={categories}
          onUpdate={loadData}
        />
      )}

      {viewingDocument && (
        <DocumentViewer
          open={showViewer}
          onClose={() => {
            setShowViewer(false);
            setViewingDocument(null);
          }}
          document={viewingDocument}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdate={loadData}
        />
      )}
    </div>
    </PullToRefresh>
  );
}