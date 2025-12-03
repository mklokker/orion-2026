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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, UserPlus, Trash2, Shield, Settings } from "lucide-react";
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
  const [invitePermission, setInvitePermission] = useState("everyone");
  const [newMemberSearch, setNewMemberSearch] = useState("");
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isCreator = conversation?.created_by === currentUser?.email;
  const hasAdminRights = isAdmin || isCreator;

  // Permission Logic
  const canRename = hasAdminRights;
  const canChangePermissions = hasAdminRights;
  const canRemoveMembers = hasAdminRights;
  
  // Can Add Members logic
  const canAddMembers = hasAdminRights || (conversation?.invite_permission !== 'admin');

  useEffect(() => {
    if (conversation) {
      setGroupName(conversation.name || "");
      setInvitePermission(conversation.invite_permission || "everyone");
      
      // Map participants emails to user objects
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

  const handlePermissionChange = async (value) => {
    try {
      setIsSaving(true);
      setInvitePermission(value);
      await ChatConversation.update(conversation.id, { invite_permission: value });
      toast({ title: "Sucesso", description: "Permissões atualizadas." });
      onUpdate();
    } catch (error) {
      setInvitePermission(conversation.invite_permission || "everyone");
      toast({ title: "Erro", description: "Falha ao atualizar permissões.", variant: "destructive" });
    } finally {
      setIsSaving(false);
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

      // Notify new members
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
    if (!canRemoveMembers && emailToRemove !== currentUser.email) return;

    try {
      setIsSaving(true);
      const newParticipants = conversation.participants.filter(p => p !== emailToRemove);
      
      await ChatConversation.update(conversation.id, { 
        participants: newParticipants 
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
        onClose(); // Close modal if user left
      }
      
      onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover membro.", variant: "destructive" });
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do Grupo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label>Nome do Grupo</Label>
            <div className="flex gap-2">
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={!canRename}
              />
              {canRename && (
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

          {/* Permissions */}
          {canChangePermissions && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Permissão de Convite
              </Label>
              <Select 
                value={invitePermission} 
                onValueChange={handlePermissionChange}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Todos os membros</SelectItem>
                  <SelectItem value="admin">Apenas Admins/Criador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add Members */}
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
                <div className="border rounded-md p-2 mt-2 space-y-1">
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
                        className="w-full p-2 hover:bg-gray-50 rounded flex items-center gap-2 text-left text-sm"
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedNewMembers.map(email => {
                    const user = users.find(u => u.email === email);
                    return (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {getUserDisplayName(user)}
                        <X
                          className="w-3 h-3 cursor-pointer"
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

          {/* Members List */}
          <div className="space-y-2">
            <Label>Participantes ({participants.length})</Label>
            <ScrollArea className="h-48 border rounded-md p-2">
              <div className="space-y-2">
                {participants.map(user => {
                  const isMe = user.email === currentUser.email;
                  const isGroupCreator = user.email === conversation?.created_by;
                  
                  return (
                    <div key={user.email} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
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
                          <p className="text-xs text-gray-500">
                            {isGroupCreator ? "Criador do Grupo" : "Membro"}
                          </p>
                        </div>
                      </div>
                      
                      {(canRemoveMembers || isMe) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveMember(user.email)}
                          title={isMe ? "Sair do grupo" : "Remover membro"}
                          disabled={isGroupCreator && !isMe} // Cannot remove creator unless it's self leaving (though creator shouldn't leave without transfer usually, keeping simple)
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}