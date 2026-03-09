import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Users, X, UserPlus, Megaphone } from "lucide-react";

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
  isGroupMode,
  isAdmin = false
}) {
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [adminOnlyPosting, setAdminOnlyPosting] = useState(false);

  const availableUsers = users.filter(u => u.email !== currentUser?.email);
  
  const filteredUsers = availableUsers.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
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
    if (selectedUsers.length < 1) return;
    onCreateGroup(groupName || "Novo Grupo", selectedUsers.map(u => u.email), adminOnlyPosting);
    handleClose();
  };

  const handleSelectAll = () => {
    setSelectedUsers(availableUsers);
  };

  const handleDeselectAll = () => {
    setSelectedUsers([]);
  };

  const handleClose = () => {
    setSearch("");
    setSelectedUsers([]);
    setGroupName("");
    setAdminOnlyPosting(false);
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

          {/* Admin-only posting toggle (visible only for system admins) */}
          {isGroupMode && isAdmin && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
              <Megaphone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="admin-only-posting" className="font-semibold text-sm cursor-pointer">
                    Canal de comunicação
                  </Label>
                  <Switch
                    id="admin-only-posting"
                    checked={adminOnlyPosting}
                    onCheckedChange={setAdminOnlyPosting}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Somente admins poderão postar. Usuários podem reagir e interagir com as mensagens.
                </p>
              </div>
            </div>
          )}

          {/* Select all / Deselect all buttons */}
          {isGroupMode && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex-1"
              >
                <UserPlus className="w-4 h-4 mr-1" /> Selecionar Todos
              </Button>
              {selectedUsers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" /> Limpar Seleção
                </Button>
              )}
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

          {/* Users list */}
          <div className="h-[300px] overflow-y-auto">
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
          </div>

          {/* Create group button */}
          {isGroupMode && (
            <Button
              onClick={handleCreateGroup}
              disabled={selectedUsers.length < 1}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Criar Grupo ({selectedUsers.length} participantes)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}