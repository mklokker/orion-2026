/**
 * COLLAB SERVICE — Módulo de Colaboração
 * =======================================
 * Camada de serviço isolada para o módulo Colaboração.
 * NÃO mistura com Task, Service, ou qualquer outra entidade existente.
 *
 * RELACIONAMENTOS DEFINIDOS:
 *   CollabProject (1) → (N) CollabProjectParticipant  [via project_id]
 *   CollabProject (1) → (N) CollabChecklist           [via project_id]
 *   CollabChecklist (1) → (N) CollabChecklistItem     [via checklist_id + project_id]
 *   CollabProject (1) → (N) CollabProjectFile         [via project_id]
 *   CollabProject (1) → (N) CollabStatusUpdate        [via project_id]
 *   CollabProject (1) → (N) CollabReminder            [via project_id]
 *
 * REGRAS DE INTEGRIDADE:
 *   - Todo projeto deve ter owner_email preenchido
 *   - Não é permitido participante duplicado no mesmo projeto
 *   - Itens de checklist devem ter project_id consistente com a checklist
 *   - Deleção de projeto deve limpar registros filhos (chamada em cascata)
 *   - responsible_email não é obrigatório ser participante (pode ser externo), mas recomendado
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
} = base44.entities;

// ─────────────────────────────────────────────
// PROJETOS
// ─────────────────────────────────────────────

/** Cria um novo projeto e adiciona o owner como participante automaticamente */
export async function createProject(data, currentUserEmail) {
  if (!data.title?.trim()) throw new Error("Título do projeto é obrigatório.");
  if (!currentUserEmail) throw new Error("Usuário não autenticado.");

  const project = await CollabProject.create({
    ...data,
    owner_email: currentUserEmail,
    status: data.status || "rascunho",
    priority: data.priority || "media",
  });

  // Adiciona o criador como owner automaticamente
  await CollabProjectParticipant.create({
    project_id: project.id,
    user_email: currentUserEmail,
    role: "owner",
    joined_at: new Date().toISOString(),
    added_by: currentUserEmail,
  });

  // Se responsible_email diferente do owner, adiciona como participante
  if (data.responsible_email && data.responsible_email !== currentUserEmail) {
    await CollabProjectParticipant.create({
      project_id: project.id,
      user_email: data.responsible_email,
      role: "responsavel",
      joined_at: new Date().toISOString(),
      added_by: currentUserEmail,
    });
  }

  return project;
}

/** Edita um projeto existente */
export async function updateProject(projectId, data) {
  if (!projectId) throw new Error("ID do projeto é obrigatório.");
  return await CollabProject.update(projectId, data);
}

/** Lista todos os projetos visíveis para o usuário */
export async function listProjects(currentUserEmail, isAdmin = false) {
  const all = await CollabProject.list("-created_date");
  if (isAdmin) return all;

  // Busca participações do usuário
  const participations = await CollabProjectParticipant.filter({ user_email: currentUserEmail });
  const participatingIds = new Set(participations.map((p) => p.project_id));

  // Retorna projetos públicos + projetos onde é participante
  return all.filter((p) => !p.is_private || participatingIds.has(p.id));
}

/** Busca projeto por ID */
export async function getProjectById(projectId) {
  if (!projectId) throw new Error("ID do projeto é obrigatório.");
  const results = await CollabProject.filter({ id: projectId });
  return results[0] || null;
}

/** Arquiva um projeto */
export async function archiveProject(projectId) {
  return await CollabProject.update(projectId, { status: "arquivado" });
}

/** Deleta projeto e todos os registros filhos em cascata */
export async function deleteProjectCascade(projectId) {
  if (!projectId) throw new Error("ID do projeto é obrigatório.");

  // Busca todos os filhos para deletar
  const [participants, checklists, checklistItems, files, updates, reminders] = await Promise.all([
    CollabProjectParticipant.filter({ project_id: projectId }),
    CollabChecklist.filter({ project_id: projectId }),
    CollabChecklistItem.filter({ project_id: projectId }),
    CollabProjectFile.filter({ project_id: projectId }),
    CollabStatusUpdate.filter({ project_id: projectId }),
    CollabReminder.filter({ project_id: projectId }),
  ]);

  // Deleta tudo em paralelo
  await Promise.all([
    ...participants.map((r) => CollabProjectParticipant.delete(r.id)),
    ...checklists.map((r) => CollabChecklist.delete(r.id)),
    ...checklistItems.map((r) => CollabChecklistItem.delete(r.id)),
    ...files.map((r) => CollabProjectFile.delete(r.id)),
    ...updates.map((r) => CollabStatusUpdate.delete(r.id)),
    ...reminders.map((r) => CollabReminder.delete(r.id)),
  ]);

  await CollabProject.delete(projectId);
}

// ─────────────────────────────────────────────
// PARTICIPANTES
// ─────────────────────────────────────────────

