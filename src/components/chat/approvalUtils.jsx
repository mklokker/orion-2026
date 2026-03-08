/**
 * approvalUtils.js
 * Lógica compartilhada de aprovação de TaskRequest com validação por item,
 * normalização de protocolo e relatório detalhado.
 */
import { base44 } from "@/api/base44Client";

const Task             = base44.entities.Task;
const Service          = base44.entities.Service;
const TaskInteraction  = base44.entities.TaskInteraction;
const ServiceInteraction = base44.entities.ServiceInteraction;
const TaskRequest      = base44.entities.TaskRequest;
const ChatMessage      = base44.entities.ChatMessage;
const ChatConversation = base44.entities.ChatConversation;

// Status que indicam item ATIVO (não criar novamente)
const ACTIVE_STATUSES = new Set(["Em Execução", "Pendente", "Atrasada"]);
// Status que indicam item FINALIZADO (pode criar novamente)
const DONE_STATUSES   = new Set(["Concluída", "Finalizada"]);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Normaliza um identificador para comparação case-insensitive e sem pontuação.
 * "123.456" => "123456"   "ABC 01" => "abc01"
 */
export function normalizeKey(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[\s.,-]/g, "");
}

/**
 * Carrega todos os Tasks e Services do banco em paralelo
 * e retorna dois Maps: taskMap e serviceMap keyed by normalizedKey.
 * Cada entry é o objeto mais recente com aquele key.
 */
export async function buildExistingMaps(items) {
  // Separate identifiers by type
  const taskKeys    = items.filter(i => i.type === "task").map(i => normalizeKey(i.identifier));
  const serviceKeys = items.filter(i => i.type === "service").map(i => normalizeKey(i.identifier));

  // Fetch in parallel
  const [allTasks, allServices] = await Promise.all([
    taskKeys.length    > 0 ? Task.list("-created_date", 500)    : Promise.resolve([]),
    serviceKeys.length > 0 ? Service.list("-created_date", 500) : Promise.resolve([]),
  ]);

  // Build maps: normalizedKey => array of records (can have multiple, e.g. one active + one done)
  const taskMap    = new Map();
  const serviceMap = new Map();

  for (const t of allTasks) {
    const k = normalizeKey(t.protocol);
    if (!taskMap.has(k)) taskMap.set(k, []);
    taskMap.get(k).push(t);
  }
  for (const s of allServices) {
    const k = normalizeKey(s.service_name);
    if (!serviceMap.has(k)) serviceMap.set(k, []);
    serviceMap.get(k).push(s);
  }

  return { taskMap, serviceMap };
}

/**
 * Verifica se um item deve ser pulado (já existe ativo).
 * Retorna: { skip: bool, reason: string, existingId: string|null, existingStatus: string|null }
 */
export function checkItemShouldSkip(item, taskMap, serviceMap) {
  const key = normalizeKey(item.identifier);
  const records = item.type === "task" ? (taskMap.get(key) || []) : (serviceMap.get(key) || []);

  if (records.length === 0) return { skip: false };

  // Check if any record is ACTIVE
  const activeRecord = records.find(r => {
    const status = r.status || "";
    return ACTIVE_STATUSES.has(status);
  });

  if (activeRecord) {
    return {
      skip: true,
      reason: `Já existe ativo (status: ${activeRecord.status})`,
      existingId: activeRecord.id,
      existingStatus: activeRecord.status,
    };
  }

  // All existing records are done — allow creation
  return { skip: false };
}

/**
 * Cria um item (Task ou Service) com interação.
 * Retorna { created_id: string } ou lança erro.
 */
export async function createItem(item, request, departmentId, currentUser) {
  const userName = currentUser.display_name || currentUser.full_name || currentUser.email;

  if (item.type === "task") {
    const task = await Task.create({
      protocol:      item.identifier,
      description:   item.description || `Tarefa ${item.identifier}`,
      end_date:      item.end_date,
      priority:      "P3",
      assigned_to:   request.requester_email,
      department_id: departmentId || undefined,
      status:        "Pendente",
    });
    await TaskInteraction.create({
      task_id:          task.id,
      interaction_type: "created",
      message:          `Tarefa criada via solicitação no chat por ${userName}`,
      user_email:       currentUser.email,
      user_name:        userName,
    });
    return { created_id: task.id };
  } else {
    const svc = await Service.create({
      service_name:  item.identifier,
      description:   item.description || `Serviço ${item.identifier}`,
      end_date:      item.end_date,
      priority:      "P3",
      assigned_to:   request.requester_email,
      department_id: departmentId || undefined,
      status:        "Em Execução",
    });
    await ServiceInteraction.create({
      service_id:       svc.id,
      interaction_type: "created",
      message:          `Serviço criado via solicitação no chat por ${userName}`,
      user_email:       currentUser.email,
      user_name:        userName,
    });
    return { created_id: svc.id };
  }
}

