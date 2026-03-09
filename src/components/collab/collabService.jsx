/**
 * COLLAB SERVICE — Módulo de Colaboração
 * =======================================
 * Camada de serviço isolada para o módulo Colaboração.
 * NÃO mistura com Task, Service, ou qualquer outra entidade existente.
 *
 * RELACIONAMENTOS:
 *   CollabProject (1) → (N) CollabProjectParticipant  [via project_id]
 *   CollabProject (1) → (N) CollabChecklist           [via project_id]
 *   CollabChecklist (1) → (N) CollabChecklistItem     [via checklist_id + project_id]
 *   CollabProject (1) → (N) CollabProjectFile         [via project_id]
 *   CollabProject (1) → (N) CollabStatusUpdate        [via project_id]
 *   CollabProject (1) → (N) CollabReminder            [via project_id]
 *   CollabProject (1) → (1) ChatConversation          [via conversation_id / context_id]
 *
 * INTEGRAÇÃO COM CHAT:
 *   - Reutiliza o motor de chat existente (ChatConversation + ChatMessage)
 *   - A conversa do projeto tem context_type="project" e context_id=project.id
 *   - NÃO cria sistema paralelo de mensagens
 *   - NÃO interfere no chat geral nem na lógica de bubbles (UserPresence bubble_*)
 *
 * BUBBLES (PRESERVADO):
 *   - Toda personalização de bolhas continua em UserPresence (bubble_* fields)
 *   - collabService não toca em UserPresence nem em variáveis CSS de bolha
 *   - ConversationView e useBubbleColors não são alterados
 */

import { base44 } from "@/api/base44Client";

const {
  CollabProject,
  CollabProjectParticipant,
  CollabChecklist,
  CollabChecklistItem,
  CollabProjectFile,
  CollabStatusUpdate,
  CollabReminder,
  ChatConversation,
} = base44.entities;

// ─────────────────────────────────────────────
// PROJETOS
// ─────────────────────────────────────────────

/**
 * Cria projeto + conversa dedicada + participantes iniciais.
 * A conversa usa context_type="project" e context_id=project.id
 */
export async function createProject(data, currentUserEmail) {
  if (!data.title?.trim()) throw new Error("Título do projeto é obrigatório.");
  if (!currentUserEmail) throw new Error("Usuário não autenticado.");

  // Monta lista inicial de participantes para a conversa
  const initialParticipants = [currentUserEmail];
  if (data.responsible_email && data.responsible_email !== currentUserEmail) {
    initialParticipants.push(data.responsible_email);
  }
  if (Array.isArray(data.extra_participants)) {
    data.extra_participants.forEach((email) => {
      if (!initialParticipants.includes(email)) initialParticipants.push(email);
    });
  }

  // 1. Cria o projeto (sem conversation_id ainda)
  const project = await CollabProject.create({
    title: data.title.trim(),
    description: data.description || "",
    status: data.status || "rascunho",
    priority: data.priority || "media",
    start_date: data.start_date || null,
    due_date: data.due_date || null,
    owner_email: currentUserEmail,
    responsible_email: data.responsible_email || null,
    is_private: data.is_private ?? true,
    color_tag: data.color_tag || "#4338CA",
    department: data.department || null,
    summary_required: data.summary_required ?? false,
    summary_text: "",
  });

  // 2. Cria a conversa dedicada ao projeto
  const conversation = await ChatConversation.create({
    type: "group",
    name: `📁 ${data.title.trim()}`,
    participants: initialParticipants,
    admins: [currentUserEmail],
    is_public: false,
    admin_only_posting: false,
    context_type: "project",
    context_id: project.id,
  });

  // 3. Vincula conversa ao projeto
  await CollabProject.update(project.id, { conversation_id: conversation.id });

  // 4. Cria registro de participante: owner
  await CollabProjectParticipant.create({
    project_id: project.id,
    user_email: currentUserEmail,
    role: "owner",
    joined_at: new Date().toISOString(),
    added_by: currentUserEmail,
  });

  // 5. Cria registro de participante: responsavel (se diferente do owner)
  if (data.responsible_email && data.responsible_email !== currentUserEmail) {
    await CollabProjectParticipant.create({
      project_id: project.id,
      user_email: data.responsible_email,
      role: "responsavel",
      joined_at: new Date().toISOString(),
      added_by: currentUserEmail,
    });
  }

  // 6. Cria registros para participantes extras
  if (Array.isArray(data.extra_participants)) {
    for (const email of data.extra_participants) {
      if (email === currentUserEmail || email === data.responsible_email) continue;
      await CollabProjectParticipant.create({
        project_id: project.id,
        user_email: email,
        role: "participante",
        joined_at: new Date().toISOString(),
        added_by: currentUserEmail,
      });
    }
  }

  return { ...project, conversation_id: conversation.id };
}

