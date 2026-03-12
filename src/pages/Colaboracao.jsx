import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/entities/User";
import { getPublicUsers } from "@/functions/getPublicUsers";
import {
  listProjects, updateProject,
  listParticipants, listChecklistItems, listChecklists,
} from "@/components/collab/collabService";
import CreateProjectModal from "@/components/collab/CreateProjectModal";
import CollabProjectCard from "@/components/collab/CollabProjectCard";
import CollabKanbanBoard from "@/components/collab/CollabKanbanBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Briefcase, LayoutGrid, List, SlidersHorizontal, X,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  rascunho: "Rascunho", ativo: "Ativo", em_andamento: "Em Andamento",
  concluido: "Concluído", arquivado: "Arquivado",
};

export default function Colaboracao() {
  const [projects, setProjects]         = useState([]);
  const [currentUser, setCurrentUser]   = useState(null);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState("kanban"); // "list" | "kanban"
  const [showCreate, setShowCreate]     = useState(false);
  const [showFilters, setShowFilters]   = useState(false);

  // Filters
  const [search, setSearch]                       = useState("");
  const [filterStatus, setFilterStatus]           = useState("all");
  const [filterResponsible, setFilterResponsible] = useState("all");
  const [filterMine, setFilterMine]               = useState(false);
  const [filterOverdue, setFilterOverdue]         = useState(false);

  // Kanban auxiliary data (participantes + checklist items por projeto)
  // Agora carregados sob demanda (lazy load) ao invés de tudo na inicialização
  const [participantsMap, setParticipantsMap]       = useState({}); // { projectId: [] }
  const [checklistItemsMap, setChecklistItemsMap]   = useState({}); // { projectId: [] }
  const [loadingAuxData, setLoadingAuxData]         = useState({}); // { projectId: boolean }

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
    // Removido: loadAuxData() — agora lazy load sob demanda
  };

  // Lazy load: carrega dados auxiliares de um projeto específico apenas quando necessário
  const loadProjectAuxData = async (projectId) => {
    // Evita recarregar se já temos os dados
    if (participantsMap[projectId] && checklistItemsMap[projectId]) return;
    // Evita chamadas duplicadas simultâneas
    if (loadingAuxData[projectId]) return;

    setLoadingAuxData(prev => ({ ...prev, [projectId]: true }));

    try {
      const [parts, checklists] = await Promise.all([
        listParticipants(projectId),
        listChecklists(projectId),
      ]);

      // Carrega itens de todas as checklists
      const allItems = [];
      for (const cl of checklists) {
        const items = await listChecklistItems(cl.id);
        allItems.push(...items);
      }

      setParticipantsMap(prev => ({ ...prev, [projectId]: parts }));
      setChecklistItemsMap(prev => ({ ...prev, [projectId]: allItems }));
    } catch (e) {
      console.error(`[Colaboracao] Erro ao carregar dados auxiliares do projeto ${projectId}:`, e);
    } finally {
      setLoadingAuxData(prev => ({ ...prev, [projectId]: false }));
    }
  };

  // Pré-carrega dados auxiliares para projetos visíveis (apenas os filtrados)
  useEffect(() => {
    if (!loading && filtered.length > 0) {
      // Carrega em background apenas para os projetos visíveis
      filtered.slice(0, 20).forEach(p => loadProjectAuxData(p.id));
    }
  }, [filtered, loading]);

  const getName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.display_name || u?.full_name || email;
  };

  const openProject = (id) => {
    // Garante que dados auxiliares estejam carregados antes de abrir
    loadProjectAuxData(id);
    window.location.href = `${createPageUrl("ColabProjeto")}?id=${id}`;
  };

  const handleStatusChange = async (projectId, newStatus) => {
    // Save previous status for rollback
    const previousStatus = projects.find(p => p.id === projectId)?.status;
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    try {
      await updateProject(projectId, { status: newStatus });
    } catch (e) {
      // Rollback on failure
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: previousStatus } : p));
      console.error("[Colaboracao] Falha ao atualizar status, revertendo:", e);
    }
  };

  // ─── Filtered projects ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getNameLocal = (email) => {
      const u = users.find(u => u.email === email);
      return u?.display_name || u?.full_name || email || "";
    };

    return projects.filter(p => {
      // Search (case-insensitive)
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDesc  = (p.description || "").toLowerCase().includes(q);
        const matchResp  = getNameLocal(p.responsible_email || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchResp) return false;
      }

      // Status filter — skip in kanban view (board already organizes by status)
      if (view === "list" && filterStatus !== "all" && p.status !== filterStatus) return false;

      // Responsible filter
      if (filterResponsible !== "all" && p.responsible_email !== filterResponsible) return false;

      // Mine filter (owner or participant)
      if (filterMine) {
        const myParts = participantsMap[p.id] || [];
        const isMine = p.owner_email === currentUser?.email ||
          myParts.some(pt => pt.user_email === currentUser?.email);
        if (!isMine) return false;
      }

      // Overdue filter
      if (filterOverdue) {
        if (!p.due_date) return false;
        const due = new Date(p.due_date + "T23:59:59");
        if (due >= today || ["concluido", "arquivado"].includes(p.status)) return false;
      }

      return true;
    });
  }, [projects, search, view, filterStatus, filterResponsible, filterMine, filterOverdue, currentUser, participantsMap, users]);

  const activeFilterCount = [
    filterStatus !== "all",
    filterResponsible !== "all",
    filterMine,
    filterOverdue,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterResponsible("all");
    setFilterMine(false);
    setFilterOverdue(false);
  };

  // Unique responsibles for filter dropdown
  const responsibleOptions = useMemo(() => {
    const emails = [...new Set(projects.map(p => p.responsible_email).filter(Boolean))];
    return emails.map(email => ({ email, name: getName(email) }));
  }, [projects, users]);

  return (
    <div className="h-full overflow-auto bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground leading-tight">Colaboração</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {loading ? "Carregando..." : `${projects.length} projeto${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
                  view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`p-2 rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
                  view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5 h-9">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Projeto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* ── Search + Filter row ── */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors min-h-[36px] shrink-0 ${
              showFilters || activeFilterCount > 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="bg-white/30 text-inherit text-xs rounded-full px-1.5 py-0 font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>
          {(activeFilterCount > 0 || search) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2 min-h-[36px] shrink-0"
              title="Limpar filtros"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>

        {/* ── Expanded filters ── */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Responsible */}
            {responsibleOptions.length > 0 && (
              <Select value={filterResponsible} onValueChange={setFilterResponsible}>
                <SelectTrigger className="h-8 text-xs w-auto min-w-[150px]">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {responsibleOptions.map(o => (
                    <SelectItem key={o.email} value={o.email}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Quick filters */}
            <button
              onClick={() => setFilterMine(!filterMine)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors min-h-[32px] ${
                filterMine
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-accent"
              }`}
            >
              Meus projetos
            </button>
            <button
              onClick={() => setFilterOverdue(!filterOverdue)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors min-h-[32px] ${
                filterOverdue
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-card border-border text-foreground hover:bg-accent"
              }`}
            >
              Atrasados
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Carregando projetos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Briefcase className="w-14 h-14 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm mb-4">
              {search || activeFilterCount > 0
                ? "Nenhum projeto corresponde aos filtros."
                : "Nenhum projeto ainda."}
            </p>
            {!search && activeFilterCount === 0 && (
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1" /> Criar primeiro projeto
              </Button>
            )}
            {(search || activeFilterCount > 0) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-3.5 h-3.5 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        ) : view === "list" ? (
          // ── LIST VIEW ──
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {filtered.map(p => (
                <CollabProjectCard
                  key={p.id}
                  project={p}
                  participants={participantsMap[p.id] || []}
                  checklistItems={checklistItemsMap[p.id] || []}
                  users={users}
                  onClick={() => openProject(p.id)}
                  isLoadingData={loadingAuxData[p.id]}
                />
              ))}
            </div>
          </div>
        ) : (
          // ── KANBAN VIEW ──
          <div className="p-4 md:p-6">
            {filterStatus !== "all" && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-400 max-w-6xl mx-auto">
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                Filtro de status ignorado no Kanban — o board já organiza por status. Use a visão Lista para filtrar por status.
              </div>
            )}
            <CollabKanbanBoard
              projects={filtered}
              participantsMap={participantsMap}
              checklistItemsMap={checklistItemsMap}
              users={users}
              onStatusChange={handleStatusChange}
              onProjectClick={openProject}
              loadingAuxData={loadingAuxData}
            />
          </div>
        )}
      </div>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        currentUser={currentUser}
        users={users}
        onCreated={(project) => {
          window.location.href = `${createPageUrl("ColabProjeto")}?id=${project.id}`;
        }}
      />
    </div>
  );
}