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

  // Dispara o worker assíncrono sem aguardar resposta
  base44.asServiceRole.functions.invoke('processBackupJob', { jobId: job.id }).catch(() => {});

  return Response.json({ jobId: job.id });
});