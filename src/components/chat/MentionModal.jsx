import React, { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X } from "lucide-react";

export default function MentionModal({
  open,
  onClose,
  users,
  currentUserEmail,
  onSelect
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Filtrar usuários: case-insensitive
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return users.filter(u => 
      u.email !== currentUserEmail && (
        u.display_name?.toLowerCase().includes(lowerSearch) ||
        u.full_name?.toLowerCase().includes(lowerSearch) ||
        u.email.toLowerCase().includes(lowerSearch)
      )
    );
  }, [searchTerm, users, currentUserEmail]);

  // Reset selected index quando filtro muda
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Auto-scroll para resultado selecionado
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const resultElement = resultsRef.current.children[selectedIndex];
      if (resultElement) {
        resultElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Focus input quando modal abre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleKeyDown = (e) => {
    if (filteredUsers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredUsers[selectedIndex]) {
        handleSelect(filteredUsers[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (user) => {
    onSelect(user);
    onClose();
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (user) => user?.display_name || user?.full_name || user?.email;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md flex flex-col max-h-[80vh] p-0">
        <DialogHeader className="px-4 md:px-6 py-3 border-b border-border">
          <DialogTitle className="text-lg">Mencionar usuário</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="px-4 md:px-6 py-3 border-b border-border shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                autoFocus
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 pr-9 text-sm md:text-base"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 p-1 hover:bg-accent rounded"
                  title="Limpar"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 && searchTerm && (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Nenhum usuário encontrado</p>
              </div>
            )}

            {filteredUsers.length === 0 && !searchTerm && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Digite para buscar</p>
              </div>
            )}

            {filteredUsers.length > 0 && (
              <div ref={resultsRef} className="space-y-0">
                {filteredUsers.map((user, idx) => (
                  <button
                    key={user.email}
                    onClick={() => handleSelect(user)}
                    className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 text-left transition-colors border-l-2 ${
                      selectedIndex === idx
                        ? "bg-accent border-l-primary"
                        : "border-l-transparent hover:bg-accent/50"
                    }`}
                  >
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={user.profile_picture} />
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {getInitials(getDisplayName(user))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {getDisplayName(user)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}