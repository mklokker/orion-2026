import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, File, Trash2, ExternalLink } from "lucide-react";
import { addProjectFile, removeProjectFile } from "@/components/collab/collabService";
import { base44 } from "@/api/base44Client";

const getFileIcon = (fileType) => {
  if (!fileType) return <File className="w-4 h-4 text-muted-foreground" />;
  if (fileType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
  if (fileType.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export default function ProjectFiles({ projectId, files, currentUser, users, canEdit, onReload }) {
  const fileInputRef    = useRef(null);
  const [uploading, setUploading] = useState(false);

  const getName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.display_name || u?.full_name || email;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await addProjectFile(projectId, {
        file_name: file.name,
        file_url,
        file_type: file.type,
        file_size: file.size,
        source_type: "manual",
      }, currentUser.email);
      await onReload();
    } catch (e) {
      console.error("Upload error:", e);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (fileId) => {
    if (!confirm("Remover este arquivo do projeto?")) return;
    await removeProjectFile(fileId);
    onReload();
  };

  const manualFiles = files.filter(f => f.source_type === "manual");
  const chatFiles   = files.filter(f => f.source_type === "chat");

  return (
    <div className="space-y-4">
      {canEdit && (
        <>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-1" />
            {uploading ? "Enviando..." : "Enviar arquivo"}
          </Button>
        </>
      )}

      {files.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum arquivo anexado ao projeto.
        </p>
      )}

      {manualFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Enviados manualmente
          </p>
          {manualFiles.map(f => (
            <div
              key={f.id}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="shrink-0">{getFileIcon(f.file_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {getName(f.uploaded_by)}{f.file_size ? ` · ${formatSize(f.file_size)}` : ""}
                </p>
              </div>
              <a
                href={f.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:text-primary transition-colors shrink-0"
                title="Abrir arquivo"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {canEdit && (
                <button
                  onClick={() => handleDelete(f.id)}
                  className="p-1.5 hover:text-destructive transition-colors shrink-0"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {chatFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Do chat do projeto
          </p>
          {chatFiles.map(f => (
            <div
              key={f.id}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-blue-50/40 dark:bg-blue-900/10"
            >
              <div className="shrink-0">{getFileIcon(f.file_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{f.file_name}</p>
              </div>
              <a
                href={f.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:text-primary transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}