/** Edita um projeto existente */
export async function updateProject(projectId, data) {
  if (!projectId) throw new Error("ID do projeto é obrigatório.");

  // Se o título mudou, atualiza também o nome da conversa
  if (data.title) {
    const project = await CollabProject.filter({ id: projectId });
    if (project[0]?.conversation_id) {
      await ChatConversation.update(project[0].conversation_id, {
        name: `📁 ${data.title.trim()}`,
      });
    }
  }

  return await CollabProject.update(projectId, data);
}

/** Lista projetos visíveis para o usuário */
export async function listProjects(currentUserEmail, isAdmin = false) {
  const all = await CollabProject.list("-created_date");
  if (isAdmin) return all;

  const participations = await CollabProjectParticipant.filter({ user_email: currentUserEmail });
  const participatingIds = new Set(participations.map((p) => p.project_id));

  return all.filter((p) => !p.is_private || participatingIds.has(p.id));
}

/** Busca projeto por ID */
export async function getProjectById(projectId) {
  if (!projectId) throw new Error("ID do projeto é obrigatório.");
  const results = await CollabProject.filter({ id: projectId });
  return results[0] || null;
}

/**
 * Retorna a ChatConversation dedicada ao projeto.
 * Use para abrir o chat dentro da tela de projeto.
 */
export async function getProjectConversation(projectId) {
  const project = await getProjectById(projectId);
  if (!project?.conversation_id) return null;

  const convs = await ChatConversation.filter({ id: project.conversation_id });
  return convs[0] || null;
}

/**
 * Dado um conversation_id, retorna o CollabProject vinculado (se houver).
 * Útil para identificar no chat se a conversa é de um projeto.
 */
export async function getProjectByConversationId(conversationId) {
  const results = await CollabProject.filter({ conversation_id: conversationId });
  return results[0] || null;
}

/** Arquiva projeto */
export async function archiveProject(projectId) {
  return await CollabProject.update(projectId, { status: "arquivado" });
}

/** Deleta projeto e todos os registros filhos em cascata */
export async function deleteProjectCascade(projectId) {
  if (!projectId) throw new Error("ID do projeto é obrigatório.");

  const project = await getProjectById(projectId);

  const [participants, checklists, checklistItems, files, updates, reminders] = await Promise.all([
    CollabProjectParticipant.filter({ project_id: projectId }),
    CollabChecklist.filter({ project_id: projectId }),
    CollabChecklistItem.filter({ project_id: projectId }),
    CollabProjectFile.filter({ project_id: projectId }),
    CollabStatusUpdate.filter({ project_id: projectId }),
    CollabReminder.filter({ project_id: projectId }),
  ]);

  await Promise.all([
    ...participants.map((r) => CollabProjectParticipant.delete(r.id)),
    ...checklists.map((r) => CollabChecklist.delete(r.id)),
    ...checklistItems.map((r) => CollabChecklistItem.delete(r.id)),
    ...files.map((r) => CollabProjectFile.delete(r.id)),
    ...updates.map((r) => CollabStatusUpdate.delete(r.id)),
    ...reminders.map((r) => CollabReminder.delete(r.id)),
  ]);

  // Deleta a conversa dedicada (não afeta outras conversas)
  if (project?.conversation_id) {
    await ChatConversation.delete(project.conversation_id).catch(() => {});
  }

  return await CollabProject.delete(projectId);
}

// ─────────────────────────────────────────────
// PARTICIPANTES + SINCRONIZAÇÃO COM CONVERSA
// ─────────────────────────────────────────────

/** Lista participantes de um projeto */
export async function listParticipants(projectId) {
  return await CollabProjectParticipant.filter({ project_id: projectId });
}

/**
 * Adiciona participante ao projeto E sincroniza na ChatConversation dedicada.
 * Valida duplicidade.
 */
export async function addParticipant(projectId, userEmail, role = "participante", addedBy) {
  if (!projectId || !userEmail) throw new Error("project_id e user_email são obrigatórios.");

  // Valida duplicidade
  const existing = await CollabProjectParticipant.filter({
    project_id: projectId,
    user_email: userEmail,
  });
  if (existing.length > 0) throw new Error("Participante já está no projeto.");

  // Cria registro de participante
  const record = await CollabProjectParticipant.create({
    project_id: projectId,
    user_email: userEmail,
    role,
    joined_at: new Date().toISOString(),
    added_by: addedBy,
  });

  // Sincroniza na conversa dedicada
  await syncParticipantsToConversation(projectId);

  return record;
}

/**
 * Remove participante do projeto E sincroniza na ChatConversation.
 * Não permite remover o owner.
 */
export async function removeParticipant(participantRecordId, projectId) {
  const records = await CollabProjectParticipant.filter({ id: participantRecordId });
  const record = records[0];
  if (!record) throw new Error("Participante não encontrado.");
  if (record.role === "owner") throw new Error("Não é possível remover o owner do projeto.");

  await CollabProjectParticipant.delete(participantRecordId);

  // Sincroniza na conversa
  await syncParticipantsToConversation(projectId);
}

