import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { getPublicUsers } from "@/functions/getPublicUsers";
import {
  getProjectById, listParticipants, listChecklists, listChecklistItems,
  listStatusUpdates, listProjectFiles, listReminders,
} from "@/components/collab/collabService";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, MessageSquare } from "lucide-react";
import { createPageUrl } from "@/utils";
import ProjectInfoPanel  from "@/components/collab/ProjectInfoPanel";
import ProjectChatPanel  from "@/components/collab/ProjectChatPanel";

export default function ColabProjeto() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  const [project, setProject]             = useState(null);
  const [participants, setParticipants]   = useState([]);
  const [checklists, setChecklists]       = useState([]);
  const [checklistItems, setChecklistItems] = useState({});
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [files, setFiles]                 = useState([]);
  const [reminders, setReminders]         = useState([]);
  const [currentUser, setCurrentUser]     = useState(null);
  const [users, setUsers]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [mobileTab, setMobileTab]         = useState("info");

  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  const loadAll = async () => {
    setLoading(true);
    const [userData, usersData] = await Promise.all([
      User.me(),
      getPublicUsers().then(r => r?.data?.users).catch(() => User.list()),
    ]);
    setCurrentUser(userData);
    setUsers(usersData || []);

    const [proj, parts, clists, updates, projFiles, remins] = await Promise.all([
      getProjectById(projectId),
      listParticipants(projectId),
      listChecklists(projectId),
      listStatusUpdates(projectId),
      listProjectFiles(projectId),
      listReminders(projectId),
    ]);

    setProject(proj);
    setParticipants(parts);
    setChecklists(clists);
    setStatusUpdates(updates);
    setFiles(projFiles);
    setReminders(remins);

    if (clists.length > 0) {
      const itemsMap = {};
      await Promise.all(clists.map(async cl => {
        itemsMap[cl.id] = await listChecklistItems(cl.id);
      }));
      setChecklistItems(itemsMap);
    }
    setLoading(false);
  };

  const goBack = () => {
    window.location.href = createPageUrl("Colaboracao");
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-muted-foreground">Nenhum projeto selecionado.</p>
        <Button onClick={goBack}><ArrowLeft className="w-4 h-4 mr-2" /> Ver projetos</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground animate-pulse text-sm">Carregando projeto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button onClick={goBack}><ArrowLeft className="w-4 h-4 mr-2" /> Ver projetos</Button>
      </div>
    );
  }

  const myRole  = participants.find(p => p.user_email === currentUser?.email)?.role;
  const canEdit = myRole === "owner" || myRole === "responsavel" || currentUser?.role === "admin";

  const infoPanel = (
    <ProjectInfoPanel
      project={project}
      participants={participants}
      checklists={checklists}
      checklistItems={checklistItems}
      statusUpdates={statusUpdates}
      files={files}
      reminders={reminders}
      currentUser={currentUser}
      users={users}
      canEdit={canEdit}
      myRole={myRole}
      onReload={loadAll}
    />
  );

  const chatPanel = project.conversation_id ? (
    <ProjectChatPanel
      conversationId={project.conversation_id}
      currentUser={currentUser}
      users={users}
      isAdmin={currentUser?.role === "admin"}
    />
  ) : (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Chat não disponível para este projeto.
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Mobile: back bar */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold text-sm truncate flex-1">{project.title}</h2>
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:flex h-full overflow-hidden">
        {/* Left: info panel */}
        <div className="w-[440px] lg:w-[500px] xl:w-[540px] shrink-0 border-r border-border overflow-y-auto bg-card">
          {infoPanel}
        </div>
        {/* Right: chat */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {chatPanel}
        </div>
      </div>

      {/* Mobile: tab switcher */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden min-h-0">
        <div className="px-3 pt-2 pb-0 shrink-0">
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            <button
              onClick={() => setMobileTab("info")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
                mobileTab === "info"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Projeto
            </button>
            <button
              onClick={() => setMobileTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
                mobileTab === "chat"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0 mt-2">
          {mobileTab === "info" ? (
            <div className="h-full overflow-y-auto">{infoPanel}</div>
          ) : (
            <div className="h-full overflow-hidden">{chatPanel}</div>
          )}
        </div>
      </div>
    </div>
  );
}