/**
 * Processa um único item com retry e validação.
 * Retorna entry de log: { identifier, type, status: "created"|"skipped_active"|"failed", reason, created_id }
 */
export async function processItemWithValidation(item, request, departmentId, currentUser, taskMap, serviceMap, maxRetries = 2) {
  // 1. Validate — check if already active
  const check = checkItemShouldSkip(item, taskMap, serviceMap);
  if (check.skip) {
    return {
      identifier:     item.identifier,
      type:           item.type,
      status:         "skipped_active",
      reason:         check.reason,
      existing_id:    check.existingId,
      existing_status: check.existingStatus,
      created_id:     null,
    };
  }

  // 2. Create with retry
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { created_id } = await createItem(item, request, departmentId, currentUser);
      return {
        identifier: item.identifier,
        type:       item.type,
        status:     "created",
        reason:     null,
        created_id,
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) await sleep(300 * (attempt + 1));
    }
  }

  return {
    identifier: item.identifier,
    type:       item.type,
    status:     "failed",
    reason:     lastError?.message || "Erro desconhecido",
    created_id: null,
  };
}

/**
 * Processa todos os itens de uma solicitação com validação completa.
 * Retorna relatório detalhado por item + resumo.
 */
export async function approveRequestWithValidation(request, departmentId, currentUser, onItemDone = null) {
  const items = request.items || [];

  // Build existence maps once for the whole request (efficient)
  const { taskMap, serviceMap } = await buildExistingMaps(items);

  const itemResults = [];

  for (const item of items) {
    const result = await processItemWithValidation(item, request, departmentId, currentUser, taskMap, serviceMap);
    itemResults.push(result);
    if (onItemDone) onItemDone(result, itemResults.length);
  }

  // Build summary
  const created       = itemResults.filter(r => r.status === "created");
  const skippedActive = itemResults.filter(r => r.status === "skipped_active");
  const failed        = itemResults.filter(r => r.status === "failed");

  const summary = {
    total:         items.length,
    created:       created.length,
    skipped_active: skippedActive.length,
    failed:        failed.length,
  };

  const approvalResult = { items: itemResults, summary, processed_at: new Date().toISOString() };

  // Update TaskRequest
  await TaskRequest.update(request.id, {
    status:          "approved",
    reviewed_by:     currentUser.email,
    reviewed_at:     new Date().toISOString(),
    approval_result: approvalResult,
  });

  // Post chat message
  if (request.conversation_id) {
    try {
      const approverName = currentUser.display_name || currentUser.full_name || currentUser.email;
      const skippedList  = skippedActive.map(r => r.identifier).join(", ");

      let msg = `✅ **Solicitação aprovada** por ${approverName}\n\n`;
      if (summary.created > 0)        msg += `✅ Criados: ${summary.created}\n`;
      if (summary.skipped_active > 0) msg += `⏭️ Pulados (já ativos): ${summary.skipped_active}${skippedList ? ` — ${skippedList}` : ""}\n`;
      if (summary.failed > 0)         msg += `❌ Falhas: ${summary.failed}\n`;
      if (summary.created === 0 && summary.skipped_active > 0) msg += `\n_Nenhum item novo criado — todos já existem e estão ativos._`;

      await ChatMessage.create({
        conversation_id: request.conversation_id,
        sender_email:    currentUser.email,
        sender_name:     approverName,
        content:         msg,
        type:            "text",
        read_by:         [{ email: currentUser.email, read_at: new Date().toISOString() }],
      });

      await ChatConversation.update(request.conversation_id, {
        last_message:    `✅ Solicitação aprovada por ${approverName}`,
        last_message_at: new Date().toISOString(),
        last_message_by: currentUser.email,
      });
    } catch (_) { /* non-critical */ }
  }

  return { itemResults, summary, approvalResult };
}