/** Atualiza role de um participante */
export async function updateParticipantRole(participantRecordId, newRole) {
  if (newRole === "owner") throw new Error("Não é possível definir um segundo owner.");
  return await CollabProjectParticipant.update(participantRecordId, { role: newRole });
}

/**
 * Sincroniza a lista de participantes do projeto na ChatConversation dedicada.
 * Chamado internamente após add/remove de participante.
 * Observadores também entram na conversa (podem visualizar e participar do chat nesta fase).
 */
async function syncParticipantsToConversation(projectId) {
  const [project, participants] = await Promise.all([
    getProjectById(projectId),
    listParticipants(projectId),
  ]);

  if (!project?.conversation_id) return;

  const emails = participants.map((p) => p.user_email);
  const ownerEmail = participants.find((p) => p.role === "owner")?.user_email;

  await ChatConversation.update(project.conversation_id, {
    participants: emails,
    admins: ownerEmail ? [ownerEmail] : [],
  });
}

// ─────────────────────────────────────────────
// CHECKLISTS
// ─────────────────────────────────────────────

export async function listChecklists(projectId) {
  const lists = await CollabChecklist.filter({ project_id: projectId });
  return lists.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function createChecklist(projectId, title, createdBy, sortOrder = 0) {
  if (!title?.trim()) throw new Error("Título da checklist é obrigatório.");
  return await CollabChecklist.create({
    project_id: projectId,
    title: title.trim(),
    sort_order: sortOrder,
    created_by: createdBy,
  });
}

export async function deleteChecklist(checklistId) {
  const items = await CollabChecklistItem.filter({ checklist_id: checklistId });
  await Promise.all(items.map((i) => CollabChecklistItem.delete(i.id)));
  return await CollabChecklist.delete(checklistId);
}

// ─────────────────────────────────────────────
// ITENS DE CHECKLIST
// ─────────────────────────────────────────────

export async function listChecklistItems(checklistId) {
  const items = await CollabChecklistItem.filter({ checklist_id: checklistId });
  return items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function createChecklistItem(checklistId, projectId, text, createdBy, extra = {}) {
  if (!text?.trim()) throw new Error("Texto do item é obrigatório.");

  // Valida integridade: checklist pertence ao mesmo projeto
  const checklists = await CollabChecklist.filter({ id: checklistId });
  if (!checklists[0]) throw new Error("Checklist não encontrada.");
  if (checklists[0].project_id !== projectId)
    throw new Error("Checklist não pertence a este projeto.");

  return await CollabChecklistItem.create({
    project_id: projectId,
    checklist_id: checklistId,
    text: text.trim(),
    is_done: false,
    created_by: createdBy,
    sort_order: extra.sort_order || 0,
    assigned_to: extra.assigned_to || null,
    due_date: extra.due_date || null,
  });
}

export async function toggleChecklistItem(itemId, isDone, completedByEmail) {
  return await CollabChecklistItem.update(itemId, {
    is_done: isDone,
    completed_at: isDone ? new Date().toISOString() : null,
    completed_by: isDone ? completedByEmail : null,
  });
}

export async function updateChecklistItem(itemId, data) {
  return await CollabChecklistItem.update(itemId, data);
}

// ─────────────────────────────────────────────
// ARQUIVOS
// ─────────────────────────────────────────────

export async function listProjectFiles(projectId) {
  return await CollabProjectFile.filter({ project_id: projectId });
}

export async function addProjectFile(projectId, fileData, uploadedBy) {
  return await CollabProjectFile.create({
    project_id: projectId,
    ...fileData,
    uploaded_by: uploadedBy,
    source_type: fileData.source_type || "manual",
  });
}

export async function removeProjectFile(fileId) {
  return await CollabProjectFile.delete(fileId);
}

// ─────────────────────────────────────────────
// STATUS UPDATES
// ─────────────────────────────────────────────

export async function listStatusUpdates(projectId) {
  const updates = await CollabStatusUpdate.filter({ project_id: projectId });
  return updates.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

export async function createStatusUpdate(projectId, content, authorEmail) {
  if (!content?.trim()) throw new Error("Conteúdo do update é obrigatório.");
  return await CollabStatusUpdate.create({
    project_id: projectId,
    author_email: authorEmail,
    content: content.trim(),
  });
}

// ─────────────────────────────────────────────
// LEMBRETES
// ─────────────────────────────────────────────

export async function listReminders(projectId) {
  const reminders = await CollabReminder.filter({ project_id: projectId });
  return reminders.sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at));
}

export async function createReminder(projectId, data, createdBy) {
  if (!data.title?.trim()) throw new Error("Título do lembrete é obrigatório.");
  if (!data.remind_at) throw new Error("Data do lembrete é obrigatória.");
  return await CollabReminder.create({
    project_id: projectId,
    ...data,
    created_by: createdBy,
    status: "ativo",
  });
}

export async function updateReminderStatus(reminderId, status) {
  return await CollabReminder.update(reminderId, { status });
}