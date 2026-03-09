import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Archive, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { updateProject, archiveProject } from "@/components/collab/collabService";
import ProjectChecklists     from "./ProjectChecklists";
import ProjectParticipants   from "./ProjectParticipants";
import ProjectStatusUpdates  from "./ProjectStatusUpdates";
import ProjectFiles          from "./ProjectFiles";
import ProjectReminders      from "./ProjectReminders";
import EditProjectModal      from "./EditProjectModal";

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

export default function ProjectInfoPanel({
  project, participants, checklists, checklistItems,
  statusUpdates, files, reminders,
  currentUser, users, canEdit, myRole, onReload,
}) {
  const getUser    = (email) => users.find(u => u.email === email);
  const getName    = (email) => {
    const u = getUser(email);
    return u?.display_name || u?.full_name || email;
  };
  const getAvatar  = (email) => getUser(email)?.profile_picture;
  const getInitial = (email) => getName(email)?.[0]?.toUpperCase() || "?";

  const ownerUser       = getUser(project.owner_email);
  const responsibleUser = project.responsible_email ? getUser(project.responsible_email) : null;

  const allItems  = Object.values(checklistItems).flat();
  const doneItems = allItems.filter(i => i.is_done);
  const progress  = allItems.length > 0
    ? Math.round((doneItems.length / allItems.length) * 100)
    : 0;

  const handleComplete = async () => {
    await updateProject(project.id, { status: "concluido" });
    onReload();
  };
  const handleArchive = async () => {
    await archiveProject(project.id);
    onReload();
  };

  const [showEditModal, setShowEditModal] = useState(false);

  const canAct = canEdit &&
    project.status !== "concluido" &&
    project.status !== "arquivado";

  return (
    <div className="flex flex-col">
      {/* Back link (desktop only) */}
      <div className="hidden md:flex items-center gap-1 px-4 pt-3 pb-1">
        <a
          href={createPageUrl("Colaboracao")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Projetos
        </a>
      </div>

      {/* Project header */}
      <div
        className="p-4 border-b border-border"
        style={{ borderLeft: `4px solid ${project.color_tag || "#4338CA"}` }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-base md:text-lg font-bold text-foreground leading-tight flex-1">
            {project.title}
          </h1>
          {canEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowEditModal(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge className={STATUS_COLORS[project.status]}>
            {STATUS_LABELS[project.status]}
          </Badge>
          <Badge className={PRIORITY_COLORS[project.priority]}>
            {PRIORITY_LABELS[project.priority]}
          </Badge>
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {project.description}
          </p>
        )}

        {/* Global progress bar */}
        {allItems.length > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso das tarefas</span>
              <span>{doneItems.length}/{allItems.length} · {progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {canAct && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={handleComplete}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluir
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleArchive}>
              <Archive className="w-3.5 h-3.5 mr-1" /> Arquivar
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral">
        <TabsList className="mx-4 mt-3 grid grid-cols-5 h-9">
          <TabsTrigger value="geral"      className="text-xs px-1">Geral</TabsTrigger>
          <TabsTrigger value="checklists" className="text-xs px-1">Tarefas</TabsTrigger>
          <TabsTrigger value="updates"    className="text-xs px-1">Updates</TabsTrigger>
          <TabsTrigger value="arquivos"   className="text-xs px-1">Arquivos</TabsTrigger>
          <TabsTrigger value="lembretes"  className="text-xs px-1">Alertas</TabsTrigger>
        </TabsList>

        {/* ── GERAL ── */}
        <TabsContent value="geral" className="px-4 pb-6 pt-4 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Proprietário</p>
              <div className="flex items-center gap-1.5">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={getAvatar(project.owner_email)} />
                  <AvatarFallback className="text-xs">{getInitial(project.owner_email)}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{getName(project.owner_email)}</span>
              </div>
            </div>
            {project.responsible_email && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={getAvatar(project.responsible_email)} />
                    <AvatarFallback className="text-xs">{getInitial(project.responsible_email)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{getName(project.responsible_email)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {project.start_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Início</p>
                <p className="text-sm">
                  {format(new Date(project.start_date + "T00:00:00"), "dd/MM/yyyy")}
                </p>
              </div>
            )}
            {project.due_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prazo</p>
                <p className="text-sm font-medium text-orange-600">
                  {format(new Date(project.due_date + "T00:00:00"), "dd/MM/yyyy")}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Criado em</p>
              <p className="text-sm">
                {format(new Date(project.created_date), "dd/MM/yy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Participants */}
          <div className="border-t border-border pt-4">
            <ProjectParticipants
              projectId={project.id}
              participants={participants}
              users={users}
              currentUser={currentUser}
              canEdit={canEdit}
              onReload={onReload}
            />
          </div>

          {/* Summary */}
          {project.summary_required && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Resumo obrigatório
                </p>
              </div>
              {project.summary_text ? (
                <p className="text-sm text-foreground bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">
                  {project.summary_text}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum resumo definido ainda.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── CHECKLISTS ── */}
        <TabsContent value="checklists" className="px-4 pb-6 pt-4">
          <ProjectChecklists
            projectId={project.id}
            checklists={checklists}
            checklistItems={checklistItems}
            currentUser={currentUser}
            users={users}
            canEdit={canEdit}
            onReload={onReload}
          />
        </TabsContent>

        {/* ── STATUS UPDATES ── */}
        <TabsContent value="updates" className="px-4 pb-6 pt-4">
          <ProjectStatusUpdates
            projectId={project.id}
            updates={statusUpdates}
            currentUser={currentUser}
            users={users}
            summaryRequired={project.summary_required}
            onReload={onReload}
          />
        </TabsContent>

        {/* ── ARQUIVOS ── */}
        <TabsContent value="arquivos" className="px-4 pb-6 pt-4">
          <ProjectFiles
            projectId={project.id}
            files={files}
            currentUser={currentUser}
            users={users}
            canEdit={canEdit}
            onReload={onReload}
          />
        </TabsContent>

        {/* ── LEMBRETES ── */}
        <TabsContent value="lembretes" className="px-4 pb-6 pt-4">
          <ProjectReminders
            projectId={project.id}
            reminders={reminders}
            currentUser={currentUser}
            users={users}
            canEdit={canEdit}
            onReload={onReload}
          />
        </TabsContent>
      </Tabs>
    </div>

    <EditProjectModal
      open={showEditModal}
      onClose={() => setShowEditModal(false)}
      project={project}
      users={users}
      onUpdated={() => { setShowEditModal(false); onReload(); }}
    />
  );
}