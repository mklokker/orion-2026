import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/entities/User";
import { Document } from "@/entities/Document";
import { DocumentVersion } from "@/entities/DocumentVersion";
import { DocumentPermission } from "@/entities/DocumentPermission";
import { DocumentPermissionLog } from "@/entities/DocumentPermissionLog";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ArrowLeft, Save, Share2, History, Users, Lock, RefreshCw, Shield, Trash2, Eye, MessageSquare, Edit3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [permissions, setPermissions] = useState([]);
  const [currentUserPermission, setCurrentUserPermission] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showPermissionsLog, setShowPermissionsLog] = useState(false);
  const [permissionLogs, setPermissionLogs] = useState([]);
  const [searchUser, setSearchUser] = useState("");
  const [selectedAccessLevel, setSelectedAccessLevel] = useState("read");

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

        // Load Permissions
        const perms = await DocumentPermission.filter({ document_id: doc.id });
        setPermissions(perms);
        
        const myPerm = perms.find(p => p.user_email === currentUser.email);
        setCurrentUserPermission(myPerm?.access_level || (doc.uploaded_by === currentUser.email ? 'owner' : null));

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

    // Check permission
    if (docId !== 'new' && currentUserPermission !== 'owner' && currentUserPermission !== 'edit') {
      toast({ title: "Acesso Negado", description: "Você não tem permissão para editar este documento.", variant: "destructive" });
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
        // Create owner permission
        await DocumentPermission.create({
          document_id: savedDoc.id,
          user_email: currentUser.email,
          access_level: 'owner',
          granted_by: currentUser.email
        });

        toast({ title: "Criado", description: "Documento criado com sucesso" });
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

    // Check if already has permission
    const existing = permissions.find(p => p.user_email === email);
    if (existing) {
      toast({ title: "Aviso", description: "Usuário já possui acesso." });
      return;
    }

    try {
      await DocumentPermission.create({
        document_id: document.id,
        user_email: email,
        access_level: selectedAccessLevel,
        granted_by: currentUser.email
      });

      await DocumentPermissionLog.create({
        document_id: document.id,
        target_user_email: email,
        action: 'granted',
        new_level: selectedAccessLevel,
        performed_by: currentUser.email,
        timestamp: new Date().toISOString()
      });

      // Refresh permissions
      const perms = await DocumentPermission.filter({ document_id: document.id });
      setPermissions(perms);

      toast({ title: "Compartilhado", description: `Acesso de ${selectedAccessLevel === 'read' ? 'leitura' : selectedAccessLevel === 'comment' ? 'comentário' : 'edição'} concedido.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao compartilhar" });
    }
  };

  const handleUpdatePermission = async (permId, email, newLevel) => {
    try {
      const oldPerm = permissions.find(p => p.id === permId);
      
      await DocumentPermission.update(permId, { access_level: newLevel });
      
      await DocumentPermissionLog.create({
        document_id: document.id,
        target_user_email: email,
        action: 'updated',
        previous_level: oldPerm?.access_level,
        new_level: newLevel,
        performed_by: currentUser.email,
        timestamp: new Date().toISOString()
      });

      const perms = await DocumentPermission.filter({ document_id: document.id });
      setPermissions(perms);
      
      toast({ title: "Atualizado", description: "Permissão atualizada." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar permissão" });
    }
  };

  const handleRemoveCollaborator = async (permId, email) => {
     try {
      const oldPerm = permissions.find(p => p.id === permId);

      await DocumentPermission.delete(permId);
      
      await DocumentPermissionLog.create({
        document_id: document.id,
        target_user_email: email,
        action: 'revoked',
        previous_level: oldPerm?.access_level,
        performed_by: currentUser.email,
        timestamp: new Date().toISOString()
      });

      setPermissions(prev => prev.filter(p => p.id !== permId));
      toast({ title: "Removido", description: "Acesso revogado." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover colaborador" });
    }
  };

  const loadLogs = async () => {
    try {
      const logs = await DocumentPermissionLog.filter({ document_id: document.id }, '-timestamp');
      setPermissionLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const isOwner = currentUserPermission === 'owner';
  const canEdit = isOwner || currentUserPermission === 'edit';

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
    !permissions.some(p => p.user_email === u.email) &&
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
                      Versões
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
                               <p className="text-[10px] text-gray-400">{format(new Date(v.created_date), "dd/MM/yyyy HH:mm")}</p>
                             </div>
                             {canEdit && (
                                 <Button variant="outline" size="sm" onClick={() => {
                                   setContent(v.text_content);
                                   toast({ title: "Versão restaurada", description: "Conteúdo carregado no editor. Salve para confirmar." });
                                   setShowVersionsModal(false);
                                 }}>Restaurar</Button>
                             )}
                           </div>
                         ))}
                         {versions.length === 0 && <p className="text-center text-gray-500 py-4">Nenhuma versão anterior</p>}
                      </div>
                    </ScrollArea>
                  </DialogContent>
               </Dialog>

               <Dialog open={showPermissionsLog} onOpenChange={setShowPermissionsLog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Log de Permissões</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-72">
                      <div className="space-y-3">
                         {permissionLogs.map(log => {
                           const performer = users.find(u => u.email === log.performed_by)?.full_name || log.performed_by;
                           const target = users.find(u => u.email === log.target_user_email)?.full_name || log.target_user_email;
                           
                           let message = "";
                           if (log.action === 'granted') message = `concedeu acesso de ${log.new_level}`;
                           if (log.action === 'revoked') message = `removeu o acesso`;
                           if (log.action === 'updated') message = `alterou acesso de ${log.previous_level} para ${log.new_level}`;

                           return (
                             <div key={log.id} className="text-sm border-b pb-2 last:border-0">
                               <p>
                                 <span className="font-medium">{performer}</span> {message} para <span className="font-medium">{target}</span>
                               </p>
                               <p className="text-xs text-gray-400 mt-1">{format(new Date(log.timestamp), "dd/MM/yyyy HH:mm")}</p>
                             </div>
                           );
                         })}
                         {permissionLogs.length === 0 && <p className="text-center text-gray-500 py-4">Nenhum registro encontrado</p>}
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
                    <div className="space-y-6">
                      {/* Add New Collaborator */}
                      {isOwner && (
                        <div className="space-y-2 border-b pb-4">
                          <label className="text-sm font-medium block">Adicionar Colaborador</label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                                <Input 
                                  placeholder="Buscar usuário por nome ou email..." 
                                  value={searchUser} 
                                  onChange={e => setSearchUser(e.target.value)} 
                                />
                            </div>
                            <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="read">Leitura</SelectItem>
                                  <SelectItem value="comment">Comentário</SelectItem>
                                  <SelectItem value="edit">Edição</SelectItem>
                                </SelectContent>
                            </Select>
                          </div>
                          
                          {searchUser && (
                            <div className="mt-2 border rounded-md max-h-40 overflow-y-auto bg-white shadow-sm">
                               {filteredUsers.map(u => (
                                 <div key={u.id} className="p-2 hover:bg-gray-50 flex justify-between items-center cursor-pointer border-b last:border-0" onClick={() => handleShare(u.email)}>
                                   <div className="flex items-center gap-2">
                                     <Avatar className="w-6 h-6">
                                       <AvatarImage src={u.profile_picture} />
                                       <AvatarFallback className="text-[10px]">{u.email[0].toUpperCase()}</AvatarFallback>
                                     </Avatar>
                                     <div className="flex flex-col">
                                         <span className="text-sm font-medium">{u.display_name || u.full_name}</span>
                                         <span className="text-xs text-gray-500">{u.email}</span>
                                     </div>
                                   </div>
                                   <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">Adicionar</Badge>
                                 </div>
                               ))}
                               {filteredUsers.length === 0 && <p className="p-3 text-xs text-gray-500 text-center">Nenhum usuário encontrado</p>}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* List Collaborators */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">Quem tem acesso</label>
                        <div className="space-y-3">
                          {/* Owner (Uploaded By) */}
                          <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                             <div className="flex items-center gap-3">
                               <Avatar className="w-8 h-8">
                                  <AvatarImage src={users.find(u => u.email === document.uploaded_by)?.profile_picture} />
                                  <AvatarFallback>{document.uploaded_by[0].toUpperCase()}</AvatarFallback>
                               </Avatar>
                               <div>
                                   <p className="text-sm font-medium">{document.uploaded_by_name}</p>
                                   <p className="text-xs text-gray-500">Proprietário</p>
                               </div>
                             </div>
                             <Badge variant="secondary">Dono</Badge>
                          </div>

                          {/* Other Permissions */}
                          {permissions.filter(p => p.user_email !== document.uploaded_by).map(perm => {
                             const u = users.find(user => user.email === perm.user_email);
                             const displayName = u?.display_name || u?.full_name || perm.user_email;
                             
                             return (
                               <div key={perm.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                                 <div className="flex items-center gap-3">
                                   <Avatar className="w-8 h-8">
                                      <AvatarImage src={u?.profile_picture} />
                                      <AvatarFallback>{perm.user_email[0].toUpperCase()}</AvatarFallback>
                                   </Avatar>
                                   <div>
                                       <p className="text-sm font-medium">{displayName}</p>
                                       <p className="text-xs text-gray-500">{perm.user_email}</p>
                                   </div>
                                 </div>
                                 
                                 {isOwner ? (
                                     <div className="flex items-center gap-2">
                                         <Select 
                                            value={perm.access_level} 
                                            onValueChange={(val) => handleUpdatePermission(perm.id, perm.user_email, val)}
                                         >
                                            <SelectTrigger className="h-8 w-[110px] text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="read">Leitura</SelectItem>
                                              <SelectItem value="comment">Comentário</SelectItem>
                                              <SelectItem value="edit">Edição</SelectItem>
                                            </SelectContent>
                                         </Select>
                                         <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-gray-400 hover:text-red-600" 
                                            onClick={() => handleRemoveCollaborator(perm.id, perm.user_email)}
                                            title="Revogar acesso"
                                         >
                                           <Trash2 className="w-4 h-4" />
                                         </Button>
                                     </div>
                                 ) : (
                                     <Badge variant="outline" className="capitalize">
                                         {perm.access_level === 'read' ? 'Leitura' : perm.access_level === 'comment' ? 'Comentário' : 'Edição'}
                                     </Badge>
                                 )}
                               </div>
                             );
                          })}
                        </div>
                      </div>

                      {/* Audit Log Trigger */}
                      <div className="pt-4 border-t flex justify-center">
                          <Button 
                            variant="link" 
                            className="text-xs text-gray-500 h-auto p-0"
                            onClick={() => {
                                loadLogs();
                                setShowPermissionsLog(true);
                            }}
                          >
                            Ver histórico de compartilhamento
                          </Button>
                      </div>
                    </div>
                  </DialogContent>
               </Dialog>
             </>
           )}
           
           {canEdit && (
               <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2">
                 {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 Salvar
               </Button>
           )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-gray-50 p-4 overflow-y-auto flex justify-center">
         <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg min-h-[calc(100vh-8rem)] flex flex-col">
            <ReactQuill 
             theme="snow" 
             value={content} 
             onChange={setContent} 
             readOnly={!canEdit}
             className={`flex-1 flex flex-col ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
             modules={{
               toolbar: canEdit ? [
                 [{ 'header': [1, 2, 3, false] }],
                 ['bold', 'italic', 'underline', 'strike'],
                 [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                 ['link', 'image'],
                 ['clean']
               ] : false,
             }}
            />
         </div>
      </div>
    </div>
  );
}