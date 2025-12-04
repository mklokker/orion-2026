import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/entities/User";
import { Document } from "@/entities/Document";
import { DocumentVersion } from "@/entities/DocumentVersion";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ArrowLeft, Save, Share2, History, Users, Lock, RefreshCw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export default function DocumentEditor({ docId, onClose, currentUser }) {
  const { toast } = useToast();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [versions, setVersions] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  useEffect(() => {
    loadDocument();
    loadUsers();
  }, [docId]);

  const loadDocument = async () => {
    try {
      if (docId === 'new') {
        setDocument({
          title: "Novo Documento",
          document_type: "text",
          collaborators: [],
          uploaded_by: currentUser?.email || '',
          uploaded_by_name: currentUser?.full_name || 'Usuário'
        });
        return;
      }

      const docs = await Document.filter({ id: docId });
      if (docs.length > 0) {
        const doc = docs[0];
        setDocument(doc);
        setTitle(doc.title);
        setContent(doc.text_content || '');
        
        // Load versions
        const vs = await DocumentVersion.filter({ document_id: doc.id }, '-version_number');
        setVersions(vs);
      }
    } catch (error) {
      console.error("Error loading document", error);
      toast({ title: "Erro", description: "Falha ao carregar documento", variant: "destructive" });
    }
  };

  const loadUsers = async () => {
    try {
      const list = await User.list();
      setUsers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Atenção", description: "O documento precisa de um título" });
      return;
    }

    setIsSaving(true);
    try {
      let savedDoc;
      if (docId === 'new') {
        savedDoc = await Document.create({
          title,
          document_type: "text",
          text_content: content,
          uploaded_by: currentUser.email,
          uploaded_by_name: currentUser.full_name || currentUser.email,
          collaborators: [currentUser.email], // Creator is collaborator
          last_edited_by: currentUser.email
        });
        toast({ title: "Criado", description: "Documento criado com sucesso" });
        // Could redirect or update ID, for now we might rely on parent reloading or handling
        onClose(savedDoc);
      } else {
        // Create version before update
        const currentVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;
        
        await DocumentVersion.create({
          document_id: document.id,
          version_number: currentVersion,
          text_content: content,
          change_notes: `Editado por ${currentUser.full_name}`,
          created_by_name: currentUser.full_name || currentUser.email
        });

        await Document.update(document.id, {
          title,
          text_content: content,
          last_edited_by: currentUser.email,
          updated_date: new Date().toISOString()
        });
        
        toast({ title: "Salvo", description: "Alterações salvas com sucesso" });
        loadDocument(); // Reload to get updates
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async (email) => {
    if (!document || docId === 'new') {
       toast({ title: "Salve primeiro", description: "Salve o documento antes de compartilhar" });
       return;
    }

    try {
      const currentCollaborators = document.collaborators || [];
      if (currentCollaborators.includes(email)) return;

      const newCollaborators = [...currentCollaborators, email];
      await Document.update(document.id, { collaborators: newCollaborators });
      setDocument(prev => ({ ...prev, collaborators: newCollaborators }));
      toast({ title: "Compartilhado", description: "Usuário adicionado aos colaboradores" });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao compartilhar" });
    }
  };

  const handleRemoveCollaborator = async (email) => {
     try {
      const newCollaborators = (document.collaborators || []).filter(e => e !== email);
      await Document.update(document.id, { collaborators: newCollaborators });
      setDocument(prev => ({ ...prev, collaborators: newCollaborators }));
      toast({ title: "Removido", description: "Colaborador removido" });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover colaborador" });
    }
  };

  if (!document) return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Carregando editor...</p>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u => 
    u.email !== currentUser.email && 
    !document.collaborators?.includes(u.email) &&
    (u.display_name?.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onClose(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto" 
              placeholder="Título do Documento"
            />
            <div className="text-xs text-gray-500 flex items-center gap-2">
               {docId !== 'new' && (
                 <>
                   <span>Última edição por {document.last_edited_by}</span>
                   <span className="w-1 h-1 rounded-full bg-gray-300" />
                   <span>{versions.length} versões</span>
                 </>
               )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {docId !== 'new' && (
             <>
               <Dialog open={showVersionsModal} onOpenChange={setShowVersionsModal}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" title="Histórico de Versões">
                      <History className="w-4 h-4 mr-2" />
                      Histórico
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Histórico de Versões</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-72">
                      <div className="space-y-2">
                         {versions.map(v => (
                           <div key={v.id} className="p-3 border rounded hover:bg-gray-50 flex justify-between items-center">
                             <div>
                               <p className="font-medium">Versão {v.version_number}</p>
                               <p className="text-xs text-gray-500">Por {v.created_by_name}</p>
                             </div>
                             <Button variant="outline" size="sm" onClick={() => {
                               setContent(v.text_content);
                               toast({ title: "Versão restaurada", description: "Conteúdo carregado no editor. Salve para confirmar." });
                               setShowVersionsModal(false);
                             }}>Restaurar</Button>
                           </div>
                         ))}
                         {versions.length === 0 && <p className="text-center text-gray-500 py-4">Nenhuma versão anterior</p>}
                      </div>
                    </ScrollArea>
                  </DialogContent>
               </Dialog>

               <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Compartilhar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Compartilhar Documento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Adicionar Colaborador</label>
                        <Input 
                          placeholder="Buscar usuário..." 
                          value={searchUser} 
                          onChange={e => setSearchUser(e.target.value)} 
                        />
                        {searchUser && (
                          <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                             {filteredUsers.map(u => (
                               <div key={u.id} className="p-2 hover:bg-gray-50 flex justify-between items-center cursor-pointer" onClick={() => handleShare(u.email)}>
                                 <div className="flex items-center gap-2">
                                   <Avatar className="w-6 h-6">
                                     <AvatarImage src={u.profile_picture} />
                                     <AvatarFallback>U</AvatarFallback>
                                   </Avatar>
                                   <span className="text-sm">{u.display_name || u.full_name}</span>
                                 </div>
                                 <Badge variant="outline">Adicionar</Badge>
                               </div>
                             ))}
                             {filteredUsers.length === 0 && <p className="p-2 text-xs text-gray-500">Nenhum usuário encontrado</p>}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Colaboradores Atuais</label>
                        <div className="space-y-2">
                          {document.collaborators?.map(email => {
                             const u = users.find(user => user.email === email);
                             return (
                               <div key={email} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                 <div className="flex items-center gap-2">
                                   <Avatar className="w-6 h-6">
                                      <AvatarImage src={u?.profile_picture} />
                                      <AvatarFallback>{email[0].toUpperCase()}</AvatarFallback>
                                   </Avatar>
                                   <span className="text-sm">{u?.display_name || u?.full_name || email}</span>
                                 </div>
                                 {email !== document.uploaded_by && (
                                   <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleRemoveCollaborator(email)}>
                                     <Users className="w-3 h-3" />
                                   </Button>
                                 )}
                                 {email === document.uploaded_by && <Badge variant="secondary" className="text-xs">Dono</Badge>}
                               </div>
                             );
                          })}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
               </Dialog>
             </>
           )}
           
           <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2">
             {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             Salvar
           </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-gray-50 p-4 overflow-y-auto flex justify-center">
         <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg min-h-[calc(100vh-8rem)] flex flex-col">
            <ReactQuill 
              theme="snow" 
              value={content} 
              onChange={setContent} 
              className="flex-1 flex flex-col"
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  ['link', 'image'],
                  ['clean']
                ],
              }}
            />
         </div>
      </div>
    </div>
  );
}