/** Lista participantes de um projeto */
export async function listParticipants(projectId) {
  return await CollabProjectParticipant.filter({ project_id: projectId });
}

/** Adiciona participante — valida duplicidade */
export async function addParticipant(projectId, userEmail, role = "participante", addedBy) {
  if (!projectId || !userEmail) throw new Error("project_id e user_email são obrigatórios.");

  // Verifica duplicidade
  const existing = await CollabProjectParticipant.filter({
    project_id: projectId,
    user_email: userEmail,
  });
  if (existing.length > 0) throw new Error("Participante já está no projeto.");

  return await CollabProjectParticipant.create({
    project_id: projectId,
    user_email: userEmail,
    role,
    joined_at: new Date().toISOString(),
    added_by: addedBy,
  });
}

/** Remove participante — não permite remover o owner */
export async function removeParticipant(participantRecordId, project) {
  const record = await CollabProjectParticipant.filter({ id: participantRecordId });
  if (!record[0]) throw new Error("Participante não encontrado.");
  if (record[0].role === "owner") throw new Error("Não é possível remover o owner do projeto.");
  return await CollabProjectParticipant.delete(participantRecordId);
}

/** Atualiza role de um participante */
export async function updateParticipantRole(participantRecordId, newRole) {
  if (newRole === "owner") throw new Error("Não é possível definir um segundo owner.");
  return await CollabProjectParticipant.update(participantRecordId, { role: newRole });
}

// ─────────────────────────────────────────────
// CHECKLISTS
// ─────────────────────────────────────────────

/** Lista checklists de um projeto */
export async function listChecklists(projectId) {
  const lists = await CollabChecklist.filter({ project_id: projectId });
  return lists.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/** Cria uma checklist */
export async function createChecklist(projectId, title, createdBy, sortOrder = 0) {
  if (!title?.trim()) throw new Error("Título da checklist é obrigatório.");
  return await CollabChecklist.create({
    project_id: projectId,
    title: title.trim(),
    sort_order: sortOrder,
    created_by: createdBy,
  });
}

/** Deleta checklist e seus itens em cascata */
export async function deleteChecklist(checklistId, projectId) {
  const items = await CollabChecklistItem.filter({ checklist_id: checklistId });
  await Promise.all(items.map((i) => CollabChecklistItem.delete(i.id)));
  return await CollabChecklist.delete(checklistId);
}

// ─────────────────────────────────────────────
// ITENS DE CHECKLIST
// ─────────────────────────────────────────────

/** Lista itens de uma checklist */
export async function listChecklistItems(checklistId) {
  const items = await CollabChecklistItem.filter({ checklist_id: checklistId });
  return items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/** Cria item de checklist — valida project_id consistente com a checklist */
export async function createChecklistItem(checklistId, projectId, text, createdBy, extra = {}) {
  if (!text?.trim()) throw new Error("Texto do item é obrigatório.");

  // Valida que checklist pertence ao mesmo projeto
  const checklist = await CollabChecklist.filter({ id: checklistId });
  if (!checklist[0]) throw new Error("Checklist não encontrada.");
  if (checklist[0].project_id !== projectId)
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

/** Marca item como concluído/pendente */
export async function toggleChecklistItem(itemId, isDone, completedByEmail) {
  return await CollabChecklistItem.update(itemId, {
    is_done: isDone,
    completed_at: isDone ? new Date().toISOString() : null,
    completed_by: isDone ? completedByEmail : null,
  });
}

/** Atualiza item de checklist */
export async function updateChecklistItem(itemId, data) {
  return await CollabChecklistItem.update(itemId, data);
}

// ─────────────────────────────────────────────
// ARQUIVOS
// ─────────────────────────────────────────────

/** Lista arquivos de um projeto */
export async function listProjectFiles(projectId) {
  return await CollabProjectFile.filter({ project_id: projectId });
}

/** Adiciona arquivo ao projeto */
export async function addProjectFile(projectId, fileData, uploadedBy) {
  return await CollabProjectFile.create({
    project_id: projectId,
    ...fileData,
    uploaded_by: uploadedBy,
    source_type: fileData.source_type || "manual",
  });
}

/** Remove arquivo */
export async function removeProjectFile(fileId) {
  return await CollabProjectFile.delete(fileId);
}

// ─────────────────────────────────────────────
// STATUS UPDATES
// ─────────────────────────────────────────────

/** Lista status updates de um projeto (mais recentes primeiro) */
export async function listStatusUpdates(projectId) {
  const updates = await CollabStatusUpdate.filter({ project_id: projectId });
  return updates.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

/** Cria um status update */
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

/** Lista lembretes de um projeto */
export async function listReminders(projectId) {
  const reminders = await CollabReminder.filter({ project_id: projectId });
  return reminders.sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at));
}

/** Cria um lembrete */
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

/** Atualiza status de um lembrete */
export async function updateReminderStatus(reminderId, status) {
  return await CollabReminder.update(reminderId, { status });
}