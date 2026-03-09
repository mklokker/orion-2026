import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { getPublicUsers } from "@/functions/getPublicUsers";
import { listProjects } from "@/components/collab/collabService";
import CreateProjectModal from "@/components/collab/CreateProjectModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Briefcase, Calendar, User as UserIcon } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

const STATUS_LABELS = {
  rascunho: "Rascunho", ativo: "Ativo", em_andamento: "Em Andamento",
  concluido: "Concluído", arquivado: "Arquivado",
};
const STATUS_COLORS = {
  rascunho:    "bg-gray-100 text-gray-700 border-0",
  ativo:       "bg-blue-100 text-blue-700 border-0",
  em_andamento:"bg-yellow-100 text-yellow-700 border-0",
  concluido:   "bg-green-100 text-green-700 border-0",
  arquivado:   "bg-red-100 text-red-700 border-0",
};
const PRIORITY_COLORS = {
  baixa:   "bg-green-50 text-green-700 border-0",
  media:   "bg-yellow-50 text-yellow-700 border-0",
  alta:    "bg-orange-50 text-orange-700 border-0",
  urgente: "bg-red-50 text-red-700 border-0",
};
const PRIORITY_LABELS = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };

export default function Colaboracao() {
  const [projects, setProjects]     = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [userData, usersData] = await Promise.all([
      User.me(),
      getPublicUsers().then(r => r?.data?.users).catch(() => User.list()),
    ]);
    setCurrentUser(userData);
    setUsers(usersData || []);
    const projs = await listProjects(userData.email, userData.role === "admin");
    setProjects(projs);
    setLoading(false);
  };

  const getName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.display_name || u?.full_name || email;
  };

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  const openProject = (id) => {
    window.location.href = `${createPageUrl("ColabProjeto")}?id=${id}`;
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Colaboração</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Projetos colaborativos da equipe
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Projeto</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* States */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Carregando projetos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Briefcase className="w-14 h-14 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm mb-4">
              {search ? "Nenhum projeto encontrado para esta busca." : "Nenhum projeto ainda."}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1" /> Criar primeiro projeto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => openProject(p.id)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                style={{ borderLeft: `4px solid ${p.color_tag || "#4338CA"}` }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1 text-sm md:text-base">
                    {p.title}
                  </h3>
                  <Badge className={`text-xs shrink-0 mt-0.5 ${PRIORITY_COLORS[p.priority]}`}>
                    {PRIORITY_LABELS[p.priority]}
                  </Badge>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {p.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge className={`text-xs ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </Badge>
                  {p.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(p.due_date + "T00:00:00"), "dd/MM/yy")}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground border-t border-border pt-2">
                  <UserIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{getName(p.owner_email)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        currentUser={currentUser}
        users={users}
        onCreated={loadData}
      />
    </div>
  );
}