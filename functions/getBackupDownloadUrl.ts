// getBackupDownloadUrl - gera signed URL temporária (10 min) a partir do file_uri persistido no BackupMetadata
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { backupMetadataId } = await req.json();
  if (!backupMetadataId) {
    return Response.json({ error: 'backupMetadataId is required' }, { status: 400 });
  }

  // Busca o metadata do backup
  const metadatas = await base44.asServiceRole.entities.BackupMetadata.filter({ id: backupMetadataId });
  const metadata = metadatas?.[0];

  if (!metadata) {
    return Response.json({ error: 'Backup not found' }, { status: 404 });
  }

  if (!metadata.file_uri) {
    return Response.json({ error: 'Backup file not available' }, { status: 400 });
  }

  // Gera signed URL com 10 minutos de expiração via integração Core
  const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri: metadata.file_uri,
    expires_in: 600,
  });

  // Registra que este backup foi utilizado para download
  try {
    await base44.asServiceRole.entities.BackupMetadata.update(backupMetadataId, {
      last_restored_at: new Date().toISOString(),
    });
  } catch (_) {}

  return Response.json({ url: result.signed_url, filename: `backup_${metadata.snapshot_timestamp?.slice(0, 10) || 'orion'}.json` });
});