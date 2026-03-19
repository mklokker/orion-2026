import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Entidades a exportar (em ordem de dependência) ───────────────────────────
const ENTITIES_TO_EXPORT = [
  'Department',
  'AppSettings',
  'UserPresence',
  'UserColumnOrder',
  'DocumentCategory',
  'Document',
  'DocumentVersion',
  'DocumentFavorite',
  'DocumentPermission',
  'DocumentPermissionLog',
  'Task',
  'TaskInteraction',
  'Service',
  'ServiceInteraction',
  'UserStar',
  'Notification',
  'ChatConversation',
  'ChatMessage',
  'Course',
  'CourseVideo',
  'BackupMetadata',
  // Entidades adicionais do schema
  'Desk',
  'Sector',
  'CourseProgress',
  'CourseQuiz',
  'QuizQuestion',
  'QuizAttempt',
  'Certificate',
  'UserPoints',
  'UserBadge',
  'ForumTopic',
  'ForumReply',
  'CourseDocument',
  'CourseSite',
  'AlinhamentoCategoria',
  'Alinhamento',
  'AlinhamentoTopico',
  'AtaReuniao',
  'PlanoAcao',
  'PlanoAcaoItem',
  'PlanoAcaoCategoria',
  'PlanoAcaoIndicador',
  'PlanoAcaoObjetivo',
  'PlanoAcaoPrograma',
  'AtasAlinhamentosLog',
  'TaskRequest',
];

const SCHEMA_VERSION = '1.0.0';
const PAGE_SIZE = 1000;
const RETRY_DELAYS = [1000, 3000, 8000]; // backoff em ms

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPageWithRetry(base44, entityName, skip) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const records = await base44.asServiceRole.entities[entityName].list(undefined, PAGE_SIZE, skip);
      return records || [];
    } catch (err) {
      const is429 = err?.response?.status === 429 || String(err?.message).includes('429');
      if (is429 && attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      // Entidade pode não existir neste ambiente — retornar vazio
      if (err?.response?.status === 404 || err?.response?.status === 400) return [];
      throw err;
    }
  }
  return [];
}

async function exportEntity(base44, entityName) {
  const records = [];
  let skip = 0;
  while (true) {
    const page = await fetchPageWithRetry(base44, entityName, skip);
    records.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return records;
}

async function updateJob(base44, jobId, fields) {
  try {
    await base44.asServiceRole.entities.BackupJob.update(jobId, fields);
  } catch (_) { /* não bloquear o worker por falha de update de progresso */ }
}

// ─── Worker principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { jobId } = await req.json();

  if (!jobId) {
    return Response.json({ error: 'jobId is required' }, { status: 400 });
  }

  // Marca como running
  await updateJob(base44, jobId, {
    status: 'running',
    started_at: new Date().toISOString(),
    current_step: 'exporting',
    progress_percent: 1,
  });

  const exportData = {};
  const entitiesCounts = {};
  const totalEntities = ENTITIES_TO_EXPORT.length;

  // ─── Exportar entidade por entidade ────────────────────────────────────────
  for (let i = 0; i < ENTITIES_TO_EXPORT.length; i++) {
    const entityName = ENTITIES_TO_EXPORT[i];

    await updateJob(base44, jobId, {
      current_entity: entityName,
      current_step: `exporting ${entityName}`,
      progress_percent: Math.round(2 + (i / totalEntities) * 80), // 2% → 82%
    });

    try {
      const records = await exportEntity(base44, entityName);
      exportData[entityName] = records;
      entitiesCounts[entityName] = records.length;
    } catch (err) {
      // Log e continua — não aborta todo o backup por uma entidade com erro
      exportData[entityName] = [];
      entitiesCounts[entityName] = 0;
    }
  }

  // ─── Gerar manifest ────────────────────────────────────────────────────────
  await updateJob(base44, jobId, {
    current_step: 'building manifest',
    progress_percent: 83,
  });

  const snapshotTimestamp = new Date().toISOString();

  // Buscar job para pegar created_by_email
  let jobRecord = null;
  try {
    const jobs = await base44.asServiceRole.entities.BackupJob.filter({ id: jobId });
    jobRecord = jobs?.[0] || null;
  } catch (_) {}

  const manifest = {
    schema_version: SCHEMA_VERSION,
    snapshot_timestamp: snapshotTimestamp,
    created_by_email: jobRecord?.created_by_email || '',
    job_id: jobId,
    entities_counts: entitiesCounts,
    total_records: Object.values(entitiesCounts).reduce((a, b) => a + b, 0),
    entities_included: ENTITIES_TO_EXPORT,
  };

  // ─── Montar payload final ──────────────────────────────────────────────────
  await updateJob(base44, jobId, {
    current_step: 'serializing',
    progress_percent: 85,
  });

  const backupPayload = JSON.stringify({ manifest, data: exportData });

  // ─── Upload privado ────────────────────────────────────────────────────────
  await updateJob(base44, jobId, {
    current_step: 'uploading',
    progress_percent: 88,
  });

  const filename = `backup_${snapshotTimestamp.replace(/[:.]/g, '-')}.json`;
  const file = new File([backupPayload], filename, { type: 'application/json' });

  let fileUri = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
      fileUri = uploadResult?.file_uri;
      break;
    } catch (err) {
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      // Falha no upload — marca como failed
      await updateJob(base44, jobId, {
        status: 'failed',
        error_message: `Upload falhou: ${err?.message || 'erro desconhecido'}`,
        finished_at: new Date().toISOString(),
        progress_percent: 88,
      });
      return Response.json({ error: 'Upload failed', jobId }, { status: 500 });
    }
  }

  // ─── Criar BackupMetadata ──────────────────────────────────────────────────
  await updateJob(base44, jobId, {
    current_step: 'saving metadata',
    progress_percent: 95,
  });

  let metadataId = null;
  try {
    const metadata = await base44.asServiceRole.entities.BackupMetadata.create({
      name: `Backup ${snapshotTimestamp.slice(0, 10)}`,
      file_uri: fileUri,
      file_size_bytes: new TextEncoder().encode(backupPayload).length,
      created_by_email: manifest.created_by_email,
      schema_version: SCHEMA_VERSION,
      entities_counts: entitiesCounts,
      snapshot_timestamp: snapshotTimestamp,
      status: 'available',
      job_id: jobId,
      includes_files: false,
      restore_count: 0,
    });
    metadataId = metadata?.id;
  } catch (err) {
    // Não bloqueia — metadata é secundário
  }

  // ─── Finalizar job ─────────────────────────────────────────────────────────
  await updateJob(base44, jobId, {
    status: 'completed',
    progress_percent: 100,
    current_step: 'done',
    current_entity: '',
    processed_count: manifest.total_records,
    total_count: manifest.total_records,
    result_file_uri: fileUri,
    manifest_json: manifest,
    finished_at: new Date().toISOString(),
  });

  return Response.json({ success: true, jobId, metadataId, total_records: manifest.total_records });
});