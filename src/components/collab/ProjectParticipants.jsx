import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Search } from "lucide-react";
import { addParticipant, removeParticipant } from "@/components/collab/collabService";

const ROLE_LABELS  = { owner: "Owner", responsavel: "Responsável", participante: "Participante", observador: "Observador" };
const ROLE_COLORS  = {
  owner:        "bg-purple-100 text-purple-700",
  responsavel:  "bg-blue-100 text-blue-700",
  participante: "bg-green-100 text-green-700",
  observador:   "bg-gray-100 text-gray-600",
};

export default function ProjectParticipants({
  projectId, participants, users, currentUser, canEdit, onReload,
}) {
  const [filter, setFilter]     = useState("");
  const [adding, setAdding]     = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const getName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.display_name || u?.full_name || email;
  };
  const getAvatar = (email) => users.find(u => u.email === email)?.profile_picture;
  const getInitial = (email) => getName(email)?.[0]?.toUpperCase() || "?";

  const participantEmails = new Set(participants.map(p => p.user_email));
  const available = users.filter(u =>
    !participantEmails.has(u.email) &&
    (u.display_name || u.full_name || u.email)
      .toLowerCase()
      .includes(userSearch.toLowerCase())
  );

  const filtered = participants.filter(p =>
    getName(p.user_email).toLowerCase().includes(filter.toLowerCase())
  );

  const handleAdd = async (user) => {
    await addParticipant(projectId, user.email, "participante", currentUser.email);
    setUserSearch("");
    setAdding(false);
    onReload();
  };

  const handleRemove = async (participant) => {
    if (!confirm(`Remover ${getName(participant.user_email)} do projeto?`)) return;
    await removeParticipant(participant.id, projectId);
    onReload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">
          Participantes <span className="text-muted-foreground font-normal">({participants.length})</span>
        </p>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)} className="h-7 px-2 gap-1">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Search filter (only shown when > 4 participants) */}
      {participants.length > 4 && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Filtrar participantes..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.map(p => (
          <div key={p.id} className="flex items-center gap-2 py-1">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={getAvatar(p.user_email)} />
              <AvatarFallback className="text-xs bg-muted">{getInitial(p.user_email)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{getName(p.user_email)}</p>
            </div>
            <Badge className={`text-xs shrink-0 border-0 ${ROLE_COLORS[p.role]}`}>
              {ROLE_LABELS[p.role]}
            </Badge>
            {canEdit && p.role !== "owner" && (
              <button
                onClick={() => handleRemove(p)}
                className="p-1 hover:text-destructive transition-colors"
                title="Remover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground py-1">Nenhum participante encontrado.</p>
        )}
      </div>

      {/* Add participant panel */}
      {adding && (
        <div className="mt-3 border border-border rounded-xl p-3 bg-muted/30 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário para adicionar..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {available.slice(0, 10).map(u => (
              <button
                key={u.email}
                onClick={() => handleAdd(u)}
                className="flex items-center gap-2 w-full px-2 py-2 hover:bg-accent rounded-lg transition-colors text-left min-h-[40px]"
              >
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarImage src={u.profile_picture} />
                  <AvatarFallback className="text-xs">{(u.display_name || u.full_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{u.display_name || u.full_name || u.email}</span>
              </button>
            ))}
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-2">
                {userSearch ? "Nenhum usuário encontrado." : "Digite para buscar usuários."}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAdding(false); setUserSearch(""); }}
            className="w-full h-7 text-xs"
          >
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}