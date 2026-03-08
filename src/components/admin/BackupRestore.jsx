import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  RefreshCw,
  Clock,
  XCircle,
  Play,
  FileDown,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { startBackupFull } from "@/functions/startBackupFull";
import { getBackupDownloadUrl } from "@/functions/getBackupDownloadUrl";

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const totalRecords = (counts) => {
  if (!counts) return 0;
  return Object.values(counts).reduce((a, b) => a + (b || 0), 0);
};

const STATUS_LABELS = {
  pending: { label: "Na fila", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  running: { label: "Em execução", color: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "Falhou", color: "bg-red-100 text-red-800 border-red-200" },
  canceled: { label: "Cancelado", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

// ─── ActiveJobCard ─────────────────────────────────────────────────────────
function ActiveJobCard({ job, onRetry }) {
  if (!job) return null;
  const s = STATUS_LABELS[job.status] || STATUS_LABELS.pending;
  const isActive = job.status === "pending" || job.status === "running";

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
          ) : job.status === "completed" ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span className="text-sm font-semibold truncate">
            Job <span className="font-mono text-xs text-muted-foreground">{job.id?.slice(-8)}</span>
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.color}`}>
          {s.label}
        </span>
      </div>

      {(isActive || job.status === "completed") && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{job.current_step || "Aguardando..."}</span>
            <span>{job.progress_percent || 0}%</span>
          </div>
          <Progress value={job.progress_percent || 0} className="h-2" />
        </div>
      )}

      {isActive && job.current_entity && (
        <p className="text-xs text-muted-foreground truncate">
          Entidade atual: <span className="font-medium text-foreground">{job.current_entity}</span>
        </p>
      )}

      {(job.processed_count > 0 || job.total_count > 0) && (
        <p className="text-xs text-muted-foreground">
          Registros:{" "}
          <span className="font-medium text-foreground">
            {job.processed_count?.toLocaleString("pt-BR") || 0}
          </span>
          {job.total_count > 0 && ` / ${job.total_count.toLocaleString("pt-BR")}`}
        </p>
      )}

      {job.status === "failed" && job.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 break-words">
          <p className="font-medium mb-1">Erro:</p>
          <p>{job.error_message}</p>
        </div>
      )}

      {job.status === "completed" && job.manifest_json && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
          ✅ {job.manifest_json.total_records?.toLocaleString("pt-BR") || 0} registros exportados com sucesso
        </div>
      )}

      {job.status === "failed" && (
        <Button size="sm" variant="outline" onClick={onRetry} className="w-full gap-2 h-9">
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}

// ─── BackupListItem ─────────────────────────────────────────────────────────
function BackupListItem({ metadata, onDownload, downloadingId }) {
  const total = totalRecords(metadata.entities_counts);
  const size = formatBytes(metadata.file_size_bytes);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 p-2 rounded-lg bg-blue-50 shrink-0">
          <HardDrive className="w-4 h-4 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-medium text-sm truncate">
            {metadata.name || `Backup ${formatDate(metadata.snapshot_timestamp)}`}
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(metadata.snapshot_timestamp || metadata.created_date)}
            </span>
            {total > 0 && <span>{total.toLocaleString("pt-BR")} registros</span>}
            {size && <span>{size}</span>}
            {metadata.schema_version && <span className="font-mono">v{metadata.schema_version}</span>}
          </div>

          <p className="text-xs text-muted-foreground truncate">
            Por: {metadata.created_by_email || "—"}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => onDownload(metadata.id)}
        disabled={!!downloadingId || !metadata.file_uri}
        className="shrink-0 gap-1.5 h-9 w-full sm:w-auto"
      >
        {downloadingId === metadata.id ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileDown className="w-3.5 h-3.5" />
        )}
        Baixar
      </Button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function BackupRestore() {
  const { toast } = useToast();
  const [activeJob, setActiveJob] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [startingBackup, setStartingBackup] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const pollingRef = useRef(null);

  // ── Load backup list ──────────────────────────────────────────────────────
  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const list = await base44.entities.BackupMetadata.list("-created_date", 50);
      setBackups(list || []);
    } catch (e) {
      setBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  // ── Poll active job ───────────────────────────────────────────────────────
  const pollJob = async (jobId) => {
    try {
      const jobs = await base44.entities.BackupJob.filter({ id: jobId });
      const job = jobs?.[0];
      if (!job) return;

      setActiveJob(job);

      const isDone =
        job.status === "completed" || job.status === "failed" || job.status === "canceled";

      if (isDone) {
        stopPolling();
        localStorage.removeItem("orion_active_backup_job");

        if (job.status === "completed") {
          toast({
            title: "✅ Backup concluído!",
            description: `${job.manifest_json?.total_records?.toLocaleString("pt-BR") || 0} registros exportados.`,
          });
          loadBackups();
        } else if (job.status === "failed") {
          toast({
            title: "Backup falhou",
            description: job.error_message || "Erro desconhecido.",
            variant: "destructive",
          });
        }
      }
    } catch (_) {}
  };

  const startPolling = (jobId) => {
    stopPolling();
    pollingRef.current = setInterval(() => pollJob(jobId), 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadBackups();

    const savedJobId = localStorage.getItem("orion_active_backup_job");
    if (savedJobId) {
      base44.entities.BackupJob.filter({ id: savedJobId })
        .then((jobs) => {
          const job = jobs?.[0];
          if (!job) {
            localStorage.removeItem("orion_active_backup_job");
            return;
          }
          setActiveJob(job);

          const isDone =
            job.status === "completed" || job.status === "failed" || job.status === "canceled";

          if (!isDone) startPolling(savedJobId);
          else localStorage.removeItem("orion_active_backup_job");
        })
        .catch(() => localStorage.removeItem("orion_active_backup_job"));
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start backup ──────────────────────────────────────────────────────────
  const handleStartBackup = async () => {
    setStartingBackup(true);
    try {
      const response = await startBackupFull({});
      const jobId = response?.data?.jobId;
      if (!jobId) throw new Error("jobId não retornado");

      localStorage.setItem("orion_active_backup_job", jobId);

      const jobs = await base44.entities.BackupJob.filter({ id: jobId });
      setActiveJob(
        jobs?.[0] || { id: jobId, status: "pending", progress_percent: 0, current_step: "queued" }
      );
      startPolling(jobId);

      toast({ title: "Backup iniciado!", description: "Acompanhe o progresso abaixo." });
    } catch (err) {
      toast({
        title: "Erro ao iniciar backup",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setStartingBackup(false);
    }
  };

  // ── Retry failed job ──────────────────────────────────────────────────────
  const handleRetry = async () => {
    setActiveJob(null);
    localStorage.removeItem("orion_active_backup_job");
    await handleStartBackup();
  };

  // ── Download backup (ROBUSTO) ──────────────────────────────────────────────
  const handleDownload = async (metadataId) => {
    setDownloadingId(metadataId);

    // Abre a aba imediatamente (antes do await) para evitar bloqueio de popup
    const newTab = window.open("", "_blank", "noopener,noreferrer");

    try {
      const res = await getBackupDownloadUrl({ backupMetadataId: metadataId });

      // Suporta diferentes formatos de retorno do wrapper:
      // - axios: res.data = { url, filename }
      // - wrapper: res.data = { data: { url, filename } }
      // - retorno direto: { url, filename }
      const payload = res?.data?.data ?? res?.data ?? res;
      const url = payload?.url;
      const filename = payload?.filename;

      if (!url) throw new Error("URL não gerada pela função getBackupDownloadUrl");

      // Preferir navegar a aba recém-aberta (menos bloqueio do Chrome)
      if (newTab) {
        newTab.location.href = url;
        try {
          newTab.document.title = filename || "backup_orion.json";
        } catch (_) {}
      } else {
        // fallback se popup for bloqueado
        window.location.assign(url);
      }

      toast({ title: "Download iniciado!", description: "O link expira em 10 minutos." });
    } catch (err) {
      if (newTab) newTab.close();
      toast({
        title: "Erro no download",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const isJobActive = activeJob && (activeJob.status === "pending" || activeJob.status === "running");

  return (
    <div className="space-y-6">
      {/* ── Start Backup Card ── */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Database className="w-5 h-5 text-primary shrink-0" />
            Backup Full do Sistema
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Exporta todas as entidades do sistema para um arquivo JSON privado no servidor. O processo roda em
            background e pode levar alguns minutos dependendo do volume de dados.
          </p>

          <Button
            onClick={handleStartBackup}
            disabled={startingBackup || !!isJobActive}
            className="w-full sm:w-auto gap-2 h-10"
          >
            {startingBackup ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {startingBackup ? "Iniciando..." : isJobActive ? "Backup em andamento..." : "Iniciar Backup Full"}
          </Button>

          {activeJob && <ActiveJobCard job={activeJob} onRetry={handleRetry} />}
        </CardContent>
      </Card>

      {/* ── Backup List Card ── */}
      <Card>
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <HardDrive className="w-5 h-5 text-primary shrink-0" />
            Backups Disponíveis
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadBackups}
            className="h-8 w-8 shrink-0"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-5">
          {loadingBackups ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Database className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum backup disponível ainda.</p>
              <p className="text-xs text-muted-foreground">Inicie um backup para vê-lo aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((bk) => (
                <BackupListItem
                  key={bk.id}
                  metadata={bk}
                  onDownload={handleDownload}
                  downloadingId={downloadingId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Info ── */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-medium">Informações importantes:</p>
          <ul className="list-disc ml-3 space-y-0.5">
            <li>O arquivo de backup fica armazenado de forma privada no servidor.</li>
            <li>O link de download expira em 10 minutos após ser gerado.</li>
            <li>Dados de usuários (senhas, tokens) não são incluídos por segurança.</li>
            <li>Se o processo falhar, use "Tentar Novamente" para reiniciar.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}