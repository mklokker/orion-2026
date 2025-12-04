import React, { useState, useEffect } from "react";
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

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center gap-3">
              <Files className="w-10 h-10 text-blue-600" />
              Acervo de Documentos
            </h1>
            <p className="text-gray-600 mt-2">
              Repositório central de documentos, POPs e materiais de referência
            </p>
          </div>

          <div className="flex gap-3">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowCategoryManager(true)}
                className="gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Gerenciar Categorias
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setEditorDocId('new');
                setShowEditor(true);
              }}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Novo Texto Colaborativo
            </Button>
            <Button
              onClick={() => {
                setEditingDocument(null); // Ensure no document is being edited when opening for creation
                setShowCreateModal(true);
              }}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="w-4 h-4" />
              Upload Arquivo
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Documentos</p>
                  <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Categorias</p>
                  <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
                </div>
                <FolderOpen className="w-10 h-10 text-indigo-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Visualizações</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {documents.reduce((acc, doc) => acc + (doc.views_count || 0), 0)}
                  </p>
                </div>
                <Eye className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory !== "all" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedCategory("all")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <Button
                variant={showOnlyFavorites ? "default" : "outline"}
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className="gap-2"
              >
                <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                {showOnlyFavorites ? 'Mostrando Favoritos' : 'Meus Favoritos'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documentos por Categoria */}
        {groupedByCategory.length === 0 && uncategorizedDocs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum documento encontrado</p>
              <p className="text-gray-400 text-sm mt-2">
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
                  <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                  <Badge variant="outline">{catDocs.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catDocs.map(doc => (
                    <Card 
                      key={doc.id} 
                      className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300 relative"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <button
                        onClick={(e) => toggleFavorite(doc, e)}
                        className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
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
                            <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                            {doc.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Por: {doc.uploaded_by_name}</span>
                            <span>{format(new Date(doc.created_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          
                          {doc.document_type === 'file' && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{formatFileSize(doc.file_size)}</span>
                              <Badge variant="outline" className="text-xs">
                                {doc.file_name?.split('.').pop()?.toUpperCase()}
                              </Badge>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-500">
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
                  <h2 className="text-2xl font-bold text-gray-900">Sem Categoria</h2>
                  <Badge variant="outline">{uncategorizedDocs.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uncategorizedDocs.map(doc => (
                    <Card 
                      key={doc.id} 
                      className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300 relative"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <button
                        onClick={(e) => toggleFavorite(doc, e)}
                        className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
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
                            <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                            {doc.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Por: {doc.uploaded_by_name}</span>
                            <span>{format(new Date(doc.created_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          
                          {doc.document_type === 'file' && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{formatFileSize(doc.file_size)}</span>
                              <Badge variant="outline" className="text-xs">
                                {doc.file_name?.split('.').pop()?.toUpperCase()}
                              </Badge>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-500">
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
  );
}