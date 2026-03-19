import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Cria o job de backup com status pending
  const job = await base44.asServiceRole.entities.BackupJob.create({
    type: 'backup',
    status: 'pending',
    created_by_email: user.email,
    progress_percent: 0,
    current_step: 'queued',
    processed_count: 0,
    total_count: 0,
    options: {},
  });

  // Dispara o worker assíncrono sem aguardar resposta.
  // Usa waitUntil-style: faz o invoke e ignora o resultado (fire-and-forget robusto).
  // O worker atualiza BackupJob.status conforme avança.
  const invokeWorker = async () => {
    try {
      await base44.asServiceRole.functions.invoke('processBackupJob', { jobId: job.id });
    } catch (err) {
      // Worker falhou ou timeout — marcar job como failed para que o UI mostre retry
      try {
        await base44.asServiceRole.entities.BackupJob.update(job.id, {
          status: 'failed',
          error_message: `Worker não respondeu: ${err?.message || 'timeout ou erro de rede'}`,
          finished_at: new Date().toISOString(),
        });
      } catch (_) {}
    }
  };

  // Dispara sem await (fire-and-forget)
  invokeWorker();

  return Response.json({ jobId: job.id });
});