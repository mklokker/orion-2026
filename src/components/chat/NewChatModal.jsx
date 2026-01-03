import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Users, X, Globe } from "lucide-react";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function NewChatModal({
  open,
  onClose,
  users,
  currentUser,
  onCreateDirect,
  onCreateGroup,
  isGroupMode
}) {
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const filteredUsers = users.filter(u => 
    u.email !== currentUser?.email &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleUser = (user) => {
    if (isGroupMode) {
      setSelectedUsers(prev => 
        prev.find(u => u.email === user.email)
          ? prev.filter(u => u.email !== user.email)
          : [...prev, user]
      );
    } else {
      onCreateDirect(user);
      handleClose();
    }
  };

  const handleCreateGroup = () => {
    // Grupo público não precisa de participantes selecionados
    if (!isPublic && selectedUsers.length < 1) return;
    onCreateGroup(groupName || "Novo Grupo", selectedUsers.map(u => u.email), isPublic);
    handleClose();
  };

  const handleClose = () => {
    setSearch("");
    setSelectedUsers([]);
    setGroupName("");
    setIsPublic(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGroupMode ? <Users className="w-5 h-5" /> : null}
            {isGroupMode ? "Novo Grupo" : "Nova Conversa"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name input */}
          {isGroupMode && (
            <Input
              placeholder="Nome do grupo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          {/* Public group toggle */}
          {isGroupMode && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="public-group" className="font-medium text-gray-900">Grupo Público</Label>
                  <p className="text-xs text-gray-500">Todos os usuários poderão ver e participar</p>
                </div>
              </div>
              <Switch
                id="public-group"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          )}

          {/* Selected users chips */}
          {isGroupMode && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <div
                  key={user.email}
                  className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm"
                >
                  <span>{user.full_name?.split(" ")[0]}</span>
                  <button onClick={() => toggleUser(user)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Users list - hidden for public groups */}
          {(!isGroupMode || !isPublic) && (
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredUsers.map(user => {
                  const isSelected = selectedUsers.find(u => u.email === user.email);
                  return (
                    <div
                      key={user.email}
                      onClick={() => toggleUser(user)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 ${
                        isSelected ? "bg-green-50" : ""
                      }`}
                    >
                      {isGroupMode && (
                        <Checkbox checked={!!isSelected} />
                      )}
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.profile_picture} />
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {user.display_name || user.full_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Nenhum usuário encontrado</p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Public group info */}
          {isGroupMode && isPublic && (
            <div className="text-center py-8 text-gray-500">
              <Globe className="w-12 h-12 mx-auto mb-3 text-blue-400" />
              <p className="font-medium text-gray-700">Grupo Público</p>
              <p className="text-sm">Todos os usuários atuais e futuros terão acesso a este grupo automaticamente.</p>
            </div>
          )}

          {/* Create group button */}
          {isGroupMode && (
            <Button
              onClick={handleCreateGroup}
              disabled={!isPublic && selectedUsers.length < 1}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              {isPublic 
                ? "Criar Grupo Público" 
                : `Criar Grupo (${selectedUsers.length} participantes)`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}