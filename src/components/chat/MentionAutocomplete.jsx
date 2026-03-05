import React, { useMemo, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  filterAndSortUsersBySearch, 
  getUserDisplayName, 
  getInitials 
} from "./userSearchUtils";

/**
 * MentionAutocomplete component
 * Renderiza lista de sugestões de @ quando digitado
 */
export default function MentionAutocomplete({
  searchTerm,
  users,
  currentUserEmail,
  onSelect,
  position = { top: 0, left: 0 }
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filtrar usuários: remove o usuário atual, busca com prioridade no nome
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const filtered = filterAndSortUsersBySearch(users, searchTerm, currentUserEmail);
    return filtered;
  }, [searchTerm, users, currentUserEmail]);

  // Reset selected index quando filtro mudar
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  if (filteredUsers.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-card border border-border rounded-lg shadow-lg max-w-xs w-max max-h-64 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {filteredUsers.map((user, idx) => {
        const displayName = getUserDisplayName(user);
        return (
          <button
            key={user.email}
            onClick={() => onSelect(user)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              idx === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Avatar className="w-6 h-6 shrink-0">
              <AvatarImage src={user.profile_picture} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}