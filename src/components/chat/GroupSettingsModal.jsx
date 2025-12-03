import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  X, UserPlus, Trash2, Shield, Settings, Camera, 
  ShieldCheck, ShieldAlert, UserMinus, Crown 
} from "lucide-react";
import { ChatConversation } from "@/entities/ChatConversation";
import { Notification as NotificationEntity } from "@/entities/Notification";
import { useToast } from "@/components/ui/use-toast";

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getUserDisplayName = (user) => {
  return user?.display_name || user?.full_name || user?.email || "Usuário";
};

export default function GroupSettingsModal({
  open,
  onClose,
  conversation,
  currentUser,
  users,
  onUpdate
}) {
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState("");
  const [invitePermission, setInvitePermission] = useState("everyone");
  const [newMemberSearch, setNewMemberSearch] = useState("");
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState({
    only_admins_message: false,
    only_admins_edit_info: false
  });

  // Role Checks
  const isPlatformAdmin = currentUser?.role === 'admin';
  const isCreator = conversation?.created_by === currentUser?.email;
  const groupAdmins = conversation?.admins || (conversation?.created_by ? [conversation.created_by] : []);
  const isGroupAdmin = groupAdmins.includes(currentUser?.email) || isCreator || isPlatformAdmin;

  useEffect(() => {
    if (conversation) {
      setGroupName(conversation.name || "");
      setGroupImage(conversation.group_image || "");
      setInvitePermission(conversation.invite_permission || "everyone");
      setPermissions(conversation.permissions || {
        only_admins_message: false,
        only_admins_edit_info: false
      });
      
      const currentParticipants = (conversation.participants || []).map(email => {
        return users.find(u => u.email === email) || { email, display_name: email };
      });
      setParticipants(currentParticipants);
    }
  }, [conversation, users]);

  const handleRename = async () => {
    if (!groupName.trim()) return;
    
    try {
      setIsSaving(true);
      await ChatConversation.update(conversation.id, { name: groupName });
      toast({ title: "Sucesso", description: "Nome do grupo atualizado." });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao renomear grupo.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const { base44 } = await import("@/api/base44Client");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await ChatConversation.update(conversation.id, { group_image: file_url });
      setGroupImage(file_url);
      toast({ title: "Sucesso", description: "Imagem do grupo atualizada." });
      onUpdate();
    } catch (error) {
      console.error("Error uploading group image:", error);
      toast({ title: "Erro", description: "Falha ao atualizar imagem.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionChange = async (key, value) => {
    const newPermissions = { ...permissions, [key]: value };
    setPermissions(newPermissions);
    
    try {
      await ChatConversation.update(conversation.id, { permissions: newPermissions });
      toast({ title: "Sucesso", description: "Permissão atualizada." });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar permissão." });
    }
  };

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;

    try {
      setIsSaving(true);
      const newParticipants = [...conversation.participants, ...selectedNewMembers];
      
      await ChatConversation.update(conversation.id, { 
        participants: newParticipants 
      });

      for (const email of selectedNewMembers) {
        const user = users.find(u => u.email === email);
        if (user) {
          await NotificationEntity.create({
            user_email: email,
            title: "Adicionado ao Grupo",
            message: `Você foi adicionado ao grupo "${groupName}" por ${currentUser.full_name}`,
            type: "interaction",
            action_by: currentUser.email,
            action_by_name: currentUser.full_name,
            read: false
          });
        }
      }

      toast({ title: "Sucesso", description: "Novos membros adicionados." });
      setSelectedNewMembers([]);
      setNewMemberSearch("");
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao adicionar membros.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (emailToRemove) => {
    try {
      setIsSaving(true);
      const newParticipants = conversation.participants.filter(p => p !== emailToRemove);
      const newAdmins = (conversation.admins || []).filter(a => a !== emailToRemove);
      
      await ChatConversation.update(conversation.id, { 
        participants: newParticipants,
        admins: newAdmins
      });

      if (emailToRemove !== currentUser.email) {
        await NotificationEntity.create({
          user_email: emailToRemove,
          title: "Removido do Grupo",
          message: `Você foi removido do grupo "${groupName}" por ${currentUser.full_name}`,
          type: "interaction",
          action_by: currentUser.email,
          action_by_name: currentUser.full_name,
          read: false
        });
        toast({ title: "Sucesso", description: "Membro removido." });
      } else {
        toast({ title: "Sucesso", description: "Você saiu do grupo." });
        onClose();
      }
      
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover membro.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromote = async (email) => {
    try {
      setIsSaving(true);
      const currentAdmins = conversation.admins || [];
      if (currentAdmins.includes(email)) return;

      const newAdmins = [...currentAdmins, email];
      await ChatConversation.update(conversation.id, { admins: newAdmins });
      
      await NotificationEntity.create({
        user_email: email,
        title: "Promovido a Admin",
        message: `Você agora é administrador do grupo "${groupName}"`,
        type: "interaction",
        action_by: currentUser.email,
        action_by_name: currentUser.full_name,
        read: false
      });

      toast({ title: "Sucesso", description: "Membro promovido a administrador." });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao promover membro." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDemote = async (email) => {
    try {
      setIsSaving(true);
      const currentAdmins = conversation.admins || [];
      const newAdmins = currentAdmins.filter(a => a !== email);
      
      await ChatConversation.update(conversation.id, { admins: newAdmins });
      
      toast({ title: "Sucesso", description: "Administrador rebaixado para membro." });
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao rebaixar membro." });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsersToAdd = users.filter(u => 
    !conversation?.participants?.includes(u.email) &&
    !selectedNewMembers.includes(u.email) &&
    (getUserDisplayName(u).toLowerCase().includes(newMemberSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(newMemberSearch.toLowerCase()))
  ).slice(0, 5);

  const canEditInfo = isGroupAdmin || !permissions.only_admins_edit_info;
  const canAddMembers = isGroupAdmin || conversation?.invite_permission === 'everyone';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do Grupo
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="settings">Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-gray-100 shadow-lg">
                  <AvatarImage src={groupImage} />
                  <AvatarFallback className="text-2xl">{getInitials(groupName)}</AvatarFallback>
                </Avatar>
                {canEditInfo && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md transition-all hover:scale-110">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                )}
              </div>

              <div className="w-full space-y-2">
                <Label>Nome do Grupo</Label>
                <div className="flex gap-2">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    disabled={!canEditInfo}
                  />
                  {canEditInfo && (
                    <Button 
                      size="sm" 
                      onClick={handleRename} 
                      disabled={isSaving || groupName === conversation?.name}
                    >
                      Salvar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4 py-4">
            {canAddMembers && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Adicionar Membros
                </Label>
                <Input
                  placeholder="Buscar usuário..."
                  value={newMemberSearch}
                  onChange={(e) => setNewMemberSearch(e.target.value)}
                />
                
                {newMemberSearch && (
                  <div className="border rounded-md p-2 mt-2 space-y-1 bg-gray-50">
                    {filteredUsersToAdd.length === 0 ? (
                      <p className="text-xs text-gray-500 p-2">Nenhum usuário encontrado</p>
                    ) : (
                      filteredUsersToAdd.map(user => (
                        <button
                          key={user.email}
                          onClick={() => {
                            setSelectedNewMembers([...selectedNewMembers, user.email]);
                            setNewMemberSearch("");
                          }}
                          className="w-full p-2 hover:bg-gray-200 rounded flex items-center gap-2 text-left text-sm transition-colors"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.profile_picture} />
                            <AvatarFallback>{getInitials(getUserDisplayName(user))}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{getUserDisplayName(user)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedNewMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-lg">
                    {selectedNewMembers.map(email => {
                      const user = users.find(u => u.email === email);
                      return (
                        <Badge key={email} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                          {getUserDisplayName(user)}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-red-500"
                            onClick={() => setSelectedNewMembers(selectedNewMembers.filter(e => e !== email))}
                          />
                        </Badge>
                      );
                    })}
                    <Button size="sm" onClick={handleAddMembers} disabled={isSaving} className="w-full mt-2">
                      Confirmar Adição ({selectedNewMembers.length})
                    </Button>
                  </div>
                )}
              </div>
            )}

            <ScrollArea className="h-64 border rounded-md p-2">
              <div className="space-y-1">
                {participants.map(user => {
                  const isMe = user.email === currentUser.email;
                  const isMemberAdmin = (conversation.admins || []).includes(user.email) || user.email === conversation.created_by;
                  const isCreator = user.email === conversation.created_by;
                  
                  return (
                    <div key={user.email} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded group/item">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.profile_picture} />
                          <AvatarFallback>{getInitials(getUserDisplayName(user))}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <p className="text-sm font-medium flex items-center gap-1">
                            {getUserDisplayName(user)}
                            {isMe && <span className="text-xs text-gray-500">(Você)</span>}
                          </p>
                          <div className="flex items-center gap-1">
                            {isCreator ? (
                              <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-700 bg-yellow-50 px-1 h-5">Criador</Badge>
                            ) : isMemberAdmin ? (
                              <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-700 bg-blue-50 px-1 h-5">Admin</Badge>
                            ) : (
                              <span className="text-xs text-gray-400">Membro</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        {isGroupAdmin && !isMe && !isCreator && (
                          <>
                            {isMemberAdmin ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-orange-600 hover:bg-orange-50"
                                onClick={() => handleDemote(user.email)}
                                title="Remover de Admin"
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:bg-green-50"
                                onClick={() => handlePromote(user.email)}
                                title="Promover a Admin"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveMember(user.email)}
                              title="Remover do grupo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {isMe && !isCreator && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                            onClick={() => handleRemoveMember(user.email)}
                            title="Sair do grupo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 py-4">
            {!isGroupAdmin && (
               <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-yellow-800 text-sm flex gap-2 items-start">
                 <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                 <p>Apenas administradores podem alterar estas configurações.</p>
               </div>
            )}

            <div className="space-y-6 opacity-100 disabled:opacity-50">
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label className="text-base">Enviar Mensagens</Label>
                   <p className="text-sm text-gray-500">
                     {permissions.only_admins_message 
                       ? "Apenas administradores podem enviar mensagens" 
                       : "Todos os membros podem enviar mensagens"}
                   </p>
                 </div>
                 <Switch 
                   checked={permissions.only_admins_message}
                   onCheckedChange={(checked) => handlePermissionChange('only_admins_message', checked)}
                   disabled={!isGroupAdmin}
                 />
               </div>

               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label className="text-base">Editar Dados do Grupo</Label>
                   <p className="text-sm text-gray-500">
                     {permissions.only_admins_edit_info 
                       ? "Apenas administradores podem editar nome e foto" 
                       : "Todos os membros podem editar nome e foto"}
                   </p>
                 </div>
                 <Switch 
                   checked={permissions.only_admins_edit_info}
                   onCheckedChange={(checked) => handlePermissionChange('only_admins_edit_info', checked)}
                   disabled={!isGroupAdmin}
                 />
               </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}