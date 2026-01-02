import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Pencil, 
  UserPlus, 
  LogOut, 
  Trash2,
  Crown,
  Camera
} from "lucide-react";
import { base44 } from "@/api/base44Client";
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

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function GroupSettingsModal({
  open,
  onClose,
  conversation,
  users,
  currentUser,
  allUsers,
  onUpdate,
  onLeave,
  onDelete
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(conversation?.name || "");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const isAdmin = conversation.admins?.includes(currentUser?.email);
  const participants = conversation.participants || [];

  const handleSaveName = async () => {
    await onUpdate({ name: groupName });
    setIsEditing(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUpdate({ avatar_url: file_url });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    }
    setUploading(false);
  };

  const handleRemoveMember = async (email) => {
    const newParticipants = participants.filter(p => p !== email);
    await onUpdate({ participants: newParticipants });
  };

  const handleAddMembers = async (emails) => {
    const newParticipants = [...new Set([...participants, ...emails])];
    await onUpdate({ participants: newParticipants });
    setShowAddMembers(false);
  };

  // For direct chats
  const otherUser = !isGroup 
    ? users.find(u => u.email !== currentUser?.email)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isGroup ? "Configurações do Grupo" : "Detalhes da Conversa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Avatar and Name */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={isGroup ? conversation.avatar_url : otherUser?.profile_picture} />
                  <AvatarFallback className={`text-2xl ${isGroup ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {isGroup ? <Users className="w-10 h-10" /> : getInitials(otherUser?.full_name)}
                  </AvatarFallback>
                </Avatar>
                {isGroup && isAdmin && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                )}
              </div>

              {isGroup ? (
                isEditing ? (
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="text-center"
                    />
                    <Button size="sm" onClick={handleSaveName}>Salvar</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3">
                    <h3 className="text-xl font-semibold">{conversation.name || "Grupo"}</h3>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center mt-3">
                  <h3 className="text-xl font-semibold">{otherUser?.display_name || otherUser?.full_name}</h3>
                  <p className="text-sm text-gray-500">{otherUser?.email}</p>
                </div>
              )}

              {isGroup && (
                <p className="text-sm text-gray-500">{participants.length} participantes</p>
              )}
            </div>

            {/* Members list (groups only) */}
            {isGroup && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Participantes</h4>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAddMembers(true)}>
                      <UserPlus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {participants.map(email => {
                      const user = allUsers?.find(u => u.email === email);
                      const isParticipantAdmin = conversation.admins?.includes(email);
                      const isMe = email === currentUser?.email;

                      return (
                        <div key={email} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user?.profile_picture} />
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {getInitials(user?.full_name || email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {user?.display_name || user?.full_name || email}
                              {isMe && " (você)"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{email}</p>
                          </div>
                          {isParticipantAdmin && (
                            <Badge variant="secondary" className="gap-1">
                              <Crown className="w-3 h-3" /> Admin
                            </Badge>
                          )}
                          {isAdmin && !isMe && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleRemoveMember(email)}
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
            )}

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t">
              {isGroup && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sair do grupo
                </Button>
              )}
              {isGroup && isAdmin && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir grupo
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você não receberá mais mensagens deste grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onLeave} className="bg-red-600 hover:bg-red-700">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mensagens serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}